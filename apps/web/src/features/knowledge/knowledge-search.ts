import { communicativeFunctionValues, fixednessLevelValues, patternTypeValues } from "@english-coach/domain";
import { z } from "zod";

const optionalSearchSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

export const knowledgeSearchSchema = z.object({
  communicativeFunction: z.enum(communicativeFunctionValues).optional(),
  fixednessLevel: z.enum(fixednessLevelValues).optional(),
  search: optionalSearchSchema,
  patternType: z.enum(patternTypeValues).optional(),
});

export type KnowledgeSearchParams = z.infer<typeof knowledgeSearchSchema>;

export function parseKnowledgeSearch(search: Record<string, unknown>) {
  return knowledgeSearchSchema.parse(search);
}

export function normalizeKnowledgeSearch(search: KnowledgeSearchParams) {
  return knowledgeSearchSchema.parse(search);
}
