import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Kbd } from "../ui/Kbd";

export function ViewHeader({ eyebrow, title, subtitle, children }: { eyebrow: string; title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-8">
      <div className="min-w-[12rem] flex-1">
        <div className="mb-2 font-mono text-2xs uppercase tracking-[0.14em] text-accent/80">{eyebrow}</div>
        <h1 className="truncate text-[24px] font-semibold uppercase tracking-[0.08em] text-fg">{title}</h1>
        {subtitle && <div className="mt-1.5 text-[13px] text-muted">{subtitle}</div>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

interface ActionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}

export function ActionCard({ icon: Icon, title, description, shortcut, onClick, disabled, badge }: ActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col items-start gap-3 rounded-xl border border-line-soft bg-bg-2 p-4 text-left transition-all duration-200",
        disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-px hover:border-line hover:bg-surface/70",
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface text-fg-2 ring-1 ring-line transition-colors group-hover:text-accent">
          <Icon size={15} strokeWidth={1.75} />
        </span>
        {shortcut && <Kbd>{shortcut}</Kbd>}
        {badge && <span className="whitespace-nowrap rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-faint">{badge}</span>}
      </div>
      <div>
        <div className="text-[13px] font-medium text-fg">{title}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-muted">{description}</div>
      </div>
    </button>
  );
}

export function Panel({ title, count, children, className }: { title: string; count?: number; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line-soft bg-bg-2", className)}>
      <div className="flex h-10 items-center gap-2 border-b border-line-soft px-4 text-[12px] font-medium text-fg-2">
        {title}
        {count !== undefined && <span className="font-mono text-2xs text-faint">{count}</span>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyLine({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2 text-[12.5px] text-muted">
      <span className="grid h-7 w-7 place-items-center rounded-md border border-dashed border-line text-faint">
        <Icon size={13} />
      </span>
      {children}
    </div>
  );
}
