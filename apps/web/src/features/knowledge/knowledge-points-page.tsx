import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@english-coach/ui";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatTimestamp, humanizeLabel, useKnowledgePointDetail, useKnowledgePoints } from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";

function useKnowledgePointsQueryState() {
  const currentSearch = useSearch({ from: "/knowledge-points" });
  const navigate = useNavigate({ from: "/knowledge-points" });
  const [searchInput, setSearchInput] = useState(currentSearch.search ?? "");

  useEffect(() => {
    setSearchInput(currentSearch.search ?? "");
  }, [currentSearch.search]);

  useEffect(() => {
    const nextSearch = searchInput.trim() || undefined;

    if (nextSearch === currentSearch.search) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void navigate({
        replace: true,
        search: (previous) => ({ ...previous, page: 1, search: nextSearch }),
        to: "/knowledge-points",
      });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentSearch.search, navigate, searchInput]);

  return {
    ...currentSearch,
    query: {
      page: currentSearch.page,
      pageSize: currentSearch.pageSize,
      search: currentSearch.search,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
    },
    searchInput,
    setPage: (page: number) =>
      void navigate({ search: (previous) => ({ ...previous, page }), to: "/knowledge-points" }),
    setPageSize: (pageSize: number) =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, pageSize }), to: "/knowledge-points" }),
    setSearchInput,
    setSortBy: (sortBy: "lastSeenAt" | "pattern" | "sessionCount" | "totalOccurrences") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortBy }), to: "/knowledge-points" }),
    setSortDirection: (sortDirection: "asc" | "desc") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortDirection }), to: "/knowledge-points" }),
  };
}

export function KnowledgePointsPage() {
  const queryState = useKnowledgePointsQueryState();
  const knowledgePoints = useKnowledgePoints(queryState.query);
  const [selectedKnowledgePointId, setSelectedKnowledgePointId] = useState<string | undefined>();
  const detail = useKnowledgePointDetail(selectedKnowledgePointId);
  const totalPages = knowledgePoints.data?.totalPages ?? 0;
  const canGoBack = queryState.page > 1;
  const canGoForward = totalPages > 0 && queryState.page < totalPages;

  return (
    <AuthGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Knowledge Points"
          description="This page only shows language patterns that appeared in your finished sessions. Open any row to inspect linked transcript turns and jump back into the exact moment it appeared."
          title="Track the language you actually encountered, not a generic syllabus."
          aside={
            <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Tracked items</span>
                <span>{knowledgePoints.data?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Source</span>
                <span>Ended sessions only</span>
              </div>
            </div>
          }
        />

        <Card className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_10rem]">
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Search patterns</span>
              <Input
                aria-label="Search knowledge points"
                className="border-white/10 bg-slate-950/60 text-slate-50"
                onChange={(event) => queryState.setSearchInput(event.target.value)}
                placeholder="Search pattern or example"
                value={queryState.searchInput}
              />
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Sort by</span>
              <select
                aria-label="Sort knowledge points by"
                className="h-10 rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-50 outline-none"
                onChange={(event) => queryState.setSortBy(event.target.value as typeof queryState.sortBy)}
                value={queryState.sortBy}
              >
                <option value="lastSeenAt">Last seen</option>
                <option value="pattern">Pattern</option>
                <option value="sessionCount">Sessions</option>
                <option value="totalOccurrences">Occurrences</option>
              </select>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <span>Direction</span>
              <select
                aria-label="Knowledge point sort direction"
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
                aria-label="Knowledge point page size"
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

        {knowledgePoints.isPending ? <LoadingPanel label="Loading knowledge points..." /> : null}
        {knowledgePoints.error ? (
          <PageState description={knowledgePoints.error.message} title="Could not load knowledge points" />
        ) : null}
        {!knowledgePoints.isPending && !knowledgePoints.error && (knowledgePoints.data?.items.length ?? 0) === 0 ? (
          <PageState
            description="Finish a few sessions first. This page fills from transcript analysis after sessions end."
            title="No knowledge points yet"
          />
        ) : null}

        {knowledgePoints.data?.items.length ? (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-300">Pattern</TableHead>
                  <TableHead className="text-slate-300">Function</TableHead>
                  <TableHead className="text-slate-300">Sessions</TableHead>
                  <TableHead className="text-slate-300">Occurrences</TableHead>
                  <TableHead className="text-slate-300">Last seen</TableHead>
                  <TableHead className="text-right text-slate-300">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {knowledgePoints.data.items.map((item) => (
                  <TableRow className="border-white/10" key={item.id}>
                    <TableCell>
                      <div className="grid gap-1">
                        <span className="font-medium text-white">{item.pattern}</span>
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {humanizeLabel(item.syntaxRole)} · {humanizeLabel(item.fixednessLevel)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">{humanizeLabel(item.communicativeFunction)}</TableCell>
                    <TableCell className="text-slate-200">{item.sessionCount}</TableCell>
                    <TableCell>
                      <div className="grid gap-1 text-sm text-slate-200">
                        <span>{item.totalOccurrences} total</span>
                        <span className="text-xs text-slate-500">
                          You: {item.userOccurrenceCount} · Agent: {item.agentOccurrenceCount}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">{formatTimestamp(item.lastSeenAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => setSelectedKnowledgePointId(item.id)} size="sm" variant="outline">
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : null}

        {knowledgePoints.data?.items.length ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-300">
            <span>
              Page {queryState.page} of {Math.max(totalPages, 1)} · {knowledgePoints.data.total} tracked items
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

        <Dialog
          onOpenChange={(open) => (!open ? setSelectedKnowledgePointId(undefined) : null)}
          open={Boolean(selectedKnowledgePointId)}
        >
          <DialogContent className="max-w-4xl border-white/10 bg-slate-950 text-slate-50">
            <DialogHeader>
              <DialogTitle>{detail.data?.pattern ?? "Knowledge point"}</DialogTitle>
              <DialogDescription className="text-slate-400">
                Review where this pattern showed up in your history and jump straight to the transcript turn.
              </DialogDescription>
            </DialogHeader>

            {detail.isPending ? <LoadingPanel label="Loading knowledge point details..." /> : null}
            {detail.error ? (
              <PageState description={detail.error.message} title="Could not load knowledge point details" />
            ) : null}
            {detail.data ? (
              <div className="grid gap-6">
                <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:grid-cols-4">
                  <div className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Function</span>
                    <span className="text-sm text-slate-200">{humanizeLabel(detail.data.communicativeFunction)}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Sessions</span>
                    <span className="text-sm text-slate-200">{detail.data.sessionCount}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Occurrences</span>
                    <span className="text-sm text-slate-200">{detail.data.totalOccurrences}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Last seen</span>
                    <span className="text-sm text-slate-200">{formatTimestamp(detail.data.lastSeenAt)}</span>
                  </div>
                </div>

                {detail.data.example ? (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-200">
                    Example: “{detail.data.example}”
                  </div>
                ) : null}

                {detail.data.occurrences.length ? (
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg text-white">Transcript links</h3>
                      <span className="text-sm text-slate-400">{detail.data.occurrences.length} linked turns</span>
                    </div>
                    <div className="max-h-[26rem] overflow-auto rounded-[20px] border border-white/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-slate-300">Excerpt</TableHead>
                            <TableHead className="text-slate-300">Speaker</TableHead>
                            <TableHead className="text-slate-300">Session</TableHead>
                            <TableHead className="text-slate-300">Turn</TableHead>
                            <TableHead className="text-right text-slate-300">Link</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.data.occurrences.map((occurrence) => (
                            <TableRow className="border-white/10" key={occurrence.id}>
                              <TableCell className="max-w-xl text-sm leading-7 text-slate-200">
                                “{occurrence.excerpt}”
                                {occurrence.occurrenceCount > 1 ? (
                                  <span className="ml-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                                    x{occurrence.occurrenceCount}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-slate-300">
                                {occurrence.speaker === "user" ? "You" : "Agent"}
                              </TableCell>
                              <TableCell>
                                <div className="grid gap-1 text-sm text-slate-200">
                                  <span>{occurrence.sessionTitle}</span>
                                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    {occurrence.sessionType} ·{" "}
                                    {formatTimestamp(occurrence.sessionEndedAt ?? occurrence.sessionStartedAt)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-300">#{occurrence.transcriptTurnIndex + 1}</TableCell>
                              <TableCell className="text-right">
                                <Button asChild size="sm" variant="outline">
                                  <Link
                                    params={{ sessionId: occurrence.sessionHistoryId }}
                                    search={{ tab: "transcript", turn: occurrence.transcriptTurnIndex }}
                                    to="/history/$sessionId"
                                  >
                                    Open turn
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <PageState
                    description="The session aggregate exists, but transcript turn links have not been recorded for this item yet."
                    title="No linked transcript turns"
                  />
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGate>
  );
}
