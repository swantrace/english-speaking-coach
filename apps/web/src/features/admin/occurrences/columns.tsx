import { Badge } from "@english-coach/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { OccurrenceActions } from "./occurrence-actions";
import type { ProposedOccurrenceListItemView } from "./types";

function OccurrenceStatusBadge({ status }: { status: ProposedOccurrenceListItemView["status"] }) {
  const className =
    status === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
      : status === "rejected"
        ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-50"
        : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50";

  return (
    <Badge className={className} variant="outline">
      {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Proposed"}
    </Badge>
  );
}

export function createOccurrenceColumns(): ColumnDef<ProposedOccurrenceListItemView>[] {
  return [
    {
      accessorKey: "proposedPattern",
      header: "Proposed pattern",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-slate-950">{row.original.proposedPattern}</p>
          <p className="text-sm text-slate-500">{row.original.transcriptTurnLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: "transcriptExcerpt",
      header: "Transcript excerpt",
      cell: ({ row }) => <p className="max-w-xl text-sm leading-6 text-slate-700">{row.original.transcriptExcerpt}</p>,
    },
    {
      accessorKey: "sessionReference",
      header: "Session",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-950">{row.original.sessionReference}</p>
          <p className="text-sm text-slate-500">Session #{row.original.sessionHistoryId.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <OccurrenceStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <OccurrenceActions occurrence={row.original} />,
    },
  ];
}
