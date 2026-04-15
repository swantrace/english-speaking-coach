import { Badge, Checkbox } from "@english-coach/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { ReviewStatusBadge } from "@/components/status/review-status-badge";
import type { AdminScenarioListItemView } from "../types";
import { AdminScenarioActions } from "./admin-scenario-actions";

export function createAdminScenarioColumns(): ColumnDef<AdminScenarioListItemView>[] {
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
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: "Scenario title",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-medium text-slate-950">{row.original.title}</p>
          <p className="text-sm text-slate-500">Updated {row.original.updatedAtLabel}</p>
        </div>
      ),
    },
    {
      accessorKey: "settingPreview",
      header: "Setting",
      cell: ({ row }) => <p className="max-w-xl text-sm leading-6 text-slate-700">{row.original.settingPreview}</p>,
    },
    {
      accessorKey: "tags",
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
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <AdminScenarioActions scenario={row.original} />
        </div>
      ),
    },
  ];
}
