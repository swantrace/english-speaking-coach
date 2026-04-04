import { Button } from "@english-coach/ui";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  formatTimestamp,
  humanizeLabel,
  sessionToneMap,
  useHistory,
  useSessionDetail,
  useSessionLauncher,
} from "../../lib/app-data";
import { AuthGate, Card, LoadingPanel, PageIntro, PageState } from "../../lib/app-shell";

export function HistoryListPage() {
  const history = useHistory();

  return (
    <AuthGate>
      <div className="grid gap-8">
        <PageIntro
          badge="History"
          description="Only ended sessions appear here. Role-play stays review-only. Free-form sessions can be launched again from the detail page when their context is available."
          title="Review what you practised, what the agent modelled, and where your errors cluster."
        />

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
      </div>
    </AuthGate>
  );
}

export function HistoryDetailPage() {
  const { sessionId } = useParams({ from: "/history/$sessionId" });
  const detail = useSessionDetail(sessionId);
  const [showAllTranscript, setShowAllTranscript] = useState(false);
  const { freeFormLaunch } = useSessionLauncher();

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
              <Button onClick={() => setShowAllTranscript((current) => !current)} variant="outline">
                {showAllTranscript ? "Show latest turns" : "Expand full transcript"}
              </Button>
            </div>
            <div className="grid gap-3">
              {(showAllTranscript ? detail.data.transcript : detail.data.transcript.slice(-8)).map((turn) => (
                <div
                  className={`rounded-[18px] border px-4 py-3 ${
                    turn.speaker === "user" ? "border-cyan-300/18 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"
                  }`}
                  key={`${turn.timestampMs}:${turn.text}`}
                >
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{turn.speaker}</span>
                  <p className="mt-2 text-sm leading-7 text-slate-100">{turn.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </AuthGate>
  );
}
