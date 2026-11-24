import { Download, Loader2, RefreshCw } from "lucide-react";
import { updatesConfigured, useUpdates } from "../../features/updates/updateStore";
import { isTauri } from "../../lib/platform";
import { timeAgo } from "../../lib/time";

/** Version, update check and install (Settings → Updates). */
export function UpdatesSection() {
  const { current, status, check, install } = useUpdates();
  const busy = status.kind === "checking" || status.kind === "downloading" || status.kind === "ready";
  const line = !isTauri
    ? "Updates work in the desktop app."
    : !updatesConfigured
      ? "No release repository configured yet (npm run set-release-repo owner/name)."
      : status.kind === "upToDate"
        ? `You're up to date · checked ${timeAgo(status.at)}`
        : status.kind === "available"
          ? `Version ${status.version} is available`
          : status.kind === "downloading"
            ? `Downloading… ${status.total ? Math.round((status.done / status.total) * 100) + "%" : ""}`
            : status.kind === "ready"
              ? "Installed — restarting"
              : status.kind === "error"
                ? `Last check failed: ${status.message}`
                : "Checks automatically at launch and every 6 hours.";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <div className="text-[13px] text-fg">Orbitr <span className="font-mono text-fg-2">v{current}</span></div>
          <div className="mt-0.5 text-[11.5px] text-muted">{line}</div>
        </div>
        {status.kind === "available" ? (
          <button onClick={() => void install()} className="flex h-7 items-center gap-1.5 rounded-md bg-fg px-3 text-[12px] font-medium text-bg hover:bg-fg/85">
            <Download size={12} /> Install & restart
          </button>
        ) : (
          <button
            disabled={!isTauri || !updatesConfigured || busy}
            onClick={() => void check(true)}
            className="flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] text-fg ring-1 ring-line hover:bg-surface disabled:opacity-40"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Check now
          </button>
        )}
      </div>
      {status.kind === "available" && status.notes && (
        <pre className="selectable mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-bg px-3 py-2 font-sans text-[12px] leading-relaxed text-fg-2">{status.notes}</pre>
      )}
      {status.kind === "downloading" && status.total ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-bg">
          <div className="h-full bg-fg transition-[width]" style={{ width: `${(status.done / status.total) * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}
