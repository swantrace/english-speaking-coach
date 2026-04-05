import type { Scenario, ScenarioReviewStatus, ScenarioSource } from "@english-coach/contract";
import {
  Badge,
  Button,
  DataTable,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@english-coach/ui";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import type { useAdminScenarios } from "../../lib/app-data";
import { ellipsize, formatTimestamp, humanizeLabel } from "../../lib/app-data";
import { Card, PageState } from "../../lib/app-shell";
import type { AdminScenarioQueryState } from "./admin-scenario-query-state";
import { getReviewBadgeClassName, getSourceBadgeClassName } from "./admin-scenario-types";

export function AdminScenarioManageTab({
  isDeletePending,
  isReviewStatusPending,
  isSavePending,
  onDelete,
  onOpenCreate,
  onOpenEdit,
  onPreview,
  onReviewStatusChange,
  queryState,
  scenarios,
}: {
  isDeletePending: boolean;
  isReviewStatusPending: boolean;
  isSavePending: boolean;
  onDelete: (scenario: Scenario) => void;
  onOpenCreate: () => void;
  onOpenEdit: (scenario: Scenario) => void;
  onPreview: (scenario: Scenario) => void;
  onReviewStatusChange: (scenarioId: string, reviewStatus: ScenarioReviewStatus) => void;
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
    {
      accessorKey: "source",
      cell: ({ row }) => (
        <Badge className={getSourceBadgeClassName(row.original.source)} variant="outline">
          {humanizeLabel(row.original.source)}
        </Badge>
      ),
      enableSorting: false,
      header: "Source",
    },
    {
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <Badge className={getReviewBadgeClassName(row.original.reviewStatus)} variant="outline">
          {humanizeLabel(row.original.reviewStatus)}
        </Badge>
      ),
      enableSorting: false,
      header: "Status",
    },
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
          {row.original.reviewStatus !== "approved" ? (
            <Button
              className="border border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200"
              disabled={isReviewStatusPending}
              onClick={() => onReviewStatusChange(row.original.id, "approved")}
              size="sm"
            >
              Approve
            </Button>
          ) : null}
          {row.original.reviewStatus !== "rejected" ? (
            <Button
              disabled={isReviewStatusPending}
              onClick={() => onReviewStatusChange(row.original.id, "rejected")}
              size="sm"
              variant="outline"
            >
              Reject
            </Button>
          ) : null}
          {row.original.reviewStatus !== "pending_review" ? (
            <Button
              disabled={isReviewStatusPending}
              onClick={() => onReviewStatusChange(row.original.id, "pending_review")}
              size="sm"
              variant="outline"
            >
              Requeue
            </Button>
          ) : null}
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

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem]">
        <div className="grid gap-2 text-sm text-slate-700">
          <span>Source</span>
          <Select
            onValueChange={(value: string) =>
              queryState.setSource(value === "all" ? undefined : (value as ScenarioSource))
            }
            value={queryState.source ?? "all"}
          >
            <SelectTrigger className="border-slate-200 bg-white text-slate-900">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="auto_generated">Auto generated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 text-sm text-slate-700">
          <span>Review status</span>
          <Select
            onValueChange={(value: string) =>
              queryState.setReviewStatus(value === "all" ? undefined : (value as ScenarioReviewStatus))
            }
            value={queryState.reviewStatus ?? "all"}
          >
            <SelectTrigger className="border-slate-200 bg-white text-slate-900">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending_review">Pending review</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 text-sm text-slate-700">
          <span>Moderation state</span>
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
            Approved scenarios are learner-visible. Pending and rejected scenarios stay admin-only.
          </div>
        </div>
      </div>

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
