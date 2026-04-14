import {
  type CreateFreeFormSessionInput,
  type CreateRolePlaySessionInput,
  type CreateSessionResult,
  createFreeFormSessionInputSchema,
  createRolePlaySessionInputSchema,
  createSessionResultSchema,
} from "@english-coach/contract";
import { apiClient } from "@/lib/axios";

const sessionCreateEndpoints = {
  freeForm: "/api/sessions/token",
  rolePlay: "/api/sessions/token",
} as const;

async function postCreateSession(
  endpoint: (typeof sessionCreateEndpoints)[keyof typeof sessionCreateEndpoints],
  payload: CreateFreeFormSessionInput | CreateRolePlaySessionInput,
) {
  const response = await apiClient.post(endpoint, payload);
  return createSessionResultSchema.parse(response.data);
}

export async function createRolePlaySession(input: CreateRolePlaySessionInput): Promise<CreateSessionResult> {
  return postCreateSession(sessionCreateEndpoints.rolePlay, createRolePlaySessionInputSchema.parse(input));
}

export async function createFreeFormSession(input: CreateFreeFormSessionInput): Promise<CreateSessionResult> {
  return postCreateSession(sessionCreateEndpoints.freeForm, createFreeFormSessionInputSchema.parse(input));
}
