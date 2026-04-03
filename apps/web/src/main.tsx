import { Button } from "@english-coach/ui";
import { type FormEvent, startTransition, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { authClient } from "./lib/auth-client";
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
  return message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      message: line,
      queuedAt: new Date().toISOString(),
      shouldFail,
    }));
}

function getJobStatusTone(status: "queued" | "started" | "completed" | "failed") {
  if (status === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  }

  if (status === "started") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  if (status === "failed") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-100";
  }

  return "border-sky-500/30 bg-sky-500/10 text-sky-100";
}

function getSubmissionResultTone(status: "queued" | "invalid_input" | "enqueue_failed") {
  if (status === "queued") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-100";
  }

  if (status === "enqueue_failed") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-100";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-100";
}

type AuthMode = "sign-in" | "sign-up";

interface AuthFormState {
  email: string;
  name: string;
  password: string;
}

interface AuthFeedback {
  code?: string;
  hint?: string;
  message: string;
  status?: number;
  tone: "error" | "success";
}

const defaultAuthFormState: AuthFormState = {
  email: "",
  name: "",
  password: "",
};

function getAuthFeedback(error: unknown, mode: AuthMode): AuthFeedback {
  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error && typeof error.message === "string" ? error.message : undefined;
    const maybeCode = "code" in error && typeof error.code === "string" ? error.code : undefined;
    const maybeStatus =
      "status" in error && typeof error.status === "number"
        ? error.status
        : "statusCode" in error && typeof error.statusCode === "number"
          ? error.statusCode
          : undefined;

    if (maybeCode === "INVALID_EMAIL_OR_PASSWORD") {
      return {
        code: maybeCode,
        hint: "Email exists does not guarantee the password matches. Use the exact password you registered with.",
        message: maybeMessage ?? "Invalid email or password",
        status: maybeStatus,
        tone: "error",
      };
    }

    if (maybeCode === "USER_ALREADY_EXISTS") {
      return {
        code: maybeCode,
        hint: "Try signing in instead, or use another email address.",
        message: maybeMessage ?? "An account with this email already exists",
        status: maybeStatus,
        tone: "error",
      };
    }

    if (maybeMessage) {
      return {
        code: maybeCode,
        hint: maybeStatus === 401 && mode === "sign-in" ? "Double-check the password and try again." : undefined,
        message: maybeMessage,
        status: maybeStatus,
        tone: "error",
      };
    }
  }

  if (error instanceof Error && error.message) {
    return {
      hint:
        error.message === "Failed to fetch"
          ? "Check that the backend is running and reachable from the browser."
          : undefined,
      message: error.message,
      tone: "error",
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      tone: "error",
    };
  }

  return {
    message: "Authentication request failed",
    tone: "error",
  };
}

function AuthScreen({ isPending, onSubmit }: { isPending: boolean; onSubmit: () => Promise<void> }) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [formState, setFormState] = useState<AuthFormState>(defaultAuthFormState);
  const [submitState, setSubmitState] = useState<"idle" | "submitting">("idle");
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);

  const updateField = (field: keyof AuthFormState, value: string) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState("submitting");
    setFeedback(null);

    try {
      if (mode === "sign-up") {
        const response = await authClient.signUp.email({
          email: formState.email,
          name: formState.name,
          password: formState.password,
        });

        if (response.error) {
          throw response.error;
        }

        setFeedback({
          hint: mode === "sign-up" ? "A session cookie has already been issued by the backend." : undefined,
          message: "Account created. You are now signed in.",
          tone: "success",
        });
      } else {
        const response = await authClient.signIn.email({
          email: formState.email,
          password: formState.password,
        });

        if (response.error) {
          throw response.error;
        }

        setFeedback({
          hint: "Your protected requests should work as soon as the session refresh finishes.",
          message: "Signed in successfully.",
          tone: "success",
        });
      }

      setFormState((current) => ({
        ...current,
        password: "",
      }));
      await onSubmit();
    } catch (error) {
      setFeedback(getAuthFeedback(error, mode));
    } finally {
      setSubmitState("idle");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08111f] text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(56,189,248,0.2),_transparent_35%),linear-gradient(135deg,_rgba(8,17,31,0.96),_rgba(10,24,42,0.98))]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-16">
        <section className="grid content-start gap-6 rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-[0_24px_120px_rgba(8,15,30,0.45)] backdrop-blur-xl">
          <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
            Better Auth Demo
          </span>
          <div className="grid gap-4">
            <h1 className="max-w-3xl text-balance font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
              Register once, sign in fast, and unlock the protected scenario console.
            </h1>
            <p className="max-w-2xl text-pretty text-sm leading-7 text-slate-300 sm:text-base">
              Authentication is handled by Better Auth on the backend. Until a session cookie exists, the frontend will
              not be allowed to call the scenario generation endpoints.
            </p>
          </div>
          <dl className="grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/30 p-5 text-sm text-slate-200">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-400">Backend Auth URL</dt>
              <dd className="font-medium">http://localhost:3001/api/auth</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-400">Session Transport</dt>
              <dd>HTTP-only cookies</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-400">Protected Routes</dt>
              <dd>/api/scenarios/*</dd>
            </div>
          </dl>
        </section>

        <section className="grid content-start gap-5 rounded-[32px] border border-white/10 bg-slate-950/45 p-8 shadow-[0_24px_120px_rgba(8,15,30,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "sign-in" ? "bg-cyan-300 text-slate-950" : "text-slate-300"
              }`}
              onClick={() => setMode("sign-in")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "sign-up" ? "bg-cyan-300 text-slate-950" : "text-slate-300"
              }`}
              onClick={() => setMode("sign-up")}
              type="button"
            >
              Sign up
            </button>
          </div>

          <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
            {mode === "sign-up" ? (
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-slate-200">Name</span>
                <input
                  autoComplete="name"
                  className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300/40"
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Alex Coach"
                  required
                  value={formState.name}
                />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-200">Email</span>
              <input
                autoComplete="email"
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300/40"
                onChange={(event) => updateField("email", event.target.value)}
                onFocus={() => {
                  if (feedback?.tone === "error") {
                    setFeedback(null);
                  }
                }}
                placeholder="coach@example.com"
                required
                type="email"
                value={formState.email}
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-slate-200">Password</span>
              <input
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300/40"
                minLength={8}
                onChange={(event) => updateField("password", event.target.value)}
                onFocus={() => {
                  if (feedback?.tone === "error") {
                    setFeedback(null);
                  }
                }}
                placeholder="At least 8 characters"
                required
                type="password"
                value={formState.password}
              />
            </label>

            {feedback ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  feedback.tone === "error"
                    ? "border border-rose-400/20 bg-rose-400/10 text-rose-100"
                    : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                }`}
              >
                <div className="grid gap-2">
                  <span>{feedback.message}</span>
                  {feedback.code || typeof feedback.status === "number" ? (
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] opacity-80">
                      {feedback.code ? <span>Code: {feedback.code}</span> : null}
                      {typeof feedback.status === "number" ? <span>Status: {feedback.status}</span> : null}
                    </div>
                  ) : null}
                  {feedback.hint ? <span className="text-xs opacity-90">{feedback.hint}</span> : null}
                </div>
              </div>
            ) : null}

            <Button disabled={submitState === "submitting" || isPending} size="lg" type="submit">
              {submitState === "submitting"
                ? mode === "sign-up"
                  ? "Creating account..."
                  : "Signing in..."
                : mode === "sign-up"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}

function ScenarioConsole({
  session,
  sessionPending,
}: {
  session: NonNullable<ReturnType<typeof authClient.useSession>["data"]>;
  sessionPending: boolean;
}) {
  const store = useScenarioGenerateStore();
  const [message, setMessage] = useState(
    [
      "Role-play a difficult customer call about a refund.",
      "Practice a tense salary negotiation with your manager.",
      "Handle a product demo with a skeptical enterprise buyer.",
    ].join("\n"),
  );
  const [shouldFail, setShouldFail] = useState(false);
  const [signOutState, setSignOutState] = useState<"idle" | "submitting">("idle");

  const batchItems = createSubmission(message, shouldFail);
  const activeLastSubmissionCount = store.submissionResults.reduce((count, result) => {
    if (result.status !== "queued" || !result.jobId) {
      return count;
    }

    const liveJob = store.jobs.find((job) => job.jobId === result.jobId);

    if (!liveJob) {
      return count + 1;
    }

    return liveJob.status === "completed" || liveJob.status === "failed" ? count : count + 1;
  }, 0);
  const isSubmissionLocked = store.submitState === "submitting" || activeLastSubmissionCount > 0;

  useEffect(() => {
    scenarioGenerateStore.connect();

    return () => {
      scenarioGenerateStore.disconnect();
    };
  }, []);

  const submitScenario = async () => {
    if (batchItems.length === 0) {
      return;
    }

    await scenarioGenerateStore.submit(batchItems);
  };

  const handleSignOut = async () => {
    setSignOutState("submitting");

    try {
      const response = await authClient.signOut();

      if (response.error) {
        throw response.error;
      }

      startTransition(() => {
        scenarioGenerateStore.disconnect();
      });
    } finally {
      setSignOutState("idle");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08111f] text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(56,189,248,0.2),_transparent_35%),linear-gradient(135deg,_rgba(8,17,31,0.96),_rgba(10,24,42,0.98))]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-10 sm:px-10 lg:px-12">
        <header className="grid gap-5 rounded-[32px] border border-white/10 bg-white/6 p-8 shadow-[0_24px_120px_rgba(8,15,30,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
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

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {session.user.name} · {session.user.email}
              </span>
              <Button
                disabled={signOutState === "submitting" || sessionPending}
                onClick={() => void handleSignOut()}
                variant="outline"
              >
                {signOutState === "submitting" ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
            <div className="grid gap-3">
              <h1 className="max-w-4xl text-balance font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
                One EventSource, one scenario channel, all job updates in one place.
              </h1>
              <p className="max-w-3xl text-pretty text-sm leading-7 text-slate-300 sm:text-base">
                The frontend only reaches these routes after Better Auth has issued a session cookie. Scenario requests
                are now server-protected and anonymous calls are rejected with 401.
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

        <section className="grid gap-6">
          <article className="grid gap-5 rounded-[28px] border border-white/10 bg-slate-950/40 p-6 backdrop-blur-xl lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="grid gap-5 content-start">
              <div className="grid gap-2">
                <h2 className="text-2xl font-semibold text-slate-50">Submit Scenario Jobs</h2>
                <p className="text-sm leading-6 text-slate-400">
                  Enter one scenario per line. A single submit will enqueue the whole batch and the list on the right
                  will track each job separately.
                </p>
              </div>

              <label className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-slate-200">Batch Prompts</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{batchItems.length} items</span>
                </div>
                <textarea
                  className="min-h-36 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-slate-50 outline-none transition focus:border-cyan-300/40"
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="One scenario per line"
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
                <Button
                  disabled={isSubmissionLocked || batchItems.length === 0}
                  onClick={() => void submitScenario()}
                  size="lg"
                >
                  {store.submitState === "submitting"
                    ? "Submitting..."
                    : activeLastSubmissionCount > 0
                      ? `Waiting For ${activeLastSubmissionCount} Jobs`
                      : `Queue ${batchItems.length || 0} Jobs`}
                </Button>
                <Button onClick={() => scenarioGenerateStore.connect()} size="lg" variant="outline">
                  Reconnect Events
                </Button>
                <Button onClick={() => scenarioGenerateStore.disconnect()} size="lg" variant="outline">
                  Disconnect
                </Button>
              </div>

              {activeLastSubmissionCount > 0 ? (
                <p className="text-sm text-amber-200">
                  The previous batch still has {activeLastSubmissionCount} job
                  {activeLastSubmissionCount === 1 ? "" : "s"} running. You can submit again after they reach completed
                  or failed.
                </p>
              ) : null}

              {store.lastError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {store.lastError}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/50 p-5 content-start">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Last Submission</h3>
                <span className="text-xs text-slate-500">
                  {store.lastSubmissionSummary
                    ? `${store.lastSubmissionSummary.queued} queued / ${store.lastSubmissionSummary.invalid} invalid / ${store.lastSubmissionSummary.enqueueFailed} enqueue failed`
                    : "No submissions yet"}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {store.submissionResults.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500">
                    Submission results will appear here after the next POST.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm text-slate-200">
                      <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Item</th>
                          <th className="px-3 py-2 font-medium">Job ID</th>
                          <th className="px-3 py-2 font-medium">Message</th>
                          <th className="px-3 py-2 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {store.submissionResults.map((result) => (
                          <tr
                            className="border-t border-white/10 align-middle"
                            key={`${result.index}:${result.jobId ?? result.status}`}
                          >
                            <td className="px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              #{result.index + 1}
                            </td>
                            <td className="max-w-44 truncate px-3 py-2 text-[11px] text-slate-400">
                              {result.jobId ?? "pending"}
                            </td>
                            <td className="max-w-0 px-3 py-2">
                              <span className="block truncate text-slate-300">
                                {result.error ?? result.payload?.message ?? "No payload"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getSubmissionResultTone(result.status)}`}
                              >
                                {result.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm text-slate-200">
                      <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Job ID</th>
                          <th className="px-3 py-2 font-medium">Message</th>
                          <th className="px-3 py-2 font-medium text-right">Status</th>
                          <th className="px-3 py-2 font-medium">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {store.jobs.map((job) => (
                          <tr className="border-t border-white/10 align-middle" key={job.jobId}>
                            <td className="max-w-48 truncate px-3 py-2 text-[11px] text-slate-400">{job.jobId}</td>
                            <td className="max-w-0 px-3 py-2">
                              <span className={`block truncate ${job.error ? "text-rose-200" : "text-slate-200"}`}>
                                {job.error ?? job.message}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getJobStatusTone(job.status)}`}
                              >
                                {job.status}
                              </span>
                            </td>
                            <td className="w-56 min-w-56 px-3 py-2">
                              <div className="grid gap-1">
                                <div className="h-1 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,197,94,0.7),rgba(56,189,248,0.95))] transition-[width] duration-500"
                                    style={{ width: `${Math.max(job.progress, 4)}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                                  <span>{job.progress}%</span>
                                  <span>{formatTimestamp(job.updatedAt)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export const App = () => {
  const sessionQuery = authClient.useSession();

  if (sessionQuery.isPending) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08111f] text-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_right,_rgba(56,189,248,0.2),_transparent_35%),linear-gradient(135deg,_rgba(8,17,31,0.96),_rgba(10,24,42,0.98))]" />
        <div className="relative rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200 backdrop-blur-xl">
          Checking session...
        </div>
      </main>
    );
  }

  if (!sessionQuery.data) {
    return <AuthScreen isPending={sessionQuery.isPending} onSubmit={sessionQuery.refetch} />;
  }

  return <ScenarioConsole session={sessionQuery.data} sessionPending={sessionQuery.isPending} />;
};

const root = document.getElementById("app");
if (root) {
  createRoot(root).render(<App />);
}
