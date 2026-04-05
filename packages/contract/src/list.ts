import { z } from "zod";
import { communicativeFunctions, fixednessLevels, syntaxRoles } from "./linguistics";
import { scenarioReviewStatusSchema, scenarioSchema, scenarioSourceSchema, sessionTypeSchema } from "./session";

export const defaultListPage = 1;
export const defaultListPageSize = 20;
export const maxListPageSize = 100;
export const defaultScenarioCursorPageSize = 24;

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
  reviewStatus: scenarioReviewStatusSchema.optional(),
  search: optionalSearchTextSchema,
  sortBy: scenarioListSortBySchema.default(scenarioListSortBySchema.enum.updatedAt),
  sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
  source: scenarioSourceSchema.optional(),
});

export const historySummarySchema = z.object({
  canReopen: z.boolean(),
  completedGoals: z.array(z.string()).nullable().optional(),
  endedAt: z.string().nullable(),
  freeFormContextId: z.string().nullable().optional(),
  id: z.string(),
  review: z.string().nullable(),
  scenarioId: z.string().nullable(),
  selectedCharacterIndex: z.number().nullable(),
  sessionType: sessionTypeSchema,
  startedAt: z.string(),
  title: z.string(),
  userId: z.string(),
});

export const historyListSortBySchema = z.enum(["startedAt", "endedAt", "title"]);
export const historyListQuerySchema = pageListQuerySchema.extend({
  search: optionalSearchTextSchema,
  sessionType: sessionTypeSchema.optional(),
  sortBy: historyListSortBySchema.default(historyListSortBySchema.enum.startedAt),
  sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
});

export const knowledgeItemSourceSchema = z.enum(["admin", "auto_generated"]);
export const knowledgeItemReviewStatusSchema = z.enum(["pending_review", "approved", "rejected"]);
export const knowledgeItemSchema = z.object({
  communicativeFunction: z.enum(communicativeFunctions).nullable(),
  createdAt: z.string(),
  example: z.string().nullable(),
  fixednessLevel: z.enum(fixednessLevels).nullable(),
  id: z.string(),
  pattern: z.string(),
  reviewStatus: knowledgeItemReviewStatusSchema,
  reviewedAt: z.string().nullable(),
  reviewedByUserId: z.string().nullable(),
  submissionId: z.string().nullable(),
  source: knowledgeItemSourceSchema,
  syntaxRole: z.enum(syntaxRoles).nullable(),
  updatedAt: z.string(),
});

export const knowledgeItemListSortBySchema = z.enum(["updatedAt", "createdAt", "pattern", "reviewStatus", "source"]);
export const knowledgeItemListQuerySchema = pageListQuerySchema.extend({
  communicativeFunction: z.enum(communicativeFunctions).optional(),
  fixednessLevel: z.enum(fixednessLevels).optional(),
  reviewStatus: knowledgeItemReviewStatusSchema.optional(),
  search: optionalSearchTextSchema,
  sortBy: knowledgeItemListSortBySchema.default(knowledgeItemListSortBySchema.enum.updatedAt),
  sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
  source: knowledgeItemSourceSchema.optional(),
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
  speaker: z.enum(["user", "agent"]),
  transcriptTurnIndex: z.number().int().min(0),
});

export const knowledgePointDetailSchema = knowledgePointSummarySchema.extend({
  occurrences: z.array(knowledgePointOccurrenceSchema),
});

export const scenarioPageResponseSchema = createPageListResponseSchema(scenarioSchema);
export const scenarioCursorResponseSchema = createCursorListResponseSchema(scenarioSchema);
export const adminScenarioListResponseSchema = createPageListResponseSchema(scenarioSchema);
export const historyListResponseSchema = createPageListResponseSchema(historySummarySchema);
export const knowledgeItemListResponseSchema = createPageListResponseSchema(knowledgeItemSchema);
export const knowledgePointListResponseSchema = createPageListResponseSchema(knowledgePointSummarySchema);

export type SortDirection = z.infer<typeof sortDirectionSchema>;
export const scenarioListQuerySchema = learnerScenarioListQuerySchema;
export type LearnerScenarioListQuery = z.infer<typeof learnerScenarioListQuerySchema>;
export type AdminScenarioListQuery = z.infer<typeof adminScenarioListQuerySchema>;
export type ScenarioListQuery = LearnerScenarioListQuery;
export type HistorySummary = z.infer<typeof historySummarySchema>;
export type HistoryListQuery = z.infer<typeof historyListQuerySchema>;
export type KnowledgeItemSource = z.infer<typeof knowledgeItemSourceSchema>;
export type KnowledgeItemReviewStatus = z.infer<typeof knowledgeItemReviewStatusSchema>;
export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;
export type KnowledgeItemListQuery = z.infer<typeof knowledgeItemListQuerySchema>;
export type KnowledgePointListQuery = z.infer<typeof knowledgePointListQuerySchema>;
export type KnowledgePointSummary = z.infer<typeof knowledgePointSummarySchema>;
export type KnowledgePointOccurrence = z.infer<typeof knowledgePointOccurrenceSchema>;
export type KnowledgePointDetail = z.infer<typeof knowledgePointDetailSchema>;
export type ScenarioPageResponse = z.infer<typeof scenarioPageResponseSchema>;
export type ScenarioCursorResponse = z.infer<typeof scenarioCursorResponseSchema>;
export type AdminScenarioListResponse = z.infer<typeof adminScenarioListResponseSchema>;
export type HistoryListResponse = z.infer<typeof historyListResponseSchema>;
export type KnowledgeItemListResponse = z.infer<typeof knowledgeItemListResponseSchema>;
export type KnowledgePointListResponse = z.infer<typeof knowledgePointListResponseSchema>;
