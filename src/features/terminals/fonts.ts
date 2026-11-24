import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { isTauri } from "../../lib/platform";

/**
 * Terminal fonts. Nerd Fonts add the icon glyphs (file types, git, powerline) that Neovim
 * plugins and shell prompts use; without one those render as empty boxes.
 *
 * WebKit (the macOS webview) hides user-installed fonts from web content, so a family name
 * alone isn't enough there: the native side finds the font files and we register their
 * bytes with the FontFace API. In a plain browser we fall back to canvas detection.
 */
interface NerdFont {
  family: string;
  regular: string;
  bold: string | null;
}

const PREFERRED = ["JetBrainsMono Nerd Font Mono", "FiraCode Nerd Font Mono", "Hack Nerd Font Mono", "MesloLGS Nerd Font Mono", "CaskaydiaCove Nerd Font Mono"];
const BUNDLED = '"JetBrains Mono"';
const GENERIC = "ui-monospace, Menlo, Consolas, monospace";

export const useFonts = create<{ nerd: NerdFont[]; loaded: string[]; ready: boolean }>()(() => ({ nerd: [], loaded: [], ready: false }));

function isFontInstalled(family: string): boolean {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  const width = (font: string) => {
    ctx.font = `48px ${font}`;
    return ctx.measureText("mmmmmmmmmmlli10OQ@#").width;
  };
  return ["monospace", "serif"].some((fb) => width(`"${family}", ${fb}`) !== width(fb));
}

/** Installed Nerd Font families, Mono variants first. */
export const installedNerdFonts = () => useFonts.getState().nerd.map((f) => f.family);

function pick(choice: string): string | undefined {
  const names = installedNerdFonts();
  if (choice !== "auto") return choice;
  return PREFERRED.find((p) => names.includes(p)) ?? names.find((n) => n.endsWith("Mono")) ?? names[0];
}

/** CSS font-family for terminals: chosen/auto Nerd Font, a Nerd fallback, then bundled JetBrains Mono. */
export function terminalFontFamily(choice: string): string {
  const primary = pick(choice);
  const fallback = choice !== "auto" ? pick("auto") : undefined;
  return [primary && `"${primary}"`, fallback && fallback !== primary && `"${fallback}"`, BUNDLED, GENERIC].filter(Boolean).join(", ");
}

async function register(font: NerdFont) {
  if (useFonts.getState().loaded.includes(font.family)) return;
  const faces = [
    [font.regular, "400"],
    ...(font.bold ? [[font.bold, "700"]] : []),
  ] as const;
  await Promise.all(
    faces.map(async ([path, weight]) => {
      const bytes = await invoke<ArrayBuffer>("read_font", { path });
      const face = new FontFace(font.family, bytes, { weight });
      document.fonts.add(await face.load());
    }),
  );
  useFonts.setState((s) => ({ loaded: [...s.loaded, font.family] }));
}

/** Loads the chosen (and fallback) Nerd Font so terminals can render icons. */
export async function ensureTerminalFont(choice: string) {
  if (!isTauri) return;
  const { nerd } = useFonts.getState();
  const wanted = [pick(choice), pick("auto")].filter((f, i, a): f is string => !!f && a.indexOf(f) === i);
  for (const family of wanted) {
    const font = nerd.find((f) => f.family === family);
    if (font) await register(font).catch((e) => console.error(`Failed to load ${family}`, e));
  }
}

/** Discover fonts once at startup. */
export async function initFonts(choice: string) {
  if (isTauri) {
    const nerd = await invoke<NerdFont[]>("nerd_fonts").catch(() => []);
    useFonts.setState({ nerd });
    await ensureTerminalFont(choice);
  } else {
    const nerd = PREFERRED.filter(isFontInstalled).map((family) => ({ family, regular: "", bold: null }));
    useFonts.setState({ nerd });
  }
  useFonts.setState({ ready: true });
}
