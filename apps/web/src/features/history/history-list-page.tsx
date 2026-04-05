import type { HistorySummary } from "@english-coach/contract";
import { Button, DataTable, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@english-coach/ui";
import { useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { formatTimestamp, sessionToneMap, useHistoryList } from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";
import { useHistoryListQueryState } from "./history-query-state";

export function HistoryListPage() {
  const queryState = useHistoryListQueryState();
  const navigate = useNavigate();
  const history = useHistoryList(queryState.query);
  const sorting: SortingState = [{ desc: queryState.sortDirection === "desc", id: queryState.sortBy }];
  const totalPages = Math.max(history.data?.totalPages ?? 0, 1);

  const columns: ColumnDef<HistorySummary>[] = [
    {
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="grid gap-1">
          <span className="text-base font-medium text-white">{row.original.title}</span>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{row.original.id}</span>
        </div>
      ),
      header: "Session",
    },
    {
      accessorKey: "sessionType",
      cell: ({ row }) => (
        <span
          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${sessionToneMap[row.original.sessionType]}`}
        >
          {row.original.sessionType}
        </span>
      ),
      enableSorting: false,
      header: "Mode",
    },
    {
      accessorKey: "startedAt",
      cell: ({ row }) => <span className="text-slate-300">{formatTimestamp(row.original.startedAt)}</span>,
      header: "Started",
    },
    {
      accessorKey: "endedAt",
      cell: ({ row }) => <span className="text-slate-300">{formatTimestamp(row.original.endedAt)}</span>,
      header: "Ended",
    },
    {
      accessorKey: "review",
      cell: ({ row }) =>
        row.original.review ? (
          <span className="text-slate-300">Ready</span>
        ) : (
          <span className="inline-block animate-pulse text-slate-300">Generating...</span>
        ),
      enableSorting: false,
      header: "Review",
    },
    {
      accessorKey: "canReopen",
      cell: ({ row }) =>
        row.original.canReopen ? (
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-100">
            Reopenable
          </span>
        ) : (
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Review only</span>
        ),
      enableSorting: false,
      header: () => <div className="text-right">Status</div>,
    },
  ];

  const openSessionDetail = (sessionId: string) => {
    void navigate({ params: { sessionId }, search: { tab: "review" }, to: "/history/$sessionId" });
  };

  return (
    <AuthGate>
      <div className="grid gap-8">
        <PageIntro
          badge="History"
          description="Only ended sessions appear here. Role-play stays review-only. Free-form sessions can be launched again from the detail page when their context is available."
          title="Review what you practised, what the agent modelled, and where your errors cluster."
        />

        <Card className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem]">
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Mode</span>
              <Select
                onValueChange={(value: string) =>
                  queryState.setSessionType(value === "all" ? undefined : (value as typeof queryState.sessionType))
                }
                value={queryState.sessionType ?? "all"}
              >
                <SelectTrigger className="border-white/10 bg-slate-950/60 text-slate-50">
                  <SelectValue placeholder="All modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modes</SelectItem>
                  <SelectItem value="role-play">Role-play</SelectItem>
                  <SelectItem value="free-form">Free-form</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>History behavior</span>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-6 text-slate-400">
                Use the search bar and sortable headers in the DataTable below. Selecting a row opens the session detail
                view.
              </div>
            </div>
          </div>
        </Card>

        {history.isPending ? <LoadingPanel label="Loading session history..." /> : null}
        {history.error ? (
          <PageState description={history.error.message} title="Could not load session history" />
        ) : null}
        {!history.isPending && !history.error && (history.data?.items.length ?? 0) === 0 ? (
          <PageState description="No ended sessions exist yet." title="No history yet" />
        ) : null}

        {history.data?.items.length ? (
          <Card className="grid gap-5 overflow-hidden">
            <DataTable
              columns={columns}
              data={history.data.items}
              getRowAriaLabel={(row) => `Open session ${row.title}`}
              getRowClassName={() => "cursor-pointer border-white/10 hover:bg-white/[0.04] focus-visible:outline-none"}
              globalFilter={queryState.searchInput}
              isPending={history.isPending}
              onGlobalFilterChange={queryState.setSearchInput}
              onRowClick={(row) => openSessionDetail(row.id)}
              onSortingChange={(nextSorting: SortingState) => {
                const nextColumn = nextSorting[0];

                if (!nextColumn) {
                  return;
                }

                if (nextColumn.id === "startedAt" || nextColumn.id === "endedAt" || nextColumn.id === "title") {
                  queryState.setSortBy(nextColumn.id);
                  queryState.setSortDirection(nextColumn.desc ? "desc" : "asc");
                }
              }}
              paginationMeta={{
                limit: history.data.pageSize,
                onLimitChange: queryState.setPageSize,
                onPageChange: queryState.setPage,
                page: history.data.page,
                pages: totalPages,
                total: history.data.total,
              }}
              searchPlaceholder="Search title or review"
              sorting={sorting}
            />
          </Card>
        ) : null}
      </div>
    </AuthGate>
  );
}
