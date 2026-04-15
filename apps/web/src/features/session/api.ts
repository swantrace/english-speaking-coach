import {
  type CreateFreeFormSessionInput,
  type CreateRolePlaySessionInput,
  type CreateSessionResult,
  createFreeFormSessionInputSchema,
  createRolePlaySessionInputSchema,
  createSessionResultSchema,
  type EndSessionResult,
  endSessionResultSchema,
  type HistoryDetailResponse,
  type HistoryListQuery,
  type HistoryListResponse,
  historyDetailResponseSchema,
  historyListQuerySchema,
  historyListResponseSchema,
  type LiveSessionBootstrap,
  liveSessionBootstrapSchema,
} from "@english-coach/contract/session";
import { apiClient } from "@/lib/axios";
import { normalizeHistoryListQueryKeyInput } from "@/lib/query-keys";
import type { SessionHistoryFilters } from "./types";

const sessionEndpoints = {
  create: "/api/sessions/token",
  end: (sessionId: string) => `/api/sessions/${sessionId}/end`,
  historyDetail: (sessionId: string) => `/api/history/${sessionId}`,
  historyList: "/api/history",
  liveBootstrap: (sessionId: string) => `/api/sessions/${sessionId}/live`,
} as const;

async function postCreateSession(payload: CreateFreeFormSessionInput | CreateRolePlaySessionInput) {
  const response = await apiClient.post(sessionEndpoints.create, payload);
  return createSessionResultSchema.parse(response.data);
}

export async function createRolePlaySession(input: CreateRolePlaySessionInput): Promise<CreateSessionResult> {
  return postCreateSession(createRolePlaySessionInputSchema.parse(input));
}

export async function createFreeFormSession(input: CreateFreeFormSessionInput): Promise<CreateSessionResult> {
  return postCreateSession(createFreeFormSessionInputSchema.parse(input));
}

export async function fetchLiveSessionBootstrap(sessionId: string): Promise<LiveSessionBootstrap> {
  const response = await apiClient.get(sessionEndpoints.liveBootstrap(sessionId));
  return liveSessionBootstrapSchema.parse(response.data);
}

export async function fetchSessionHistoryList(filters: SessionHistoryFilters = {}): Promise<HistoryListResponse> {
  const normalizedFilters = normalizeHistoryListQueryKeyInput(filters);
  const query: HistoryListQuery = historyListQuerySchema.parse({
    page: 1,
    pageSize: 100,
    search: normalizedFilters.search || undefined,
    sessionType: normalizedFilters.sessionType || undefined,
    sortBy: "startedAt",
    sortDirection: "desc",
  });
  const response = await apiClient.get(sessionEndpoints.historyList, {
    params: query,
  });

  return historyListResponseSchema.parse(response.data);
}

export async function fetchSessionHistoryDetail(sessionId: string): Promise<HistoryDetailResponse> {
  const response = await apiClient.get(sessionEndpoints.historyDetail(sessionId));
  return historyDetailResponseSchema.parse(response.data);
}

export async function endSession(sessionId: string): Promise<EndSessionResult> {
  const response = await apiClient.post(sessionEndpoints.end(sessionId));
  return endSessionResultSchema.parse(response.data);
}
