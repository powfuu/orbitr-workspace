import { create } from "zustand";
import { voiceService } from "../../services/voice";
import { useSettings } from "../../stores/settingsStore";
import { useSessions } from "../../stores/sessionStore";
import { useFocusedSession } from "../../stores/focusStore";
import { getActiveTabs } from "../../stores/tabStore";
import { toast } from "../../stores/toastStore";
import { isTauri } from "../../lib/platform";
import { sendText } from "../sessions/ptySession";
import type { ID } from "../../types";

export type VoicePhase = "off" | "downloading" | "loading" | "listening" | "speaking" | "transcribing" | "needsTarget";

interface VoiceState {
  phase: VoicePhase;
  level: number;
  download: number | null; // 0..1
  lastText: string | null;
  lastTarget: string | null;
  /** Transcript waiting for the user to pick where it goes (nothing was focused). */
  pending: string | null;
  toggle: () => Promise<void>;
  stop: () => Promise<void>;
  sendPendingTo: (id: ID, name: string) => Promise<void>;
  discardPending: () => void;
}

const alive = (s: { status: string }) => s.status === "running";

/** Where speech goes: the last focused live session, else the open agent tab, else the active terminal. */
export function resolveVoiceTarget(): { id: ID; name: string } | null {
  const { agents, terminals, activeTerminalId } = useSessions.getState();
  const all = [...agents, ...terminals].filter(alive);
  const byId = (id: ID | null) => all.find((s) => s.id === id);
  const { tabs, activeTabId } = getActiveTabs();
  const tab = tabs.find((t) => t.id === activeTabId)?.target;
  const s =
    byId(useFocusedSession.getState().id) ??
    (tab?.type === "agent" ? byId(tab.id) : undefined) ??
    byId(activeTerminalId);
  return s ? { id: s.id, name: s.name } : null;
}

let unlisten: (() => void)[] = [];

export const useVoice = create<VoiceState>()((set, get) => ({
  phase: "off",
  level: 0,
  download: null,
  lastText: null,
  lastTarget: null,
  pending: null,

  async toggle() {
    if (get().phase !== "off") return get().stop();
    set({ pending: null });
    if (!isTauri) return toast({ kind: "info", title: "Voice input needs the desktop app" });
    try {
      const status = await voiceService.modelStatus();
      if (!status.ready) {
        set({ phase: "downloading", download: 0 });
        toast({ kind: "info", title: "Downloading speech model", detail: "One-time ~148 MB download. Runs fully on this device." });
        const off = await voiceService.onDownload((p) => set({ download: p.total ? p.downloaded / p.total : null }));
        try {
          await voiceService.downloadModel();
        } finally {
          off();
        }
        set({ download: null });
      }
      set({ phase: "loading" });
      unlisten = await Promise.all([
        voiceService.onLevel((level) => set({ level })),
        voiceService.onEvent((e) => {
          if (e.state === "transcript") return void deliver(e.text);
          if (e.state === "error") return toast({ kind: "error", title: "Voice input error", detail: e.message });
          set({ phase: e.state });
        }),
      ]);
      await voiceService.start(useSettings.getState().voiceLanguage);
      if (get().phase === "loading") set({ phase: "listening" });
    } catch (err) {
      await get().stop();
      toast({ kind: "error", title: "Couldn't start voice input", detail: String(err) });
    }
  },

  async stop() {
    await releaseMic();
    set({ phase: "off", level: 0, download: null, pending: null });
  },

  async sendPendingTo(id, name) {
    const text = get().pending;
    if (!text) return;
    set({ pending: null });
    await send({ id, name }, text);
    set({ phase: "off" });
  },

  discardPending: () => set({ pending: null, phase: "off" }),
}));

async function releaseMic() {
  unlisten.forEach((u) => u());
  unlisten = [];
  useVoice.setState({ level: 0 });
  if (isTauri) await voiceService.stop().catch(() => undefined);
}

async function send(target: { id: ID; name: string }, text: string) {
  useVoice.setState({ lastText: text, lastTarget: target.name });
  const ok = await sendText(target.id, text, useSettings.getState().voiceAutoSubmit);
  if (!ok) toast({ kind: "error", title: `${target.name} is not running`, detail: `“${text}” was not sent.` });
}

/** Dictated text is always lowercase with no periods (Whisper capitalises and punctuates; shells and agents don't want that). */
export const normalizeDictation = (text: string) => text.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();

/** One phrase per activation: send it, then close the mic. */
async function deliver(text: string) {
  text = normalizeDictation(text);
  if (!text) return void useVoice.setState({ phase: "off" });
  await releaseMic();
  const target = resolveVoiceTarget();
  if (!target) {
    // Keep the words; the indicator asks where to send them.
    useVoice.setState({ phase: "needsTarget", pending: text });
    return;
  }
  await send(target, text);
  useVoice.setState({ phase: "off" });
}

// Focusing a session while a phrase is waiting sends it there.
useFocusedSession.subscribe((s) => {
  const { pending, sendPendingTo } = useVoice.getState();
  if (!pending || !s.id) return;
  const target = resolveVoiceTarget();
  if (target) void sendPendingTo(target.id, target.name);
});
