import type { KnowledgePointDetail, KnowledgePointOccurrence, KnowledgePointSummary } from "@english-coach/contract";
import type {
  KnowledgeDetailView,
  KnowledgeListFilters,
  KnowledgeListItemView,
  KnowledgeOccurrenceView,
} from "./types";

export function mapKnowledgeListItem(item: KnowledgePointSummary): KnowledgeListItemView {
  return {
    communicativeFunction: item.communicativeFunction,
    firstLearnedAt: item.createdAt,
    fixednessLevel: item.fixednessLevel,
    id: item.id,
    occurrenceCount: item.totalOccurrences,
    pattern: item.pattern,
    syntaxRole: item.syntaxRole,
  };
}

export function mapKnowledgeOccurrence(occurrence: KnowledgePointOccurrence): KnowledgeOccurrenceView {
  return {
    excerpt: occurrence.excerpt,
    id: occurrence.id,
    occurredAt: occurrence.sessionEndedAt ?? occurrence.sessionStartedAt,
    sessionId: occurrence.sessionHistoryId,
    sessionTitle: occurrence.sessionTitle,
    sessionType: occurrence.sessionType,
    transcriptTurnLabel: `Turn ${occurrence.transcriptTurnIndex + 1}`,
  };
}

export function mapKnowledgeDetail(detail: KnowledgePointDetail): KnowledgeDetailView {
  return {
    communicativeFunction: detail.communicativeFunction,
    firstLearnedAt: detail.createdAt,
    fixednessLevel: detail.fixednessLevel,
    id: detail.id,
    lastSeenAt: detail.lastSeenAt,
    occurrenceCount: detail.totalOccurrences,
    occurrences: detail.occurrences.map(mapKnowledgeOccurrence),
    pattern: detail.pattern,
    senses: detail.senses
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((sense) => ({
        example: sense.example,
        exampleZh: sense.example_zh,
        grammaticalNote: sense.grammatical_note ?? null,
        meaningEn: sense.meaning_en,
        meaningZh: sense.meaning_zh,
        order: sense.order,
      })),
    sessionCount: detail.sessionCount,
    syntaxRole: detail.syntaxRole,
  };
}

export function filterKnowledgeListItems(items: KnowledgeListItemView[], filters: KnowledgeListFilters) {
  return items.filter((item) => {
    if (filters.syntaxRole && item.syntaxRole !== filters.syntaxRole) {
      return false;
    }

    if (filters.fixednessLevel && item.fixednessLevel !== filters.fixednessLevel) {
      return false;
    }

    if (filters.communicativeFunction && item.communicativeFunction !== filters.communicativeFunction) {
      return false;
    }

    return true;
  });
}
