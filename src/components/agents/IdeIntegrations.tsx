import { ExternalLink, Play } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AGENTS } from "../../features/agents/registry";
import { NVIM_CONFIGS, installConfigCommand } from "../../features/editors/nvimConfigs";
import { useSettings } from "../../stores/settingsStore";
import { cn } from "../../lib/cn";
import { newDefaultTerminal } from "../../features/terminals/newDefaultTerminal";
import { AgentIntegrations } from "./AgentIntegrations";
import { IconButton } from "../ui/IconButton";


export function IdeIntegrations() {
  const nvim = AGENTS.nvim;
  const active = useSettings((s) => s.nvimConfig);
  const set = useSettings((s) => s.set);
  return (
    <div>
      {nvim && <AgentIntegrations title="IDE integrations" list={[nvim]} />}
      <div id="int-configs" className="mb-2 mt-6 scroll-mt-14 term-heading">Neovim configs</div>
      <p className="mb-3 text-[11.5px] text-faint">
        Prefer a ready-made setup over plain Vim? Each one installs into its own <span className="font-mono">~/.config/&lt;name&gt;</span> and runs with{" "}
        <span className="font-mono">NVIM_APPNAME</span>, so your current config stays untouched. ▶ installs it and makes it the one Orbitr opens (switch back in Settings → Vim). Needs Neovim.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-2">
        {NVIM_CONFIGS.map((d) => (
          <div key={d.app} className={cn("flex items-start gap-3 rounded-xl border bg-bg-2 px-3.5 py-3", active === d.app ? "border-success/40" : d.badge ? "border-accent/40" : "border-line-soft")}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[12.5px] text-fg">
                {d.name}
                {d.badge && <span className="rounded-full bg-accent/15 px-1.5 text-[9.5px] uppercase tracking-[0.08em] text-accent">{d.badge}</span>}
                {active === d.app && <span className="rounded-full border border-success/30 bg-success/10 px-1.5 text-[9.5px] uppercase tracking-[0.08em] text-success">in use</span>}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted">{d.blurb}</div>
            </div>
            <div className="flex items-center gap-0.5">
              <IconButton icon={ExternalLink} label="Website" size="sm" onClick={() => void openUrl(d.url)} />
              <IconButton
                icon={Play}
                label={`Install & use ${d.name} (Settings → Vim)`}
                size="sm"
                onClick={() => {
                  set("nvimConfig", d.app);
                  void newDefaultTerminal(undefined, d.name, installConfigCommand(d));
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
