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

export type CreateRolePlaySessionInput = z.infer<typeof createRolePlaySessionInputSchema>;
export type CreateFreeFormSessionInput = z.infer<typeof createFreeFormSessionInputSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type CreateSessionResult = z.infer<typeof createSessionResultSchema>;
