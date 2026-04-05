import { Button } from "@english-coach/ui";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  createHistoryTranscriptCueMap,
  createTranscriptCueMapFromAnnotations,
  getRewrittenTranscriptEntries,
  getTranscriptEntriesFromSessionTurns,
} from "../../lib/agent-session-helpers";
import {
  formatTimestamp,
  humanizeLabel,
  sessionToneMap,
  useSessionDetail,
  useSessionLauncher,
} from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";
import { historyDetailTabs } from "./history-query-state";
import { HistoryTranscriptTab } from "./history-transcript-tab";

export function HistoryDetailPage() {
  const { sessionId } = useParams({ from: "/history/$sessionId" });
  const historySearch = useSearch({ from: "/history/$sessionId" });
  const navigate = useNavigate({ from: "/history/$sessionId" });
  const detail = useSessionDetail(sessionId);
  const [showAllTranscript, setShowAllTranscript] = useState(false);
  const { freeFormLaunch } = useSessionLauncher();
  const activeTab = historySearch.tab;
  const transcriptEntries = useMemo(
    () => (detail.data ? getTranscriptEntriesFromSessionTurns(detail.data.transcript) : []),
    [detail.data],
  );
  const rewrittenEntries = useMemo(
    () => (detail.data ? getRewrittenTranscriptEntries(transcriptEntries, detail.data.rewrittenTranscript) : []),
    [detail.data, transcriptEntries],
  );
  const transcriptCueMap = useMemo(
    () =>
      detail.data
        ? detail.data.transcriptAnnotations.length > 0
          ? createTranscriptCueMapFromAnnotations({
              annotations: detail.data.transcriptAnnotations,
              entries: transcriptEntries,
            })
          : createHistoryTranscriptCueMap({
              completedGoals: detail.data.session.completedGoals,
              entries: transcriptEntries,
              errors: detail.data.errors,
              scenarioGoals: detail.data.session.scenario?.goals.goals,
            })
        : {},
    [detail.data, transcriptEntries],
  );
  const displayedTranscriptEntries = activeTab === "rewritten" ? rewrittenEntries : transcriptEntries;
  const visibleEntries = showAllTranscript ? displayedTranscriptEntries : displayedTranscriptEntries.slice(-8);
  const selectedEntry =
    historySearch.turn === undefined
      ? undefined
      : displayedTranscriptEntries.find((entry) => entry.turnIndex === historySearch.turn);
  const selectedAnchor =
    historySearch.turn === undefined
      ? undefined
      : detail.data?.transcriptTurnAnchors.find((anchor) => anchor.transcriptTurnIndex === historySearch.turn);

  const focusTurn = (turnIndex: number, tab: "review" | "transcript" | "rewritten" = "transcript") => {
    void navigate({
      search: (previous) => ({ ...previous, tab, turn: turnIndex }),
      to: "/history/$sessionId",
    });
  };

  useEffect(() => {
    if (historySearch.turn === undefined || historySearch.tab !== "review") {
      return;
    }

    void navigate({
      replace: true,
      search: (previous) => ({ ...previous, tab: "transcript" }),
      to: "/history/$sessionId",
    });
  }, [historySearch.tab, historySearch.turn, navigate]);

  useEffect(() => {
    if (historySearch.turn === undefined || !displayedTranscriptEntries.length) {
      return;
    }

    if (!showAllTranscript && !visibleEntries.some((entry) => entry.turnIndex === historySearch.turn)) {
      setShowAllTranscript(true);
    }
  }, [displayedTranscriptEntries.length, historySearch.turn, showAllTranscript, visibleEntries]);

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
              <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Mode</span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${sessionToneMap[detail.data.session.sessionType]}`}
                  >
                    {detail.data.session.sessionType}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Knowledge items</span>
                  <span>{detail.data.knowledgeItems.length}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Errors</span>
                  <span>{detail.data.errors.length}</span>
                </div>
              </div>
            }
          />

          <Card className="flex flex-wrap gap-3">
            {historyDetailTabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <Button
                  className={isActive ? "border border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200" : undefined}
                  key={tab.key}
                  onClick={() => {
                    void navigate({
                      search: (previous) => ({ ...previous, tab: tab.key }),
                      to: "/history/$sessionId",
                    });
                  }}
                  variant={isActive ? "default" : "outline"}
                >
                  {tab.label}
                </Button>
              );
            })}
          </Card>

          {activeTab === "review" ? (
            <>
              <Card className="grid gap-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl text-slate-950">Review</h2>
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
                  <div className="coach-prose rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <ReactMarkdown>{detail.data.session.review}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
                  </div>
                )}
              </Card>

              {detail.data.session.sessionType === "role-play" && detail.data.session.scenario ? (
                <Card className="grid gap-4">
                  <h2 className="text-2xl text-slate-950">Goal outcome</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {detail.data.session.scenario.goals.goals.map((goal) => {
                      const wasCompleted = (detail.data.session.completedGoals ?? []).includes(goal.id);

                      return (
                        <div
                          className={`rounded-[22px] border px-4 py-4 ${
                            wasCompleted ? "border-emerald-300 bg-emerald-100" : "border-rose-300 bg-rose-100"
                          }`}
                          key={goal.id}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-lg text-slate-900">{goal.description}</h3>
                            <span>{wasCompleted ? "✓" : "✗"}</span>
                          </div>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {goal.optional ? "Optional goal" : "Required goal"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ) : null}

              <Card className="grid gap-6">
                <h2 className="text-2xl text-slate-950">Knowledge items</h2>
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
                      <h3 className="text-lg text-slate-950 capitalize">{humanizeLabel(group)}</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {(["user", "agent"] as const).map((speaker) => {
                          const speakerItems = items.filter((item) => item.speaker === speaker);

                          return (
                            <div
                              className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                              key={speaker}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <h4 className="text-base text-slate-950">
                                  {speaker === "user" ? "You used" : "Agent modelled"}
                                </h4>
                                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                  {speakerItems.length} items
                                </span>
                              </div>
                              {speakerItems.length ? (
                                speakerItems.map((item) => (
                                  <div className="rounded-[18px] border border-slate-200 bg-white p-4" key={item.id}>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-slate-900">{item.pattern}</span>
                                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                        x{item.count}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">
                                      {humanizeLabel(item.syntaxRole)} · {humanizeLabel(item.fixednessLevel)}
                                    </p>
                                    {item.examples.length ? (
                                      <p className="mt-3 text-sm leading-7 text-slate-700">“{item.examples[0]}”</p>
                                    ) : null}
                                    {item.occurrences.length ? (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {item.occurrences.slice(0, 3).map((occurrence) => (
                                          <Button
                                            key={occurrence.id}
                                            onClick={() => focusTurn(occurrence.transcriptTurnIndex)}
                                            size="sm"
                                            variant="outline"
                                          >
                                            Turn {occurrence.transcriptTurnIndex + 1}
                                          </Button>
                                        ))}
                                        {item.occurrences.length > 3 ? (
                                          <span className="self-center text-xs uppercase tracking-[0.18em] text-slate-500">
                                            +{item.occurrences.length - 3} more links
                                          </span>
                                        ) : null}
                                      </div>
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
                  <p className="text-sm text-slate-500">No extracted knowledge items yet.</p>
                )}
              </Card>

              <Card className="grid gap-4">
                <h2 className="text-2xl text-slate-950">Errors</h2>
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
                      <h3 className="text-lg capitalize text-slate-950">{humanizeLabel(dimension)}</h3>
                      <div className="grid gap-3">
                        {errors.map((error) => (
                          <div className="rounded-[20px] border border-rose-300 bg-rose-100 p-4" key={error.id}>
                            <p className="text-sm font-medium text-rose-900">{error.errorDescription}</p>
                            <p className="mt-2 text-sm leading-7 text-slate-700">Utterance: “{error.utterance}”</p>
                            <p className="mt-2 text-sm leading-7 text-rose-800">Suggestion: {error.suggestion}</p>
                            {error.matchedTranscriptTurnIndex !== null ? (
                              <div className="mt-3">
                                <Button
                                  onClick={() => focusTurn(error.matchedTranscriptTurnIndex as number)}
                                  size="sm"
                                  variant="outline"
                                >
                                  Open turn {error.matchedTranscriptTurnIndex + 1}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No errors recorded for this session.</p>
                )}
              </Card>
            </>
          ) : null}

          {activeTab === "transcript" || activeTab === "rewritten" ? (
            <HistoryTranscriptTab
              activeTab={activeTab}
              cuesById={transcriptCueMap}
              hasRewrittenTranscript={detail.data.rewrittenTranscript.length > 0}
              onClearFocus={
                historySearch.turn !== undefined
                  ? () => {
                      void navigate({
                        search: (previous) => ({ ...previous, turn: undefined }),
                        to: "/history/$sessionId",
                      });
                    }
                  : undefined
              }
              onSelectEntry={(entry) => {
                void navigate({
                  search: (previous) => ({ ...previous, tab: activeTab, turn: entry.turnIndex }),
                  to: "/history/$sessionId",
                });
              }}
              onToggleExpanded={() => setShowAllTranscript((current) => !current)}
              selectedAnchorLabel={selectedAnchor?.turnLabel}
              selectedEntryId={selectedEntry?.id}
              showAllTranscript={showAllTranscript}
              visibleEntries={visibleEntries}
            />
          ) : null}
        </div>
      ) : null}
    </AuthGate>
  );
}
