import type { ColumnDef } from "@tanstack/react-table";
import { includesSelectedValues } from "@/components/data-table/filter-fns";
import { truncateText } from "@/lib/format";
import { AiRequestStatusBadge } from "./ai-request-status-badge";
import type { AdminAiRequestListItemView } from "./types";

export function createAdminAiRequestColumns(): ColumnDef<AdminAiRequestListItemView>[] {
  const multiValueFilter = includesSelectedValues<AdminAiRequestListItemView>();

  return [
    {
      accessorKey: "operation",
      header: "Operation",
      cell: ({ row }) => (
        <div className="max-w-[16rem] space-y-1">
          <p className="truncate font-mono text-sm text-slate-950">{row.original.operation}</p>
          <p className="truncate font-mono text-xs text-slate-500">{row.original.id}</p>
        </div>
      ),
    },
    {
      accessorKey: "modelLabel",
      header: "Model",
      cell: ({ row }) => (
        <div className="max-w-[15rem] space-y-1">
          <p className="truncate text-sm text-slate-700">{row.original.modelLabel}</p>
          <p className="truncate text-xs text-slate-500">{row.original.providerId}</p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      filterFn: multiValueFilter,
      header: "Status",
      cell: ({ row }) => <AiRequestStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "totalTokens",
      header: "Tokens",
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <p className="text-slate-950">{row.original.tokenLabel}</p>
          <p className="text-xs text-slate-500">
            In {row.original.inputTokens?.toLocaleString() ?? "?"} / Out{" "}
            {row.original.outputTokens?.toLocaleString() ?? "?"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "latencyMs",
      header: "Latency",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.latencyLabel}</span>,
    },
    {
      accessorKey: "startedAt",
      header: "Started",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.startedAtLabel}</span>,
    },
    {
      accessorKey: "submissionId",
      header: "Related",
      cell: ({ row }) => {
        const relatedId =
          row.original.submissionJobId ??
          row.original.submissionId ??
          row.original.sessionHistoryId ??
          row.original.scenarioId ??
          row.original.knowledgeItemId;

        return (
          <span className="block max-w-[14rem] truncate font-mono text-xs text-slate-600">
            {relatedId ? truncateText(relatedId, 36) : "No relation"}
          </span>
        );
      },
    },
  ];
}
