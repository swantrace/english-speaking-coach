import {
  communicativeFunctionValues,
  fixednessLevelValues,
  knowledgeOccurrenceStatusValues,
  syntaxRoleValues,
} from "@english-coach/domain";
import { z } from "zod";
import {
  adminKnowledgeOccurrencesQuerySchema,
  assignKnowledgeOccurrenceSchema,
  createPageListResponseSchema,
  knowledgeItemListQuerySchema,
  knowledgeItemSchema,
  knowledgePointDetailSchema,
  knowledgePointListQuerySchema,
  knowledgePointListResponseSchema,
  knowledgePointOccurrenceSchema,
  knowledgePointSummarySchema,
  knowledgeSenseSchema,
} from "../list";

export {
  knowledgeGenerateSubmissionBodySchema,
  knowledgeGenerateSubmissionResponseSchema,
} from "../knowledge-generate";

const optionalSearchTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).max(200).optional());

const optionalNullableEnumField = <TValues extends readonly [string, ...string[]]>(values: TValues) =>
  z.union([z.enum(values), z.null()]).optional();

export const adminKnowledgeListQuerySchema = knowledgeItemListQuerySchema;
export const adminKnowledgeListItemSchema = knowledgeItemSchema;
export const adminKnowledgeListResponseSchema = createPageListResponseSchema(adminKnowledgeListItemSchema);
export {
  knowledgePointDetailSchema,
  knowledgePointListQuerySchema,
  knowledgePointListResponseSchema,
  knowledgePointOccurrenceSchema,
  knowledgePointSummarySchema,
};

export const adminKnowledgeDetailSchema = adminKnowledgeListItemSchema.extend({
  senses: z.array(knowledgeSenseSchema).default([]),
});

export const adminKnowledgeWriteSchema = z.object({
  communicativeFunction: optionalNullableEnumField(communicativeFunctionValues),
  fixednessLevel: optionalNullableEnumField(fixednessLevelValues),
  isPendingReview: z.boolean().optional(),
  pattern: z.string().trim().min(1),
  senses: z.array(knowledgeSenseSchema).default([]),
  syntaxRole: optionalNullableEnumField(syntaxRoleValues),
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
