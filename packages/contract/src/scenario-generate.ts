import { scenarios } from "@english-coach/database/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  createJobEventsSubmissionResponseSchema,
  jobProgressMessageSchema,
  jobProgressStatusSchema,
} from "./job-events";
import { scenarioCharacterSchema, scenarioDialogueTurnSchema, scenarioGoalsSchema } from "./session";

export const scenarioGenerateSubmissionKind = "scenario.generate";
export const scenarioGenerateQueueName = scenarioGenerateSubmissionKind;
export const scenarioGenerateJobName = scenarioGenerateSubmissionKind;
export const scenarioGenerateUpdatedEvent = "scenario.generate.updated";
export const scenarioGenerateProgressChannel = `${scenarioGenerateSubmissionKind}.progress`;
export const scenarioGenerateEventsSubscriberPrefix = `${scenarioGenerateSubmissionKind}.events`;
export const scenarioGenerateSubmitPath = "/api/scenarios/generate";
export const scenarioGenerateEventsPath = "/api/scenarios/generate/events";
export const scenarioGenerateDefaultEventsLimit = 50;

export const scenarioGenerateJobStatusSchema = jobProgressStatusSchema;
export const scenarioGenerateSubmissionStatusSchema = z.enum(["queued", "invalid_input", "enqueue_failed"]);
export const scenarioGenerateCursorSchema = z.number().int().min(0);
export const scenarioGenerateEventsQuerySchema = z.object({
  cursor: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(scenarioGenerateDefaultEventsLimit),
  submissionId: z.string().min(1).optional(),
});

export const scenarioGenerateSubmissionItemSchema = z.object({
  message: z.string().min(1),
  queuedAt: z.string().optional(),
});

export const scenarioGenerateSubmissionBodySchema = z.object({
  items: z.array(scenarioGenerateSubmissionItemSchema).min(1),
});

const adminScenarioWriteBaseSchema = createInsertSchema(scenarios, {
  characters: z.tuple([scenarioCharacterSchema, scenarioCharacterSchema]),
  exampleDialogue: z.array(scenarioDialogueTurnSchema).min(1),
  goals: scenarioGoalsSchema,
  setting: z.string().trim().min(1),
  title: z.string().trim().min(1),
}).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const adminScenarioCreateSchema = adminScenarioWriteBaseSchema;

export const adminScenarioUpdateSchema = adminScenarioWriteBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const scenarioGenerateSubmissionTransportBodySchema = z.object({
  items: z.array(z.unknown()).min(1),
});

export const scenarioGenerateSubmissionTransportRequestSchema = z.union([
  scenarioGenerateSubmissionTransportBodySchema,
  z.record(z.string(), z.unknown()),
]);

export const scenarioGenerateSubmissionResultSchema = z.object({
  cursor: scenarioGenerateCursorSchema.optional(),
  error: z.string().optional(),
  index: z.number(),
  jobId: z.string().optional(),
  payload: scenarioGenerateSubmissionItemSchema
    .extend({
      queuedAt: z.string(),
    })
    .optional(),
  status: scenarioGenerateSubmissionStatusSchema,
  submissionId: z.string().min(1).optional(),
});

export const scenarioGenerateJobUpdateSchema = jobProgressMessageSchema.extend({
  cursor: scenarioGenerateCursorSchema,
  submissionId: z.string().min(1),
});

export const scenarioGenerateSubmissionResponseSchema = createJobEventsSubmissionResponseSchema(
  scenarioGenerateSubmissionResultSchema,
).extend({
  limit: z.number().int().min(1).max(100),
  submissionId: z.string().min(1),
});

export function createScenarioGenerateEventsUrl({
  cursor,
  limit = scenarioGenerateDefaultEventsLimit,
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

  return `${scenarioGenerateEventsPath}?${searchParams.toString()}`;
}

export type ScenarioGenerateSubmissionBody = z.infer<typeof scenarioGenerateSubmissionBodySchema>;
export type ScenarioGenerateSubmissionItem = z.infer<typeof scenarioGenerateSubmissionItemSchema>;
export type ScenarioGenerateSubmissionTransportBody = z.infer<typeof scenarioGenerateSubmissionTransportBodySchema>;
export type ScenarioGenerateSubmissionTransportRequest = z.infer<
  typeof scenarioGenerateSubmissionTransportRequestSchema
>;
export type AdminScenarioCreate = z.infer<typeof adminScenarioCreateSchema>;
export type AdminScenarioUpdate = z.infer<typeof adminScenarioUpdateSchema>;
export type ScenarioGenerateEventsQuery = z.infer<typeof scenarioGenerateEventsQuerySchema>;
export type ScenarioGenerateSubmissionResult = z.infer<typeof scenarioGenerateSubmissionResultSchema>;
export type ScenarioGenerateJobUpdate = z.infer<typeof scenarioGenerateJobUpdateSchema>;
export type ScenarioGenerateSubmissionResponse = z.infer<typeof scenarioGenerateSubmissionResponseSchema>;
