import type { ColumnDef } from "@tanstack/react-table";
import { JobStatusBadge } from "@/components/status/job-status-badge";
import { truncateText } from "@/lib/format";
import type { AdminJobListItemView } from "./types";

export function createAdminJobColumns(): ColumnDef<AdminJobListItemView>[] {
  return [
    {
      accessorKey: "jobId",
      header: "Job",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-mono text-sm text-slate-950">{row.original.jobId}</p>
          <p className="text-xs text-slate-500">{row.original.kindLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: "kind",
      header: "Kind",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.kindLabel}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "progress",
      header: "Progress",
      cell: ({ row }) => (
        <div className="min-w-28">
          <p className="text-sm text-slate-700">{row.original.progressLabel}</p>
          <div className="mt-2 h-2 rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-[width] duration-300"
              style={{ width: `${Math.max(4, row.original.progress)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      accessorKey: "message",
      header: "Message",
      cell: ({ row }) => (
        <span className="block max-w-sm text-sm leading-6 text-slate-600">
          {row.original.message ? truncateText(row.original.message, 96) : "No message"}
        </span>
      ),
    },
    {
      accessorKey: "queuedAt",
      header: "Queued",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.queuedAtLabel}</span>,
    },
    {
      accessorKey: "processedAt",
      header: "Processed",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.processedAtLabel}</span>,
    },
  ];
}
