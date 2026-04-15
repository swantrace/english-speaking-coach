import type { CommunicativeFunction, FixednessLevel, SessionType, SyntaxRole } from "@english-coach/domain";

export interface KnowledgeListFilters {
  communicativeFunction?: CommunicativeFunction;
  fixednessLevel?: FixednessLevel;
  search?: string;
  syntaxRole?: SyntaxRole;
}

export interface KnowledgeListItemView {
  communicativeFunction: CommunicativeFunction | null;
  firstLearnedAt: string;
  fixednessLevel: FixednessLevel | null;
  id: string;
  occurrenceCount: number;
  pattern: string;
  syntaxRole: SyntaxRole | null;
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
  syntaxRole: SyntaxRole | null;
}
