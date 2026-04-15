import { userRoleValues, userStatusValues } from "@english-coach/domain";
import { z } from "zod";

const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const adminUserSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  role: z.enum(userRoleValues).optional(),
  search: optionalSearchSchema,
  status: z.enum(userStatusValues).optional(),
});

export type AdminUserSearchParams = z.infer<typeof adminUserSearchSchema>;

export function parseAdminUserSearch(search: Record<string, unknown>) {
  return adminUserSearchSchema.parse(search);
}

export function normalizeAdminUserSearch(search: AdminUserSearchParams) {
  return adminUserSearchSchema.parse(search);
}
