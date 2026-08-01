import type { AdminKnowledgeOccurrenceStatus } from "@english-coach/contract/knowledge";
import type { CommunicativeFunction, FixednessLevel, PatternType } from "@english-coach/domain";
import type { KnowledgeSenseView } from "@/features/knowledge/types";

export interface ProposedOccurrenceListFilters {
  search?: string;
  status?: AdminKnowledgeOccurrenceStatus;
}

export interface ProposedOccurrenceListItemView {
  draftError?: string | null;
  draftStatus?: "failed" | "generating" | "not-generated" | "ready";
  id: string;
  knowledgeItemId: string | null;
  proposedCommunicativeFunction: CommunicativeFunction | null;
  proposedFixednessLevel: FixednessLevel | null;
  proposedPattern: string;
  proposedPatternType: PatternType | null;
  proposedSenses: KnowledgeSenseView[] | null;
  reviewedAt: string | null;
  sessionHistoryId: string;
  sessionReference: string;
  status: AdminKnowledgeOccurrenceStatus;
  transcriptExcerpt: string;
  transcriptTurnIndex: number;
  transcriptTurnLabel: string;
  utterance: string;
}
