import { knowledgeOccurrenceStatusValues } from "@english-coach/domain";
import { z } from "zod";
import type { ProposedOccurrenceListFilters } from "./types";

const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const occurrenceSearchSchema = z.object({
  search: optionalSearchSchema,
  status: z.enum(knowledgeOccurrenceStatusValues).optional().default("proposed"),
});

export type OccurrenceSearchParams = z.infer<typeof occurrenceSearchSchema>;

export function parseOccurrenceSearch(search: Record<string, unknown>) {
  return occurrenceSearchSchema.parse(search);
}

export function normalizeOccurrenceSearch(search: Partial<ProposedOccurrenceListFilters>) {
  const parsed = occurrenceSearchSchema.parse(search);

  return {
    search: parsed.search,
    status: parsed.status,
  };
}
