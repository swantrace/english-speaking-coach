import {
  communicativeFunctionValues,
  errorDimensionValues,
  fixednessLevelValues,
  syntaxRoleValues,
  userRoleValues,
} from "@english-coach/domain";
import { z } from "zod";

export const defaultListPage = 1;
export const defaultListPageSize = 20;
export const maxListPageSize = 100;
export const defaultScenarioCursorPageSize = 24;

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

export const adminDashboardSummarySchema = z.object({
  activeUsers7d: z.number().int().min(0),
  freeFormSessionsCompleted: z.number().int().min(0),
  knowledgeItemsCreated: z.number().int().min(0),
  rolePlaySessionsCompleted: z.number().int().min(0),
  scenariosCreated: z.number().int().min(0),
  totalUsers: z.number().int().min(0),
});

export const adminDashboardUsageTrendPointSchema = z.object({
  activeUsers7d: z.number().int().min(0),
  date: z.string().min(1),
  freeFormSessionsCompleted: z.number().int().min(0),
  rolePlaySessionsCompleted: z.number().int().min(0),
  totalUsers: z.number().int().min(0),
});

export const adminDashboardContentTrendPointSchema = z.object({
  date: z.string().min(1),
  knowledgeItemsCreated: z.number().int().min(0),
  scenariosCreated: z.number().int().min(0),
});

export const adminDashboardResponseSchema = z.object({
  contentTrend: z.array(adminDashboardContentTrendPointSchema).default([]),
  summary: adminDashboardSummarySchema,
  usageTrend: z.array(adminDashboardUsageTrendPointSchema).default([]),
});

// Legacy lift: these linguistic taxonomies used to live in `linguistics.ts`.
export const syntaxRoles = syntaxRoleValues;
export const fixednessLevels = fixednessLevelValues;
export const communicativeFunctions = communicativeFunctionValues;
export const errorDimensions = errorDimensionValues;
export const userRoles = userRoleValues;

export const jobEventsConnectedEvent = "connected";
export const jobEventsHeartbeatEvent = "heartbeat";
export const jobProgressStatuses = ["queued", "started", "completed", "failed"] as const;

export const jobProgressStatusSchema = z.enum(jobProgressStatuses);

export const jobProgressMessageSchema = z.object({
  error: z.string().optional(),
  jobId: z.string(),
  kind: z.string(),
  message: z.string(),
  processedAt: z.string().optional(),
  progress: z.number(),
  queuedAt: z.string().optional(),
  status: jobProgressStatusSchema,
});

export const jobEventsSubmissionSummarySchema = z.object({
  enqueueFailed: z.number(),
  invalid: z.number(),
  queued: z.number(),
  total: z.number(),
});

export const jobEventsSystemStatusSchema = z.enum([jobEventsConnectedEvent, jobEventsHeartbeatEvent]);

export const jobEventsSystemMessageSchema = z.object({
  channel: z.string(),
  status: jobEventsSystemStatusSchema,
});

export function createJobEventsSubmissionResponseSchema<TSubmissionResultSchema extends z.ZodTypeAny>(
  submissionResultSchema: TSubmissionResultSchema,
) {
  return z.object({
    eventsUrl: z.string(),
    results: z.array(submissionResultSchema),
    summary: jobEventsSubmissionSummarySchema,
  });
}

export function isTerminalJobProgressStatus(status: JobProgressStatus) {
  return status === "completed" || status === "failed";
}

export type SortDirection = z.infer<typeof sortDirectionSchema>;
export type AdminDashboardSummary = z.infer<typeof adminDashboardSummarySchema>;
export type AdminDashboardUsageTrendPoint = z.infer<typeof adminDashboardUsageTrendPointSchema>;
export type AdminDashboardContentTrendPoint = z.infer<typeof adminDashboardContentTrendPointSchema>;
export type AdminDashboardResponse = z.infer<typeof adminDashboardResponseSchema>;
export type SyntaxRole = (typeof syntaxRoles)[number];
export type FixednessLevel = (typeof fixednessLevels)[number];
export type CommunicativeFunction = (typeof communicativeFunctions)[number];
export type ErrorDimension = (typeof errorDimensions)[number];
export type UserRole = (typeof userRoles)[number];
export type JobProgressStatus = z.infer<typeof jobProgressStatusSchema>;
export type JobProgressMessage = z.infer<typeof jobProgressMessageSchema>;
export type JobEventsSubmissionSummary = z.infer<typeof jobEventsSubmissionSummarySchema>;
export type JobEventsSystemStatus = z.infer<typeof jobEventsSystemStatusSchema>;
export type JobEventsSystemMessage = z.infer<typeof jobEventsSystemMessageSchema>;
