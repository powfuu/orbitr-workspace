/** Lines typed + Enter in a session, so the timeline can follow the right transcript. */
type Listener = (sessionId: string, text: string) => void;
const listeners = new Set<Listener>();
export const onPromptSubmitted = (fn: Listener) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
export const emitPromptSubmitted = (sessionId: string, text: string) => listeners.forEach((fn) => fn(sessionId, text));
