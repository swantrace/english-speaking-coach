import type { KnowledgeItem, KnowledgeItemReviewStatus, KnowledgeItemSource } from "@english-coach/contract";
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
import type { useKnowledgeItemsList } from "../../lib/app-data";
import { ellipsize, formatTimestamp, humanizeLabel } from "../../lib/app-data";
import { Card, PageState } from "../../lib/app-shell";
import type { AdminKnowledgeQueryState } from "./admin-knowledge-query-state";
import { getReviewBadgeClassName, getSourceBadgeClassName } from "./admin-knowledge-types";

export function AdminKnowledgeManageTab({
  isDeletePending,
  isReviewStatusPending,
  isSavePending,
  items,
  onDelete,
  onOpenCreate,
  onOpenEdit,
  onReviewStatusChange,
  queryState,
}: {
  isDeletePending: boolean;
  isReviewStatusPending: boolean;
  isSavePending: boolean;
  items: ReturnType<typeof useKnowledgeItemsList>;
  onDelete: (item: KnowledgeItem) => void;
  onOpenCreate: () => void;
  onOpenEdit: (item: KnowledgeItem) => void;
  onReviewStatusChange: (knowledgeItemId: string, reviewStatus: KnowledgeItemReviewStatus) => void;
  queryState: AdminKnowledgeQueryState;
}) {
  const columns: ColumnDef<KnowledgeItem>[] = [
    {
      accessorKey: "pattern",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="font-medium text-slate-900">{row.original.pattern}</span>
          <span className="text-xs leading-6 text-slate-500">
            {ellipsize(row.original.example ?? "No example", 120)}
          </span>
        </div>
      ),
      header: "Pattern",
    },
    {
      accessorKey: "source",
      cell: ({ row }) => (
        <Badge className={getSourceBadgeClassName(row.original.source)} variant="outline">
          {humanizeLabel(row.original.source)}
        </Badge>
      ),
      header: "Source",
    },
    {
      accessorKey: "reviewStatus",
      cell: ({ row }) => (
        <Badge className={getReviewBadgeClassName(row.original.reviewStatus)} variant="outline">
          {humanizeLabel(row.original.reviewStatus)}
        </Badge>
      ),
      header: "Status",
    },
    {
      accessorFn: (row) =>
        [row.syntaxRole, row.fixednessLevel, row.communicativeFunction]
          .filter(Boolean)
          .map((value) => humanizeLabel(value))
          .join(" · "),
      enableSorting: false,
      header: "Classification",
      id: "classification",
    },
    {
      accessorKey: "updatedAt",
      cell: ({ row }) => <span className="text-sm text-slate-600">{formatTimestamp(row.original.updatedAt)}</span>,
      header: "Updated",
    },
    {
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
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
  const totalPages = Math.max(items.data?.totalPages ?? 0, 1);

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <h2 className="text-2xl text-slate-950">Knowledge catalog</h2>
          <p className="text-sm leading-7 text-slate-600">
            Search, filter, review, and edit approved or pending knowledge items from the same table workflow.
          </p>
        </div>
        <Button onClick={onOpenCreate}>Add knowledge item</Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem]">
        <div className="grid gap-2 text-sm text-slate-700">
          <span>Source</span>
          <Select
            onValueChange={(value: string) =>
              queryState.setSource(value === "all" ? undefined : (value as KnowledgeItemSource))
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
              queryState.setReviewStatus(value === "all" ? undefined : (value as KnowledgeItemReviewStatus))
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
            Generated items keep their source after approval. Review status, not source, controls moderation.
          </div>
        </div>
      </div>

      {items.error ? <PageState description={items.error.message} title="Could not load knowledge items" /> : null}
      {!items.error ? (
        <DataTable
          columns={columns}
          data={items.data?.items ?? []}
          globalFilter={queryState.search ?? ""}
          isPending={items.isPending || isSavePending || isDeletePending}
          onGlobalFilterChange={queryState.setSearch}
          onSortingChange={(nextSorting: SortingState) => {
            const nextColumn = nextSorting[0];

            if (!nextColumn) {
              return;
            }

            if (
              nextColumn.id === "createdAt" ||
              nextColumn.id === "pattern" ||
              nextColumn.id === "reviewStatus" ||
              nextColumn.id === "source" ||
              nextColumn.id === "updatedAt"
            ) {
              queryState.setSort(nextColumn.id, nextColumn.desc ? "desc" : "asc");
            }
          }}
          paginationMeta={{
            limit: items.data?.pageSize ?? queryState.pageSize,
            onLimitChange: queryState.setPageSize,
            onPageChange: queryState.setPage,
            page: items.data?.page ?? queryState.page,
            pages: totalPages,
            total: items.data?.total ?? 0,
          }}
          searchPlaceholder="Search by pattern or example"
          sorting={sorting}
        />
      ) : null}
    </Card>
  );
}
