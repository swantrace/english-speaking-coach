import type { z } from "zod";
import { type AdminAiRequestListFilters, adminAiRequestListFiltersSchema } from "./types";

export const adminAiRequestSearchSchema = adminAiRequestListFiltersSchema;

export type AdminAiRequestSearchParams = z.infer<typeof adminAiRequestSearchSchema>;

export function parseAdminAiRequestSearch(search: Record<string, unknown>) {
  return adminAiRequestSearchSchema.parse(search);
}

export function normalizeAdminAiRequestSearch(search: Partial<AdminAiRequestListFilters>) {
  const parsed = adminAiRequestSearchSchema.parse(search);

  return {
    from: parsed.from,
    modelId: parsed.modelId,
    operation: parsed.operation,
    page: parsed.page,
    pageSize: parsed.pageSize,
    providerId: parsed.providerId,
    search: parsed.search,
    status: parsed.status,
    to: parsed.to,
  };
}
