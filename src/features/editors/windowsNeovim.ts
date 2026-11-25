/**
 * PowerShell that makes sure `nvim` exists on Windows before anything uses it. Installs the
 * official portable build (zip) into %LOCALAPPDATA%\Programs\nvim and adds it to the user PATH:
 * no MSI and no admin rights (winget's MSI fails on machines where Windows Installer is locked down).
 * One line, single quotes only: it is passed to `powershell -Command`.
 */
export const ENSURE_NEOVIM_PS = [
  "if (-not (Get-Command nvim -ErrorAction SilentlyContinue)) {",
  "Write-Host 'Neovim not found, installing it (portable, no admin needed)...' -ForegroundColor Cyan;",
  String.raw`$nvRoot = Join-Path $env:LOCALAPPDATA 'Programs\nvim';`,
  "$nvZip = Join-Path $env:TEMP 'orbitr-nvim-win64.zip';",
  "curl.exe -fL --progress-bar -o $nvZip https://github.com/neovim/neovim/releases/latest/download/nvim-win64.zip;",
  "if ($LASTEXITCODE -ne 0) { Write-Host 'Could not download Neovim.' -ForegroundColor Red; return };",
  "New-Item -ItemType Directory -Force $nvRoot | Out-Null;",
  // Windows' own tar (a Git for Windows tar earlier on PATH cannot read C:\ paths).
  String.raw`& (Join-Path $env:SystemRoot 'System32\tar.exe') -xf $nvZip -C $nvRoot; Remove-Item $nvZip -Force;`,
  String.raw`$nvBin = Join-Path $nvRoot 'nvim-win64\bin';`,
  "$userPath = [Environment]::GetEnvironmentVariable('Path', 'User');",
  "if ((($userPath -split ';') -notcontains $nvBin)) { [Environment]::SetEnvironmentVariable('Path', ((@($userPath, $nvBin) | Where-Object { $_ }) -join ';'), 'User') };",
  "$env:Path = $env:Path + ';' + $nvBin;",
  "if (Get-Command nvim -ErrorAction SilentlyContinue) { Write-Host ('Neovim installed: ' + (nvim --version | Select-Object -First 1)) -ForegroundColor Green }",
  "else { Write-Host 'Neovim could not be installed.' -ForegroundColor Red; return }",
  "}",
].join(" ");
