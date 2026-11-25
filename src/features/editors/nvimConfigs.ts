import { isWindows } from "../../lib/platform";
import { ENSURE_NEOVIM_PS } from "./windowsNeovim";

/** Ready-made Neovim configs. Each lives in its own NVIM_APPNAME, so your ~/.config/nvim is never touched. */
export interface NvimConfigDef {
  name: string;
  app: string;
  repo: string;
  url: string;
  blurb: string;
  /** Highlight label, e.g. our own config. */
  badge?: string;
  /** Pin plugins to the config's lazy-lock.json on first install (avoids newer, incompatible versions). */
  lazyRestore?: boolean;
}

export const NVIM_CONFIGS: NvimConfigDef[] = [
  { name: "EverVim", app: "evervim", repo: "https://github.com/powfuu/EverVim", url: "https://github.com/powfuu/EverVim", blurb: "NvChad-based setup with Orbitr Dark, IDE keys and a theme picker.", badge: "from the creators of Orbitr", lazyRestore: true },
  { name: "LazyVim", app: "lazyvim", repo: "https://github.com/LazyVim/starter", url: "https://www.lazyvim.org", blurb: "Fast, modern defaults on lazy.nvim. Best starting point." },
  { name: "LunarVim", app: "lunarvim", repo: "https://github.com/LunarVim/LunarVim", url: "https://www.lunarvim.org", blurb: "IDE layer: LSP, formatting and debugging out of the box." },
  { name: "AstroNvim", app: "astronvim", repo: "https://github.com/AstroNvim/template", url: "https://astronvim.com", blurb: "Polished UI with a community plugin catalogue." },
  { name: "NvChad", app: "nvchad", repo: "https://github.com/NvChad/starter", url: "https://nvchad.com", blurb: "Beautiful themes, very fast startup." },
  { name: "SpaceVim", app: "spacevim", repo: "https://github.com/SpaceVim/SpaceVim", url: "https://spacevim.org", blurb: "Spacemacs-style layers and leader-key menus." },
  { name: "kickstart.nvim", app: "kickstart", repo: "https://github.com/nvim-lua/kickstart.nvim", url: "https://github.com/nvim-lua/kickstart.nvim", blurb: "One documented file to learn and build your own." },
];

export type NvimConfig = NvimConfigDef;

/**
 * Clones the config once into Neovim's config folder for that NVIM_APPNAME, then opens Neovim with it.
 * Windows terminals run PowerShell and Neovim reads %LOCALAPPDATA%\<app> there; elsewhere ~/.config/<app>.
 */
export const installConfigCommand = (d: NvimConfig, windows = isWindows) => {
  if (windows) {
    // Plugins are pinned once (marker file), also for a config cloned by an earlier failed attempt.
    const restore = d.lazyRestore
      ? ` if (-not (Test-Path (Join-Path $env:LOCALAPPDATA '${d.app}.orbitr-restored'))) { $env:NVIM_APPNAME = '${d.app}'; nvim --headless '+Lazy! restore' +qa; if ($LASTEXITCODE -eq 0) { New-Item -ItemType File (Join-Path $env:LOCALAPPDATA '${d.app}.orbitr-restored') | Out-Null } };`
      : "";
    return `${ENSURE_NEOVIM_PS}; $d = Join-Path $env:LOCALAPPDATA '${d.app}'; if (-not (Test-Path $d)) { git clone --depth 1 ${d.repo} $d; if ($LASTEXITCODE -ne 0) { return } };${restore} $env:NVIM_APPNAME = '${d.app}'; nvim`;
  }
  const restore = d.lazyRestore ? ` && NVIM_APPNAME=${d.app} nvim --headless "+Lazy! restore" +qa` : "";
  return `[ -d ~/.config/${d.app} ] || { git clone --depth 1 ${d.repo} ~/.config/${d.app}${restore}; }; NVIM_APPNAME=${d.app} nvim`;
};
