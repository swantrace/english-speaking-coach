import { scenarios, sessionErrors, sessionHistory, sessionProcessing } from "@english-coach/database/schema";
import { selectedCharacterIndexValues, sessionTypeValues, speakerValues } from "@english-coach/domain";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  communicativeFunctions,
  createPageListResponseSchema,
  errorDimensions,
  fixednessLevels,
  pageListQuerySchema,
  patternTypes,
  sortDirectionSchema,
} from "../common";
import { scenarioCharacterSchema, scenarioDialogueTurnSchema, scenarioGoalsSchema, scenarioSchema } from "../scenario";

const optionalSearchTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).max(200).optional());

function normalizeErrorDimension(value: unknown) {
  if (typeof value === "string" && errorDimensions.some((dimension) => dimension === value)) {
    return value;
  }

  const normalizedValue = typeof value === "string" ? value.toLowerCase() : "";

  if (normalizedValue.indexOf("phon") >= 0 || normalizedValue.indexOf("pronunciation") >= 0) {
    return "phonological";
  }

  if (normalizedValue.indexOf("prag") >= 0) {
    return "pragmatic";
  }

  if (normalizedValue.indexOf("disc") >= 0) {
    return "discourse";
  }

  if (
    normalizedValue.indexOf("grammar") >= 0 ||
    normalizedValue.indexOf("grammatical") >= 0 ||
    normalizedValue.indexOf("syntactic") >= 0
  ) {
    return "syntactic";
  }

  return "lexical";
}

export const sessionTypeSchema = z.enum(sessionTypeValues);

export const sessionProcessingEventName = "session-processing";
export const sessionProcessingUpdatedEventType = "session-processing.updated";
export const dialogueAudioQueueName = "dialogue-audio.generate";
export const dialogueAudioJobName = dialogueAudioQueueName;
export const dialogueAudioJobSchema = z.object({ sessionHistoryId: z.string().min(1) });

export const sessionProcessingSnapshotSchema = createSelectSchema(sessionProcessing);

export const sessionProcessingEventSchema = z.object({
  processing: sessionProcessingSnapshotSchema,
  type: z.literal(sessionProcessingUpdatedEventType),
});

export function createSessionProcessingEvent(snapshot: z.infer<typeof sessionProcessingSnapshotSchema>) {
  return sessionProcessingEventSchema.parse({
    processing: snapshot,
    type: sessionProcessingUpdatedEventType,
  });
}

export function isSessionProcessingTerminal(snapshot: z.infer<typeof sessionProcessingSnapshotSchema>) {
  return [
    snapshot.analysisStatus,
    snapshot.rewrittenTranscriptStatus,
    snapshot.dialogueAudioStatus,
    snapshot.knowledgeStatus,
  ].every((status) => status === "not_applicable" || status === "ready" || status === "failed");
}

export const sessionTurnSchema = z.object({
  speaker: z.enum(speakerValues),
  text: z.string().trim().min(1),
  timestampMs: z.number(),
});

export const coachingPromptKindSchema = z.enum(["error_hint", "knowledge_hint", "fluency_hint"]);

export const rewrittenTranscriptTurnSchema = z.object({
  text: z.string().trim().min(1),
  transcriptTurnIndex: z.number().int().min(0),
});

export const inConversationUiPromptSchema = z.object({
  prompt: z.string().trim().min(1),
  promptKind: coachingPromptKindSchema,
  transcriptTurnIndex: z.number().int().min(0).optional(),
});

export const sessionKnowledgeOccurrenceSchema = z.object({
  proposedPattern: z.string().trim().min(1),
  transcriptTurnIndex: z.number().int().min(0),
  utterance: z.string().trim().min(1),
});

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
    imageAssetId: z.string().trim().min(1).nullable(),
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

export const goalProgressPacketSchema = z.object({
  currentGoalId: z.string(),
  filledSlots: z.record(z.string(), z.string()),
  goals: z.array(
    z.object({
      description: z.string(),
      id: z.string(),
      optional: z.boolean().optional(),
      status: z.enum(["incomplete", "complete"]),
    }),
  ),
  transcriptTurnIndex: z.number().int().min(0).optional(),
  type: z.literal("goal-progress"),
});

export const workerFeedbackPacketSchema = z.object({
  message: z.string(),
  sessionHistoryId: z.string(),
  type: z.literal("worker-feedback"),
});

export const uiUpdatePacketSchema = z.object({
  prompt: z.string().trim().min(1),
  promptKind: coachingPromptKindSchema,
  sessionHistoryId: z.string(),
  transcriptTurnIndex: z.number().int().min(0).optional(),
  type: z.literal("ui-update"),
});

export const sessionStatusPacketSchema = z.object({
  sessionHistoryId: z.string().trim().min(1),
  status: z.enum(["ending", "ended"]),
  type: z.literal("session-status"),
});

export const liveSessionIncomingPacketSchema = z.discriminatedUnion("type", [
  goalProgressPacketSchema,
  sessionStatusPacketSchema,
  uiUpdatePacketSchema,
]);

export const historySummarySchema = createSelectSchema(sessionHistory, {
  completedGoals: z.array(z.string()).nullable().optional(),
  summary: z
    .object({
      overallComment: z.string().optional(),
      opportunities: z.array(z.string()).optional(),
      strengths: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
}).extend({
  canReopen: z.boolean(),
  title: z.string(),
});

export const historyListSortBySchema = z.enum(["startedAt", "endedAt", "title"]);
export const historyListQuerySchema = pageListQuerySchema.extend({
  search: optionalSearchTextSchema,
  sessionType: sessionTypeSchema.optional(),
  sortBy: historyListSortBySchema.default(historyListSortBySchema.enum.startedAt),
  sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
});

export const historyDetailTabSchema = z.enum(["review", "transcript", "rewritten"]);

export const historyDetailScenarioSchema = createSelectSchema(scenarios, {
  characters: z.tuple([scenarioCharacterSchema, scenarioCharacterSchema]),
  exampleDialogue: z.array(scenarioDialogueTurnSchema),
  goals: scenarioGoalsSchema,
}).pick({
  characters: true,
  exampleDialogue: true,
  goals: true,
  id: true,
  setting: true,
  title: true,
});

export const historyKnowledgeItemOccurrenceSummarySchema = z.object({
  excerpt: z.string().trim().min(1),
  id: z.string(),
  occurrenceCount: z.number().int().min(1),
  speaker: z.enum(speakerValues),
  transcriptTurnIndex: z.number().int().min(0),
});

export const historyKnowledgeItemSchema = z.object({
  communicativeFunction: z.enum(communicativeFunctions).nullable(),
  count: z.number().int(),
  examples: z.array(z.string()),
  fixednessLevel: z.enum(fixednessLevels).nullable(),
  id: z.string(),
  knowledgeItemId: z.string(),
  occurrences: z.array(historyKnowledgeItemOccurrenceSummarySchema),
  pattern: z.string(),
  speaker: z.enum(speakerValues),
  patternType: z.enum(patternTypes).nullable(),
});

export const historySessionErrorSchema = createSelectSchema(sessionErrors, {
  dimension: z.enum(errorDimensions),
}).extend({
  matchedTranscriptTurnIndex: z.number().int().min(0).nullable(),
});

export const historyTranscriptTurnAnchorSchema = z.object({
  id: z.string(),
  speaker: z.enum(speakerValues),
  transcriptTurnIndex: z.number().int().min(0),
  turnLabel: z.string(),
});

export const historyDetailSessionSchema = historySummarySchema.extend({
  scenario: historyDetailScenarioSchema.nullable(),
});

export const dialogueAudioSchema = z.object({
  assetId: z.string().min(1),
  contentType: z.literal("audio/wav"),
  durationMs: z.number().int().nonnegative(),
});

export const historyDetailResponseSchema = z.object({
  contextDocument: z.string().optional(),
  dialogueAudio: dialogueAudioSchema.nullable(),
  errors: z.array(historySessionErrorSchema),
  knowledgeItems: z.array(historyKnowledgeItemSchema),
  processing: sessionProcessingSnapshotSchema.nullable(),
  rewrittenTranscript: z.array(rewrittenTranscriptTurnSchema),
  session: historyDetailSessionSchema,
  transcript: z.array(sessionTurnSchema),
  transcriptCreatedAt: z.string().nullable(),
  transcriptTurnAnchors: z.array(historyTranscriptTurnAnchorSchema),
});

export const historyListResponseSchema = createPageListResponseSchema(historySummarySchema);

export const inConversationAnalysisJobSchema = z.object({
  roomName: z.string(),
  sessionHistoryId: z.string(),
  transcriptStartIndex: z.number().int().min(0),
  turns: z.array(sessionTurnSchema),
});

export const sessionDispatchMetadataSchema = z.object({
  sessionHistoryId: z.string(),
});

export const rolePlayAgentBootstrapSchema = z.object({
  roomName: z.string(),
  scenario: scenarioSchema,
  selectedCharacterIndex: z.number().int().min(0).max(1),
  sessionHistoryId: z.string(),
  sessionType: z.literal(sessionTypeSchema.enum["role-play"]),
  userId: z.string(),
});

export const freeFormAgentBootstrapSchema = z.object({
  contextDocument: z.string().trim().min(1),
  freeFormContextId: z.string(),
  roomName: z.string(),
  sessionHistoryId: z.string(),
  sessionType: z.literal(sessionTypeSchema.enum["free-form"]),
  userId: z.string(),
});

export const sessionAgentBootstrapSchema = z.discriminatedUnion("sessionType", [
  rolePlayAgentBootstrapSchema,
  freeFormAgentBootstrapSchema,
]);

export const sessionCompletionRequestSchema = z.object({
  completedGoals: z.array(z.string()).optional(),
  roomName: z.string(),
  sessionHistoryId: z.string(),
  transcript: z.array(sessionTurnSchema),
});

export const lingAnalysisErrorSchema = z.object({
  dimension: z.preprocess(normalizeErrorDimension, z.enum(errorDimensions)),
  errorDescription: z.string().trim().min(1),
  suggestion: z.string().trim().min(1),
  utterance: z.string().trim().min(1),
});

export const lingAnalysisResultSchema = z.object({
  errors: z.array(lingAnalysisErrorSchema).min(0),
  occurrences: z.array(sessionKnowledgeOccurrenceSchema).min(0).max(24),
  rewrittenUserTurns: z.array(rewrittenTranscriptTurnSchema).min(0),
  review: z.string().trim().min(1),
});

export const inConversationAnalysisResultSchema = z.object({
  uiPrompts: z.array(inConversationUiPromptSchema).min(0).max(3),
  workerFeedbackMessage: z.string().trim().min(1),
});

export const inConversationAnalysisQueueName = "inConversationAnalysis";
export const inConversationAnalysisJobName = "inConversationAnalysis";
export const sessionCompletionQueueName = "sessionCompletion";
export const sessionCompletionJobName = "sessionCompletion";
export const lingAnalysisQueueName = "lingAnalysis";
export const lingAnalysisJobName = "lingAnalysis";

export type SessionType = z.infer<typeof sessionTypeSchema>;
export type SessionProcessingSnapshot = z.infer<typeof sessionProcessingSnapshotSchema>;
export type SessionProcessingEvent = z.infer<typeof sessionProcessingEventSchema>;
export type SessionTurn = z.infer<typeof sessionTurnSchema>;
export type RewrittenTranscriptTurn = z.infer<typeof rewrittenTranscriptTurnSchema>;
export type DialogueAudioJob = z.infer<typeof dialogueAudioJobSchema>;
export type InConversationUiPrompt = z.infer<typeof inConversationUiPromptSchema>;
export type SessionKnowledgeOccurrence = z.infer<typeof sessionKnowledgeOccurrenceSchema>;
export type CreateRolePlaySessionInput = z.infer<typeof createRolePlaySessionInputSchema>;
export type CreateFreeFormSessionInput = z.infer<typeof createFreeFormSessionInputSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type CreateSessionResult = z.infer<typeof createSessionResultSchema>;
export type LiveSessionBootstrap = z.infer<typeof liveSessionBootstrapSchema>;
export type EndSessionResult = z.infer<typeof endSessionResultSchema>;
export type GoalProgressPacket = z.infer<typeof goalProgressPacketSchema>;
export type WorkerFeedbackPacket = z.infer<typeof workerFeedbackPacketSchema>;
export type UiUpdatePacket = z.infer<typeof uiUpdatePacketSchema>;
export type SessionStatusPacket = z.infer<typeof sessionStatusPacketSchema>;
export type LiveSessionIncomingPacket = z.infer<typeof liveSessionIncomingPacketSchema>;
export type HistorySummary = z.infer<typeof historySummarySchema>;
export type HistoryListQuery = z.infer<typeof historyListQuerySchema>;
export type HistoryDetailTab = z.infer<typeof historyDetailTabSchema>;
export type HistoryDetailScenario = z.infer<typeof historyDetailScenarioSchema>;
export type HistoryKnowledgeItemOccurrenceSummary = z.infer<typeof historyKnowledgeItemOccurrenceSummarySchema>;
export type HistoryKnowledgeItem = z.infer<typeof historyKnowledgeItemSchema>;
export type HistorySessionError = z.infer<typeof historySessionErrorSchema>;
export type HistoryTranscriptTurnAnchor = z.infer<typeof historyTranscriptTurnAnchorSchema>;
export type HistoryDetailSession = z.infer<typeof historyDetailSessionSchema>;
export type HistoryDetailResponse = z.infer<typeof historyDetailResponseSchema>;
export type DialogueAudio = z.infer<typeof dialogueAudioSchema>;
export type HistoryListResponse = z.infer<typeof historyListResponseSchema>;
export type InConversationAnalysisJob = z.infer<typeof inConversationAnalysisJobSchema>;
export type SessionDispatchMetadata = z.infer<typeof sessionDispatchMetadataSchema>;
export type SessionAgentBootstrap = z.infer<typeof sessionAgentBootstrapSchema>;
export type SessionCompletionRequest = z.infer<typeof sessionCompletionRequestSchema>;
export type SessionCompletionJob = SessionCompletionRequest;
export type CoachingPromptKind = z.infer<typeof coachingPromptKindSchema>;
export type LingAnalysisResult = z.infer<typeof lingAnalysisResultSchema>;
export type InConversationAnalysisResult = z.infer<typeof inConversationAnalysisResultSchema>;
