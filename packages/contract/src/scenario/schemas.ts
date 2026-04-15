import { scenarios } from "@english-coach/database/schema";
import { speakerValues } from "@english-coach/domain";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
  createCursorListResponseSchema,
  createJobEventsSubmissionResponseSchema,
  createPageListResponseSchema,
  jobProgressMessageSchema,
  jobProgressStatusSchema,
  pageListQuerySchema,
  sortDirectionSchema,
} from "../common";

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

export const scenarioCharacterSchema = z.object({
  description: z.string(),
  name: z.string(),
});

const scenarioDialogueTurnTextSchema = z.string().trim().min(1);

export const scenarioDialogueTurnSchema = z.union([
  z.object({
    characterIndex: z.union([z.literal(0), z.literal(1)]),
    text: scenarioDialogueTurnTextSchema,
  }),
  z
    .object({
      speaker: z.enum(speakerValues),
      text: scenarioDialogueTurnTextSchema,
    })
    .transform(({ speaker, text }) => ({
      characterIndex: speaker === "user" ? (0 as const) : (1 as const),
      text,
    })),
]);

export const scenarioGoalSchema = z.object({
  description: z.string(),
  id: z.string(),
  logic: z.object({
    required_intents: z.array(z.string()),
    required_slots: z.array(z.string()),
  }),
  optional: z.boolean().optional(),
});

export const scenarioGoalsSchema = z.object({
  goals: z.array(scenarioGoalSchema),
  intents: z.array(z.string()),
  slots: z.array(z.string()),
});

export const scenarioPendingReviewSchema = z.boolean();

export const scenarioSchema = createSelectSchema(scenarios, {
  characters: z.tuple([scenarioCharacterSchema, scenarioCharacterSchema]),
  exampleDialogue: z.array(scenarioDialogueTurnSchema),
  goals: scenarioGoalsSchema,
});

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

export const scenarioPageResponseSchema = createPageListResponseSchema(scenarioSchema);
// Legacy lift: cursor pagination response used to live in `list.ts`.
export const scenarioCursorResponseSchema = createCursorListResponseSchema(scenarioSchema);
export const adminScenarioListResponseSchema = createPageListResponseSchema(scenarioSchema);

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

export type ScenarioCharacter = z.infer<typeof scenarioCharacterSchema>;
export type ScenarioDialogueTurn = z.infer<typeof scenarioDialogueTurnSchema>;
export type ScenarioGoal = z.infer<typeof scenarioGoalSchema>;
export type ScenarioGoals = z.infer<typeof scenarioGoalsSchema>;
export type ScenarioPendingReview = z.infer<typeof scenarioPendingReviewSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type LearnerScenarioListQuery = z.infer<typeof learnerScenarioListQuerySchema>;
export type AdminScenarioListQuery = z.infer<typeof adminScenarioListQuerySchema>;
export type ScenarioListQuery = LearnerScenarioListQuery;
export type ScenarioPageResponse = z.infer<typeof scenarioPageResponseSchema>;
export type ScenarioCursorResponse = z.infer<typeof scenarioCursorResponseSchema>;
export type AdminScenarioListResponse = z.infer<typeof adminScenarioListResponseSchema>;
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
