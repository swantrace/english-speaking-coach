import { selectedCharacterIndexValues, sessionTypeValues } from "@english-coach/domain";
import { z } from "zod";

export const createRolePlaySessionInputSchema = z.object({
  scenarioId: z.string().trim().min(1),
  selectedCharacterIndex: z.union([
    z.literal(selectedCharacterIndexValues[0]),
    z.literal(selectedCharacterIndexValues[1]),
  ]),
  sessionType: z.literal(sessionTypeValues[0]),
});

export const createFreeFormSessionInputSchema = z.object({
  contextDocument: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  sessionType: z.literal(sessionTypeValues[1]),
});

export const createSessionRequestSchema = z.discriminatedUnion("sessionType", [
  createRolePlaySessionInputSchema,
  createFreeFormSessionInputSchema,
]);

export const createSessionResultSchema = z.object({
  roomName: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
  sessionType: z.enum(sessionTypeValues),
  token: z.string().trim().min(1),
});

const liveSessionRoomConnectionSchema = z.object({
  roomName: z.string().trim().min(1),
  serverUrl: z.string().trim().min(1),
  token: z.string().trim().min(1),
});

const liveSessionCharacterSchema = z.object({
  description: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const liveSessionGoalSchema = z.object({
  description: z.string().trim().min(1),
  id: z.string().trim().min(1),
  optional: z.boolean().default(false),
});

const liveRolePlaySessionBootstrapSchema = z.object({
  endedAt: z.string().trim().min(1).nullable(),
  room: liveSessionRoomConnectionSchema,
  scenario: z.object({
    characters: z.tuple([liveSessionCharacterSchema, liveSessionCharacterSchema]),
    goals: z.array(liveSessionGoalSchema),
    id: z.string().trim().min(1),
    imageUrl: z.string().trim().min(1).nullable(),
    selectedCharacterIndex: z.union([
      z.literal(selectedCharacterIndexValues[0]),
      z.literal(selectedCharacterIndexValues[1]),
    ]),
    setting: z.string().trim().min(1),
    title: z.string().trim().min(1),
  }),
  sessionId: z.string().trim().min(1),
  sessionType: z.literal(sessionTypeValues[0]),
  startedAt: z.string().trim().min(1),
});

const liveFreeFormSessionBootstrapSchema = z.object({
  context: z.object({
    content: z.string().trim().min(1),
    summary: z.string().trim().min(1),
  }),
  endedAt: z.string().trim().min(1).nullable(),
  room: liveSessionRoomConnectionSchema,
  sessionId: z.string().trim().min(1),
  sessionType: z.literal(sessionTypeValues[1]),
  startedAt: z.string().trim().min(1),
});

export const liveSessionBootstrapSchema = z.discriminatedUnion("sessionType", [
  liveRolePlaySessionBootstrapSchema,
  liveFreeFormSessionBootstrapSchema,
]);

export const endSessionResultSchema = z.object({
  endedAt: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
});

export type CreateRolePlaySessionInput = z.infer<typeof createRolePlaySessionInputSchema>;
export type CreateFreeFormSessionInput = z.infer<typeof createFreeFormSessionInputSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type CreateSessionResult = z.infer<typeof createSessionResultSchema>;
export type LiveSessionBootstrap = z.infer<typeof liveSessionBootstrapSchema>;
export type EndSessionResult = z.infer<typeof endSessionResultSchema>;
