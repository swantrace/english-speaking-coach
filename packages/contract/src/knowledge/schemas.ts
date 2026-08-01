import { knowledgeItems } from "@english-coach/database/schema";
import {
  communicativeFunctionValues,
  fixednessLevelValues,
  knowledgeOccurrenceStatusValues,
  patternTypeValues,
  speakerValues,
} from "@english-coach/domain";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  createJobEventsSubmissionResponseSchema,
  createPageListResponseSchema,
  jobProgressMessageSchema,
  jobProgressStatusSchema,
  pageListQuerySchema,
  sortDirectionSchema,
} from "../common";
import { sessionTypeSchema } from "../session";

const optionalSearchTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).max(200).optional());

const optionalNullableEnumField = <TValues extends readonly [string, ...string[]]>(values: TValues) =>
  z.union([z.enum(values), z.null()]).optional();

export const knowledgeItemPendingReviewSchema = z.boolean();

export const knowledgeSenseSchema = z.object({
  example: z.string().trim().min(1),
  example_zh: z.string().trim().min(1),
  grammatical_note: z.string().trim().min(1).optional(),
  meaning_en: z.string().trim().min(1),
  meaning_zh: z.string().trim().min(1),
  order: z.number().int().min(1),
});

/**
 * Complete AI-enriched draft stored on an occurrence before an administrator
 * approves it or links it to an existing knowledge item.
 */
export const knowledgeOccurrenceDraftSchema = z.object({
  proposedCommunicativeFunction: z.enum(communicativeFunctionValues).nullable(),
  proposedFixednessLevel: z.enum(fixednessLevelValues).nullable(),
  proposedPattern: z.string().trim().min(1),
  proposedPatternType: z.enum(patternTypeValues),
  proposedSenses: z.array(knowledgeSenseSchema).min(1),
});

export const knowledgeItemSchema = createSelectSchema(knowledgeItems, {
  communicativeFunction: z.enum(communicativeFunctionValues).nullable(),
  fixednessLevel: z.enum(fixednessLevelValues).nullable(),
  isPendingReview: z.boolean(),
  patternType: z.enum(patternTypeValues).nullable(),
});

export const knowledgeItemListSortBySchema = z.enum(["updatedAt", "createdAt", "pattern", "isPendingReview"]);
export const knowledgeItemListQuerySchema = pageListQuerySchema.extend({
  communicativeFunction: z.enum(communicativeFunctionValues).optional(),
  fixednessLevel: z.enum(fixednessLevelValues).optional(),
  isPendingReview: z.coerce.boolean().optional(),
  search: optionalSearchTextSchema,
  sortBy: knowledgeItemListSortBySchema.default(knowledgeItemListSortBySchema.enum.updatedAt),
  sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
  patternType: z.enum(patternTypeValues).optional(),
});

export const knowledgePointListSortBySchema = z.enum(["lastSeenAt", "pattern", "sessionCount", "totalOccurrences"]);
export const knowledgePointListQuerySchema = pageListQuerySchema.extend({
  search: optionalSearchTextSchema,
  sortBy: knowledgePointListSortBySchema.default(knowledgePointListSortBySchema.enum.lastSeenAt),
  sortDirection: sortDirectionSchema.default(sortDirectionSchema.enum.desc),
});

export const knowledgePointSummarySchema = z.object({
  communicativeFunction: z.enum(communicativeFunctionValues).nullable(),
  createdAt: z.string(),
  fixednessLevel: z.enum(fixednessLevelValues).nullable(),
  id: z.string(),
  lastSeenAt: z.string(),
  pattern: z.string().trim().min(1),
  sessionCount: z.number().int().min(1),
  patternType: z.enum(patternTypeValues).nullable(),
  totalOccurrences: z.number().int().min(1),
  updatedAt: z.string(),
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
  senses: z.array(knowledgeSenseSchema),
});

export const knowledgeItemListResponseSchema = createPageListResponseSchema(knowledgeItemSchema);
export const knowledgePointListResponseSchema = createPageListResponseSchema(knowledgePointSummarySchema);

export const adminKnowledgeListQuerySchema = knowledgeItemListQuerySchema;
export const adminKnowledgeListItemSchema = knowledgeItemSchema;
export const adminKnowledgeListResponseSchema = createPageListResponseSchema(adminKnowledgeListItemSchema);

export const adminKnowledgeDetailSchema = adminKnowledgeListItemSchema.extend({
  senses: z.array(knowledgeSenseSchema).default([]),
});

export const adminKnowledgeWriteSchema = z.object({
  communicativeFunction: optionalNullableEnumField(communicativeFunctionValues),
  fixednessLevel: optionalNullableEnumField(fixednessLevelValues),
  isPendingReview: z.boolean().optional(),
  pattern: z.string().trim().min(1),
  senses: z.array(knowledgeSenseSchema).default([]),
  patternType: optionalNullableEnumField(patternTypeValues),
});

export const adminKnowledgeCreateSchema = adminKnowledgeWriteSchema.extend({
  isPendingReview: z.boolean().default(false),
});

export const adminKnowledgeUpdateSchema = adminKnowledgeWriteSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const adminKnowledgeBulkApproveSchema = z.object({
  knowledgeItemIds: z.array(z.string().trim().min(1)).min(1),
});

export const adminKnowledgeBulkDeleteSchema = z.object({
  knowledgeItemIds: z.array(z.string().trim().min(1)).min(1),
});

export const adminKnowledgeOccurrenceStatusSchema = z.enum(knowledgeOccurrenceStatusValues);

export const adminKnowledgeOccurrenceListItemSchema = z.object({
  id: z.string().min(1),
  knowledgeItemId: z.string().min(1).nullable(),
  proposedPattern: z.string().trim().min(1),
  reviewedAt: z.string().min(1).nullable(),
  sessionHistoryId: z.string().min(1),
  sessionTitle: z.string().trim().min(1).nullable(),
  status: adminKnowledgeOccurrenceStatusSchema,
  transcriptExcerpt: z.string().trim().min(1),
  transcriptTurnIndex: z.number().int().min(0),
  utterance: z.string().trim().min(1),
});

export const adminKnowledgeOccurrenceListQueryWithStatusSchema = adminKnowledgeOccurrencesQuerySchema.extend({
  search: optionalSearchTextSchema,
  status: adminKnowledgeOccurrenceStatusSchema.optional(),
});

export const adminKnowledgeOccurrenceListResponseWithStatusSchema = createPageListResponseSchema(
  adminKnowledgeOccurrenceListItemSchema,
);

export const adminLinkKnowledgeOccurrenceSchema = assignKnowledgeOccurrenceSchema;
export const adminLinkKnowledgeOccurrenceResponseSchema = z.object({
  id: z.string().min(1),
  knowledgeItemId: z.string().min(1),
  status: adminKnowledgeOccurrenceStatusSchema,
});

export const adminRejectKnowledgeOccurrenceSchema = z.object({
  reason: z.string().trim().min(1).max(200).optional(),
});

export const adminRejectKnowledgeOccurrenceResponseSchema = z.object({
  id: z.string().min(1),
  status: z.literal("rejected"),
});

export const knowledgeGenerateSubmissionKind = "knowledge.generate";
export const knowledgeGenerateQueueName = knowledgeGenerateSubmissionKind;
export const knowledgeGenerateJobName = knowledgeGenerateSubmissionKind;
export const knowledgeGenerateUpdatedEvent = "knowledge.generate.updated";
export const knowledgeGenerateProgressChannel = `${knowledgeGenerateSubmissionKind}.progress`;
export const knowledgeOccurrenceResolveQueueName = "knowledgeOccurrenceResolve";
export const knowledgeOccurrenceResolveJobName = "knowledgeOccurrenceResolve";
export const knowledgeOccurrenceResolveJobSchema = z.object({
  occurrenceId: z.string().min(1),
});
export const knowledgeGenerateEventsSubscriberPrefix = `${knowledgeGenerateSubmissionKind}.events`;
export const knowledgeGenerateSubmitPath = "/api/admin/knowledge-items/generate";
export const knowledgeGenerateEventsPath = "/api/admin/knowledge-items/generate/events";
export const knowledgeGenerateDefaultEventsLimit = 50;

export const knowledgeGenerateJobStatusSchema = jobProgressStatusSchema;
export const knowledgeGenerateSubmissionStatusSchema = z.enum(["queued", "invalid_input", "enqueue_failed"]);
export const knowledgeGenerateCursorSchema = z.number().int().min(0);
export const knowledgeGenerateEventsQuerySchema = z.object({
  cursor: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(knowledgeGenerateDefaultEventsLimit),
  submissionId: z.string().min(1).optional(),
});

export const knowledgeGenerateHistoryQuerySchema = z.object({
  jobsPerSubmission: z.coerce.number().int().min(1).max(20).default(5),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const knowledgeGenerateSubmissionItemSchema = z.object({
  message: z.string().min(1),
  queuedAt: z.string().optional(),
});

export const knowledgeGenerateSubmissionBodySchema = z.object({
  items: z.array(knowledgeGenerateSubmissionItemSchema).min(1),
});

export const knowledgeGenerateSubmissionTransportBodySchema = z.object({
  items: z.array(z.unknown()).min(1),
});

export const knowledgeGenerateSubmissionTransportRequestSchema = z.union([
  knowledgeGenerateSubmissionTransportBodySchema,
  z.record(z.string(), z.unknown()),
]);

export const knowledgeGenerateSubmissionResultSchema = z.object({
  cursor: knowledgeGenerateCursorSchema.optional(),
  error: z.string().optional(),
  index: z.number(),
  jobId: z.string().optional(),
  payload: knowledgeGenerateSubmissionItemSchema
    .extend({
      queuedAt: z.string(),
    })
    .optional(),
  status: knowledgeGenerateSubmissionStatusSchema,
  submissionId: z.string().min(1).optional(),
});

export const knowledgeGenerateJobUpdateSchema = jobProgressMessageSchema.extend({
  cursor: knowledgeGenerateCursorSchema,
  submissionId: z.string().min(1),
});

export const knowledgeGenerateSubmissionResponseSchema = createJobEventsSubmissionResponseSchema(
  knowledgeGenerateSubmissionResultSchema,
).extend({
  limit: z.number().int().min(1).max(100),
  submissionId: z.string().min(1),
});

export const knowledgeGenerateSubmissionHistorySummarySchema = z.object({
  completed: z.number().int().min(0),
  failed: z.number().int().min(0),
  queued: z.number().int().min(0),
  started: z.number().int().min(0),
  totalJobs: z.number().int().min(0),
});

export const knowledgeGenerateSubmissionHistoryItemSchema = z.object({
  createdAt: z.string(),
  eventsUrl: z.string(),
  id: z.string(),
  jobs: z.array(knowledgeGenerateJobUpdateSchema),
  summary: knowledgeGenerateSubmissionHistorySummarySchema,
  totalCount: z.number().int().min(0),
  updatedAt: z.string(),
  userId: z.string().nullable(),
});

export const knowledgeGenerateSubmissionHistoryResponseSchema = z.object({
  items: z.array(knowledgeGenerateSubmissionHistoryItemSchema),
});

export function createKnowledgeGenerateEventsUrl({
  cursor,
  limit = knowledgeGenerateDefaultEventsLimit,
  submissionId,
}: {
  cursor?: number;
  limit?: number;
  submissionId: string;
}) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    submissionId,
  });

  if (typeof cursor === "number") {
    searchParams.set("cursor", String(cursor));
  }

  return `${knowledgeGenerateEventsPath}?${searchParams.toString()}`;
}

export type KnowledgeItem = z.infer<typeof knowledgeItemSchema>;
export type KnowledgeItemListQuery = z.infer<typeof knowledgeItemListQuerySchema>;
export type KnowledgeOccurrenceDraft = z.infer<typeof knowledgeOccurrenceDraftSchema>;
export type KnowledgeSense = z.infer<typeof knowledgeSenseSchema>;
export type KnowledgePointListQuery = z.infer<typeof knowledgePointListQuerySchema>;
export type KnowledgePointSummary = z.infer<typeof knowledgePointSummarySchema>;
export type KnowledgePointOccurrence = z.infer<typeof knowledgePointOccurrenceSchema>;
export type KnowledgePointDetail = z.infer<typeof knowledgePointDetailSchema>;
export type UnresolvedKnowledgeOccurrence = z.infer<typeof unresolvedKnowledgeOccurrenceSchema>;
export type AdminKnowledgeOccurrencesQuery = z.infer<typeof adminKnowledgeOccurrencesQuerySchema>;
export type KnowledgeItemListResponse = z.infer<typeof knowledgeItemListResponseSchema>;
export type KnowledgePointListResponse = z.infer<typeof knowledgePointListResponseSchema>;
export type AdminKnowledgeListQuery = z.infer<typeof adminKnowledgeListQuerySchema>;
export type AdminKnowledgeListItem = z.infer<typeof adminKnowledgeListItemSchema>;
export type AdminKnowledgeListResponse = z.infer<typeof adminKnowledgeListResponseSchema>;
export type AdminKnowledgeDetail = z.infer<typeof adminKnowledgeDetailSchema>;
export type AdminKnowledgeCreate = z.infer<typeof adminKnowledgeCreateSchema>;
export type AdminKnowledgeUpdate = z.infer<typeof adminKnowledgeUpdateSchema>;
export type AdminKnowledgeBulkApprove = z.infer<typeof adminKnowledgeBulkApproveSchema>;
export type AdminKnowledgeBulkDelete = z.infer<typeof adminKnowledgeBulkDeleteSchema>;
export type AdminKnowledgeOccurrenceStatus = z.infer<typeof adminKnowledgeOccurrenceStatusSchema>;
export type AdminKnowledgeOccurrenceListItem = z.infer<typeof adminKnowledgeOccurrenceListItemSchema>;
export type AdminKnowledgeOccurrenceListQuery = z.infer<typeof adminKnowledgeOccurrenceListQueryWithStatusSchema>;
export type AdminKnowledgeOccurrenceListResponse = z.infer<typeof adminKnowledgeOccurrenceListResponseWithStatusSchema>;
export type AdminLinkKnowledgeOccurrenceInput = z.infer<typeof adminLinkKnowledgeOccurrenceSchema>;
export type AdminLinkKnowledgeOccurrenceResponse = z.infer<typeof adminLinkKnowledgeOccurrenceResponseSchema>;
export type AdminRejectKnowledgeOccurrenceInput = z.infer<typeof adminRejectKnowledgeOccurrenceSchema>;
export type AdminRejectKnowledgeOccurrenceResponse = z.infer<typeof adminRejectKnowledgeOccurrenceResponseSchema>;
export type KnowledgeGenerateEventsQuery = z.infer<typeof knowledgeGenerateEventsQuerySchema>;
export type KnowledgeGenerateHistoryQuery = z.infer<typeof knowledgeGenerateHistoryQuerySchema>;
export type KnowledgeGenerateSubmissionBody = z.infer<typeof knowledgeGenerateSubmissionBodySchema>;
export type KnowledgeGenerateSubmissionItem = z.infer<typeof knowledgeGenerateSubmissionItemSchema>;
export type KnowledgeGenerateSubmissionHistoryItem = z.infer<typeof knowledgeGenerateSubmissionHistoryItemSchema>;
export type KnowledgeGenerateSubmissionHistoryResponse = z.infer<
  typeof knowledgeGenerateSubmissionHistoryResponseSchema
>;
export type KnowledgeGenerateSubmissionResult = z.infer<typeof knowledgeGenerateSubmissionResultSchema>;
export type KnowledgeGenerateJobUpdate = z.infer<typeof knowledgeGenerateJobUpdateSchema>;
export type KnowledgeGenerateSubmissionResponse = z.infer<typeof knowledgeGenerateSubmissionResponseSchema>;
export type KnowledgeOccurrenceResolveJob = z.infer<typeof knowledgeOccurrenceResolveJobSchema>;
