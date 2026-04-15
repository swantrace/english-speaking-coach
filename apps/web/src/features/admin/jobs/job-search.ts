import type { z } from "zod";
import type { AdminJobListFilters } from "./types";
import { adminJobListFiltersSchema } from "./types";

export const adminJobSearchSchema = adminJobListFiltersSchema;

export type AdminJobSearchParams = z.infer<typeof adminJobSearchSchema>;

export function parseAdminJobSearch(search: Record<string, unknown>) {
  return adminJobSearchSchema.parse(search);
}

export function normalizeAdminJobSearch(search: Partial<AdminJobListFilters>) {
  const parsed = adminJobSearchSchema.parse(search);

  return {
    kind: parsed.kind,
    search: parsed.search,
    status: parsed.status,
  };
}
