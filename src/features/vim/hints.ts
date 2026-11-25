import type { Hint } from "./vimStore";

const SELECTOR =
  'a[href], button, input, textarea, select, [role="button"], [role="tab"], [role="switch"], [role="option"], [role="menuitem"], [tabindex]:not([tabindex="-1"]), .xterm';
const CHARS = "asdfghjklqwertyuiopzxcvbnm";

/** Every visible, uncovered clickable element, labelled like Vimium. */
export function collectHints(): Hint[] {
  const els = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter((el) => {
    if (el.closest(".xterm") && !el.classList.contains("xterm")) return false;
    if ((el as HTMLButtonElement).disabled) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false;
    const top = document.elementFromPoint(r.left + Math.min(r.width / 2, 12), r.top + r.height / 2);
    return !!top && (el === top || el.contains(top) || top.contains(el));
  });
  const two = els.length > CHARS.length;
  return els.map((el, i) => {
    const r = el.getBoundingClientRect();
    const at = (n: number) => CHARS.charAt(n % CHARS.length);
    const label = two ? at(Math.floor(i / CHARS.length)) + at(i) : at(i);
    return { el, label, x: Math.max(0, r.left), y: Math.max(0, r.top) };
  });
}

export function activate(el: HTMLElement) {
  if (el.classList.contains("xterm")) return el.querySelector<HTMLElement>("textarea")?.focus();
  if (el.matches("input, textarea, select")) return el.focus();
  el.focus({ preventScroll: true });
  el.click();
}
