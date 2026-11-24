import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SerializeAddon } from "@xterm/addon-serialize";
import { SearchAddon } from "@xterm/addon-search";
import { WebglAddon } from "@xterm/addon-webgl";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { openUrl } from "@tauri-apps/plugin-opener";
import { terminalTheme } from "./theme";
import { ensureTerminalFont, terminalFontFamily, useFonts } from "./fonts";
import { useSettings, type Settings } from "../../stores/settingsStore";
import { isTauri } from "../../lib/platform";
import type { ID } from "../../types";

/**
 * Owns xterm.js instances outside React. Each terminal lives in its own DOM node
 * that is moved between containers, so switching tabs or collapsing the panel
 * never loses scrollback or interrupts output.
 */
interface Entry {
  term: Terminal;
  fit: FitAddon;
  serializer: SerializeAddon;
  search: SearchAddon;
  host: HTMLDivElement;
  opened: boolean;
}

const entries = new Map<ID, Entry>();
const fontsReady = document.fonts.load('13px "JetBrains Mono"').catch(() => undefined);

const optionsFrom = (s: Settings) => ({
  fontFamily: terminalFontFamily(s.terminalFont),
  fontSize: s.terminalFontSize,
  cursorStyle: s.cursorStyle,
  cursorBlink: s.cursorBlink,
  scrollback: s.scrollback,
});

/** Re-applies options and redraws every terminal (glyph atlas included). */
function refreshAll() {
  const opts = optionsFrom(useSettings.getState());
  for (const [id, e] of entries) {
    Object.assign(e.term.options, opts);
    e.term.clearTextureAtlas();
    e.term.refresh(0, e.term.rows - 1);
    terminalRegistry.fit(id);
  }
}

// Settings changes apply live; a newly chosen font is loaded first.
useSettings.subscribe((s, prev) => {
  if (s.terminalFont !== prev.terminalFont) void ensureTerminalFont(s.terminalFont).then(refreshAll);
  else refreshAll();
});
// Fonts arrive asynchronously at startup (read from disk): redraw once they're registered.
useFonts.subscribe((s, prev) => {
  if (s.loaded !== prev.loaded || s.ready !== prev.ready) refreshAll();
});

/** GPU renderer; falls back to the DOM renderer if WebGL is unavailable or the context is lost. */
function loadWebgl(term: Terminal) {
  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => webgl.dispose());
    term.loadAddon(webgl);
  } catch {
    /* DOM renderer */
  }
}

export const terminalRegistry = {
  create(id: ID): Terminal {
    const term = new Terminal({
      lineHeight: 1.25,
      macOptionIsMeta: true,
      allowProposedApi: true,
      theme: terminalTheme,
      ...optionsFrom(useSettings.getState()),
    });
    const fit = new FitAddon();
    const serializer = new SerializeAddon();
    term.loadAddon(fit);
    term.loadAddon(serializer);
    const search = new SearchAddon();
    term.loadAddon(search);
    // Cmd/Ctrl+click opens http(s) links in the system browser.
    term.loadAddon(
      new WebLinksAddon((e, uri) => {
        if ((e.metaKey || e.ctrlKey) && /^https?:\/\//i.test(uri) && isTauri) void openUrl(uri);
      }),
    );
    const host = document.createElement("div");
    host.className = "h-full w-full";
    entries.set(id, { term, fit, serializer, search, host, opened: false });
    return term;
  },

  get: (id: ID) => entries.get(id)?.term,

  async attach(id: ID, container: HTMLElement) {
    // The view can mount before the PTY spawn creates the instance: create it here so the
    // spawn (which reuses existing entries) writes into the terminal that is on screen.
    if (!entries.has(id)) this.create(id);
    const e = entries.get(id)!;
    container.appendChild(e.host);
    if (!e.opened) {
      await fontsReady;
      e.term.open(e.host);
      loadWebgl(e.term);
      e.opened = true;
    }
    this.fit(id);
    e.term.refresh(0, e.term.rows - 1);
  },

  detach(id: ID) {
    entries.get(id)?.host.remove();
  },

  fit(id: ID) {
    const e = entries.get(id);
    if (!e?.opened || !e.host.isConnected || e.host.clientWidth === 0) return;
    try {
      e.fit.fit();
    } catch {
      /* renderer not ready yet */
    }
  },

  /** Screen + scrollback as ANSI, for restoring after restart. */
  serialize: (id: ID, lines = 1000) => entries.get(id)?.serializer.serialize({ scrollback: lines }),

  /** Search addon of a terminal (find next/previous, match decorations). */
  search: (id: ID) => entries.get(id)?.search,

  focus: (id: ID) => entries.get(id)?.term.focus(),

  dispose(id: ID) {
    const e = entries.get(id);
    if (!e) return;
    e.term.dispose();
    e.host.remove();
    entries.delete(id);
  },
};
