import type { ColumnDef } from "@tanstack/react-table";
import type { AdminSubmissionListItemView } from "./types";

export function createAdminSubmissionColumns(): ColumnDef<AdminSubmissionListItemView>[] {
  return [
    {
      accessorKey: "id",
      header: "Submission",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-mono text-sm text-slate-950">{row.original.id}</p>
          <p className="text-xs text-slate-500">{row.original.userLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: "kind",
      header: "Kind",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.kindLabel}</span>,
    },
    {
      accessorKey: "totalCount",
      header: "Jobs",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.totalCount.toLocaleString()}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.createdAtLabel}</span>,
    },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.updatedAtLabel}</span>,
    },
  ];
}
