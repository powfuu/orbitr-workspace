import { create } from "zustand";

export interface Hint {
  label: string;
  el: HTMLElement;
  x: number;
  y: number;
}

interface VimState {
  mode: "insert" | "normal";
  hints: Hint[] | null;
  typed: string;
  /** NORMAL-mode cursor: the element h/j/k/l moved to; Enter clicks it. */
  cursor: HTMLElement | null;
  set: (p: Partial<Omit<VimState, "set">>) => void;
}

export const useVim = create<VimState>()((set) => ({ mode: "insert", hints: null, typed: "", cursor: null, set }));
