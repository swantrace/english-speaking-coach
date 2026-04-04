import { Button } from "@english-coach/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { getAuthenticatedHomePath, useViewer, viewerQueryKey } from "../../lib/app-data";
import { Card, LoadingPanel, PageIntro } from "../../lib/app-shell";
import { authClient } from "../../lib/auth-client";

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
        hint: "Email existing does not guarantee the password matches. Use the exact password you registered with.",
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

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const viewer = useViewer();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [formState, setFormState] = useState<AuthFormState>(defaultAuthFormState);
  const [submitState, setSubmitState] = useState<"idle" | "submitting">("idle");
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);

  useEffect(() => {
    if (viewer.data?.user) {
      void navigate({ replace: true, to: getAuthenticatedHomePath(viewer.data.user) });
    }
  }, [navigate, viewer.data?.user]);

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
          hint: "A session cookie has already been issued by the backend.",
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
          hint: "Protected requests should work as soon as the session refresh finishes.",
          message: "Signed in successfully.",
          tone: "success",
        });
      }

      setFormState((current) => ({
        ...current,
        password: "",
      }));
      await queryClient.invalidateQueries({ queryKey: viewerQueryKey });
      await queryClient.refetchQueries({ queryKey: viewerQueryKey, type: "active" });
    } catch (error) {
      setFeedback(getAuthFeedback(error, mode));
    } finally {
      setSubmitState("idle");
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <PageIntro
        badge="English Coach"
        description="Authentication is handled by Better Auth on the backend. Once a session cookie exists, the router opens the learner and admin surfaces without falling back to the old single-screen demo."
        title="Train spoken English through structured role-play, free-form coaching, and post-session review."
      />

      <Card className="grid content-start gap-5">
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

          <Button disabled={submitState === "submitting"} size="lg" type="submit">
            {submitState === "submitting"
              ? mode === "sign-up"
                ? "Creating account..."
                : "Signing in..."
              : mode === "sign-up"
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const viewer = useViewer();

  useEffect(() => {
    if (viewer.isPending) {
      return;
    }

    if (viewer.data?.user) {
      void navigate({ replace: true, to: getAuthenticatedHomePath(viewer.data.user) });
    }
  }, [navigate, viewer.data?.user, viewer.isPending]);

  if (viewer.isPending) {
    return <LoadingPanel label="Checking session..." />;
  }

  if (viewer.data?.user) {
    return null;
  }

  return (
    <div className="grid gap-6">
      <PageIntro
        badge="Speak With Intent"
        description="English Coach combines guided role-play, open-ended practice, and reviewable session history so learners can move from scripted comfort to real conversational range without losing structure."
        title="Practice live spoken English with clear missions, real-time coaching, and review that keeps up with you."
        aside={
          <div className="grid gap-4 rounded-[24px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)]">
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                What changes here
              </span>
              <p className="text-sm leading-7 text-slate-300">
                Learners launch focused speaking sessions, track progress through transcript-first feedback, and return
                to previous conversations with concrete review cues instead of generic summaries.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="min-w-[10rem]">
                <Link to="/login">Start practicing</Link>
              </Button>
              <Button asChild variant="outline">
                <a href="#how-it-works">See how it works</a>
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="grid gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-100/80">Role-play</span>
          <h2 className="text-2xl text-white">Mission-based speaking practice</h2>
          <p className="text-sm leading-7 text-slate-300">
            Learners enter practical scenes with goals, characters, and lightweight progress tracking so each
            conversation has a clear outcome instead of vague practice time.
          </p>
        </Card>
        <Card className="grid gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80">Free-form</span>
          <h2 className="text-2xl text-white">Coach-led conversation without losing context</h2>
          <p className="text-sm leading-7 text-slate-300">
            Open practice stays grounded in a learner topic, then feeds short transcript-level hints that invite
            follow-up questions instead of interrupting the conversation.
          </p>
        </Card>
        <Card className="grid gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">Review</span>
          <h2 className="text-2xl text-white">History that stays useful</h2>
          <p className="text-sm leading-7 text-slate-300">
            Completed sessions remain visible with transcripts, review notes, and knowledge traces, making it easier to
            revisit what actually happened in the conversation.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]" id="how-it-works">
        <Card className="grid gap-5">
          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">How it works</span>
            <h2 className="text-3xl text-white">A practice loop built around speaking, not form fields</h2>
          </div>
          <div className="grid gap-4">
            {[
              {
                step: "01",
                title: "Pick a scenario or a context",
                description:
                  "Choose a role-play mission or jump into a free-form prompt that matches the learner’s current need.",
              },
              {
                step: "02",
                title: "Speak through the session live",
                description:
                  "The transcript stays primary while the interface surfaces light-touch cues beneath the turns that matter.",
              },
              {
                step: "03",
                title: "Review what actually happened",
                description:
                  "Learners can revisit ended sessions and connect errors, knowledge points, and coaching notes back to the conversation itself.",
              },
            ].map((item) => (
              <div className="grid gap-2 rounded-[22px] border border-white/10 bg-white/[0.03] p-4" key={item.step}>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold tracking-[0.2em] text-slate-200">
                    {item.step}
                  </span>
                  <h3 className="text-lg text-white">{item.title}</h3>
                </div>
                <p className="text-sm leading-7 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="grid gap-5">
          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">For teams</span>
            <h2 className="text-3xl text-white">Admins review and shape the practice surface</h2>
          </div>
          <p className="text-sm leading-7 text-slate-300">
            Scenario and knowledge management stay behind the authenticated admin flow, with review-driven curation so
            learner-facing content can grow without turning into an unmoderated dump of generated material.
          </p>
          <div className="grid gap-3">
            <div className="rounded-[20px] border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-7 text-amber-50">
              Admins land in scenario management after login, keeping publishing and review work separate from the
              learner browsing surface.
            </div>
            <div className="rounded-[20px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-50">
              Learners land directly in the scenario catalog, where practice starts quickly and session history remains
              review-first.
            </div>
          </div>
          <Button asChild className="w-full sm:w-fit">
            <Link to="/login">Open the auth screen</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
