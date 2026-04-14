import {
  type CreateFreeFormSessionInput,
  type CreateRolePlaySessionInput,
  type CreateSessionResult,
  createFreeFormSessionInputSchema,
  createRolePlaySessionInputSchema,
  createSessionResultSchema,
  type EndSessionResult,
  endSessionResultSchema,
  type LiveSessionBootstrap,
  liveSessionBootstrapSchema,
} from "@english-coach/contract";
import { apiClient } from "@/lib/axios";

const sessionEndpoints = {
  create: "/api/sessions/token",
  end: (sessionId: string) => `/api/sessions/${sessionId}/end`,
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

export async function endSession(sessionId: string): Promise<EndSessionResult> {
  const response = await apiClient.post(sessionEndpoints.end(sessionId));
  return endSessionResultSchema.parse(response.data);
}
