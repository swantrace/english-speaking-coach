import { z } from "zod";
import {
  createJobEventsSubmissionResponseSchema,
  jobProgressMessageSchema,
  jobProgressStatusSchema,
} from "./job-events";
import { communicativeFunctions, fixednessLevels, syntaxRoles } from "./linguistics";
import { knowledgeItemReviewStatusSchema, knowledgeItemSourceSchema } from "./list";

export const knowledgeGenerateSubmissionKind = "knowledge.generate";
export const knowledgeGenerateQueueName = knowledgeGenerateSubmissionKind;
export const knowledgeGenerateJobName = knowledgeGenerateSubmissionKind;
export const knowledgeGenerateUpdatedEvent = "knowledge.generate.updated";
export const knowledgeGenerateProgressChannel = `${knowledgeGenerateSubmissionKind}.progress`;
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

const adminKnowledgeItemWriteBaseSchema = z.object({
  communicativeFunction: z.enum(communicativeFunctions).nullable().optional(),
  example: z.string().trim().min(1).nullable().optional(),
  fixednessLevel: z.enum(fixednessLevels).nullable().optional(),
  pattern: z.string().trim().min(1),
  source: knowledgeItemSourceSchema.optional(),
  syntaxRole: z.enum(syntaxRoles).nullable().optional(),
});

export const adminKnowledgeItemCreateSchema = adminKnowledgeItemWriteBaseSchema.extend({
  reviewStatus: knowledgeItemReviewStatusSchema.optional().default(knowledgeItemReviewStatusSchema.enum.approved),
  source: knowledgeItemSourceSchema.optional().default(knowledgeItemSourceSchema.enum.admin),
});

export const adminKnowledgeItemUpdateSchema = adminKnowledgeItemWriteBaseSchema
  .extend({
    reviewStatus: knowledgeItemReviewStatusSchema.optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

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

export type AdminKnowledgeItemCreate = z.infer<typeof adminKnowledgeItemCreateSchema>;
export type AdminKnowledgeItemUpdate = z.infer<typeof adminKnowledgeItemUpdateSchema>;
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
