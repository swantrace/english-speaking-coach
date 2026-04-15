import { cn } from "@english-coach/ui";
import { JobStatusBadge } from "@/components/status/job-status-badge";
import type { AdminJobStatus } from "./types";

interface JobStatusChipProps {
  status: AdminJobStatus;
  progress: number;
  progressLabel: string;
}

export function JobStatusChip({ status, progress, progressLabel }: JobStatusChipProps) {
  return (
    <div className="min-w-32 space-y-2">
      <JobStatusBadge status={status} />
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>Progress</span>
          <span>{progressLabel}</span>
        </div>
        <div className="h-2 rounded-full bg-stone-100">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              status === "failed"
                ? "bg-red-400"
                : status === "completed"
                  ? "bg-emerald-500"
                  : status === "started"
                    ? "bg-sky-500"
                    : "bg-stone-400",
            )}
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
