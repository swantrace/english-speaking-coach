import { Button } from "@english-coach/ui";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type ScenarioGenerateSubmissionItem,
  scenarioGenerateStore,
  useScenarioGenerateStore,
} from "./lib/scenario-generate-store";
import "./style.css";

const connectionStyles = {
  closed: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  connecting: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  error: "border-orange-500/30 bg-orange-500/10 text-orange-100",
  open: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
} as const;

function formatTimestamp(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString();
}

function createSubmission(message: string, shouldFail: boolean): ScenarioGenerateSubmissionItem[] {
  return [
    {
      message,
      queuedAt: new Date().toISOString(),
      shouldFail,
    },
  ];
}

export const App = () => {
  const store = useScenarioGenerateStore();
  const [message, setMessage] = useState("Role-play a difficult customer call about a refund.");
  const [shouldFail, setShouldFail] = useState(false);

  useEffect(() => {
    scenarioGenerateStore.connect();

    return () => {
      scenarioGenerateStore.disconnect();
    };
  }, []);

  const submitScenario = async () => {
    await scenarioGenerateStore.submit(createSubmission(message, shouldFail));
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08111f] text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(56,189,248,0.2),_transparent_35%),linear-gradient(135deg,_rgba(8,17,31,0.96),_rgba(10,24,42,0.98))]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 sm:px-10 lg:px-12">
        <header className="grid gap-5 rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-[0_24px_120px_rgba(8,15,30,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
              Admin Scenario Console
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${connectionStyles[store.connectionState]}`}
            >
              {store.connectionState}
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
            <div className="grid gap-3">
              <h1 className="max-w-4xl text-balance font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
                One EventSource, one scenario channel, all job updates in one place.
              </h1>
              <p className="max-w-3xl text-pretty text-sm leading-7 text-slate-300 sm:text-base">
                The frontend now keeps a local job store from the shared scenario events stream. New submissions update
                immediately, worker progress hydrates from SSE, and reconnects replay recent queue snapshots.
              </p>
            </div>
            <dl className="grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/30 p-5 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Events URL</dt>
                <dd className="max-w-[70%] truncate text-right font-medium">{store.eventsUrl}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Last Connected</dt>
                <dd>{formatTimestamp(store.lastConnectedAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Last Heartbeat</dt>
                <dd>{formatTimestamp(store.lastHeartbeatAt)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <article className="grid gap-5 rounded-[28px] border border-white/10 bg-slate-950/40 p-6 backdrop-blur-xl">
            <div className="grid gap-2">
              <h2 className="text-2xl font-semibold text-slate-50">Submit Scenario Jobs</h2>
              <p className="text-sm leading-6 text-slate-400">
                This form posts a single-item batch to the backend and lets the live stream own the authoritative job
                state afterward.
              </p>
            </div>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-200">Prompt</span>
              <textarea
                className="min-h-36 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-50 outline-none transition focus:border-cyan-300/40"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Describe the speaking scenario the admin should generate"
                value={message}
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <input
                checked={shouldFail}
                className="h-4 w-4 rounded border-white/20 bg-slate-900"
                onChange={(event) => setShouldFail(event.target.checked)}
                type="checkbox"
              />
              Simulate worker failure for this submission
            </label>

            <div className="flex flex-wrap gap-3">
              <Button disabled={store.submitState === "submitting"} onClick={() => void submitScenario()} size="lg">
                {store.submitState === "submitting" ? "Submitting..." : "Queue Scenario"}
              </Button>
              <Button onClick={() => scenarioGenerateStore.connect()} size="lg" variant="outline">
                Reconnect Events
              </Button>
              <Button onClick={() => scenarioGenerateStore.disconnect()} size="lg" variant="outline">
                Disconnect
              </Button>
            </div>

            {store.lastError ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {store.lastError}
              </div>
            ) : null}

            <div className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/50 p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Last Submission</h3>
                <span className="text-xs text-slate-500">
                  {store.lastSubmissionSummary
                    ? `${store.lastSubmissionSummary.queued} queued / ${store.lastSubmissionSummary.invalid} invalid / ${store.lastSubmissionSummary.enqueueFailed} enqueue failed`
                    : "No submissions yet"}
                </span>
              </div>
              <div className="grid gap-3">
                {store.submissionResults.length === 0 ? (
                  <p className="text-sm text-slate-500">Submission results will appear here after the next POST.</p>
                ) : (
                  store.submissionResults.map((result) => (
                    <div
                      className="grid gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                      key={`${result.index}:${result.jobId ?? result.status}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium uppercase tracking-[0.18em] text-slate-400">
                          Item {result.index}
                        </span>
                        <span>{result.status}</span>
                      </div>
                      <span className="text-slate-300">{result.payload?.message ?? result.error ?? "No payload"}</span>
                      <span className="text-xs text-slate-500">Job ID: {result.jobId ?? "not created"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>

          <article className="grid gap-5 rounded-[28px] border border-white/10 bg-slate-950/40 p-6 backdrop-blur-xl">
            <div className="flex items-end justify-between gap-4">
              <div className="grid gap-2">
                <h2 className="text-2xl font-semibold text-slate-50">Live Job Store</h2>
                <p className="text-sm leading-6 text-slate-400">
                  Every `scenario.generate.updated` event merges into this local store keyed by `jobId`.
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-slate-300">
                {store.jobs.length} jobs tracked
              </span>
            </div>

            <div className="grid gap-4">
              {store.jobs.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-500">
                  No live jobs yet. Submit one from the left panel to see the shared event stream populate this store.
                </div>
              ) : (
                store.jobs.map((job) => (
                  <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5" key={job.jobId}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="grid gap-1">
                        <span className="text-xs uppercase tracking-[0.22em] text-slate-500">{job.jobId}</span>
                        <h3 className="text-lg font-medium text-slate-100">{job.message}</h3>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${connectionStyles[job.status === "failed" ? "closed" : job.status === "completed" ? "open" : job.status === "started" ? "connecting" : "error"]}`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="grid gap-2">
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,197,94,0.7),rgba(56,189,248,0.95))] transition-[width] duration-500"
                          style={{ width: `${Math.max(job.progress, 4)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
                        <span>{job.progress}%</span>
                        <span>Queued {formatTimestamp(job.queuedAt)}</span>
                        <span>Updated {formatTimestamp(job.updatedAt)}</span>
                      </div>
                    </div>

                    {job.error ? <p className="text-sm text-rose-200">{job.error}</p> : null}
                    {job.processedAt ? (
                      <p className="text-xs text-slate-500">Processed {formatTimestamp(job.processedAt)}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};

const root = document.getElementById("app");
if (root) {
  createRoot(root).render(<App />);
}
