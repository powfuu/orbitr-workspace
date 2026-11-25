<#
  Orbitr Workspace - one-click Windows setup.

  Installs whatever is missing (Node, Rust, MSVC Build Tools, CMake, libclang),
  builds the app from this checkout, installs it for the current user and launches it.
  Safe to re-run: it skips what is already there, so it also works to update after `git pull`.

  Usage:  double-click setup.cmd   (or: powershell -ExecutionPolicy Bypass -File scripts\windows-setup.ps1)
  Flags:  -NoInstall   only build the installer, do not install it
          -NoLaunch    do not open the app at the end
#>
param(
  [switch]$NoInstall,
  [switch]$NoLaunch,
  [string]$LlvmVersion = '23.1.5'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $PSScriptRoot
$ToolsDir = Join-Path $env:LOCALAPPDATA 'orbitr-build'

function Step($msg) { Write-Host ''; Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host ''; Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user;$env:USERPROFILE\.cargo\bin"
}

function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

function Winget-Install($id, $extra) {
  if (-not (Has 'winget')) { Fail "winget is not available. Install 'App Installer' from the Microsoft Store and re-run." }
  $wingetArgs = @('install', '--id', $id, '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements') + $extra
  & winget @wingetArgs
  # -1978335189 = already installed / no newer version
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189) { Fail "winget could not install $id (exit $LASTEXITCODE)." }
  Refresh-Path
}

Write-Host 'Orbitr Workspace - Windows setup' -ForegroundColor White
Refresh-Path

# 1. Node.js 20+
Step 'Node.js'
$nodeOk = $false
if (Has 'node') { $nodeOk = ([int]((node -v) -replace '^v(\d+).*', '$1')) -ge 20 }
if (-not $nodeOk) { Winget-Install 'OpenJS.NodeJS.LTS' @() }
if (-not (Has 'node')) { Fail 'Node.js was installed but is not on PATH yet. Close this window and run setup.cmd again.' }
Ok "node $(node -v)"

# 2. MSVC Build Tools (C++ compiler + Windows SDK)
Step 'Visual Studio C++ Build Tools'
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
function Find-VS {
  if (-not (Test-Path $vswhere)) { return $null }
  $p = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  if ($p) { return ($p | Select-Object -First 1) } else { return $null }
}
$vs = Find-VS
if (-not $vs) {
  Write-Host '    Installing (several GB, takes a while; accept the Windows permission prompt if it appears)...'
  Winget-Install 'Microsoft.VisualStudio.2022.BuildTools' @('--override', '--quiet --wait --norestart --nocache --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended')
  $vs = Find-VS
  if (-not $vs) { Fail 'Visual Studio Build Tools with the C++ workload were not found after installing.' }
}
Ok $vs

# 3. Rust (stable, MSVC)
Step 'Rust'
if (-not (Has 'rustup')) { Winget-Install 'Rustlang.Rustup' @() }
if (-not (Has 'rustup')) { Fail 'rustup was installed but is not on PATH yet. Close this window and run setup.cmd again.' }
& rustup default stable | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'rustup could not install the stable toolchain.' }
Ok (& rustc -V)

# 4. CMake (needed by whisper-rs for voice input)
Step 'CMake'
if (-not (Has 'cmake')) {
  $vsCmake = Join-Path $vs 'Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin'
  if (Test-Path (Join-Path $vsCmake 'cmake.exe')) { $env:Path = "$vsCmake;$env:Path" }
  else { Winget-Install 'Kitware.CMake' @() }
}
if (-not (Has 'cmake')) { Fail 'CMake not found.' }
Ok ((& cmake --version) | Select-Object -First 1)

# 5. libclang (needed by bindgen for whisper-rs). Uses an existing LLVM if there is one,
#    otherwise extracts just libclang.dll from the official LLVM release (no MSI needed).
Step 'libclang'
$libclang = $null
foreach ($dir in @($env:LIBCLANG_PATH, "$env:ProgramFiles\LLVM\bin", (Join-Path $vs 'VC\Tools\Llvm\x64\bin'), "$ToolsDir\libclang")) {
  if ($dir -and (Test-Path (Join-Path $dir 'libclang.dll'))) { $libclang = $dir; break }
}
if (-not $libclang) {
  $libclang = "$ToolsDir\libclang"
  New-Item -ItemType Directory -Force $libclang | Out-Null
  $archive = Join-Path $ToolsDir 'llvm.tar.xz'
  $url = "https://github.com/llvm/llvm-project/releases/download/llvmorg-$LlvmVersion/clang+llvm-$LlvmVersion-x86_64-pc-windows-msvc.tar.xz"
  Write-Host "    Downloading LLVM $LlvmVersion (~900 MB, only libclang.dll is kept)..."
  & curl.exe -fL --progress-bar -o $archive $url
  if ($LASTEXITCODE -ne 0) { Fail "Could not download $url" }
  & "$env:SystemRoot\System32\tar.exe" -xJf $archive -C $libclang --strip-components 2 '*/bin/libclang.dll'
  $tarExit = $LASTEXITCODE
  Remove-Item $archive -Force -ErrorAction SilentlyContinue
  if ($tarExit -ne 0 -or -not (Test-Path "$libclang\libclang.dll")) { Fail 'Could not extract libclang.dll.' }
}
$env:LIBCLANG_PATH = $libclang
Ok $libclang

# 6. JS dependencies
Step 'npm dependencies'
Push-Location $Root
try {
  & npm ci
  if ($LASTEXITCODE -ne 0) { Fail 'npm ci failed.' }

  # 7. Build. Without the release signing key, skip updater artifacts (they require it).
  Step 'Building Orbitr (first build takes a few minutes)'
  $tauriArgs = @('tauri', 'build', '--bundles', 'nsis')
  if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
    $cfg = Join-Path $ToolsDir 'no-updater.json'
    New-Item -ItemType Directory -Force $ToolsDir | Out-Null
    Set-Content -Path $cfg -Value '{"bundle":{"createUpdaterArtifacts":false}}' -Encoding ascii
    $tauriArgs += @('--config', $cfg)
  }
  & npx @tauriArgs
  if ($LASTEXITCODE -ne 0) { Fail 'Build failed (see the output above).' }
} finally { Pop-Location }

$installer = Get-ChildItem (Join-Path $Root 'src-tauri\target\release\bundle\nsis') -Filter '*-setup.exe' |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) { Fail 'Installer not found after the build.' }
Ok $installer.FullName

if ($NoInstall) { Write-Host ''; Write-Host 'Done. Installer built (not installed).' -ForegroundColor Green; exit 0 }

# 8. Install for the current user (closes a running Orbitr first so files can be replaced)
Step 'Installing'
Get-Process orbitr -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
$p = Start-Process -FilePath $installer.FullName -ArgumentList '/S' -Wait -PassThru
if ($p.ExitCode -ne 0) { Fail "Installer exited with code $($p.ExitCode)." }
$exe = Join-Path $env:LOCALAPPDATA 'Orbitr Workspace\orbitr.exe'
if (-not (Test-Path $exe)) { Fail "Install finished but $exe is missing." }
Ok $exe

if (-not $NoLaunch) { Start-Process $exe }
Write-Host ''
Write-Host 'Done! Orbitr Workspace is installed (Start menu + desktop shortcut).' -ForegroundColor Green
Write-Host 'To update later: git pull, then run setup.cmd again.'
