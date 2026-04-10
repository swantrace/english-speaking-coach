import {
  knowledgeItems,
  scenarios,
  sessionErrors,
  sessionHistory,
  speakerValues,
} from "@english-coach/database/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { communicativeFunctions, errorDimensions, fixednessLevels, syntaxRoles } from "./linguistics";
import {
  rewrittenTranscriptTurnSchema,
  scenarioCharacterSchema,
  scenarioDialogueTurnSchema,
  scenarioGoalsSchema,
  scenarioSchema,
  sessionTurnSchema,
  sessionTypeSchema,
  transcriptAnnotationSchema,
} from "./session";

export const defaultListPage = 1;
export const defaultListPageSize = 20;
export const maxListPageSize = 100;
export const defaultScenarioCursorPageSize = 24;
export const knowledgeItemPendingReviewSchema = z.boolean();

const optionalSearchTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).max(200).optional());

const optionalCursorSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).optional());

export const sortDirectionSchema = z.enum(["asc", "desc"]);
export const pageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(defaultListPage),
  pageSize: z.coerce.number().int().min(1).max(maxListPageSize).default(defaultListPageSize),
});

export function createPageListResponseSchema<TItem extends z.ZodTypeAny>(itemSchema: TItem) {
  return z.object({
    items: z.array(itemSchema),
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });
}

export function createCursorListResponseSchema<TItem extends z.ZodTypeAny>(itemSchema: TItem) {
  return z.object({
    hasMore: z.boolean(),
    items: z.array(itemSchema),
    limit: z.number().int().min(1),
    nextCursor: z.string().nullable(),
    total: z.number().int().min(0),
  });
}

export const scenarioListSortBySchema = z.enum(["updatedAt", "createdAt", "title"]);
export const scenarioPaginationModeSchema = z.enum(["page", "cursor"]);
export const learnerScenarioListQuerySchema = pageListQuerySchema
  .extend({
    cursor: optionalCursorSchema,
    pagination: scenarioPaginationModeSchema.default(scenarioPaginationModeSchema.enum.page),
    search: optionalSearchTextSchema,
    sortBy: scenarioListSortBySchema.default(scenarioListSortBySchema.enum.updatedAt),
    sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
  })
  .refine(
    (value) =>
      value.pagination !== scenarioPaginationModeSchema.enum.cursor ||
      (value.sortBy === scenarioListSortBySchema.enum.updatedAt &&
        value.sortDirection === sortDirectionSchema.enum.desc),
    {
      message: "Cursor pagination currently supports only updatedAt descending order",
      path: ["pagination"],
    },
  );
export const adminScenarioListQuerySchema = pageListQuerySchema.extend({
  isPendingReview: z.coerce.boolean().optional(),
  search: optionalSearchTextSchema,
  sortBy: scenarioListSortBySchema.default(scenarioListSortBySchema.enum.updatedAt),
  sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
});

export const historySummarySchema = createSelectSchema(sessionHistory, {
  completedGoals: z.array(z.string()).nullable().optional(),
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
  syntaxRole: z.enum(syntaxRoles).nullable(),
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

export const historyDetailResponseSchema = z.object({
  contextDocument: z.string().optional(),
  errors: z.array(historySessionErrorSchema),
  knowledgeItems: z.array(historyKnowledgeItemSchema),
  rewrittenTranscript: z.array(rewrittenTranscriptTurnSchema),
  session: historyDetailSessionSchema,
  transcriptAnnotations: z.array(transcriptAnnotationSchema),
  transcript: z.array(sessionTurnSchema),
  transcriptCreatedAt: z.string().nullable(),
  transcriptTurnAnchors: z.array(historyTranscriptTurnAnchorSchema),
});

export const knowledgeItemSchema = createSelectSchema(knowledgeItems, {
  communicativeFunction: z.enum(communicativeFunctions).nullable(),
  fixednessLevel: z.enum(fixednessLevels).nullable(),
  isPendingReview: z.boolean(),
  syntaxRole: z.enum(syntaxRoles).nullable(),
});

export const knowledgeItemListSortBySchema = z.enum(["updatedAt", "createdAt", "pattern", "isPendingReview"]);
export const knowledgeItemListQuerySchema = pageListQuerySchema.extend({
  communicativeFunction: z.enum(communicativeFunctions).optional(),
  fixednessLevel: z.enum(fixednessLevels).optional(),
  isPendingReview: z.coerce.boolean().optional(),
  search: optionalSearchTextSchema,
  sortBy: knowledgeItemListSortBySchema.default(knowledgeItemListSortBySchema.enum.updatedAt),
  sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
  syntaxRole: z.enum(syntaxRoles).optional(),
});

export const knowledgePointListSortBySchema = z.enum(["lastSeenAt", "pattern", "sessionCount", "totalOccurrences"]);
export const knowledgePointListQuerySchema = pageListQuerySchema.extend({
  search: optionalSearchTextSchema,
  sortBy: knowledgePointListSortBySchema.default(knowledgePointListSortBySchema.enum.lastSeenAt),
  sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
});

export const knowledgePointSummarySchema = knowledgeItemSchema.extend({
  agentOccurrenceCount: z.number().int().min(0),
  lastSeenAt: z.string(),
  sessionCount: z.number().int().min(1),
  totalOccurrences: z.number().int().min(1),
  userOccurrenceCount: z.number().int().min(0),
});

export const knowledgePointOccurrenceSchema = z.object({
  excerpt: z.string().trim().min(1),
  id: z.string(),
  occurrenceCount: z.number().int().min(1),
  sessionEndedAt: z.string().nullable(),
  sessionHistoryId: z.string(),
  sessionStartedAt: z.string(),
  sessionTitle: z.string(),
  sessionType: sessionTypeSchema,
  speaker: z.enum(speakerValues),
  transcriptTurnIndex: z.number().int().min(0),
});

export const unresolvedKnowledgeOccurrenceSchema = z.object({
  id: z.string(),
  knowledgeItemId: z.string().nullable(),
  proposedPattern: z.string().trim().min(1),
  sessionHistoryId: z.string(),
  transcriptTurnIndex: z.number().int().min(0),
  utterance: z.string().trim().min(1),
});

export const adminKnowledgeOccurrencesQuerySchema = pageListQuerySchema.extend({
  search: optionalSearchTextSchema,
});

export const assignKnowledgeOccurrenceSchema = z.object({
  knowledgeItemId: z.string().min(1),
});

export const resolveKnowledgeOccurrenceSchema = z.object({
  occurrenceId: z.string().min(1),
});

export const adminKnowledgeOccurrencesResponseSchema = createPageListResponseSchema(
  unresolvedKnowledgeOccurrenceSchema,
);

export const knowledgePointDetailSchema = knowledgePointSummarySchema.extend({
  occurrences: z.array(knowledgePointOccurrenceSchema),
});

export const scenarioPageResponseSchema = createPageListResponseSchema(scenarioSchema);
export const scenarioCursorResponseSchema = createCursorListResponseSchema(scenarioSchema);
export const adminScenarioListResponseSchema = createPageListResponseSchema(scenarioSchema);
export const historyListResponseSchema = createPageListResponseSchema(historySummarySchema);
export const historyDetailResponseListSchema = historyDetailResponseSchema;
export const knowledgeItemListResponseSchema = createPageListResponseSchema(knowledgeItemSchema);
export const knowledgePointListResponseSchema = createPageListResponseSchema(knowledgePointSummarySchema);

export type SortDirection = z.infer<typeof sortDirectionSchema>;
export const scenarioListQuerySchema = learnerScenarioListQuerySchema;
export type LearnerScenarioListQuery = z.infer<typeof learnerScenarioListQuerySchema>;
export type AdminScenarioListQuery = z.infer<typeof adminScenarioListQuerySchema>;
export type ScenarioListQuery = LearnerScenarioListQuery;
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
export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;
export type KnowledgeItemListQuery = z.infer<typeof knowledgeItemListQuerySchema>;
export type KnowledgePointListQuery = z.infer<typeof knowledgePointListQuerySchema>;
export type KnowledgePointSummary = z.infer<typeof knowledgePointSummarySchema>;
export type KnowledgePointOccurrence = z.infer<typeof knowledgePointOccurrenceSchema>;
export type KnowledgePointDetail = z.infer<typeof knowledgePointDetailSchema>;
export type UnresolvedKnowledgeOccurrence = z.infer<typeof unresolvedKnowledgeOccurrenceSchema>;
export type AdminKnowledgeOccurrencesQuery = z.infer<typeof adminKnowledgeOccurrencesQuerySchema>;
export type ScenarioPageResponse = z.infer<typeof scenarioPageResponseSchema>;
export type ScenarioCursorResponse = z.infer<typeof scenarioCursorResponseSchema>;
export type AdminScenarioListResponse = z.infer<typeof adminScenarioListResponseSchema>;
export type HistoryListResponse = z.infer<typeof historyListResponseSchema>;
export type KnowledgeItemListResponse = z.infer<typeof knowledgeItemListResponseSchema>;
export type KnowledgePointListResponse = z.infer<typeof knowledgePointListResponseSchema>;
