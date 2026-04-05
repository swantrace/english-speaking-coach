import { z } from "zod";

/** Step 2: session type discriminator */
export const sessionTypeSchema = z.enum(["role-play", "free-form"]);
export type SessionType = z.infer<typeof sessionTypeSchema>;

export const sessionTurnSchema = z.object({
  speaker: z.enum(["user", "agent"]),
  text: z.string().trim().min(1),
  timestampMs: z.number(),
});
export type SessionTurn = z.infer<typeof sessionTurnSchema>;

export const coachingPromptKindSchema = z.enum(["error_hint", "knowledge_hint", "fluency_hint"]);
export const transcriptAnnotationSourceSchema = z.enum(["role-play-live", "free-form-live", "post-session-review"]);
export const transcriptAnnotationKindSchema = z.enum(["goal-progress", "coaching"]);
export const transcriptAnnotationSchema = z.object({
  coachingKind: coachingPromptKindSchema.optional(),
  id: z.string(),
  kind: transcriptAnnotationKindSchema,
  source: transcriptAnnotationSourceSchema.optional(),
  text: z.string().trim().min(1),
  transcriptTurnIndex: z.number().int().min(0),
});
export const rewrittenTranscriptTurnSchema = z.object({
  text: z.string().trim().min(1),
  transcriptTurnIndex: z.number().int().min(0),
});
export const inConversationUiPromptSchema = z.object({
  prompt: z.string().trim().min(1),
  promptKind: coachingPromptKindSchema,
  transcriptTurnIndex: z.number().int().min(0).optional(),
});
export type TranscriptAnnotation = z.infer<typeof transcriptAnnotationSchema>;
export type RewrittenTranscriptTurn = z.infer<typeof rewrittenTranscriptTurnSchema>;
export type InConversationUiPrompt = z.infer<typeof inConversationUiPromptSchema>;

// ── Scenario sub-schemas ──────────────────────────────────────────────────────

export const scenarioCharacterSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const scenarioDialogueTurnTextSchema = z.string().trim().min(1);

export const scenarioDialogueTurnSchema = z.union([
  z.object({
    characterIndex: z.union([z.literal(0), z.literal(1)]),
    text: scenarioDialogueTurnTextSchema,
  }),
  z
    .object({
      speaker: z.enum(["user", "agent"]),
      text: scenarioDialogueTurnTextSchema,
    })
    .transform(({ speaker, text }) => ({
      characterIndex: speaker === "user" ? (0 as const) : (1 as const),
      text,
    })),
]);

export const scenarioGoalSchema = z.object({
  id: z.string(),
  description: z.string(),
  optional: z.boolean().optional(),
  logic: z.object({
    required_intents: z.array(z.string()),
    required_slots: z.array(z.string()),
  }),
});

/** Stored in `scenarios.goals` — goal definitions only, no runtime status. */
export const scenarioGoalsSchema = z.object({
  intents: z.array(z.string()),
  slots: z.array(z.string()),
  goals: z.array(scenarioGoalSchema),
});

export const scenarioSourceSchema = z.enum(["admin", "auto_generated"]);
export const scenarioReviewStatusSchema = z.enum(["pending_review", "approved", "rejected"]);

/** Step 3: domain object produced by a completed scenario generation job. */
export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Scene-setting text: used as the card subtitle and fed into the agent prompt. */
  setting: z.string(),
  /** Always exactly two scenario roles. The learner's role is chosen later via `selectedCharacterIndex`. */
  characters: z.tuple([scenarioCharacterSchema, scenarioCharacterSchema]),
  goals: scenarioGoalsSchema,
  /** Pre-written model dialogue shown on the scenario detail page before practice, keyed to `characters` by index. */
  exampleDialogue: z.array(scenarioDialogueTurnSchema),
  reviewStatus: scenarioReviewStatusSchema,
  reviewedAt: z.string().nullable(),
  reviewedByUserId: z.string().nullable(),
  source: scenarioSourceSchema,
  submissionId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ── In-conversation analysis job ─────────────────────────────────────────────

/** Step 5: BullMQ job payload for free-form mid-session linguistic analysis. */
export const inConversationAnalysisJobSchema = z.object({
  sessionHistoryId: z.string(),
  /** LiveKit room name — worker uses this to dispatch data packets back to the room. */
  roomName: z.string(),
  transcriptStartIndex: z.number().int().min(0),
  turns: z.array(sessionTurnSchema),
});

export const sessionDispatchMetadataSchema = z.object({
  sessionHistoryId: z.string(),
});

export const rolePlayAgentBootstrapSchema = z.object({
  roomName: z.string(),
  selectedCharacterIndex: z.number().int().min(0).max(1),
  sessionHistoryId: z.string(),
  sessionType: z.literal(sessionTypeSchema.enum["role-play"]),
  userId: z.string(),
  scenario: scenarioSchema,
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

export const transcriptAnnotationUpsertRequestSchema = z.object({
  annotations: z.array(transcriptAnnotationSchema).min(1),
});

export const lingAnalysisKnowledgeItemSchema = z.object({
  pattern: z.string().trim().min(1),
  syntaxRole: z.enum([
    "predicate_verb",
    "predicate_adjective",
    "adverbial_modifier",
    "noun_phrase",
    "discourse_linker",
    "clause_pattern",
  ]),
  fixednessLevel: z.enum(["restricted_collocation", "fixed_expression", "idiom"]),
  communicativeFunction: z.enum([
    "manage_social_relation",
    "express_attitude_or_opinion",
    "make_request_or_offer",
    "give_or_seek_information",
    "organize_discourse",
    "react_in_conversation",
    "express_degree_or_soften",
    "express_time_or_sequence",
  ]),
  example: z.string().trim().min(1),
  speaker: z.enum(["user", "agent"]),
  count: z.number().int().nonnegative(),
  usageExcerpts: z.array(z.string().trim().min(1)),
});

export const lingAnalysisErrorSchema = z.object({
  dimension: z.enum(["lexical", "syntactic", "pragmatic", "discourse", "phonological"]),
  errorDescription: z.string().trim().min(1),
  suggestion: z.string().trim().min(1),
  utterance: z.string().trim().min(1),
});

export const lingAnalysisResultSchema = z.object({
  errors: z.array(lingAnalysisErrorSchema),
  knowledgeItemsUsed: z.array(lingAnalysisKnowledgeItemSchema),
  rewrittenUserTurns: z.array(rewrittenTranscriptTurnSchema).default([]),
  review: z.string().trim().min(1),
});

export const inConversationAnalysisResultSchema = z.object({
  uiPrompts: z.array(inConversationUiPromptSchema).max(3).default([]),
  workerFeedbackMessage: z.string().trim().min(1),
});

export const inConversationAnalysisQueueName = "inConversationAnalysis";
export const inConversationAnalysisJobName = "inConversationAnalysis";
export const sessionCompletionQueueName = "sessionCompletion";
export const sessionCompletionJobName = "sessionCompletion";
export const lingAnalysisQueueName = "lingAnalysis";
export const lingAnalysisJobName = "lingAnalysis";

export type ScenarioCharacter = z.infer<typeof scenarioCharacterSchema>;
export type ScenarioDialogueTurn = z.infer<typeof scenarioDialogueTurnSchema>;
export type ScenarioGoal = z.infer<typeof scenarioGoalSchema>;
export type ScenarioGoals = z.infer<typeof scenarioGoalsSchema>;
export type ScenarioSource = z.infer<typeof scenarioSourceSchema>;
export type ScenarioReviewStatus = z.infer<typeof scenarioReviewStatusSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type InConversationAnalysisJob = z.infer<typeof inConversationAnalysisJobSchema>;
export type SessionDispatchMetadata = z.infer<typeof sessionDispatchMetadataSchema>;
export type SessionAgentBootstrap = z.infer<typeof sessionAgentBootstrapSchema>;
export type SessionCompletionRequest = z.infer<typeof sessionCompletionRequestSchema>;
export type SessionCompletionJob = SessionCompletionRequest;
export type TranscriptAnnotationUpsertRequest = z.infer<typeof transcriptAnnotationUpsertRequestSchema>;
export type CoachingPromptKind = z.infer<typeof coachingPromptKindSchema>;
export type TranscriptAnnotationSource = z.infer<typeof transcriptAnnotationSourceSchema>;
export type LingAnalysisResult = z.infer<typeof lingAnalysisResultSchema>;
export type InConversationAnalysisResult = z.infer<typeof inConversationAnalysisResultSchema>;
