import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@english-coach/ui";
import { useState } from "react";
import { formatTimestamp, humanizeLabel, useKnowledgePoints } from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";
import { KnowledgePointDetailDialog } from "./knowledge-point-detail-dialog";
import { useKnowledgePointsQueryState } from "./knowledge-points-query-state";

export function KnowledgePointsPage() {
  const queryState = useKnowledgePointsQueryState();
  const knowledgePoints = useKnowledgePoints(queryState.query);
  const [selectedKnowledgePointId, setSelectedKnowledgePointId] = useState<string | undefined>();
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

        <KnowledgePointDetailDialog
          knowledgePointId={selectedKnowledgePointId}
          onOpenChange={(open) => (!open ? setSelectedKnowledgePointId(undefined) : null)}
          open={Boolean(selectedKnowledgePointId)}
        />
      </div>
    </AuthGate>
  );
}
