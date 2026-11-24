import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { useSettings, type Settings } from "../../stores/settingsStore";
import { useShells } from "../../hooks/useShells";
import { useAvailability } from "../../features/agents/availabilityStore";
import { cn } from "../../lib/cn";
import { modKey } from "../../lib/platform";
import { terminalFontFamily, useFonts } from "../../features/terminals/fonts";
import { ViewHeader } from "../workspace/primitives";
import { UpdatesSection } from "./UpdatesSection";
import { ThemePicker } from "./ThemePicker";
import { Select } from "../ui/Select";
import { SnippetsSection } from "./SnippetsSection";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
      <div className="min-w-[12rem] flex-1">
        <div className="text-[13px] text-fg">{label}</div>
        {hint && <div className="mt-0.5 text-[11.5px] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ k }: { k: "cursorBlink" | "restoreOnLaunch" | "notifications" | "voiceAutoSubmit" | "closeEditorOnQuit" }) {
  const value = useSettings((s) => s[k]);
  const set = useSettings((s) => s.set);
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => set(k, !value)}
      className={cn("relative h-5 w-9 rounded-full transition-colors", value ? "bg-fg" : "bg-surface-2 ring-1 ring-line")}
    >
      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full transition-all", value ? "left-[18px] bg-bg" : "left-0.5 bg-muted")} />
    </button>
  );
}

function Segmented<K extends keyof Settings>({ k, options }: { k: K; options: { value: Settings[K]; label: string }[] }) {
  const value = useSettings((s) => s[k]);
  const set = useSettings((s) => s.set);
  return (
    <div className="flex rounded-lg bg-bg p-0.5 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => set(k, o.value)}
          className={cn("h-6 rounded-md px-2.5 text-[12px]", value === o.value ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section id={`settings-${title.toLowerCase()}`} className="mb-6 scroll-mt-6">
    <div className="mb-2 font-mono text-2xs uppercase tracking-[0.14em] text-faint">{title}</div>
    <div className="divide-y divide-line-soft rounded-xl border border-line-soft bg-bg-2">{children}</div>
  </section>
);

export function SettingsView() {
  const s = useSettings();
  const shells = useShells();
  const refresh = useAvailability((a) => a.refresh);
  const editorPaths = useAvailability((a) => a.paths);
  const nerdFonts = useFonts((f) => f.nerd).map((f) => f.family);
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 @lg:px-10 @lg:py-12">
      <ViewHeader eyebrow="Preferences" title="Settings">
        <button onClick={s.reset} className="flex h-8 items-center gap-2 rounded-lg px-3 text-[12.5px] text-muted ring-1 ring-line hover:text-fg">
          <RotateCcw size={13} /> Reset
        </button>
      </ViewHeader>

      <Section title="Appearance">
        <ThemePicker />
      </Section>

      <Section title="Terminal">
        <Row label="Font size" hint="Applies to all terminals and agents immediately.">
          <div className="flex items-center gap-3">
            <input type="range" min={10} max={18} step={0.5} value={s.terminalFontSize} onChange={(e) => s.set("terminalFontSize", Number(e.target.value))} className="w-32 accent-fg" />
            <span className="w-10 text-right font-mono text-[12px] text-fg-2">{s.terminalFontSize}</span>
          </div>
        </Row>
        <Row label="Font" hint="Nerd Fonts include the icons used by Neovim plugins and shell prompts. Auto picks the first one installed.">
          <div className="flex flex-col items-end gap-1.5">
            <Select
              ariaLabel="Terminal font"
              className="w-64"
              value={s.terminalFont}
              onChange={(v) => s.set("terminalFont", v)}
              options={[
                { value: "auto", label: `Auto — ${nerdFonts.find((f) => f.endsWith("Mono")) ?? nerdFonts[0] ?? "no Nerd Font found"}` },
                ...nerdFonts.map((f) => ({ value: f, label: f, group: f.endsWith("Mono") ? "Monospace (recommended)" : "Other Nerd Fonts" })),
                { value: "JetBrains Mono", label: "JetBrains Mono", hint: "no icons", group: "Built in" },
              ]}
            />
            <span className="rounded bg-term px-2 py-1 text-[13px] text-fg-2" style={{ fontFamily: terminalFontFamily(s.terminalFont) }} title="Preview">
              {"\uf07b \ue718 \ue7a8 \uf418 \uf113 \ue0b0 \uf489 \u{f0219} \uf00c "}main.ts
            </span>
          </div>
        </Row>
        <Row label="Cursor">
          <Segmented k="cursorStyle" options={[{ value: "bar", label: "Bar" }, { value: "block", label: "Block" }, { value: "underline", label: "Line" }]} />
        </Row>
        <Row label="Blinking cursor"><Toggle k="cursorBlink" /></Row>
        <Row label="Scrollback" hint="Lines kept per terminal.">
          <Segmented k="scrollback" options={[{ value: 5000, label: "5k" }, { value: 10000, label: "10k" }, { value: 50000, label: "50k" }]} />
        </Row>
        <Row label="Default shell" hint="Used for new terminals and to launch agents.">
          <Select
            ariaLabel="Default shell"
            className="w-56 font-mono"
            value={s.defaultShell}
            onChange={(v) => s.set("defaultShell", v)}
            options={[{ value: "", label: "System default" }, ...shells.map((sh) => ({ value: sh.path, label: sh.name, hint: sh.path }))]}
          />
        </Row>
      </Section>

      <Section title="Sessions">
        <Row label="Restore sessions on launch" hint="Relaunch shells and agents (continuing their last chat) when Orbitr opens.">
          <Toggle k="restoreOnLaunch" />
        </Row>
        <Row label="Desktop notifications" hint="When an agent finishes or needs you while Orbitr is in the background.">
          <Toggle k="notifications" />
        </Row>
      </Section>

      <Section title="Voice">
        <Row label="Language" hint="Speech is transcribed on this device with Whisper. Auto-detect handles mixed Spanish/English.">
          <Segmented k="voiceLanguage" options={[{ value: "auto", label: "Auto" }, { value: "es", label: "Español" }, { value: "en", label: "English" }]} />
        </Row>
        <Row label="Send automatically" hint="Press Enter when you stop speaking. Off = text is typed and left as a draft.">
          <Toggle k="voiceAutoSubmit" />
        </Row>
      </Section>

      <Section title="Snippets">
        <SnippetsSection />
      </Section>

      <Section title="Editor">
        <Row label="Vim flavour" hint={`Used by ${modKey}E, ${modKey}P and every “Open in Vim”. Auto picks the first installed of Neovim, Vim, vi.`}>
          <Segmented k="editor" options={[{ value: "auto", label: "Auto" }, { value: "nvim", label: "Neovim" }, { value: "vim", label: "Vim" }, { value: "vi", label: "vi" }]} />
        </Row>
        <Row label="Installed" hint="Detected through your login shell PATH.">
          <span className="flex gap-3 font-mono text-[11px]">
            {(["nvim", "vim", "vi"] as const).map((k) => (
              <span key={k} className={editorPaths[k] ? "text-success" : "text-faint"} title={editorPaths[k] ?? "not installed"}>{k} {editorPaths[k] ? "✓" : "—"}</span>
            ))}
          </span>
        </Row>
        <Row label="Close tab on :q" hint="When the editor quits cleanly, close its tab. Off = keep it with the exit status.">
          <Toggle k="closeEditorOnQuit" />
        </Row>
      </Section>

      <Section title="Updates">
        <UpdatesSection />
      </Section>

      <Section title="Agents">
        <Row label="Re-check installed agents" hint="Scans your login shell PATH again.">
          <button onClick={() => void refresh()} className="h-7 rounded-md px-3 text-[12px] text-fg ring-1 ring-line hover:bg-surface">Re-check</button>
        </Row>
      </Section>
    </div>
  );
}
