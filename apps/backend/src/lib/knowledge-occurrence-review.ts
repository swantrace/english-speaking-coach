import type { AdminApproveKnowledgeOccurrenceInput } from "@english-coach/contract/knowledge";

export function buildApprovedKnowledgeItemValues(
  input: AdminApproveKnowledgeOccurrenceInput,
  { id, now }: { id: string; now: string },
) {
  return {
    communicativeFunction: input.communicativeFunction,
    createdAt: now,
    fixednessLevel: input.fixednessLevel,
    id,
    isPendingReview: false,
    pattern: input.pattern,
    patternType: input.patternType,
    senses: input.senses,
    updatedAt: now,
  } as const;
}
