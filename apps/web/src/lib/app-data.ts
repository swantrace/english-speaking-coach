import {
  adminKnowledgeOccurrencesResponseSchema,
  adminScenarioListResponseSchema,
  defaultScenarioCursorPageSize,
  historyDetailResponseSchema,
  historyDetailTabSchema,
  historyListResponseSchema,
  historyListSortBySchema,
  knowledgeGenerateSubmissionHistoryResponseSchema,
  knowledgeItemListResponseSchema,
  knowledgeItemListSortBySchema,
  knowledgeItemSchema,
  knowledgePointDetailSchema,
  knowledgePointListResponseSchema,
  knowledgePointListSortBySchema,
  type Scenario,
  scenarioCursorResponseSchema,
  scenarioListSortBySchema,
  scenarioPageResponseSchema,
  scenarioSchema,
  sessionTypeSchema,
  userRoles,
} from "@english-coach/contract";
import { MutationCache, QueryClient, useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { startTransition } from "react";
import { z } from "zod";
import { apiBaseUrl } from "./api-base-url";
import { resetGoalProgress, resetObservations } from "./livekit-packet-stores";
import { saveSessionLaunchSnapshot } from "./session-launch-store";

export const roleToneMap = {
  admin: "border-amber-300 bg-amber-100 text-amber-900",
  student: "border-cyan-300 bg-cyan-100 text-cyan-900",
} as const;

export const sessionToneMap = {
  "free-form": "border-emerald-300 bg-emerald-100 text-emerald-900",
  "role-play": "border-orange-300 bg-orange-100 text-orange-900",
} as const;

export const connectionStyles = {
  closed: "border-rose-300 bg-rose-100 text-rose-900",
  connecting: "border-amber-300 bg-amber-100 text-amber-900",
  error: "border-orange-300 bg-orange-100 text-orange-900",
  open: "border-emerald-300 bg-emerald-100 text-emerald-900",
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

const optionalRouteSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(200).optional());

export const learnerScenariosSearchSchema = z.object({
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: optionalRouteSearchSchema,
});

export const historyListSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalRouteSearchSchema,
  sessionType: sessionTypeSchema.optional(),
  sortBy: historyListSortBySchema.default("startedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const historyDetailSearchSchema = z.object({
  tab: historyDetailTabSchema.default("review"),
  turn: z.coerce.number().int().min(0).optional(),
});

export const adminScenariosSearchSchema = z.object({
  isPendingReview: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalRouteSearchSchema,
  sortBy: scenarioListSortBySchema.default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  tab: z.enum(["manage", "generate"]).default("manage"),
});

export const adminKnowledgeItemsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalRouteSearchSchema,
  sortBy: knowledgeItemListSortBySchema.default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  tab: z.enum(["manage", "generate", "occurrences"]).default("manage"),
});

export const adminKnowledgeOccurrencesSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalRouteSearchSchema,
});

export const knowledgePointsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalRouteSearchSchema,
  sortBy: knowledgePointListSortBySchema.default("lastSeenAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const freeFormSearchSchema = z.object({
  scenarioId: z.string().min(1).optional(),
});

export type ViewerResponse = z.infer<typeof viewerResponseSchema>;
export type ViewerUser = NonNullable<ViewerResponse["user"]>;
export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;

export const viewerQueryKey = ["viewer"] as const;
export const scenariosQueryKey = ["scenarios"] as const;
export const adminScenariosQueryKey = ["admin-scenarios"] as const;
export const historyQueryKey = ["history"] as const;
export const knowledgeItemsQueryKey = ["knowledge-items"] as const;
export const knowledgeOccurrencesQueryKey = ["knowledge-occurrences"] as const;
export const knowledgePointsQueryKey = ["knowledge-points"] as const;
export const knowledgeGenerateHistoryQueryKey = ["knowledge-generate-history"] as const;
export { knowledgeItemSchema };

function appendSearchParam(searchParams: URLSearchParams, key: string, value: string | number | boolean | undefined) {
  if (value === undefined || value === "") {
    return;
  }

  searchParams.set(key, String(value));
}

function createSearchParams(values: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    appendSearchParam(searchParams, key, value);
  });

  return searchParams;
}

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

export function createSubmission(message: string) {
  return message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      message: line,
      queuedAt: new Date().toISOString(),
    }));
}

export function getJobStatusTone(status: "queued" | "started" | "completed" | "failed") {
  if (status === "completed") {
    return "border-emerald-300 bg-emerald-100 text-emerald-900";
  }

  if (status === "started") {
    return "border-amber-300 bg-amber-100 text-amber-900";
  }

  if (status === "failed") {
    return "border-rose-300 bg-rose-100 text-rose-900";
  }

  return "border-sky-300 bg-sky-100 text-sky-900";
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
  return useLearnerScenarios({ page: 1, pageSize: 100, sortBy: "updatedAt", sortDirection: "desc" });
}

export function useInfiniteLearnerScenarios(query: z.infer<typeof learnerScenariosSearchSchema>) {
  const pageSize = query.pageSize ?? defaultScenarioCursorPageSize;

  return useInfiniteQuery({
    queryKey: [...scenariosQueryKey, "infinite", { pageSize, search: query.search }],
    queryFn: ({ pageParam }) => {
      const searchParams = createSearchParams({
        cursor: typeof pageParam === "string" ? pageParam : undefined,
        pageSize,
        pagination: "cursor",
        search: query.search,
      });

      return apiJson(`/api/learner/scenarios?${searchParams.toString()}`, scenarioCursorResponseSchema);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });
}

export function useLearnerScenarios(query: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy: z.infer<typeof scenarioListSortBySchema>;
  sortDirection: "asc" | "desc";
}) {
  const searchParams = createSearchParams({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });

  return useQuery({
    queryKey: [...scenariosQueryKey, query],
    queryFn: () => apiJson(`/api/learner/scenarios?${searchParams.toString()}`, scenarioPageResponseSchema),
  });
}

export function useAdminScenarios(query: z.infer<typeof adminScenariosSearchSchema>) {
  const searchParams = createSearchParams({
    isPendingReview: query.isPendingReview ?? true,
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });

  return useQuery({
    queryKey: [...adminScenariosQueryKey, query],
    queryFn: () => apiJson(`/api/admin/scenarios?${searchParams.toString()}`, adminScenarioListResponseSchema),
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
  return useHistoryList({ page: 1, pageSize: 100, sortBy: "startedAt", sortDirection: "desc" });
}

export function useHistoryList(query: z.infer<typeof historyListSearchSchema>) {
  const searchParams = createSearchParams({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    sessionType: query.sessionType,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });

  return useQuery({
    queryKey: [...historyQueryKey, query],
    queryFn: () => apiJson(`/api/history?${searchParams.toString()}`, historyListResponseSchema),
  });
}

export function useSessionDetail(sessionId: string) {
  return useQuery({
    queryKey: [...historyQueryKey, sessionId],
    queryFn: () => apiJson(`/api/history/${sessionId}`, historyDetailResponseSchema),
  });
}

export function useKnowledgeItems(source?: "admin" | "auto_generated") {
  void source;
  return useKnowledgeItemsList({
    page: 1,
    pageSize: 100,
    sortBy: "updatedAt",
    sortDirection: "desc",
    tab: "manage",
  });
}

export function useKnowledgePoints(query: z.infer<typeof knowledgePointsSearchSchema>) {
  const searchParams = createSearchParams({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });

  return useQuery({
    queryKey: [...knowledgePointsQueryKey, query],
    queryFn: () => apiJson(`/api/knowledge-points?${searchParams.toString()}`, knowledgePointListResponseSchema),
  });
}

export function useKnowledgePointDetail(knowledgeItemId?: string) {
  return useQuery({
    queryKey: [...knowledgePointsQueryKey, knowledgeItemId],
    queryFn: () => apiJson(`/api/knowledge-points/${knowledgeItemId}`, knowledgePointDetailSchema),
    enabled: Boolean(knowledgeItemId),
  });
}

export function useKnowledgeItemsList(query: z.infer<typeof adminKnowledgeItemsSearchSchema>) {
  const searchParams = createSearchParams({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });

  return useQuery({
    queryKey: [...knowledgeItemsQueryKey, query],
    queryFn: () => apiJson(`/api/admin/knowledge-items?${searchParams.toString()}`, knowledgeItemListResponseSchema),
  });
}

export function useUnresolvedKnowledgeOccurrences(query: z.infer<typeof adminKnowledgeOccurrencesSearchSchema>) {
  const searchParams = createSearchParams({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search,
  });

  return useQuery({
    queryKey: [...knowledgeOccurrencesQueryKey, query],
    queryFn: () =>
      apiJson(`/api/admin/knowledge-occurrences?${searchParams.toString()}`, adminKnowledgeOccurrencesResponseSchema),
  });
}

export function useKnowledgeGenerateHistory(limit = 8, jobsPerSubmission = 5) {
  const searchParams = createSearchParams({
    jobsPerSubmission,
    limit,
  });

  return useQuery({
    queryKey: [...knowledgeGenerateHistoryQueryKey, { jobsPerSubmission, limit }],
    queryFn: () =>
      apiJson(
        `/api/admin/knowledge-items/generate/submissions?${searchParams.toString()}`,
        knowledgeGenerateSubmissionHistoryResponseSchema,
      ),
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
