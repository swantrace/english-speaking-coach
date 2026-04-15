import type { submissionJobStatusValues } from "@english-coach/domain";
import { Badge, cn } from "@english-coach/ui";

type SubmissionJobStatus = (typeof submissionJobStatusValues)[number];

interface JobStatusBadgeProps {
  status: SubmissionJobStatus;
}

const statusClassNameMap: Record<SubmissionJobStatus, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
  failed: "border-red-200 bg-red-50 text-red-800 hover:bg-red-50",
  queued: "border-stone-200 bg-stone-100 text-stone-700 hover:bg-stone-100",
  started: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-50",
};

const statusLabelMap: Record<SubmissionJobStatus, string> = {
  completed: "Completed",
  failed: "Failed",
  queued: "Queued",
  started: "Started",
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  return (
    <Badge className={cn(statusClassNameMap[status])} variant="outline">
      {statusLabelMap[status]}
    </Badge>
  );
}
