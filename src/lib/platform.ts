export const isMac = navigator.userAgent.includes("Mac");
export const modKey = isMac ? "⌘" : "Ctrl";

/** True when the platform's primary modifier is held (Cmd on macOS, Ctrl elsewhere). */
export const hasMod = (e: KeyboardEvent | React.KeyboardEvent): boolean =>
  isMac ? e.metaKey : e.ctrlKey;

export const isTauri = "__TAURI_INTERNALS__" in window;

export const basename = (path: string): string =>
  path.split(/[\\/]/).filter(Boolean).pop() ?? path;

export const tildify = (path: string, home?: string): string =>
  home && path.startsWith(home) ? "~" + path.slice(home.length) : path;
