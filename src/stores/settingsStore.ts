import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "./persist";

export interface Settings {
  /** Theme id (see features/theme/themes.ts) or "system". */
  theme: string;
  terminalFontSize: number;
  /** "auto" (first installed Nerd Font) or a font family name. */
  terminalFont: string;
  cursorStyle: "bar" | "block" | "underline";
  cursorBlink: boolean;
  scrollback: number;
  /** Shell path for new terminals; empty = system default. */
  defaultShell: string;
  restoreOnLaunch: boolean;
  notifications: boolean;
  /** Whisper language: "auto", "es", "en"… */
  voiceLanguage: string;
  /** Press Enter automatically after each spoken phrase. */
  voiceAutoSubmit: boolean;
  /** Preferred terminal editor; "auto" = first installed of nvim, vim, vi. */
  editor: "auto" | "nvim" | "vim" | "vi";
  /** Close an editor tab when the editor quits cleanly (:q). */
  closeEditorOnQuit: boolean;
  /** Welcome tour finished or skipped. */
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "midnight",
  terminalFontSize: 12.5,
  terminalFont: "auto",
  cursorStyle: "bar",
  cursorBlink: true,
  scrollback: 10_000,
  defaultShell: "",
  restoreOnLaunch: true,
  notifications: true,
  voiceLanguage: "auto",
  voiceAutoSubmit: true,
  editor: "auto",
  closeEditorOnQuit: true,
  onboarded: false,
};

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { ...persistOptions, name: "orbitr.settings" },
  ),
);
