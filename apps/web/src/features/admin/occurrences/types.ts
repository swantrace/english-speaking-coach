import type { AdminKnowledgeOccurrenceStatus } from "@english-coach/contract/knowledge";

export interface ProposedOccurrenceListFilters {
  search?: string;
  status?: AdminKnowledgeOccurrenceStatus;
}

export interface ProposedOccurrenceListItemView {
  id: string;
  knowledgeItemId: string | null;
  proposedPattern: string;
  reviewedAt: string | null;
  sessionHistoryId: string;
  sessionReference: string;
  status: AdminKnowledgeOccurrenceStatus;
  transcriptExcerpt: string;
  transcriptTurnIndex: number;
  transcriptTurnLabel: string;
  utterance: string;
}
