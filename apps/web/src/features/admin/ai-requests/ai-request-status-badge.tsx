import { Badge, cn } from "@english-coach/ui";
import type { AdminAiRequestStatus } from "./types";

const statusClassNameMap: Record<AdminAiRequestStatus, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50",
  failed: "border-red-200 bg-red-50 text-red-800 hover:bg-red-50",
  started: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-50",
};

const statusLabelMap: Record<AdminAiRequestStatus, string> = {
  completed: "Completed",
  failed: "Failed",
  started: "Started",
};

export function AiRequestStatusBadge({ status }: { status: AdminAiRequestStatus }) {
  return (
    <Badge className={cn(statusClassNameMap[status])} variant="outline">
      {statusLabelMap[status]}
    </Badge>
  );
}
