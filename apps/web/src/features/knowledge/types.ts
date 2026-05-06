import type { CommunicativeFunction, FixednessLevel, PatternType, SessionType } from "@english-coach/domain";

export type AdminKnowledgeReviewStatus = "approved" | "pendingReview";

export interface KnowledgeListFilters {
  communicativeFunction?: CommunicativeFunction;
  fixednessLevel?: FixednessLevel;
  search?: string;
  patternType?: PatternType;
}

export interface AdminKnowledgeListFilters {
  communicativeFunction?: CommunicativeFunction;
  fixednessLevel?: FixednessLevel;
  reviewStatus?: AdminKnowledgeReviewStatus;
  search?: string;
  patternType?: PatternType;
}

export interface KnowledgeListItemView {
  communicativeFunction: CommunicativeFunction | null;
  firstLearnedAt: string;
  fixednessLevel: FixednessLevel | null;
  id: string;
  occurrenceCount: number;
  pattern: string;
  patternType: PatternType | null;
}

export interface KnowledgeListView {
  items: KnowledgeListItemView[];
  total: number;
}

export interface KnowledgeSenseView {
  example: string;
  exampleZh: string;
  grammaticalNote: string | null;
  meaningEn: string;
  meaningZh: string;
  order: number;
}

export interface KnowledgeOccurrenceView {
  excerpt: string;
  id: string;
  occurredAt: string;
  sessionId: string;
  sessionTitle: string;
  sessionType: SessionType;
  transcriptTurnLabel: string;
}

export interface KnowledgeDetailView {
  communicativeFunction: CommunicativeFunction | null;
  firstLearnedAt: string;
  fixednessLevel: FixednessLevel | null;
  id: string;
  lastSeenAt: string;
  occurrenceCount: number;
  occurrences: KnowledgeOccurrenceView[];
  pattern: string;
  senses: KnowledgeSenseView[];
  sessionCount: number;
  patternType: PatternType | null;
}

export interface AdminKnowledgeListItemView {
  communicativeFunction: CommunicativeFunction | null;
  fixednessLevel: FixednessLevel | null;
  id: string;
  isPendingReview: boolean;
  pattern: string;
  reviewStatus: AdminKnowledgeReviewStatus;
  patternType: PatternType | null;
  updatedAt: string;
  updatedAtLabel: string;
}

export interface AdminKnowledgeListView {
  items: AdminKnowledgeListItemView[];
  total: number;
}

export interface AdminKnowledgeDetailView extends AdminKnowledgeListItemView {
  createdAt: string;
  createdAtLabel: string;
  senses: KnowledgeSenseView[];
}

export interface KnowledgeSenseFormValue {
  example: string;
  exampleZh: string;
  grammaticalNote: string;
  meaningEn: string;
  meaningZh: string;
  order: number;
}

export interface KnowledgeFormValues {
  communicativeFunction: CommunicativeFunction | "";
  fixednessLevel: FixednessLevel | "";
  isPendingReview: boolean;
  pattern: string;
  senses: KnowledgeSenseFormValue[];
  patternType: PatternType | "";
}

export interface AdminKnowledgeWritePayload {
  communicativeFunction: CommunicativeFunction | null;
  fixednessLevel: FixednessLevel | null;
  isPendingReview: boolean;
  pattern: string;
  senses: Array<{
    example: string;
    example_zh: string;
    grammatical_note?: string;
    meaning_en: string;
    meaning_zh: string;
    order: number;
  }>;
  patternType: PatternType | null;
}

export interface BulkKnowledgeFormValues {
  patterns: Array<{
    value: string;
  }>;
}

export interface BulkKnowledgeSubmissionView {
  kind: string;
  queuedCount: number;
  submissionId: string;
  totalCount: number;
}
