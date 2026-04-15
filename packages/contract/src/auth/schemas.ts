import { userRoleValues, userStatusValues } from "@english-coach/domain";
import { z } from "zod";
import { createPageListResponseSchema, pageListQuerySchema } from "../common";

const optionalSearchTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(1).max(200).optional());

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

export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserListResponse = z.infer<typeof adminUserListResponseSchema>;
export type AdminApproveUserInput = z.infer<typeof adminApproveUserInputSchema>;
export type AdminRejectUserInput = z.infer<typeof adminRejectUserInputSchema>;
export type AdminSoftDeleteUserInput = z.infer<typeof adminSoftDeleteUserInputSchema>;
export type AdminSetUserRoleInput = z.infer<typeof adminSetUserRoleInputSchema>;
