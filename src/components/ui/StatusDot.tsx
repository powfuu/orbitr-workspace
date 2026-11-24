import type { ProcessStatus } from "../../types";
import { cn } from "../../lib/cn";

const color: Record<ProcessStatus, string> = {
  starting: "bg-warning",
  running: "bg-success",
  exited: "bg-faint",
  failed: "bg-error",
};

export function StatusDot({ status }: { status: ProcessStatus }) {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      {status === "running" && <span className="absolute inset-0 animate-ping rounded-full bg-success/50" />}
      <span className={cn("relative h-1.5 w-1.5 rounded-full", color[status])} />
    </span>
  );
}
