import {
  communicativeFunctions,
  fixednessLevels,
  historyListResponseSchema,
  knowledgeItemListResponseSchema,
  knowledgeItemSchema,
  type Scenario,
  scenarioCharacterSchema,
  scenarioDialogueTurnSchema,
  scenarioGoalsSchema,
  scenarioPageResponseSchema,
  scenarioSchema,
  sessionTurnSchema,
  sessionTypeSchema,
  syntaxRoles,
  userRoles,
} from "@english-coach/contract";
import { MutationCache, QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { startTransition } from "react";
import { z } from "zod";
import { apiBaseUrl } from "./api-base-url";
import { resetGoalProgress, resetObservations } from "./livekit-packet-stores";
import type { ScenarioGenerateSubmissionItem } from "./scenario-generate-store";
import { saveSessionLaunchSnapshot } from "./session-launch-store";

export const roleToneMap = {
  admin: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  student: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
} as const;

export const sessionToneMap = {
  "free-form": "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  "role-play": "border-orange-300/20 bg-orange-300/10 text-orange-100",
} as const;

export const connectionStyles = {
  closed: "border-rose-500/30 bg-rose-500/10 text-rose-100",
  connecting: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  error: "border-orange-500/30 bg-orange-500/10 text-orange-100",
  open: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
} as const;

export const liveKitUrl = (import.meta.env as ImportMetaEnv & { VITE_LIVEKIT_URL?: string }).VITE_LIVEKIT_URL;

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

export type ViewerResponse = z.infer<typeof viewerResponseSchema>;
export type ViewerUser = NonNullable<ViewerResponse["user"]>;
export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;

export const viewerQueryKey = ["viewer"] as const;
export const scenariosQueryKey = ["scenarios"] as const;
export const historyQueryKey = ["history"] as const;
export const knowledgeItemsQueryKey = ["knowledge-items"] as const;
export { knowledgeItemSchema };

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

export async function apiJson<TSchema extends z.ZodTypeAny>(
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

export async function apiVoid(path: string, init?: RequestInit) {
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

export function formatTimestamp(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatClock(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString();
}

export function humanizeLabel(value?: string | null) {
  if (!value) {
    return "Unclassified";
  }

  return value.replaceAll("_", " ");
}

export function ellipsize(value: string, length: number) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 1)}...`;
}

export function createScenarioContextDocument(scenario: Scenario) {
  return `# ${scenario.title}\n\n${scenario.setting}\n\nFocus points:\n${scenario.goals.goals
    .map((goal) => `- ${goal.description}`)
    .join("\n")}`;
}

export function createSubmission(message: string, shouldFail: boolean): ScenarioGenerateSubmissionItem[] {
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

export function getJobStatusTone(status: "queued" | "started" | "completed" | "failed") {
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

export function isAdmin(user: ViewerUser | null | undefined) {
  return (user?.role ?? "student") === "admin";
}

export function getAuthenticatedHomePath(user: ViewerUser | null | undefined) {
  if (!user) {
    return "/login" as const;
  }

  return isAdmin(user) ? ("/admin/scenarios" as const) : ("/scenarios" as const);
}

export function useViewer() {
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

export function useScenarios() {
  return useQuery({
    queryKey: scenariosQueryKey,
    queryFn: () => apiJson("/api/scenarios?page=1&pageSize=100", scenarioPageResponseSchema),
  });
}

export function useScenario(scenarioId?: string) {
  return useQuery({
    queryKey: [...scenariosQueryKey, scenarioId],
    queryFn: () => apiJson(`/api/scenarios/${scenarioId}`, scenarioSchema),
    enabled: Boolean(scenarioId),
  });
}

export function useHistory() {
  return useQuery({
    queryKey: historyQueryKey,
    queryFn: () => apiJson("/api/history?page=1&pageSize=100", historyListResponseSchema),
  });
}

export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: [...historyQueryKey, sessionId],
    queryFn: () => apiJson(`/api/history/${sessionId}`, historyDetailSchema),
  });
}

export function useKnowledgeItems(source?: "admin" | "auto_generated") {
  const searchParams = new URLSearchParams({ page: "1", pageSize: "100" });

  if (source) {
    searchParams.set("source", source);
  }

  return useQuery({
    queryKey: [...knowledgeItemsQueryKey, source ?? "all"],
    queryFn: () => apiJson(`/api/admin/knowledge-items?${searchParams.toString()}`, knowledgeItemListResponseSchema),
  });
}

export function useSessionLauncher() {
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
