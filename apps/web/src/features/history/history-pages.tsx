import { Button, Input } from "@english-coach/ui";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptEntryList } from "../../components/agents-ui/agent-chat-transcript";
import { createHistoryTranscriptCueMap, getTranscriptEntriesFromSessionTurns } from "../../lib/agent-session-helpers";
import {
  formatTimestamp,
  humanizeLabel,
  sessionToneMap,
  useHistoryList,
  useSessionDetail,
  useSessionLauncher,
} from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";

function useHistoryListQueryState() {
  const currentSearch = useSearch({ from: "/history/" });
  const navigate = useNavigate({ from: "/history/" });
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
        to: "/history",
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
      sessionType: currentSearch.sessionType,
      sortBy: currentSearch.sortBy,
      sortDirection: currentSearch.sortDirection,
    },
    searchInput,
    setPage: (page: number) => void navigate({ search: (previous) => ({ ...previous, page }), to: "/history" }),
    setPageSize: (pageSize: number) =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, pageSize }), to: "/history" }),
    setSearchInput,
    setSessionType: (sessionType: "role-play" | "free-form" | undefined) =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sessionType }), to: "/history" }),
    setSortBy: (sortBy: "startedAt" | "endedAt" | "title") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortBy }), to: "/history" }),
    setSortDirection: (sortDirection: "asc" | "desc") =>
      void navigate({ search: (previous) => ({ ...previous, page: 1, sortDirection }), to: "/history" }),
  };
}

export function HistoryListPage() {
  const queryState = useHistoryListQueryState();
  const history = useHistoryList(queryState.query);
  const canGoBack = queryState.page > 1;
  const totalPages = history.data?.totalPages ?? 0;
  const canGoForward = totalPages === 0 ? false : queryState.page < totalPages;

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
          <div className="grid gap-4">
            {history.data.items.map((item) => (
              <Card className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${sessionToneMap[item.sessionType]}`}
                    >
                      {item.sessionType}
                    </span>
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {formatTimestamp(item.startedAt)}
                    </span>
                  </div>
                  <h2 className="text-2xl text-white">{item.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span>Ended: {formatTimestamp(item.endedAt)}</span>
                    <span>
                      Review:{" "}
                      {item.review ? "Ready" : <span className="inline-block animate-pulse">Generating...</span>}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {item.canReopen ? (
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-100">
                      Reopenable
                    </span>
                  ) : null}
                  <Button asChild size="lg">
                    <Link params={{ sessionId: item.id }} to="/history/$sessionId">
                      Open Review
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
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

export function HistoryDetailPage() {
  const { sessionId } = useParams({ from: "/history/$sessionId" });
  const historySearch = useSearch({ from: "/history/$sessionId" });
  const navigate = useNavigate({ from: "/history/$sessionId" });
  const detail = useSessionDetail(sessionId);
  const [showAllTranscript, setShowAllTranscript] = useState(false);
  const { freeFormLaunch } = useSessionLauncher();
  const transcriptEntries = useMemo(
    () => (detail.data ? getTranscriptEntriesFromSessionTurns(detail.data.transcript) : []),
    [detail.data],
  );
  const transcriptCueMap = useMemo(
    () =>
      detail.data
        ? createHistoryTranscriptCueMap({
            completedGoals: detail.data.session.completedGoals,
            entries: transcriptEntries,
            errors: detail.data.errors,
            scenarioGoals: detail.data.session.scenario?.goals.goals,
          })
        : {},
    [detail.data, transcriptEntries],
  );
  const visibleEntries = showAllTranscript ? transcriptEntries : transcriptEntries.slice(-8);
  const selectedEntry =
    historySearch.turn === undefined
      ? undefined
      : transcriptEntries.find((entry) => entry.turnIndex === historySearch.turn);

  useEffect(() => {
    if (historySearch.turn === undefined || !transcriptEntries.length) {
      return;
    }

    if (!showAllTranscript && !visibleEntries.some((entry) => entry.turnIndex === historySearch.turn)) {
      setShowAllTranscript(true);
    }
  }, [historySearch.turn, showAllTranscript, transcriptEntries.length, visibleEntries]);

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      document.getElementById(selectedEntry.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedEntry]);

  return (
    <AuthGate>
      {detail.isPending ? <LoadingPanel label="Loading session review..." /> : null}
      {detail.error ? <PageState description={detail.error.message} title="Could not load session review" /> : null}
      {detail.data ? (
        <div className="grid gap-8">
          <PageIntro
            badge="Session Review"
            description={`Started ${formatTimestamp(detail.data.session.startedAt)}${detail.data.session.endedAt ? ` and ended ${formatTimestamp(detail.data.session.endedAt)}` : ""}.`}
            title={detail.data.session.title}
            aside={
              <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Mode</span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${sessionToneMap[detail.data.session.sessionType]}`}
                  >
                    {detail.data.session.sessionType}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Knowledge items</span>
                  <span>{detail.data.knowledgeItems.length}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Errors</span>
                  <span>{detail.data.errors.length}</span>
                </div>
              </div>
            }
          />

          <Card className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl text-white">Review</h2>
              {detail.data.session.canReopen && detail.data.contextDocument ? (
                <Button
                  disabled={freeFormLaunch.isPending}
                  onClick={() => {
                    void freeFormLaunch.mutateAsync({
                      contextDocument: detail.data.contextDocument ?? "",
                    });
                  }}
                  variant="outline"
                >
                  {freeFormLaunch.isPending ? "Reopening..." : "Reopen free-form session"}
                </Button>
              ) : null}
            </div>
            {detail.data.session.review ? (
              <div className="coach-prose rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <ReactMarkdown>{detail.data.session.review}</ReactMarkdown>
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
                <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
              </div>
            )}
          </Card>

          {detail.data.session.sessionType === "role-play" && detail.data.session.scenario ? (
            <Card className="grid gap-4">
              <h2 className="text-2xl text-white">Goal outcome</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {detail.data.session.scenario.goals.goals.map((goal) => {
                  const wasCompleted = (detail.data.session.completedGoals ?? []).includes(goal.id);

                  return (
                    <div
                      className={`rounded-[22px] border px-4 py-4 ${
                        wasCompleted ? "border-emerald-300/20 bg-emerald-300/10" : "border-rose-300/20 bg-rose-300/10"
                      }`}
                      key={goal.id}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-lg text-white">{goal.description}</h3>
                        <span>{wasCompleted ? "✓" : "✗"}</span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {goal.optional ? "Optional goal" : "Required goal"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <Card className="grid gap-6">
            <h2 className="text-2xl text-white">Knowledge items</h2>
            {detail.data.knowledgeItems.length ? (
              Array.from(
                detail.data.knowledgeItems.reduce((groups, item) => {
                  const bucket = groups.get(item.communicativeFunction ?? "unclassified") ?? [];
                  bucket.push(item);
                  groups.set(item.communicativeFunction ?? "unclassified", bucket);
                  return groups;
                }, new Map<string, typeof detail.data.knowledgeItems>()),
              ).map(([group, items]) => (
                <div className="grid gap-4" key={group}>
                  <h3 className="text-lg text-white capitalize">{humanizeLabel(group)}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(["user", "agent"] as const).map((speaker) => {
                      const speakerItems = items.filter((item) => item.speaker === speaker);

                      return (
                        <div
                          className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                          key={speaker}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <h4 className="text-base text-white">
                              {speaker === "user" ? "You used" : "Agent modelled"}
                            </h4>
                            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                              {speakerItems.length} items
                            </span>
                          </div>
                          {speakerItems.length ? (
                            speakerItems.map((item) => (
                              <div className="rounded-[18px] border border-white/10 bg-slate-950/50 p-4" key={item.id}>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-white">{item.pattern}</span>
                                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    x{item.count}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-slate-300">
                                  {humanizeLabel(item.syntaxRole)} · {humanizeLabel(item.fixednessLevel)}
                                </p>
                                {item.examples.length ? (
                                  <p className="mt-3 text-sm leading-7 text-slate-200">“{item.examples[0]}”</p>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">None in this group.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No extracted knowledge items yet.</p>
            )}
          </Card>

          <Card className="grid gap-4">
            <h2 className="text-2xl text-white">Errors</h2>
            {detail.data.errors.length ? (
              Array.from(
                detail.data.errors.reduce((groups, item) => {
                  const bucket = groups.get(item.dimension) ?? [];
                  bucket.push(item);
                  groups.set(item.dimension, bucket);
                  return groups;
                }, new Map<string, typeof detail.data.errors>()),
              ).map(([dimension, errors]) => (
                <div className="grid gap-3" key={dimension}>
                  <h3 className="text-lg capitalize text-white">{humanizeLabel(dimension)}</h3>
                  <div className="grid gap-3">
                    {errors.map((error) => (
                      <div className="rounded-[20px] border border-rose-300/18 bg-rose-300/10 p-4" key={error.id}>
                        <p className="text-sm font-medium text-rose-50">{error.errorDescription}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-200">Utterance: “{error.utterance}”</p>
                        <p className="mt-2 text-sm leading-7 text-rose-100">Suggestion: {error.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No errors recorded for this session.</p>
            )}
          </Card>

          <Card className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl text-white">Transcript</h2>
              <div className="flex flex-wrap items-center gap-3">
                {historySearch.turn !== undefined ? (
                  <Button
                    onClick={() => {
                      void navigate({ search: () => ({}), to: "/history/$sessionId" });
                    }}
                    variant="ghost"
                  >
                    Clear turn focus
                  </Button>
                ) : null}
                <Button onClick={() => setShowAllTranscript((current) => !current)} variant="outline">
                  {showAllTranscript ? "Show latest turns" : "Expand full transcript"}
                </Button>
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-300">
              Click any turn to set a stable `turn` query param and deep-link directly to that point in the transcript.
            </p>
            <TranscriptEntryList
              cuesById={transcriptCueMap}
              entries={visibleEntries}
              onSelectEntry={(entry) => {
                void navigate({ search: () => ({ turn: entry.turnIndex }), to: "/history/$sessionId" });
              }}
              selectedEntryId={selectedEntry?.id}
            />
          </Card>
        </div>
      ) : null}
    </AuthGate>
  );
}
