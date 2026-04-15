import { Badge } from "@english-coach/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { includesSelectedValues } from "@/components/data-table/filter-fns";
import { ReviewStatusBadge } from "@/components/status/review-status-badge";
import type { AdminScenarioListItemView } from "../types";
import { AdminScenarioActions } from "./admin-scenario-actions";

export function createAdminScenarioColumns(): ColumnDef<AdminScenarioListItemView>[] {
  const multiValueFilter = includesSelectedValues<AdminScenarioListItemView>();

  return [
    {
      accessorKey: "title",
      header: "Scenario title",
      cell: ({ row }) => (
        <div className="max-w-[22rem] space-y-1">
          <p className="truncate font-medium text-slate-950">{row.original.title}</p>
          <p className="text-sm text-slate-500">Updated {row.original.updatedAtLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: "settingPreview",
      header: "Setting",
      cell: ({ row }) => (
        <p className="line-clamp-2 max-w-xl text-sm leading-6 text-slate-700">{row.original.settingPreview}</p>
      ),
    },
    {
      accessorKey: "tags",
      filterFn: multiValueFilter,
      header: "Tags",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.tags.length > 0 ? (
            row.original.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-slate-400">No tags</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "reviewStatus",
      filterFn: multiValueFilter,
      header: "Review status",
      cell: ({ row }) => <ReviewStatusBadge isPendingReview={row.original.isPendingReview} />,
    },
    {
      accessorKey: "updatedAt",
      header: "Last updated",
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.updatedAtLabel}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <AdminScenarioActions scenario={row.original} />
        </div>
      ),
    },
  ];
}
