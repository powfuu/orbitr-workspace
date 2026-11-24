import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "../../stores/persist";
import { uid } from "../../lib/id";

export interface Snippet {
  id: string;
  name: string;
  /** Text sent to the session; `{{name}}` placeholders are asked for when used. */
  text: string;
  /** Press Enter after typing it. */
  submit: boolean;
}

const STARTERS: Omit<Snippet, "id">[] = [
  { name: "Review tests", text: "Run the test suite, fix any failing tests, and summarise what you changed.", submit: true },
  { name: "Conventional commit", text: "Review the staged changes and commit them with a concise Conventional Commits message.", submit: true },
  { name: "Explain file", text: "Explain what {{file}} does, its main responsibilities and anything risky in it.", submit: true },
  { name: "Plan first", text: "Before writing code, propose a short plan for: {{task}}. Wait for my OK.", submit: true },
];

interface SnippetState {
  snippets: Snippet[];
  save: (s: Omit<Snippet, "id"> & { id?: string }) => void;
  remove: (id: string) => void;
}

export const useSnippets = create<SnippetState>()(
  persist(
    (set) => ({
      snippets: STARTERS.map((s) => ({ ...s, id: uid() })),
      save: (s) =>
        set((st) => {
          if (s.id && st.snippets.some((x) => x.id === s.id)) return { snippets: st.snippets.map((x) => (x.id === s.id ? { ...x, ...s, id: x.id } : x)) };
          return { snippets: [...st.snippets, { ...s, id: uid() }] };
        }),
      remove: (id) => set((st) => ({ snippets: st.snippets.filter((x) => x.id !== id) })),
    }),
    { ...persistOptions, name: "orbitr.snippets" },
  ),
);
