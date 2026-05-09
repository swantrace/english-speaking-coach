import { userRoleValues, userStatusValues } from "@english-coach/domain";
import { z } from "zod";
import { createPageListResponseSchema, pageListQuerySchema } from "./list";

const optionalSearchTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).max(200).optional());

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

export const adminUserListItemSchema = z.object({
  createdAt: z.string().min(1),
  email: z.string().trim().min(1),
  id: z.string().min(1),
  lastLoginAt: z.string().min(1).nullable(),
  role: z.enum(userRoleValues),
  status: z.enum(userStatusValues),
});

export const adminUserListQuerySchema = pageListQuerySchema.extend({
  role: z.enum(userRoleValues).optional(),
  search: optionalSearchTextSchema,
  status: z.enum(userStatusValues).optional(),
});

export const adminUserListResponseSchema = createPageListResponseSchema(adminUserListItemSchema);

export const adminApproveUserInputSchema = z.object({});
export const adminRejectUserInputSchema = z.object({});
export const adminSoftDeleteUserInputSchema = z.object({});
export const adminSetUserRoleInputSchema = z.object({
  role: z.enum(userRoleValues),
});

export const adminAiModelRequestStatusValues = ["started", "completed", "failed"] as const;

const nullableTokenCountSchema = z.number().int().min(0).nullable();
const optionalAiModelRequestStatusSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.enum(adminAiModelRequestStatusValues).optional());

export const adminAiModelRequestTokenUsageSchema = z.object({
  cacheReadTokens: nullableTokenCountSchema,
  cacheWriteTokens: nullableTokenCountSchema,
  inputTokens: nullableTokenCountSchema,
  outputTokens: nullableTokenCountSchema,
  reasoningTokens: nullableTokenCountSchema,
  totalTokens: nullableTokenCountSchema,
});

export const adminAiModelRequestListQuerySchema = pageListQuerySchema.extend({
  from: optionalSearchTextSchema,
  modelId: optionalSearchTextSchema,
  operation: optionalSearchTextSchema,
  providerId: optionalSearchTextSchema,
  search: optionalSearchTextSchema,
  status: optionalAiModelRequestStatusSchema,
  to: optionalSearchTextSchema,
});

export const adminAiModelRequestListItemSchema = z
  .object({
    completedAt: z.string().nullable(),
    error: z.unknown().optional(),
    id: z.string().min(1),
    knowledgeItemId: z.string().nullable(),
    latencyMs: z.number().int().min(0).nullable(),
    metadata: z.unknown().optional(),
    modelId: z.string().min(1),
    operation: z.string().min(1),
    providerId: z.string().min(1),
    scenarioId: z.string().nullable(),
    sessionHistoryId: z.string().nullable(),
    startedAt: z.string().min(1),
    status: z.enum(adminAiModelRequestStatusValues),
    submissionId: z.string().nullable(),
    submissionJobId: z.string().nullable(),
  })
  .merge(adminAiModelRequestTokenUsageSchema);

export const adminAiModelRequestListResponseSchema = createPageListResponseSchema(adminAiModelRequestListItemSchema);

export const adminAiModelRequestDetailSchema = adminAiModelRequestListItemSchema.extend({
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  rawOutput: z.unknown().optional(),
  usage: z.unknown().optional(),
});

export const adminAiModelRequestStatsSummarySchema = z.object({
  averageLatencyMs: z.number().min(0).nullable(),
  failedRequests: z.number().int().min(0),
  requests: z.number().int().min(0),
  successfulRequests: z.number().int().min(0),
  tokenUsage: adminAiModelRequestTokenUsageSchema,
});

export const adminAiModelRequestTrendPointSchema = z.object({
  date: z.string().min(1),
  requests: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
});

export const adminAiModelRequestStatsGroupSchema = z.object({
  averageLatencyMs: z.number().min(0).nullable(),
  failedRequests: z.number().int().min(0),
  key: z.string().min(1),
  label: z.string().min(1),
  requests: z.number().int().min(0),
  tokenUsage: adminAiModelRequestTokenUsageSchema,
});

export const adminAiModelRequestStatsResponseSchema = z.object({
  byModel: z.array(adminAiModelRequestStatsGroupSchema).default([]),
  byOperation: z.array(adminAiModelRequestStatsGroupSchema).default([]),
  summary: adminAiModelRequestStatsSummarySchema,
  trend: z.array(adminAiModelRequestTrendPointSchema).default([]),
});

export type AdminDashboardSummary = z.infer<typeof adminDashboardSummarySchema>;
export type AdminDashboardUsageTrendPoint = z.infer<typeof adminDashboardUsageTrendPointSchema>;
export type AdminDashboardContentTrendPoint = z.infer<typeof adminDashboardContentTrendPointSchema>;
export type AdminDashboardResponse = z.infer<typeof adminDashboardResponseSchema>;
export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserListResponse = z.infer<typeof adminUserListResponseSchema>;
export type AdminApproveUserInput = z.infer<typeof adminApproveUserInputSchema>;
export type AdminRejectUserInput = z.infer<typeof adminRejectUserInputSchema>;
export type AdminSoftDeleteUserInput = z.infer<typeof adminSoftDeleteUserInputSchema>;
export type AdminSetUserRoleInput = z.infer<typeof adminSetUserRoleInputSchema>;
export type AdminAiModelRequestListQuery = z.infer<typeof adminAiModelRequestListQuerySchema>;
export type AdminAiModelRequestListItem = z.infer<typeof adminAiModelRequestListItemSchema>;
export type AdminAiModelRequestListResponse = z.infer<typeof adminAiModelRequestListResponseSchema>;
export type AdminAiModelRequestDetail = z.infer<typeof adminAiModelRequestDetailSchema>;
export type AdminAiModelRequestStatsResponse = z.infer<typeof adminAiModelRequestStatsResponseSchema>;
