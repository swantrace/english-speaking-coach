import { Checkbox } from "@english-coach/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { ReviewStatusBadge } from "@/components/status/review-status-badge";
import { formatCommunicativeFunction, formatFixednessLevel, formatSyntaxRole } from "@/lib/format";
import type { AdminKnowledgeListItemView } from "../types";
import { AdminKnowledgeActions } from "./admin-knowledge-actions";

export function createAdminKnowledgeColumns(): ColumnDef<AdminKnowledgeListItemView>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() ? "indeterminate" : false)}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
        />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))} />
      ),
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: "pattern",
      header: "Pattern",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-slate-950">{row.original.pattern}</p>
          <p className="text-sm text-slate-500">Updated {row.original.updatedAtLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: "syntaxRole",
      header: "Syntax role",
      cell: ({ row }) =>
        row.original.syntaxRole ? (
          <span className="text-sm text-slate-700">{formatSyntaxRole(row.original.syntaxRole)}</span>
        ) : (
          <span className="text-sm text-slate-400">Not set</span>
        ),
    },
    {
      accessorKey: "fixednessLevel",
      header: "Fixedness level",
      cell: ({ row }) =>
        row.original.fixednessLevel ? (
          <span className="text-sm text-slate-700">{formatFixednessLevel(row.original.fixednessLevel)}</span>
        ) : (
          <span className="text-sm text-slate-400">Not set</span>
        ),
    },
    {
      accessorKey: "communicativeFunction",
      header: "Communicative function",
      cell: ({ row }) =>
        row.original.communicativeFunction ? (
          <span className="text-sm text-slate-700">
            {formatCommunicativeFunction(row.original.communicativeFunction)}
          </span>
        ) : (
          <span className="text-sm text-slate-400">Not set</span>
        ),
    },
    {
      accessorKey: "reviewStatus",
      header: "Review status",
      cell: ({ row }) => <ReviewStatusBadge isPendingReview={row.original.isPendingReview} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <AdminKnowledgeActions knowledgeItem={row.original} />
        </div>
      ),
    },
  ];
}
