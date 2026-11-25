import { ExternalLink, Play } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AGENTS } from "../../features/agents/registry";
import { newDefaultTerminal } from "../../features/terminals/newDefaultTerminal";
import { AgentIntegrations } from "./AgentIntegrations";
import { IconButton } from "../ui/IconButton";

/** Ready-made Neovim configs. Each lives in its own NVIM_APPNAME, so your ~/.config/nvim is never touched. */
const DISTROS = [
  { name: "LazyVim", app: "lazyvim", repo: "https://github.com/LazyVim/starter", url: "https://www.lazyvim.org", blurb: "Fast, modern defaults on lazy.nvim. Best starting point." },
  { name: "LunarVim", app: "lunarvim", repo: "https://github.com/LunarVim/LunarVim", url: "https://www.lunarvim.org", blurb: "IDE layer: LSP, formatting and debugging out of the box." },
  { name: "AstroNvim", app: "astronvim", repo: "https://github.com/AstroNvim/template", url: "https://astronvim.com", blurb: "Polished UI with a community plugin catalogue." },
  { name: "NvChad", app: "nvchad", repo: "https://github.com/NvChad/starter", url: "https://nvchad.com", blurb: "Beautiful themes, very fast startup." },
  { name: "SpaceVim", app: "spacevim", repo: "https://github.com/SpaceVim/SpaceVim", url: "https://spacevim.org", blurb: "Spacemacs-style layers and leader-key menus." },
  { name: "kickstart.nvim", app: "kickstart", repo: "https://github.com/nvim-lua/kickstart.nvim", url: "https://github.com/nvim-lua/kickstart.nvim", blurb: "One documented file to learn and build your own." },
];

const tryCommand = (d: (typeof DISTROS)[number]) =>
  `[ -d ~/.config/${d.app} ] || git clone --depth 1 ${d.repo} ~/.config/${d.app}; NVIM_APPNAME=${d.app} nvim`;

export function IdeIntegrations() {
  const nvim = AGENTS.nvim;
  return (
    <div>
      {nvim && <AgentIntegrations title="IDE integrations" list={[nvim]} />}
      <div className="mb-2 mt-6 term-heading">Neovim configs</div>
      <p className="mb-3 text-[11.5px] text-faint">
        Prefer a ready-made setup over plain Vim? Each one installs into its own <span className="font-mono">~/.config/&lt;name&gt;</span> and runs with{" "}
        <span className="font-mono">NVIM_APPNAME</span>, so your current config stays untouched. Needs Neovim.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-2">
        {DISTROS.map((d) => (
          <div key={d.app} className="flex items-start gap-3 rounded-xl border border-line-soft bg-bg-2 px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[12.5px] text-fg">{d.name}</div>
              <div className="mt-0.5 text-[11.5px] text-muted">{d.blurb}</div>
            </div>
            <div className="flex items-center gap-0.5">
              <IconButton icon={ExternalLink} label="Website" size="sm" onClick={() => void openUrl(d.url)} />
              <IconButton icon={Play} label={`Install & open ${d.name}`} size="sm" onClick={() => void newDefaultTerminal(undefined, d.name, tryCommand(d))} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
