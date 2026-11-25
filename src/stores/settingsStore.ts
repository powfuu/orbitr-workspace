import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "./persist";

export interface Settings {
  /** Theme id (see features/theme/themes.ts) or "system". */
  theme: string;
  /** Themes used by "system" when the OS is in dark / light mode. */
  systemDark: string;
  systemLight: string;
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
  /** NVIM_APPNAME for Neovim (a config in ~/.config/<name>); empty = ~/.config/nvim. */
  nvimConfig: string;
  /** Close an editor tab when the editor quits cleanly (:q). */
  closeEditorOnQuit: boolean;
  /** Warn as Claude plan limits fill up (and when they reset). */
  limitAlerts: boolean;
  /** Percentages that trigger a limit alert. */
  limitThresholds: string;
  /** App-wide Vim mode: Esc → NORMAL (hints, Ctrl+H/L tabs, : palette). */
  vimMode: boolean;
  /** Welcome tour finished or skipped. */
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "midnight",
  systemDark: "midnight",
  systemLight: "paper",
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
  nvimConfig: "",
  limitAlerts: true,
  limitThresholds: "80,95",
  vimMode: false,
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
