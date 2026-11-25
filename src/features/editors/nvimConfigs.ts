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

/** Clones the config once into ~/.config/<app>, then opens Neovim with it. */
export const installConfigCommand = (d: NvimConfig) => {
  const restore = d.lazyRestore ? ` && NVIM_APPNAME=${d.app} nvim --headless "+Lazy! restore" +qa` : "";
  return `[ -d ~/.config/${d.app} ] || { git clone --depth 1 ${d.repo} ~/.config/${d.app}${restore}; }; NVIM_APPNAME=${d.app} nvim`;
};
