import {
  type KnowledgeOccurrenceDraft,
  knowledgeOccurrenceDraftSchema,
  knowledgeOccurrenceEnrichJobName,
} from "@english-coach/contract/knowledge";
import type { GeneratedKnowledgeItem } from "../../ai";

export function buildKnowledgeOccurrenceDraftUpdate(
  generatedKnowledgeItem: GeneratedKnowledgeItem,
): KnowledgeOccurrenceDraft {
  return knowledgeOccurrenceDraftSchema.parse({
    proposedCommunicativeFunction: generatedKnowledgeItem.communicativeFunction ?? null,
    proposedFixednessLevel: generatedKnowledgeItem.fixednessLevel ?? null,
    proposedPattern: generatedKnowledgeItem.pattern,
    proposedPatternType: generatedKnowledgeItem.patternType,
    proposedSenses: generatedKnowledgeItem.senses,
  });
}

export function createKnowledgeOccurrenceEnrichmentJobs(occurrenceIds: string[]) {
  return [...new Set(occurrenceIds)].map((occurrenceId) => ({
    data: { occurrenceId },
    name: knowledgeOccurrenceEnrichJobName,
    opts: {
      attempts: 3,
      backoff: { delay: 2_000, type: "exponential" as const },
      jobId: `${knowledgeOccurrenceEnrichJobName}-${occurrenceId}`,
      removeOnComplete: true,
      removeOnFail: false,
    },
  }));
}
