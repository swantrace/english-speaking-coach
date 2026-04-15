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
