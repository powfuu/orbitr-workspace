import { create } from "zustand";
import { uid } from "../lib/id";

export interface Toast {
  id: string;
  kind: "info" | "success" | "error";
  title: string;
  detail?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const toast = { ...t, id: uid() };
    set((s) => ({ toasts: [...s.toasts.slice(-3), toast] }));
    window.setTimeout(() => get().dismiss(toast.id), t.kind === "error" ? 7000 : 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (t: Omit<Toast, "id">) => useToasts.getState().push(t);
