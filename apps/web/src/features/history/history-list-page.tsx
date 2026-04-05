import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@english-coach/ui";
import { useNavigate } from "@tanstack/react-router";
import { formatTimestamp, sessionToneMap, useHistoryList } from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";
import { useHistoryListQueryState } from "./history-query-state";

export function HistoryListPage() {
  const queryState = useHistoryListQueryState();
  const navigate = useNavigate();
  const history = useHistoryList(queryState.query);
  const canGoBack = queryState.page > 1;
  const totalPages = history.data?.totalPages ?? 0;
  const canGoForward = totalPages === 0 ? false : queryState.page < totalPages;

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
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem_10rem]">
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Search history</span>
              <Input
                aria-label="Search session history"
                className="border-white/10 bg-slate-950/60 text-slate-50"
                onChange={(event) => queryState.setSearchInput(event.target.value)}
                placeholder="Search title or review"
                value={queryState.searchInput}
              />
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Mode</span>
              <select
                aria-label="Filter history by mode"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) =>
                  queryState.setSessionType(
                    event.target.value ? (event.target.value as typeof queryState.sessionType) : undefined,
                  )
                }
                value={queryState.sessionType ?? ""}
              >
                <option value="">All modes</option>
                <option value="role-play">Role-play</option>
                <option value="free-form">Free-form</option>
              </select>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Sort by</span>
              <select
                aria-label="Sort history by"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setSortBy(event.target.value as typeof queryState.sortBy)}
                value={queryState.sortBy}
              >
                <option value="startedAt">Started at</option>
                <option value="endedAt">Ended at</option>
                <option value="title">Title</option>
              </select>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Direction</span>
              <select
                aria-label="History sort direction"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setSortDirection(event.target.value as typeof queryState.sortDirection)}
                value={queryState.sortDirection}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Page size</span>
              <select
                aria-label="History page size"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setPageSize(Number(event.target.value))}
                value={String(queryState.pageSize)}
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
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
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-300">Session</TableHead>
                    <TableHead className="text-slate-300">Mode</TableHead>
                    <TableHead className="text-slate-300">Started</TableHead>
                    <TableHead className="text-slate-300">Ended</TableHead>
                    <TableHead className="text-slate-300">Review</TableHead>
                    <TableHead className="text-right text-slate-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.items.map((item) => (
                    <TableRow
                      className="cursor-pointer border-white/10 transition hover:bg-white/[0.04]"
                      key={item.id}
                      onClick={() => openSessionDetail(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openSessionDetail(item.id);
                        }
                      }}
                      tabIndex={0}
                    >
                      <TableCell>
                        <div className="grid gap-1">
                          <span className="text-base font-medium text-white">{item.title}</span>
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${sessionToneMap[item.sessionType]}`}
                        >
                          {item.sessionType}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-300">{formatTimestamp(item.startedAt)}</TableCell>
                      <TableCell className="text-slate-300">{formatTimestamp(item.endedAt)}</TableCell>
                      <TableCell className="text-slate-300">
                        {item.review ? "Ready" : <span className="inline-block animate-pulse">Generating...</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.canReopen ? (
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-100">
                            Reopenable
                          </span>
                        ) : (
                          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Review only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : null}

        {history.data?.items.length ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-300">
            <span>
              Page {queryState.page} of {Math.max(totalPages, 1)} · {history.data.total} sessions
            </span>
            <div className="flex items-center gap-3">
              <Button disabled={!canGoBack} onClick={() => queryState.setPage(queryState.page - 1)} variant="outline">
                Previous
              </Button>
              <Button disabled={!canGoForward} onClick={() => queryState.setPage(queryState.page + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGate>
  );
}
