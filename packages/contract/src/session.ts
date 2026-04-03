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

// ── Scenario sub-schemas ──────────────────────────────────────────────────────

export const scenarioCharacterSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const scenarioDialogueTurnSchema = z.object({
  speaker: z.enum(["user", "agent"]),
  text: z.string(),
});

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

/** Step 3: domain object produced by a completed scenario generation job. */
export const scenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Scene-setting text: used as the card subtitle and fed into the agent prompt. */
  setting: z.string(),
  /** Always exactly two characters: index 0 is the user's default, index 1 is the agent's character. */
  characters: z.tuple([scenarioCharacterSchema, scenarioCharacterSchema]),
  goals: scenarioGoalsSchema,
  /** Pre-written model dialogue shown on the scenario detail page before practice. */
  exampleDialogue: z.array(scenarioDialogueTurnSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ── In-conversation analysis job ─────────────────────────────────────────────

/** Step 5: BullMQ job payload for free-form mid-session linguistic analysis. */
export const inConversationAnalysisJobSchema = z.object({
  sessionHistoryId: z.string(),
  /** LiveKit room name — worker uses this to dispatch data packets back to the room. */
  roomName: z.string(),
  turns: z.array(sessionTurnSchema),
});

export const rolePlaySessionDispatchMetadataSchema = z.object({
  roomName: z.string(),
  scenarioId: z.string(),
  selectedCharacterIndex: z.number().int().min(0).max(1),
  sessionHistoryId: z.string(),
  sessionType: z.literal(sessionTypeSchema.enum["role-play"]),
  userId: z.string(),
});

export const freeFormSessionDispatchMetadataSchema = z.object({
  contextDocument: z.string().trim().min(1),
  freeFormContextId: z.string(),
  roomName: z.string(),
  sessionHistoryId: z.string(),
  sessionType: z.literal(sessionTypeSchema.enum["free-form"]),
  userId: z.string(),
});

export const sessionDispatchMetadataSchema = z.discriminatedUnion("sessionType", [
  rolePlaySessionDispatchMetadataSchema,
  freeFormSessionDispatchMetadataSchema,
]);

export const sessionCompletionRequestSchema = z.object({
  completedGoals: z.array(z.string()).optional(),
  roomName: z.string(),
  sessionHistoryId: z.string(),
  transcript: z.array(sessionTurnSchema),
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
  review: z.string().trim().min(1),
});

export const inConversationAnalysisResultSchema = z.object({
  observation: z.string().trim().min(1),
  workerFeedbackMessage: z.string().trim().min(1),
});

export const inConversationAnalysisQueueName = "inConversationAnalysis";
export const inConversationAnalysisJobName = "inConversationAnalysis";
export const lingAnalysisQueueName = "lingAnalysis";
export const lingAnalysisJobName = "lingAnalysis";

export type ScenarioCharacter = z.infer<typeof scenarioCharacterSchema>;
export type ScenarioDialogueTurn = z.infer<typeof scenarioDialogueTurnSchema>;
export type ScenarioGoal = z.infer<typeof scenarioGoalSchema>;
export type ScenarioGoals = z.infer<typeof scenarioGoalsSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type InConversationAnalysisJob = z.infer<typeof inConversationAnalysisJobSchema>;
export type SessionDispatchMetadata = z.infer<typeof sessionDispatchMetadataSchema>;
export type SessionCompletionRequest = z.infer<typeof sessionCompletionRequestSchema>;
export type LingAnalysisResult = z.infer<typeof lingAnalysisResultSchema>;
export type InConversationAnalysisResult = z.infer<typeof inConversationAnalysisResultSchema>;
