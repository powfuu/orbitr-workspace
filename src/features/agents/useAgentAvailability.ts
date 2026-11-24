import { useEffect } from "react";
import { useAvailability } from "./availabilityStore";

let requested = false;

/** Installed CLI paths by agent kind (null = not installed). Undefined until the first check finishes. */
export function useAgentAvailability(): Record<string, string | null> | undefined {
  const paths = useAvailability((s) => s.paths);
  useEffect(() => {
    if (!requested) {
      requested = true;
      void useAvailability.getState().refresh();
    }
  }, []);
  return Object.keys(paths).length ? paths : undefined;
}
