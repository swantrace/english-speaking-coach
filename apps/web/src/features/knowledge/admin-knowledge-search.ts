import { communicativeFunctionValues, fixednessLevelValues, syntaxRoleValues } from "@english-coach/domain";
import { z } from "zod";
import type { AdminKnowledgeListFilters } from "./types";

const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const adminKnowledgeSearchSchema = z.object({
  communicativeFunction: z.enum(communicativeFunctionValues).optional(),
  fixednessLevel: z.enum(fixednessLevelValues).optional(),
  reviewStatus: z.enum(["approved", "pendingReview"]).optional(),
  search: optionalSearchSchema,
  syntaxRole: z.enum(syntaxRoleValues).optional(),
});

export type AdminKnowledgeSearchParams = z.infer<typeof adminKnowledgeSearchSchema>;

export function parseAdminKnowledgeSearch(search: Record<string, unknown>) {
  return adminKnowledgeSearchSchema.parse(search);
}

export function normalizeAdminKnowledgeSearch(search: Partial<AdminKnowledgeListFilters>) {
  const parsed = adminKnowledgeSearchSchema.parse(search);

  return {
    communicativeFunction: parsed.communicativeFunction,
    fixednessLevel: parsed.fixednessLevel,
    reviewStatus: parsed.reviewStatus,
    search: parsed.search,
    syntaxRole: parsed.syntaxRole,
  };
}
