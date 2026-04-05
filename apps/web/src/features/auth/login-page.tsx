import { Button } from "@english-coach/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { getAuthenticatedHomePath, useViewer, viewerQueryKey } from "../../lib/app-data";
import { Card, PageIntro } from "../../lib/app-shell";
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

        <div className="text-sm text-slate-300">
          Need context first?{" "}
          <Link className="text-cyan-200 underline-offset-4 hover:underline" to="/">
            Go back to the overview
          </Link>
        </div>
      </Card>
    </div>
  );
}
