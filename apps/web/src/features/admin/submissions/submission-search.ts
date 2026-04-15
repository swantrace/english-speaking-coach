import type { z } from "zod";
import type { AdminSubmissionListFilters } from "./types";
import { adminSubmissionListFiltersSchema } from "./types";

export const adminSubmissionSearchSchema = adminSubmissionListFiltersSchema;

export type AdminSubmissionSearchParams = z.infer<typeof adminSubmissionSearchSchema>;

export function parseAdminSubmissionSearch(search: Record<string, unknown>) {
  return adminSubmissionSearchSchema.parse(search);
}

export function normalizeAdminSubmissionSearch(search: Partial<AdminSubmissionListFilters>) {
  const parsed = adminSubmissionSearchSchema.parse(search);

  return {
    kind: parsed.kind,
    search: parsed.search,
  };
}
