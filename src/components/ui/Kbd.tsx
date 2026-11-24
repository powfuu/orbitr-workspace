import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-line bg-bg-2 px-1 font-mono text-[10px] leading-none text-muted">
      {children}
    </kbd>
  );
}
