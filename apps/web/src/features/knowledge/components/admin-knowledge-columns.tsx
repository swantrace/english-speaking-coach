import type { ColumnDef } from "@tanstack/react-table";
import { includesSelectedValues } from "@/components/data-table/filter-fns";
import { ReviewStatusBadge } from "@/components/status/review-status-badge";
import { formatCommunicativeFunction, formatFixednessLevel, formatPatternType } from "@/lib/format";
import type { AdminKnowledgeListItemView } from "../types";
import { AdminKnowledgeActions } from "./admin-knowledge-actions";

export function createAdminKnowledgeColumns(): ColumnDef<AdminKnowledgeListItemView>[] {
  const multiValueFilter = includesSelectedValues<AdminKnowledgeListItemView>();

  return [
    {
      accessorKey: "pattern",
      header: "Pattern",
      cell: ({ row }) => (
        <div className="max-w-[22rem] space-y-1">
          <p className="truncate font-medium text-slate-950">{row.original.pattern}</p>
          <p className="text-sm text-slate-500">Updated {row.original.updatedAtLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: "patternType",
      filterFn: multiValueFilter,
      header: "Pattern type",
      cell: ({ row }) =>
        row.original.patternType ? (
          <span className="text-sm text-slate-700">{formatPatternType(row.original.patternType)}</span>
        ) : (
          <span className="text-sm text-slate-400">Not set</span>
        ),
    },
    {
      accessorKey: "fixednessLevel",
      filterFn: multiValueFilter,
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
      filterFn: multiValueFilter,
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
      filterFn: multiValueFilter,
      header: "Review status",
      cell: ({ row }) => <ReviewStatusBadge isPendingReview={row.original.isPendingReview} />,
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <AdminKnowledgeActions knowledgeItem={row.original} />
        </div>
      ),
    },
  ];
}
