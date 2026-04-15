import { z } from "zod";
import type { AdminScenarioListFilters } from "./types";

const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const tagsSearchSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}, z.array(z.string()).default([]));

export const adminScenarioSearchSchema = z.object({
  reviewStatus: z.enum(["approved", "pendingReview"]).optional(),
  search: optionalSearchSchema,
  tags: tagsSearchSchema,
});

export type AdminScenarioSearchParams = z.infer<typeof adminScenarioSearchSchema>;

export function parseAdminScenarioSearch(search: Record<string, unknown>) {
  return adminScenarioSearchSchema.parse(search);
}

export function normalizeAdminScenarioSearch(search: Partial<AdminScenarioListFilters>) {
  const parsed = adminScenarioSearchSchema.parse(search);

  return {
    reviewStatus: parsed.reviewStatus,
    search: parsed.search,
    tags: [...new Set(parsed.tags.map((tag) => tag.trim()).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}
