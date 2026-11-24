/**
 * Terminal fonts. Nerd Fonts add the icon glyphs (file types, git, powerline) that
 * Neovim plugins and shell prompts use; without one those render as empty boxes.
 * Fonts are the user's installed ones (WebKit/WebView2 can use system fonts).
 */
export const NERD_FONTS = [
  "JetBrainsMono Nerd Font Mono",
  "JetBrainsMono Nerd Font",
  "FiraCode Nerd Font Mono",
  "Hack Nerd Font Mono",
  "MesloLGS Nerd Font Mono",
  "CaskaydiaCove Nerd Font Mono",
  "CaskaydiaMono Nerd Font Mono",
  "SauceCodePro Nerd Font Mono",
  "Iosevka Nerd Font Mono",
  "Symbols Nerd Font Mono",
] as const;

const BUNDLED = '"JetBrains Mono"';
const GENERIC = 'ui-monospace, Menlo, Consolas, monospace';

/** True when a locally installed font with this family name renders. */
export function isFontInstalled(family: string): boolean {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return false;
  const sample = "mmmmmmmmmmlli10OQ@#";
  const width = (font: string) => {
    ctx.font = `48px ${font}`;
    return ctx.measureText(sample).width;
  };
  // Compare against two different fallbacks: a real font changes the width of at least one.
  return ["monospace", "serif"].some((fb) => width(`"${family}", ${fb}`) !== width(fb));
}

let detected: string[] | null = null;
export const installedNerdFonts = () => (detected ??= NERD_FONTS.filter(isFontInstalled));

/**
 * CSS font-family for terminals. "auto" = first installed Nerd Font, then the bundled
 * JetBrains Mono; an explicit choice keeps a Nerd fallback so icons still render.
 */
export function terminalFontFamily(choice: string): string {
  const nerd = installedNerdFonts();
  const primary = choice === "auto" ? nerd[0] : choice;
  const chain = [primary && `"${primary}"`, ...nerd.filter((f) => f !== primary).slice(0, 1).map((f) => `"${f}"`), BUNDLED, GENERIC];
  return chain.filter(Boolean).join(", ");
}
