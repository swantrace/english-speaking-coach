import { z } from "zod";

const optionalTrimmedSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const knowledgeNewSearchSchema = z.object({
  occurrenceId: optionalTrimmedSearchSchema,
  pattern: optionalTrimmedSearchSchema,
});

export type KnowledgeNewSearchParams = z.infer<typeof knowledgeNewSearchSchema>;

export function parseKnowledgeNewSearch(search: Record<string, unknown>) {
  return knowledgeNewSearchSchema.parse(search);
}

export function normalizeKnowledgeNewSearch(search: Partial<KnowledgeNewSearchParams>) {
  const parsed = knowledgeNewSearchSchema.parse(search);

  return {
    occurrenceId: parsed.occurrenceId,
    pattern: parsed.pattern,
  };
}
