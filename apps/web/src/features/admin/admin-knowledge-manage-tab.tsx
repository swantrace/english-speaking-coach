import type { KnowledgeItem } from "@english-coach/contract";
import { Button, DataTable } from "@english-coach/ui";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import type { useKnowledgeItemsList } from "../../lib/app-data";
import { ellipsize, formatTimestamp, humanizeLabel } from "../../lib/app-data";
import { Card, PageState } from "../../lib/app-shell";
import type { AdminKnowledgeQueryState } from "./admin-knowledge-query-state";

export function AdminKnowledgeManageTab({
  isDeletePending,
  isSavePending,
  items,
  onDelete,
  onOpenCreate,
  onOpenEdit,
  queryState,
}: {
  isDeletePending: boolean;
  isSavePending: boolean;
  items: ReturnType<typeof useKnowledgeItemsList>;
  onDelete: (item: KnowledgeItem) => void;
  onOpenCreate: () => void;
  onOpenEdit: (item: KnowledgeItem) => void;
  queryState: AdminKnowledgeQueryState;
}) {
  const columns: ColumnDef<KnowledgeItem>[] = [
    {
      accessorKey: "pattern",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="font-medium text-slate-900">{row.original.pattern}</span>
        </div>
      ),
      header: "Pattern",
    },
    // Source and review-status columns are temporarily disabled while the knowledge-item schema is simplified.
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
          {/* Review actions are temporarily disabled while the knowledge-item schema is simplified. */}
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

      {/* Source/review filters are temporarily disabled while the knowledge-item schema is simplified. */}

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

            if (nextColumn.id === "createdAt" || nextColumn.id === "pattern" || nextColumn.id === "updatedAt") {
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
          searchPlaceholder="Search by pattern"
          sorting={sorting}
        />
      ) : null}
    </Card>
  );
}
