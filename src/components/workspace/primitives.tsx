import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Kbd } from "../ui/Kbd";

export function ViewHeader({ eyebrow, title, subtitle, children }: { eyebrow: string; title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-8">
      <div className="min-w-[12rem] flex-1">
        <div className="mb-2 font-mono text-[11px] lowercase text-muted"><span className="text-success">❯</span> {eyebrow}</div>
        <h1 className="truncate font-mono text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
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
        <div className="text-[13px] font-medium lowercase text-fg"><span className="text-success">❯</span> {title}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-muted">{description}</div>
      </div>
    </button>
  );
}

export function Panel({ title, count, children, className, id, icon }: { title: string; count?: number; children: ReactNode; className?: string; id?: string; icon?: ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-4 rounded-xl border border-line-soft bg-bg-2", className)}>
      <div className="flex h-10 items-center gap-2 border-b border-line-soft px-4 font-mono text-[12px] text-fg-2">
        {icon ?? <span className="text-faint">#</span>}
        <span className="lowercase">{title}</span>
        {count !== undefined && <span className="text-2xs text-faint">[{count}]</span>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyLine({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-2 font-mono text-[12px] text-muted">
      <Icon size={13} className="shrink-0 text-faint" />
      <span><span className="text-faint"># </span>{children}</span>
    </div>
  );
}
