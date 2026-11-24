export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="orbitr-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-fg)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-muted)" }} />
        </linearGradient>
      </defs>
      <ellipse cx="12" cy="12" rx="9.5" ry="4.2" fill="none" stroke="url(#orbitr-g)" strokeWidth="1.6" transform="rotate(-28 12 12)" />
      <circle cx="12" cy="12" r="3.4" fill="url(#orbitr-g)" />
      <circle cx="19.6" cy="7.6" r="1.4" style={{ fill: "var(--color-accent)" }} />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <LogoMark />
      <span className="text-[13.5px] font-semibold uppercase tracking-[0.32em] text-fg">orbitr</span>
    </div>
  );
}
