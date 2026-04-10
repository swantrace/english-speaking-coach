import type { Scenario } from "@english-coach/contract";
import { Button, DataTable } from "@english-coach/ui";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import type { useAdminScenarios } from "../../lib/app-data";
import { ellipsize, formatTimestamp, humanizeLabel } from "../../lib/app-data";
import { Card, PageState } from "../../lib/app-shell";
import type { AdminScenarioQueryState } from "./admin-scenario-query-state";

export function AdminScenarioManageTab({
  isDeletePending,
  isSavePending,
  onDelete,
  onOpenCreate,
  onOpenEdit,
  onPreview,
  queryState,
  scenarios,
}: {
  isDeletePending: boolean;
  isSavePending: boolean;
  onDelete: (scenario: Scenario) => void;
  onOpenCreate: () => void;
  onOpenEdit: (scenario: Scenario) => void;
  onPreview: (scenario: Scenario) => void;
  queryState: AdminScenarioQueryState;
  scenarios: ReturnType<typeof useAdminScenarios>;
}) {
  const columns: ColumnDef<Scenario>[] = [
    {
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="font-medium text-slate-900">{row.original.title}</span>
          <span className="text-xs leading-6 text-slate-500">{ellipsize(row.original.setting, 120)}</span>
        </div>
      ),
      header: "Title",
    },
    // Source/review-status columns are temporarily disabled while scenarios use isPendingReview.
    {
      accessorFn: (row) => row.goals.goals.length,
      enableSorting: false,
      header: "Goals",
      id: "goalCount",
    },
    {
      accessorKey: "updatedAt",
      cell: ({ row }) => <span className="text-sm text-slate-600">{formatTimestamp(row.original.updatedAt)}</span>,
      header: "Updated",
    },
    {
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onPreview(row.original)} size="sm" variant="outline">
            Preview
          </Button>
          <Button onClick={() => onOpenEdit(row.original)} size="sm" variant="outline">
            Edit
          </Button>
          {/* Approval/rejection actions are temporarily disabled while scenarios use isPendingReview. */}
          <Button onClick={() => onDelete(row.original)} size="sm" variant="outline">
            Delete
          </Button>
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
      header: () => <div className="text-right">Actions</div>,
      id: "actions",
    },
  ];
  const sorting: SortingState = [{ desc: queryState.sortDirection === "desc", id: queryState.sortBy }];
  const totalPages = Math.max(scenarios.data?.totalPages ?? 0, 1);

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <h2 className="text-2xl text-slate-950">Scenario catalog</h2>
          <p className="text-sm leading-7 text-slate-600">
            Search, filter, review, and edit scenarios without leaving the table workflow.
          </p>
        </div>
        <Button onClick={onOpenCreate}>Add scenario</Button>
      </div>

      {/* Source/review filters are temporarily disabled while scenarios use isPendingReview. */}

      {scenarios.error ? <PageState description={scenarios.error.message} title="Could not load scenarios" /> : null}
      {!scenarios.error ? (
        <DataTable
          columns={columns}
          data={scenarios.data?.items ?? []}
          globalFilter={queryState.search ?? ""}
          isPending={scenarios.isPending || isSavePending || isDeletePending}
          onGlobalFilterChange={queryState.setSearch}
          onSortingChange={(nextSorting: SortingState) => {
            const nextColumn = nextSorting[0];

            if (!nextColumn) {
              return;
            }

            if (nextColumn.id === "createdAt" || nextColumn.id === "title" || nextColumn.id === "updatedAt") {
              queryState.setSort(nextColumn.id, nextColumn.desc ? "desc" : "asc");
            }
          }}
          paginationMeta={{
            limit: scenarios.data?.pageSize ?? queryState.pageSize,
            onLimitChange: queryState.setPageSize,
            onPageChange: queryState.setPage,
            page: scenarios.data?.page ?? queryState.page,
            pages: totalPages,
            total: scenarios.data?.total ?? 0,
          }}
          searchPlaceholder="Search by title or setting"
          sorting={sorting}
        />
      ) : null}
    </Card>
  );
}
