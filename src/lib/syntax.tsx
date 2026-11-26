import type { ReactNode } from "react";

/** One Dark palette for code (diff viewers). */
export const ONE_DARK = {
  // The background follows the app theme (Midnight → black, Ocean → navy…); only the code colours are One Dark.
  bg: "var(--color-term)",
  text: "#abb2bf",
  comment: "#7f848e",
  keyword: "#c678dd",
  string: "#98c379",
  number: "#d19a66",
  tag: "#e06c75",
  attr: "#d19a66",
  fn: "#61afef",
  type: "#e5c07b",
  punct: "#abb2bf",
  addBg: "rgba(152,195,121,0.13)",
  delBg: "rgba(224,108,117,0.13)",
  add: "#98c379",
  del: "#e06c75",
  hunk: "#61afef",
  gutter: "#4b5263",
};

const KEYWORDS = new Set(
  "import export from as default const let var function return if else for while do switch case break continue new class extends implements interface type enum public private protected readonly static async await yield try catch finally throw typeof instanceof in of void delete this super null undefined true false def lambda elif pass with fn pub mut impl struct trait use mod match where self Self".split(" "),
);

// One pass, first match wins: comments, strings, tags, numbers, words, everything else.
const TOKEN = /(\/\/.*$|\/\*.*?\*\/|<!--.*?-->|#(?![0-9a-f]{3,8}\b).*$)|("(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?|`(?:\\.|[^`\\])*`?)|(<\/?[A-Za-z][\w:-]*|\/?>)|(#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|ms|s|vh|vw)?\b)|([A-Za-z_$@][\w$-]*)|(\s+|.)/g;

/** Highlights one line of code (no cross-line state — fine for diff hunks). */
export function highlight(line: string, ext: string): ReactNode[] {
  const isMarkup = /^(html?|xml|svg|vue)$/.test(ext);
  const isStyle = /^(s?css|less|sass)$/.test(ext);
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    const [t, comment, str, tag, num, word] = m;
    if (!t) break;
    let color: string | undefined;
    if (comment && (ext !== "md" || !comment.startsWith("#"))) color = isStyle && comment.startsWith("#") ? undefined : ONE_DARK.comment;
    else if (str) color = ONE_DARK.string;
    else if (tag && isMarkup) color = ONE_DARK.tag;
    else if (num) color = ONE_DARK.number;
    else if (word) {
      const next = line.slice(TOKEN.lastIndex).trimStart();
      if (KEYWORDS.has(word)) color = ONE_DARK.keyword;
      else if (isMarkup && next.startsWith("=")) color = ONE_DARK.attr;
      else if (isStyle && next.startsWith(":")) color = ONE_DARK.tag;
      else if (next.startsWith("(")) color = ONE_DARK.fn;
      else if (/^[A-Z]/.test(word)) color = ONE_DARK.type;
    }
    out.push(color ? <span key={i++} style={{ color }}>{t}</span> : t);
  }
  return out;
}

export const extOf = (path: string) => path.split(".").pop()?.toLowerCase() ?? "";
