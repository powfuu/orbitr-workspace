import { createJSONStorage } from "zustand/middleware";
import { appStorage } from "../services/persistence";

/** Shared persist options: file-backed storage, hydrated explicitly before first render. */
export const persistOptions = {
  storage: createJSONStorage(() => appStorage),
  skipHydration: true,
} as const;
