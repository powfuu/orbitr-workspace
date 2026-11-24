import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type VoiceEvent =
  | { state: "listening" | "speaking" | "transcribing" }
  | { state: "transcript"; text: string }
  | { state: "error"; message: string };

export const voiceService = {
  modelStatus: () => invoke<{ ready: boolean; path: string }>("voice_model_status"),
  downloadModel: () => invoke<{ ready: boolean }>("voice_download_model"),
  start: (language: string) => invoke<void>("voice_start", { language }),
  stop: () => invoke<void>("voice_stop"),
  onEvent: (cb: (e: VoiceEvent) => void) => listen<VoiceEvent>("voice://event", (e) => cb(e.payload)),
  onLevel: (cb: (level: number) => void) => listen<number>("voice://level", (e) => cb(e.payload)),
  onDownload: (cb: (p: { downloaded: number; total: number | null }) => void) =>
    listen<{ downloaded: number; total: number | null }>("voice://download", (e) => cb(e.payload)),
};
