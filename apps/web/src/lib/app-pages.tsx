import {
  communicativeFunctions,
  fixednessLevels,
  type GoalProgressPacket,
  goalProgressPacketSchema,
  type Scenario,
  scenarioCharacterSchema,
  scenarioDialogueTurnSchema,
  scenarioGoalsSchema,
  scenarioSchema,
  sessionTurnSchema,
  sessionTypeSchema,
  syntaxRoles,
  uiUpdatePacketSchema,
  userRoles,
} from "@english-coach/contract";
import { Button } from "@english-coach/ui";
import {
  BarVisualizer,
  ConnectionStateToast,
  TrackToggle,
  useAgent,
  useSession,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react";
import { MutationCache, QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ConnectionState, type Room, RoomEvent, TokenSource, Track } from "livekit-client";
import { type FormEvent, type ReactNode, startTransition, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { z } from "zod";
import { AgentChatTranscript } from "../components/agents-ui/agent-chat-transcript";
import { AgentSessionProvider } from "../components/agents-ui/agent-session-provider";
import { formatAgentStateLabel } from "./agent-session-helpers";
import { apiBaseUrl } from "./api-base-url";
import { authClient } from "./auth-client";
import {
  appendObservation,
  resetGoalProgress,
  resetObservations,
  seedGoalProgress,
  updateGoalProgress,
  useGoalProgress,
  useObservations,
} from "./livekit-packet-stores";
import {
  type ScenarioGenerateSubmissionItem,
  scenarioGenerateStore,
  useScenarioGenerateStore,
} from "./scenario-generate-store";
import {
  getSessionLaunchSnapshot,
  removeSessionLaunchSnapshot,
  saveSessionLaunchSnapshot,
} from "./session-launch-store";

const roleToneMap = {
  admin: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  student: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
} as const;

const sessionToneMap = {
  "free-form": "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  "role-play": "border-orange-300/20 bg-orange-300/10 text-orange-100",
} as const;

const connectionStyles = {
  closed: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  connecting: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  error: "border-orange-500/30 bg-orange-500/10 text-orange-100",
  open: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
} as const;

const liveKitUrl = (import.meta.env as ImportMetaEnv & { VITE_LIVEKIT_URL?: string }).VITE_LIVEKIT_URL;

const paginatedResponseSchema = <TItem extends z.ZodTypeAny>(itemSchema: TItem) =>
  z.object({
    items: z.array(itemSchema),
    limit: z.number().int(),
    offset: z.number().int(),
    total: z.number().int(),
  });

const viewerUserSchema = z.object({
  email: z.string().email(),
  id: z.string(),
  name: z.string(),
  role: z.enum(userRoles).optional(),
});

const viewerResponseSchema = z.object({
  session: z.record(z.string(), z.unknown()).nullable(),
  user: viewerUserSchema.nullable(),
});

const sessionTokenResponseSchema = z.object({
  roomName: z.string().min(1),
  token: z.string().min(1),
});

export const rolePlaySearchSchema = z.object({
  character: z.coerce.number().int().min(0).max(1).optional(),
});

export const freeFormSearchSchema = z.object({
  scenarioId: z.string().min(1).optional(),
});

const knowledgeItemSchema = z.object({
  communicativeFunction: z.enum(communicativeFunctions).nullable(),
  createdAt: z.string(),
  example: z.string().nullable(),
  fixednessLevel: z.enum(fixednessLevels).nullable(),
  id: z.string(),
  pattern: z.string(),
  source: z.enum(["admin", "auto_generated"]),
  syntaxRole: z.enum(syntaxRoles).nullable(),
  updatedAt: z.string(),
});

const historySummarySchema = z.object({
  canReopen: z.boolean(),
  completedGoals: z.array(z.string()).nullable().optional(),
  endedAt: z.string().nullable(),
  freeFormContextId: z.string().nullable().optional(),
  id: z.string(),
  review: z.string().nullable(),
  scenarioId: z.string().nullable(),
  selectedCharacterIndex: z.number().nullable(),
  sessionType: sessionTypeSchema,
  startedAt: z.string(),
  title: z.string(),
  userId: z.string(),
});

const sessionScenarioSchema = z.object({
  characters: z.tuple([scenarioCharacterSchema, scenarioCharacterSchema]),
  exampleDialogue: z.array(scenarioDialogueTurnSchema),
  goals: scenarioGoalsSchema,
  id: z.string(),
  setting: z.string(),
  title: z.string(),
});

const sessionKnowledgeItemSchema = z.object({
  communicativeFunction: z.enum(communicativeFunctions).nullable(),
  count: z.number().int(),
  example: z.string().nullable(),
  examples: z.array(z.string()),
  fixednessLevel: z.enum(fixednessLevels).nullable(),
  id: z.string(),
  knowledgeItemId: z.string(),
  pattern: z.string(),
  source: z.enum(["admin", "auto_generated"]),
  speaker: z.enum(["user", "agent"]),
  syntaxRole: z.enum(syntaxRoles).nullable(),
});

const sessionErrorSchema = z.object({
  dimension: z.enum(["lexical", "syntactic", "pragmatic", "discourse", "phonological"]),
  errorDescription: z.string(),
  id: z.string(),
  sessionHistoryId: z.string(),
  suggestion: z.string(),
  utterance: z.string(),
});

const historyDetailSchema = z.object({
  contextDocument: z.string().optional(),
  errors: z.array(sessionErrorSchema),
  knowledgeItems: z.array(sessionKnowledgeItemSchema),
  session: z.object({
    canReopen: z.boolean(),
    completedGoals: z.array(z.string()).nullable().optional(),
    endedAt: z.string().nullable(),
    freeFormContextId: z.string().nullable().optional(),
    id: z.string(),
    review: z.string().nullable(),
    scenario: sessionScenarioSchema.nullable(),
    scenarioId: z.string().nullable(),
    selectedCharacterIndex: z.number().nullable(),
    sessionType: sessionTypeSchema,
    startedAt: z.string(),
    title: z.string(),
    userId: z.string(),
  }),
  transcript: z.array(sessionTurnSchema),
  transcriptCreatedAt: z.string().nullable(),
});

type ViewerResponse = z.infer<typeof viewerResponseSchema>;
type ViewerUser = NonNullable<ViewerResponse["user"]>;
type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;

const viewerQueryKey = ["viewer"] as const;
const scenariosQueryKey = ["scenarios"] as const;
const historyQueryKey = ["history"] as const;
const knowledgeItemsQueryKey = ["knowledge-items"] as const;

export const queryClient = new QueryClient({
  mutationCache: new MutationCache(),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 15_000,
    },
  },
});

function joinUrl(path: string) {
  return new URL(path, apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`).toString();
}

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;

  if (typeof payload?.error === "string") {
    return payload.error;
  }

  return `${response.status} ${response.statusText}`.trim();
}

async function apiJson<TSchema extends z.ZodTypeAny>(
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.infer<TSchema>> {
  const response = await fetch(joinUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return schema.parse((await response.json()) as unknown);
}

async function apiVoid(path: string, init?: RequestInit) {
  const response = await fetch(joinUrl(path), {
    credentials: "include",
    headers: {
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatClock(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString();
}

function humanizeLabel(value?: string | null) {
  if (!value) {
    return "Unclassified";
  }

  return value.replaceAll("_", " ");
}

function ellipsize(value: string, length: number) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 1)}...`;
}

function createScenarioContextDocument(scenario: Scenario) {
  return `# ${scenario.title}\n\n${scenario.setting}\n\nFocus points:\n${scenario.goals.goals
    .map((goal) => `- ${goal.description}`)
    .join("\n")}`;
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

function isAdmin(user: ViewerUser | null | undefined) {
  return (user?.role ?? "student") === "admin";
}

function useViewer() {
  return useQuery({
    queryKey: viewerQueryKey,
    queryFn: async () => {
      const response = await fetch(joinUrl("/api/session"), {
        credentials: "include",
      });

      if (response.status === 401) {
        return viewerResponseSchema.parse({ session: null, user: null });
      }

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      return viewerResponseSchema.parse((await response.json()) as unknown);
    },
  });
}

function useScenarios() {
  return useQuery({
    queryKey: scenariosQueryKey,
    queryFn: () => apiJson("/api/scenarios?limit=100", paginatedResponseSchema(scenarioSchema)),
  });
}

function useScenario(scenarioId?: string) {
  return useQuery({
    queryKey: [...scenariosQueryKey, scenarioId],
    queryFn: () => apiJson(`/api/scenarios/${scenarioId}`, scenarioSchema),
    enabled: Boolean(scenarioId),
  });
}

function useHistory() {
  return useQuery({
    queryKey: historyQueryKey,
    queryFn: () => apiJson("/api/history?limit=100", paginatedResponseSchema(historySummarySchema)),
  });
}

function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: [...historyQueryKey, sessionId],
    queryFn: () => apiJson(`/api/history/${sessionId}`, historyDetailSchema),
  });
}

function useKnowledgeItems(source?: "admin" | "auto_generated") {
  const searchParams = new URLSearchParams({ limit: "100" });

  if (source) {
    searchParams.set("source", source);
  }

  return useQuery({
    queryKey: [...knowledgeItemsQueryKey, source ?? "all"],
    queryFn: () =>
      apiJson(`/api/admin/knowledge-items?${searchParams.toString()}`, paginatedResponseSchema(knowledgeItemSchema)),
  });
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-slate-950/45 p-6 shadow-[0_24px_120px_rgba(8,15,30,0.32)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

function PageIntro({
  badge,
  title,
  description,
  aside,
}: {
  badge: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <Card className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
      <div className="grid gap-3">
        <span className="w-fit rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
          {badge}
        </span>
        <h1 className="max-w-4xl text-balance text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="max-w-3xl text-pretty text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
      </div>
      {aside ? <div>{aside}</div> : null}
    </Card>
  );
}

function PageState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="grid place-items-center px-6 py-16 text-center">
      <div className="grid max-w-xl gap-3">
        <h2 className="text-2xl text-white">{title}</h2>
        <p className="text-sm leading-7 text-slate-300">{description}</p>
      </div>
    </Card>
  );
}

function LoadingPanel({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="grid place-items-center px-6 py-12 text-center">
      <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200">{label}</div>
    </Card>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const viewer = useViewer();

  useEffect(() => {
    if (!viewer.isPending && !viewer.data?.user) {
      void navigate({ replace: true, to: "/login" });
    }
  }, [navigate, viewer.data?.user, viewer.isPending]);

  if (viewer.isPending) {
    return <LoadingPanel label="Checking session..." />;
  }

  if (!viewer.data?.user) {
    return null;
  }

  return <>{children}</>;
}

function AdminGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const viewer = useViewer();

  useEffect(() => {
    if (!viewer.isPending && !isAdmin(viewer.data?.user ?? null)) {
      void navigate({ replace: true, to: "/scenarios" });
    }
  }, [navigate, viewer.data?.user, viewer.isPending]);

  if (viewer.isPending) {
    return <LoadingPanel label="Checking permissions..." />;
  }

  if (!isAdmin(viewer.data?.user ?? null)) {
    return null;
  }

  return <>{children}</>;
}

function useSessionLauncher() {
  const navigate = useNavigate();

  const rolePlayLaunch = useMutation({
    mutationFn: async ({
      scenario,
      selectedCharacterIndex,
    }: {
      scenario: Scenario;
      selectedCharacterIndex: number;
    }) => {
      const payload = await apiJson("/api/sessions/token", sessionTokenResponseSchema, {
        body: JSON.stringify({
          scenarioId: scenario.id,
          selectedCharacterIndex,
          sessionType: sessionTypeSchema.enum["role-play"],
        }),
        method: "POST",
      });

      return { payload, scenario, selectedCharacterIndex };
    },
    onSuccess: ({ payload, scenario, selectedCharacterIndex }) => {
      resetGoalProgress(payload.roomName);
      resetObservations(payload.roomName);
      saveSessionLaunchSnapshot({
        launchedAt: new Date().toISOString(),
        roomName: payload.roomName,
        scenario,
        selectedCharacterIndex,
        sessionType: sessionTypeSchema.enum["role-play"],
        token: payload.token,
      });

      startTransition(() => {
        void navigate({ params: { roomName: payload.roomName }, to: "/session/$roomName" });
      });
    },
  });

  const freeFormLaunch = useMutation({
    mutationFn: async ({ contextDocument, scenario }: { contextDocument: string; scenario?: Scenario }) => {
      const payload = await apiJson("/api/sessions/token", sessionTokenResponseSchema, {
        body: JSON.stringify({
          contextDocument,
          sessionType: sessionTypeSchema.enum["free-form"],
        }),
        method: "POST",
      });

      return { contextDocument, payload, scenario };
    },
    onSuccess: ({ contextDocument, payload, scenario }) => {
      resetGoalProgress(payload.roomName);
      resetObservations(payload.roomName);
      saveSessionLaunchSnapshot({
        contextDocument,
        launchedAt: new Date().toISOString(),
        roomName: payload.roomName,
        scenario,
        sessionType: sessionTypeSchema.enum["free-form"],
        token: payload.token,
      });

      startTransition(() => {
        void navigate({ params: { roomName: payload.roomName }, to: "/session/$roomName" });
      });
    },
  });

  return {
    freeFormLaunch,
    rolePlayLaunch,
  };
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
      void navigate({ replace: true, to: "/scenarios" });
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

export function ScenarioBrowserPage() {
  const scenarios = useScenarios();

  return (
    <AuthGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Scenario Browser"
          description="Browse finished practice scenarios, study the example dialogue, then enter a voice session with a clear mission and real-time progress updates."
          title="Choose a scene that pushes the exact speaking behavior you want to improve."
          aside={
            <div className="grid gap-4">
              <dl className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-400">Available scenarios</dt>
                  <dd>{scenarios.data?.total ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-400">Practice modes</dt>
                  <dd>Role-play + free-form</dd>
                </div>
              </dl>
              <Button asChild variant="outline">
                <Link to="/free-form">Open Free-form</Link>
              </Button>
            </div>
          }
        />

        {scenarios.isPending ? <LoadingPanel label="Loading scenarios..." /> : null}
        {scenarios.error ? <PageState description={scenarios.error.message} title="Could not load scenarios" /> : null}
        {!scenarios.isPending && !scenarios.error && (scenarios.data?.items.length ?? 0) === 0 ? (
          <PageState
            description="No scenarios exist yet. An admin can generate them from the admin scenario page."
            title="No scenarios yet"
          />
        ) : null}

        {scenarios.data?.items.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {scenarios.data.items.map((scenario) => (
              <Card className="grid gap-5" key={scenario.id}>
                <div className="grid gap-3">
                  <span className="w-fit rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange-100">
                    {scenario.characters[0].name} / {scenario.characters[1].name}
                  </span>
                  <h2 className="text-2xl text-white">{scenario.title}</h2>
                  <p className="text-sm leading-7 text-slate-300">{ellipsize(scenario.setting, 180)}</p>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>{scenario.goals.goals.length} goals</span>
                  <span>{scenario.exampleDialogue.length} dialogue turns</span>
                </div>
                <Button asChild size="lg">
                  <Link params={{ scenarioId: scenario.id }} to="/scenarios/$scenarioId">
                    Start Practice
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </AuthGate>
  );
}

export function ScenarioDetailPage() {
  const { scenarioId } = useParams({ from: "/scenarios/$scenarioId/" });
  const scenario = useScenario(scenarioId);

  return (
    <AuthGate>
      {scenario.isPending ? <LoadingPanel label="Loading scenario..." /> : null}
      {scenario.error ? <PageState description={scenario.error.message} title="Could not load scenario" /> : null}
      {scenario.data ? (
        <div className="grid gap-8">
          <PageIntro
            badge="Study First"
            description={scenario.data.setting}
            title={scenario.data.title}
            aside={
              <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Characters</span>
                  <span>2</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Required goals</span>
                  <span>{scenario.data.goals.goals.filter((goal) => !goal.optional).length}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Optional goals</span>
                  <span>{scenario.data.goals.goals.filter((goal) => goal.optional).length}</span>
                </div>
              </div>
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="grid gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Example dialogue</h2>
                <p className="text-sm leading-7 text-slate-300">
                  Study the target exchange before you practise the scene out loud.
                </p>
              </div>

              <div className="grid gap-4">
                {scenario.data.exampleDialogue.map((turn) => (
                  <div
                    className={`grid gap-2 rounded-[22px] border px-4 py-4 ${
                      turn.speaker === "user" ? "border-cyan-300/20 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"
                    }`}
                    key={`${turn.speaker}:${turn.text}`}
                  >
                    <span className="text-xs uppercase tracking-[0.22em] text-slate-400">{turn.speaker}</span>
                    <p className="text-sm leading-7 text-slate-100">{turn.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="grid content-start gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Choose your role</h2>
                <p className="text-sm leading-7 text-slate-300">
                  Pick the character you will play. The agent automatically takes the other role.
                </p>
              </div>

              <div className="grid gap-4">
                {scenario.data.characters.map((character, index) => (
                  <Card className="grid gap-4 border-white/8 bg-white/[0.03] p-5" key={character.name}>
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Character {index + 1}</span>
                      <h3 className="text-xl text-white">{character.name}</h3>
                      <p className="text-sm leading-7 text-slate-300">{character.description}</p>
                    </div>
                    <Button asChild size="lg">
                      <Link
                        params={{ scenarioId: scenario.data.id }}
                        search={{ character: index }}
                        to="/scenarios/$scenarioId/practice/role-play"
                      >
                        Practice As {character.name}
                      </Link>
                    </Button>
                  </Card>
                ))}
              </div>

              <div className="rounded-[22px] border border-emerald-300/15 bg-emerald-300/10 p-5">
                <div className="grid gap-3">
                  <h3 className="text-lg text-white">Prefer a free-form coaching session?</h3>
                  <p className="text-sm leading-7 text-emerald-50/90">
                    Paste any context document and let the agent coach your speaking without a fixed mission flow.
                  </p>
                  <Button asChild variant="outline">
                    <Link search={{ scenarioId: scenario.data.id }} to="/free-form">
                      Open Free-form Setup
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </AuthGate>
  );
}

export function RolePlayPracticePage() {
  const { scenarioId } = useParams({ from: "/scenarios/$scenarioId/practice/role-play" });
  const { character } = useSearch({ from: "/scenarios/$scenarioId/practice/role-play" });
  const scenario = useScenario(scenarioId);
  const { rolePlayLaunch } = useSessionLauncher();
  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number | undefined>(character);

  useEffect(() => {
    setSelectedCharacterIndex(character);
  }, [character]);

  return (
    <AuthGate>
      {scenario.isPending ? <LoadingPanel label="Preparing role-play setup..." /> : null}
      {scenario.error ? <PageState description={scenario.error.message} title="Could not load scenario" /> : null}
      {scenario.data ? (
        <div className="grid gap-8">
          <PageIntro
            badge="Role-play Setup"
            description="Confirm your role, then the backend will mint a LiveKit token and dispatch the agent into a private room for this session."
            title={`Practice ${scenario.data.title} as a live mission-driven conversation.`}
          />

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="grid gap-4">
              <h2 className="text-2xl text-white">Select your character</h2>
              <div className="grid gap-4">
                {scenario.data.characters.map((characterOption, index) => {
                  const isSelected = selectedCharacterIndex === index;

                  return (
                    <button
                      className={`grid gap-2 rounded-[22px] border px-4 py-4 text-left transition ${
                        isSelected
                          ? "border-cyan-300/40 bg-cyan-300/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                      key={characterOption.name}
                      onClick={() => setSelectedCharacterIndex(index)}
                      type="button"
                    >
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Character {index + 1}</span>
                      <span className="text-xl text-white">{characterOption.name}</span>
                      <span className="text-sm leading-7 text-slate-300">{characterOption.description}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="grid gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Mission preview</h2>
                <p className="text-sm leading-7 text-slate-300">
                  Goals stay visible during the call and update from room data packets.
                </p>
              </div>
              <div className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-200">
                {scenario.data.goals.goals.map((goal) => (
                  <div className="flex items-center justify-between gap-4" key={goal.id}>
                    <span>{goal.description}</span>
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {goal.optional ? "optional" : "required"}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                disabled={selectedCharacterIndex === undefined || rolePlayLaunch.isPending}
                onClick={() => {
                  if (!scenario.data || selectedCharacterIndex === undefined) {
                    return;
                  }

                  void rolePlayLaunch.mutateAsync({
                    scenario: scenario.data,
                    selectedCharacterIndex,
                  });
                }}
                size="lg"
              >
                {rolePlayLaunch.isPending ? "Starting session..." : "Enter Voice Session"}
              </Button>
              {rolePlayLaunch.error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {rolePlayLaunch.error.message}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}
    </AuthGate>
  );
}

function FreeFormPracticePageContent({
  scenario,
  isScenarioPending,
  scenarioError,
}: {
  scenario?: Scenario;
  isScenarioPending?: boolean;
  scenarioError?: Error | null;
}) {
  const { freeFormLaunch } = useSessionLauncher();
  const [contextDocument, setContextDocument] = useState("");

  useEffect(() => {
    if (scenario && !contextDocument) {
      setContextDocument(createScenarioContextDocument(scenario));
    }
  }, [contextDocument, scenario]);

  return (
    <AuthGate>
      {isScenarioPending ? <LoadingPanel label="Preparing free-form setup..." /> : null}
      {scenarioError ? <PageState description={scenarioError.message} title="Could not load scenario" /> : null}
      {!isScenarioPending && !scenarioError ? (
        <div className="grid gap-8">
          <PageIntro
            badge="Free-form Setup"
            description="Paste any context you want the coach to use: a review report, article, lesson notes, or a scenario brief."
            title={
              scenario
                ? `Start a free-form coaching call grounded in ${scenario.title}.`
                : "Start a free-form coaching call from your own context."
            }
            aside={
              scenario ? (
                <div className="grid gap-3 rounded-[24px] border border-emerald-300/15 bg-emerald-300/10 p-5 text-sm text-emerald-50/90">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-emerald-100">Scenario seed</span>
                    <span className="rounded-full border border-emerald-200/20 bg-emerald-200/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-50">
                      optional
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <h2 className="text-xl text-white">{scenario.title}</h2>
                    <p>{ellipsize(scenario.setting, 180)}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Mode</span>
                    <span>Open coaching</span>
                  </div>
                  <p className="leading-7 text-slate-300">
                    Start from any notes, review summary, article, transcript, or prompt you want to practise around.
                  </p>
                </div>
              )
            }
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <Card className="grid gap-4">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Context document</h2>
                <p className="text-sm leading-7 text-slate-300">
                  The worker will turn this into live observations during the call.
                </p>
              </div>
              {scenario ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-emerald-300/15 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-50/90">
                  <span>Loaded from scenario seed. Edit it freely before you start.</span>
                  <button
                    className="rounded-full border border-emerald-100/20 px-3 py-1 text-xs uppercase tracking-[0.18em] transition hover:bg-emerald-100/10"
                    onClick={() => setContextDocument(createScenarioContextDocument(scenario))}
                    type="button"
                  >
                    Reset seed
                  </button>
                </div>
              ) : null}
              <textarea
                className="min-h-[24rem] rounded-[22px] border border-white/10 bg-slate-950/65 px-4 py-4 text-sm leading-7 text-slate-50 outline-none transition focus:border-cyan-300/40"
                onChange={(event) => setContextDocument(event.target.value)}
                placeholder="Paste context markdown here..."
                value={contextDocument}
              />
            </Card>

            <Card className="grid content-start gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl text-white">Preview</h2>
                <p className="text-sm leading-7 text-slate-300">
                  This is the coaching context the room session will receive.
                </p>
              </div>
              <div className="coach-prose max-h-[28rem] overflow-auto rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                <ReactMarkdown>{contextDocument || "No context yet."}</ReactMarkdown>
              </div>
              <Button
                disabled={!contextDocument.trim() || freeFormLaunch.isPending}
                onClick={() => {
                  void freeFormLaunch.mutateAsync({
                    contextDocument: contextDocument.trim(),
                    scenario,
                  });
                }}
                size="lg"
              >
                {freeFormLaunch.isPending ? "Starting session..." : "Start Free-form Session"}
              </Button>
              {freeFormLaunch.error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {freeFormLaunch.error.message}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      ) : null}
    </AuthGate>
  );
}

export function FreeFormPracticePage() {
  const { scenarioId } = useParams({ from: "/scenarios/$scenarioId/practice/free-form" });
  const scenario = useScenario(scenarioId);

  return (
    <FreeFormPracticePageContent
      isScenarioPending={scenario.isPending}
      scenario={scenario.data}
      scenarioError={scenario.error}
    />
  );
}

export function FreeFormPage() {
  const location = useLocation();
  const scenarioId = useMemo(() => {
    const value = new URLSearchParams(location.searchStr).get("scenarioId");

    return value?.trim() ? value : undefined;
  }, [location.searchStr]);
  const scenario = useScenario(scenarioId);

  return (
    <FreeFormPracticePageContent
      isScenarioPending={Boolean(scenarioId) && scenario.isPending}
      scenario={scenario.data}
      scenarioError={scenarioId ? scenario.error : null}
    />
  );
}

function MissionSidebar({
  roomName,
  scenario,
  selectedCharacterIndex,
}: {
  roomName: string;
  scenario: Scenario;
  selectedCharacterIndex: number | undefined;
}) {
  const goalProgress = useGoalProgress(roomName);
  const selectedCharacter =
    selectedCharacterIndex === undefined ? undefined : scenario.characters[selectedCharacterIndex];
  const agentCharacter =
    selectedCharacterIndex === undefined ? undefined : scenario.characters[selectedCharacterIndex === 0 ? 1 : 0];
  const goals = goalProgress?.goals ?? scenario.goals.goals.map((goal) => ({ ...goal, status: "incomplete" as const }));
  const currentGoalId = goalProgress?.currentGoalId ?? goals.find((goal) => goal.status === "incomplete")?.id ?? "";

  return (
    <div className="grid gap-5">
      <Card className="grid gap-4 p-5">
        <div className="grid gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Scene</span>
          <h2 className="text-xl text-white">{scenario.title}</h2>
          <p className="text-sm leading-7 text-slate-300">{scenario.setting}</p>
        </div>
        <div className="grid gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">You</span>
            <span>{selectedCharacter?.name ?? "Not selected"}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Agent</span>
            <span>{agentCharacter?.name ?? "Pending"}</span>
          </div>
        </div>
      </Card>

      <Card className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl text-white">Mission</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Live goals</span>
        </div>
        <div className="grid gap-3">
          {goals.map((goal) => {
            const isCurrent = goal.id === currentGoalId;
            const isComplete = goal.status === "complete";
            const slotChips = scenario.goals.goals.find((item) => item.id === goal.id)?.logic.required_slots ?? [];

            return (
              <div
                className={`grid gap-3 rounded-[20px] border px-4 py-4 transition ${
                  isComplete
                    ? "border-emerald-300/25 bg-emerald-300/10"
                    : isCurrent
                      ? "border-orange-300/30 bg-orange-300/10"
                      : "border-white/10 bg-white/[0.03]"
                }`}
                key={goal.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <span className="text-sm font-medium text-white">{goal.description}</span>
                    {goal.optional ? (
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Optional</span>
                    ) : null}
                  </div>
                  <span className="text-lg">{isComplete ? "✓" : isCurrent ? "•" : "○"}</span>
                </div>
                {slotChips.length ? (
                  <div className="flex flex-wrap gap-2">
                    {slotChips.map((slot) => {
                      const filledValue = goalProgress?.filledSlots[slot];

                      return (
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.15em] ${
                            filledValue
                              ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-100"
                              : "border-white/10 bg-white/[0.04] text-slate-400"
                          }`}
                          key={slot}
                        >
                          {filledValue ? `${slot}: ${filledValue}` : slot}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ObservationsSidebar({ roomName, contextDocument }: { roomName: string; contextDocument?: string }) {
  const observations = useObservations(roomName);

  return (
    <Card className="grid gap-4 p-5">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl text-white">Live observations</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Worker packets</span>
        </div>
        <p className="text-sm leading-7 text-slate-300">
          The worker appends observations here every few turns as it analyses the conversation.
        </p>
      </div>
      {contextDocument ? (
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Context preview</p>
          <p className="mt-2 leading-7">{ellipsize(contextDocument, 180)}</p>
        </div>
      ) : null}
      <div className="grid max-h-[32rem] gap-3 overflow-auto pr-1">
        {observations.items.length ? (
          observations.items.map((item) => (
            <div
              className="rounded-[20px] border border-emerald-300/15 bg-emerald-300/10 p-4"
              key={`${item.sessionHistoryId}:${item.observation}`}
            >
              <p className="text-sm leading-7 text-emerald-50">{item.observation}</p>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
            No live observations yet.
          </div>
        )}
      </div>
    </Card>
  );
}

function SessionPacketBridge({
  room,
  roomName,
  snapshot,
}: {
  room: Room;
  roomName: string;
  snapshot: ReturnType<typeof getSessionLaunchSnapshot>;
}) {
  const initialSeededRef = useRef(false);

  useEffect(() => {
    if (!snapshot || snapshot.sessionType !== "role-play" || !snapshot.scenario || initialSeededRef.current) {
      return;
    }

    const seedPacket: GoalProgressPacket = {
      currentGoalId: snapshot.scenario.goals.goals[0]?.id ?? "",
      filledSlots: {},
      goals: snapshot.scenario.goals.goals.map((goal) => ({
        description: goal.description,
        id: goal.id,
        optional: goal.optional,
        status: "incomplete",
      })),
      type: "goal-progress",
    };

    seedGoalProgress(roomName, seedPacket);
    initialSeededRef.current = true;
  }, [roomName, snapshot]);

  useEffect(() => {
    const decoder = new TextDecoder();
    const handlePacket = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(decoder.decode(payload)) as unknown;
        const parsedGoalProgress = goalProgressPacketSchema.safeParse(data);

        if (parsedGoalProgress.success) {
          updateGoalProgress(roomName, parsedGoalProgress.data);
          return;
        }

        const parsedUiUpdate = uiUpdatePacketSchema.safeParse(data);

        if (parsedUiUpdate.success) {
          appendObservation(roomName, parsedUiUpdate.data);
        }
      } catch {
        // Ignore packets that belong to other topics or payload shapes.
      }
    };

    room.on(RoomEvent.DataReceived, handlePacket);

    return () => {
      room.off(RoomEvent.DataReceived, handlePacket);
    };
  }, [room, roomName]);

  return null;
}

function SessionCenter({ roomName }: { roomName: string }) {
  const session = useSessionContext();
  const { isSending, messages, send } = useSessionMessages(session);
  const { microphoneTrack, state } = useAgent(session);
  const [chatMessage, setChatMessage] = useState("");

  const handleMessageSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedMessage = chatMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    await send(trimmedMessage);
    setChatMessage("");
  };

  return (
    <Card className="grid gap-6 p-6">
      <div className="grid gap-3 text-center">
        <span className="mx-auto w-fit rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange-100">
          Voice Session
        </span>
        <h1 className="text-3xl text-white sm:text-4xl">Room {roomName}</h1>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
          <span
            className={`rounded-full border px-3 py-1 ${
              connectionStyles[session.connectionState as keyof typeof connectionStyles]
            }`}
          >
            {session.connectionState}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">
            Agent {formatAgentStateLabel(state)}
          </span>
        </div>
      </div>

      <ConnectionStateToast className="lk-coach-toast" />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg text-white">Agent voice</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">LiveKit audio</span>
          </div>
          <div className="grid min-h-40 place-items-center rounded-[22px] border border-orange-300/15 bg-orange-300/10 p-6">
            {microphoneTrack ? (
              <BarVisualizer barCount={9} options={{ minHeight: 6 }} trackRef={microphoneTrack} />
            ) : (
              <span className="text-sm text-slate-400">Waiting for the agent audio track...</span>
            )}
          </div>
        </div>

        <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg text-white">Session controls</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Session provider</span>
          </div>
          <form
            className="grid gap-4 rounded-[22px] border border-cyan-300/15 bg-cyan-300/10 p-5"
            onSubmit={(event) => void handleMessageSend(event)}
          >
            <p className="text-sm leading-7 text-slate-200">
              The room now runs through LiveKit session management, so chat and transcript updates come from the session
              message stream.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <TrackToggle
                className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 transition hover:border-cyan-300/40"
                source={Track.Source.Microphone}
              >
                Toggle microphone
              </TrackToggle>
              <Button
                onClick={() => {
                  void session.end();
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                Leave session
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <label className="grid gap-2 text-sm text-slate-200">
                <span className="font-medium">Send a text message</span>
                <textarea
                  className="min-h-24 rounded-[18px] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-cyan-300/40"
                  onChange={(event) => setChatMessage(event.target.value)}
                  placeholder="Type if you want to steer the session with text as well as voice."
                  value={chatMessage}
                />
              </label>
              <Button disabled={isSending || !chatMessage.trim()} size="lg" type="submit">
                {isSending ? "Sending..." : "Send message"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid gap-4 rounded-[24px] border border-white/10 bg-slate-950/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg text-white">Session transcript</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Agent messages API</span>
        </div>
        <div className="max-h-[28rem] overflow-auto pr-1">
          <AgentChatTranscript messages={messages} agentState={state} />
        </div>
      </div>
    </Card>
  );
}

function SessionExperience({
  roomName,
  serverUrl,
  snapshot,
}: {
  roomName: string;
  serverUrl: string;
  snapshot: NonNullable<ReturnType<typeof getSessionLaunchSnapshot>>;
}) {
  const navigate = useNavigate();
  const [startError, setStartError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const tokenSource = useMemo(
    () =>
      TokenSource.literal({
        participantToken: snapshot.token,
        serverUrl,
      }),
    [serverUrl, snapshot.token],
  );
  const session = useSession(tokenSource);
  const startSession = session.start;
  const endSession = session.end;

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    const startTimeout = window.setTimeout(() => {
      void startSession({ signal: abortController.signal })
        .then(() => {
          if (!isMounted || abortController.signal.aborted) {
            return;
          }

          startedRef.current = true;
          setStartError(null);
        })
        .catch((error: unknown) => {
          if (!isMounted || abortController.signal.aborted) {
            return;
          }

          setStartError(error instanceof Error ? error.message : "Failed to start the LiveKit session");
        });
    }, 0);

    return () => {
      isMounted = false;
      abortController.abort();
      window.clearTimeout(startTimeout);
      void endSession().catch(() => {
        // Ignore shutdown errors during navigation.
      });
    };
  }, [endSession, startSession]);

  useEffect(() => {
    if (session.connectionState !== ConnectionState.Disconnected || !startedRef.current) {
      return;
    }

    removeSessionLaunchSnapshot(roomName);
    resetGoalProgress(roomName);
    resetObservations(roomName);
    startTransition(() => {
      void navigate({ replace: true, to: "/history" });
    });
  }, [navigate, roomName, session.connectionState]);

  if (startError) {
    return <PageState description={startError} title="Could not start the voice session" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
      <AgentSessionProvider session={session}>
        <SessionPacketBridge room={session.room} roomName={roomName} snapshot={snapshot} />
        <SessionCenter roomName={roomName} />
        {snapshot.sessionType === "role-play" && snapshot.scenario ? (
          <MissionSidebar
            roomName={roomName}
            scenario={snapshot.scenario}
            selectedCharacterIndex={snapshot.selectedCharacterIndex}
          />
        ) : (
          <ObservationsSidebar contextDocument={snapshot.contextDocument} roomName={roomName} />
        )}
      </AgentSessionProvider>
    </div>
  );
}

export function SessionPage() {
  const { roomName } = useParams({ from: "/session/$roomName" });
  const snapshot = getSessionLaunchSnapshot(roomName);

  if (!snapshot) {
    return (
      <AuthGate>
        <PageState
          description="The room launch snapshot is missing. Start a new practice session from a scenario or history page."
          title="Session context not found"
        />
      </AuthGate>
    );
  }

  if (!liveKitUrl) {
    return (
      <AuthGate>
        <PageState
          description="Set VITE_LIVEKIT_URL for the web app so the client can connect to the room URL that matches the minted token."
          title="LiveKit URL is not configured"
        />
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <SessionExperience roomName={roomName} serverUrl={liveKitUrl} snapshot={snapshot} />
    </AuthGate>
  );
}

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

export function AdminScenarioPage() {
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const scenarios = useScenarios();
  const store = useScenarioGenerateStore();
  const [message, setMessage] = useState(
    [
      "Role-play a difficult customer call about a refund.",
      "Practice a tense salary negotiation with your manager.",
      "Handle a product demo with a skeptical enterprise buyer.",
    ].join("\n"),
  );
  const [shouldFail, setShouldFail] = useState(false);
  const batchItems = createSubmission(message, shouldFail);
  const deleteScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      await apiVoid(`/api/scenarios/${scenarioId}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: scenariosQueryKey });
    },
  });

  useEffect(() => {
    scenarioGenerateStore.connect();

    return () => {
      scenarioGenerateStore.disconnect();
    };
  }, []);

  return (
    <AdminGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Admin Scenarios"
          description="Generate scenarios in batches over SSE, watch queue progress live, and manage the final scenario catalog from the same page."
          title="Control the practice library from a single scenario generation console."
          aside={
            <dl className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Events URL</dt>
                <dd className="max-w-[65%] truncate text-right">{store.eventsUrl}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Connection</dt>
                <dd>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${connectionStyles[store.connectionState]}`}
                  >
                    {store.connectionState}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Operator</dt>
                <dd>{viewer.data?.user?.email}</dd>
              </div>
            </dl>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card className="grid gap-5">
            <div className="grid gap-2">
              <h2 className="text-2xl text-white">Generate more</h2>
              <p className="text-sm leading-7 text-slate-300">
                Enter one scenario prompt per line and queue the batch.
              </p>
            </div>
            <textarea
              className="min-h-44 rounded-[22px] border border-white/10 bg-slate-950/65 px-4 py-4 text-sm leading-7 text-slate-50 outline-none transition focus:border-cyan-300/40"
              onChange={(event) => setMessage(event.target.value)}
              value={message}
            />
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
                disabled={store.submitState === "submitting" || batchItems.length === 0}
                onClick={() => void scenarioGenerateStore.submit(batchItems)}
                size="lg"
              >
                {store.submitState === "submitting" ? "Submitting..." : `Queue ${batchItems.length} jobs`}
              </Button>
              <Button
                onClick={() => void queryClient.invalidateQueries({ queryKey: scenariosQueryKey })}
                variant="outline"
              >
                Refresh scenarios
              </Button>
            </div>
          </Card>

          <Card className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl text-white">Live queue state</h2>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {store.jobs.length} jobs tracked
              </span>
            </div>
            <div className="grid gap-3">
              {store.jobs.length ? (
                store.jobs.map((job) => (
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4" key={job.jobId}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="max-w-[68%] truncate text-sm text-white">{job.message}</span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getJobStatusTone(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,197,94,0.7),rgba(56,189,248,0.95))] transition-[width] duration-500"
                        style={{ width: `${Math.max(job.progress, 4)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500">
                      <span>{job.progress}%</span>
                      <span>{formatClock(job.updatedAt)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                  No queued jobs yet.
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card className="grid gap-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl text-white">Scenario catalog</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {scenarios.data?.total ?? 0} scenarios
            </span>
          </div>
          {scenarios.isPending ? <LoadingPanel label="Loading scenarios..." /> : null}
          {scenarios.error ? (
            <PageState description={scenarios.error.message} title="Could not load scenarios" />
          ) : null}
          {scenarios.data?.items.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {scenarios.data.items.map((scenario) => (
                <div className="grid gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-5" key={scenario.id}>
                  <div className="grid gap-2">
                    <h3 className="text-xl text-white">{scenario.title}</h3>
                    <p className="text-sm leading-7 text-slate-300">{ellipsize(scenario.setting, 150)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span>{scenario.goals.goals.length} goals</span>
                    <span>{scenario.updatedAt.slice(0, 10)}</span>
                  </div>
                  <div className="flex gap-3">
                    <Button asChild variant="outline">
                      <Link params={{ scenarioId: scenario.id }} to="/scenarios/$scenarioId">
                        Preview
                      </Link>
                    </Button>
                    <Button
                      disabled={deleteScenario.isPending}
                      onClick={() => void deleteScenario.mutateAsync(scenario.id)}
                      variant="outline"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </AdminGate>
  );
}

function KnowledgeItemRow({ item }: { item: KnowledgeItem }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<KnowledgeItem>(item);
  const saveMutation = useMutation({
    mutationFn: async (nextItem: KnowledgeItem) => {
      return apiJson(`/api/admin/knowledge-items/${nextItem.id}`, knowledgeItemSchema, {
        body: JSON.stringify({
          communicativeFunction: nextItem.communicativeFunction,
          example: nextItem.example,
          fixednessLevel: nextItem.fixednessLevel,
          pattern: nextItem.pattern,
          source: nextItem.source === "auto_generated" ? "admin" : nextItem.source,
          syntaxRole: nextItem.syntaxRole,
        }),
        method: "PATCH",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeItemsQueryKey });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (knowledgeItemId: string) => {
      await apiVoid(`/api/admin/knowledge-items/${knowledgeItemId}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: knowledgeItemsQueryKey });
    },
  });

  useEffect(() => {
    setDraft(item);
  }, [item]);

  return (
    <tr className="border-t border-white/10 align-top">
      <td className="px-3 py-3">
        <textarea
          className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
          onChange={(event) => setDraft((current) => ({ ...current, pattern: event.target.value }))}
          value={draft.pattern}
        />
      </td>
      <td className="px-3 py-3">
        <select
          className="w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              syntaxRole: event.target.value ? (event.target.value as KnowledgeItem["syntaxRole"]) : null,
            }))
          }
          value={draft.syntaxRole ?? ""}
        >
          <option value="">Unset</option>
          {syntaxRoles.map((value) => (
            <option key={value} value={value}>
              {humanizeLabel(value)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          className="w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              fixednessLevel: event.target.value ? (event.target.value as KnowledgeItem["fixednessLevel"]) : null,
            }))
          }
          value={draft.fixednessLevel ?? ""}
        >
          <option value="">Unset</option>
          {fixednessLevels.map((value) => (
            <option key={value} value={value}>
              {humanizeLabel(value)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          className="w-full rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              communicativeFunction: event.target.value
                ? (event.target.value as KnowledgeItem["communicativeFunction"])
                : null,
            }))
          }
          value={draft.communicativeFunction ?? ""}
        >
          <option value="">Unset</option>
          {communicativeFunctions.map((value) => (
            <option key={value} value={value}>
              {humanizeLabel(value)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <div className="grid gap-3">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-center text-xs uppercase tracking-[0.18em] text-slate-300">
            {draft.source}
          </span>
          <Button
            disabled={saveMutation.isPending}
            onClick={() => void saveMutation.mutateAsync(draft)}
            variant="outline"
          >
            {saveMutation.isPending ? "Saving..." : draft.source === "auto_generated" ? "Promote + save" : "Save"}
          </Button>
          <Button
            disabled={deleteMutation.isPending}
            onClick={() => void deleteMutation.mutateAsync(draft.id)}
            variant="outline"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function AdminKnowledgeItemsPage() {
  const queryClient = useQueryClient();
  const [sourceFilter, setSourceFilter] = useState<"all" | "admin" | "auto_generated">("all");
  const [newItem, setNewItem] = useState({
    communicativeFunction: "" as string,
    example: "",
    fixednessLevel: "" as string,
    pattern: "",
    syntaxRole: "" as string,
  });
  const items = useKnowledgeItems(sourceFilter === "all" ? undefined : sourceFilter);
  const createMutation = useMutation({
    mutationFn: async () => {
      return apiJson("/api/admin/knowledge-items", knowledgeItemSchema, {
        body: JSON.stringify({
          communicativeFunction: newItem.communicativeFunction || null,
          example: newItem.example.trim() || null,
          fixednessLevel: newItem.fixednessLevel || null,
          pattern: newItem.pattern.trim(),
          syntaxRole: newItem.syntaxRole || null,
        }),
        method: "POST",
      });
    },
    onSuccess: async () => {
      setNewItem({ communicativeFunction: "", example: "", fixednessLevel: "", pattern: "", syntaxRole: "" });
      await queryClient.invalidateQueries({ queryKey: knowledgeItemsQueryKey });
    },
  });

  return (
    <AdminGate>
      <div className="grid gap-8">
        <PageIntro
          badge="Admin Knowledge"
          description="Review automatically extracted language patterns, classify them, and promote approved items into the curated admin vocabulary set."
          title="Maintain the phrase inventory the learner sees after each session."
        />

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="grid gap-4">
            <h2 className="text-2xl text-white">Create item</h2>
            <textarea
              className="min-h-28 rounded-[22px] border border-white/10 bg-slate-950/65 px-4 py-4 text-sm leading-7 text-slate-50 outline-none"
              onChange={(event) => setNewItem((current) => ({ ...current, pattern: event.target.value }))}
              placeholder="Pattern, e.g. I'd like <np>"
              value={newItem.pattern}
            />
            <textarea
              className="min-h-24 rounded-[22px] border border-white/10 bg-slate-950/65 px-4 py-4 text-sm leading-7 text-slate-50 outline-none"
              onChange={(event) => setNewItem((current) => ({ ...current, example: event.target.value }))}
              placeholder="Example sentence"
              value={newItem.example}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <select
                className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
                onChange={(event) => setNewItem((current) => ({ ...current, syntaxRole: event.target.value }))}
                value={newItem.syntaxRole}
              >
                <option value="">Syntax role</option>
                {syntaxRoles.map((value) => (
                  <option key={value} value={value}>
                    {humanizeLabel(value)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
                onChange={(event) => setNewItem((current) => ({ ...current, fixednessLevel: event.target.value }))}
                value={newItem.fixednessLevel}
              >
                <option value="">Fixedness</option>
                {fixednessLevels.map((value) => (
                  <option key={value} value={value}>
                    {humanizeLabel(value)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, communicativeFunction: event.target.value }))
                }
                value={newItem.communicativeFunction}
              >
                <option value="">Function</option>
                {communicativeFunctions.map((value) => (
                  <option key={value} value={value}>
                    {humanizeLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={!newItem.pattern.trim() || createMutation.isPending}
              onClick={() => void createMutation.mutateAsync()}
              size="lg"
            >
              {createMutation.isPending ? "Creating..." : "Add knowledge item"}
            </Button>
          </Card>

          <Card className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl text-white">Review queue</h2>
              <select
                className="rounded-xl border border-white/10 bg-slate-950/65 px-3 py-2 text-sm text-slate-50 outline-none"
                onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}
                value={sourceFilter}
              >
                <option value="all">All sources</option>
                <option value="auto_generated">Auto-generated</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {items.isPending ? <LoadingPanel label="Loading knowledge items..." /> : null}
            {items.error ? (
              <PageState description={items.error.message} title="Could not load knowledge items" />
            ) : null}
            {items.data?.items.length ? (
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-200">
                    <thead className="bg-white/[0.04] text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-3 py-3 font-medium">Pattern</th>
                        <th className="px-3 py-3 font-medium">Syntax</th>
                        <th className="px-3 py-3 font-medium">Fixedness</th>
                        <th className="px-3 py-3 font-medium">Function</th>
                        <th className="px-3 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.data.items.map((item) => (
                        <KnowledgeItemRow item={item} key={item.id} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </AdminGate>
  );
}

export function HomeRedirectPage() {
  const navigate = useNavigate();
  const viewer = useViewer();

  useEffect(() => {
    if (viewer.isPending) {
      return;
    }

    void navigate({ replace: true, to: viewer.data?.user ? "/scenarios" : "/login" });
  }, [navigate, viewer.data?.user, viewer.isPending]);

  return <LoadingPanel label="Opening English Coach..." />;
}

export function RootLayout() {
  const location = useLocation();
  const viewer = useViewer();
  const queryClient = useQueryClient();
  const [signOutState, setSignOutState] = useState<"idle" | "submitting">("idle");

  const navItems: Array<{
    label: string;
    to: "/scenarios" | "/free-form" | "/history" | "/admin/scenarios" | "/admin/knowledge-items";
  }> = [
    { label: "Scenarios", to: "/scenarios" as const },
    { label: "Free-form", to: "/free-form" as const },
    { label: "History", to: "/history" as const },
  ];

  if (isAdmin(viewer.data?.user ?? null)) {
    navItems.push({ label: "Admin Scenarios", to: "/admin/scenarios" });
    navItems.push({ label: "Admin Knowledge", to: "/admin/knowledge-items" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#08111f] text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_24%),radial-gradient(circle_at_left,_rgba(14,165,233,0.18),_transparent_28%),linear-gradient(135deg,_rgba(8,17,31,0.97),_rgba(10,24,42,0.98))]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[92rem] flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.045] px-5 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link className="text-xl font-semibold text-white" to="/scenarios">
              English Coach
            </Link>
            {viewer.data?.user ? (
              <span
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${roleToneMap[viewer.data.user.role ?? "student"]}`}
              >
                {viewer.data.user.role ?? "student"}
              </span>
            ) : null}
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-between gap-4 lg:justify-end">
            {viewer.data?.user ? (
              <nav className="flex flex-wrap items-center gap-2">
                {navItems.map((item) => {
                  const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                  return (
                    <Link
                      className={`rounded-full px-3 py-2 text-sm transition ${
                        active
                          ? "bg-white text-slate-950"
                          : "border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]"
                      }`}
                      key={item.to}
                      to={item.to}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              {viewer.data?.user ? (
                <>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
                    {viewer.data.user.name} · {viewer.data.user.email}
                  </span>
                  <Button
                    disabled={signOutState === "submitting"}
                    onClick={() => {
                      setSignOutState("submitting");
                      void authClient
                        .signOut()
                        .then(async () => {
                          await queryClient.invalidateQueries({ queryKey: viewerQueryKey });
                          await queryClient.invalidateQueries({ queryKey: historyQueryKey });
                          await queryClient.invalidateQueries({ queryKey: scenariosQueryKey });
                        })
                        .finally(() => {
                          setSignOutState("idle");
                        });
                    }}
                    variant="outline"
                  >
                    {signOutState === "submitting" ? "Signing out..." : "Sign out"}
                  </Button>
                </>
              ) : (
                <Button asChild variant="outline">
                  <Link to="/login">Sign in</Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
