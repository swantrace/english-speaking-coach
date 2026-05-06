import type {
  AdminKnowledgeDetail,
  AdminKnowledgeListItem,
  KnowledgeGenerateSubmissionResponse,
  KnowledgePointDetail,
  KnowledgePointOccurrence,
  KnowledgePointSummary,
} from "@english-coach/contract/knowledge";
import dayjs from "dayjs";
import type {
  AdminKnowledgeDetailView,
  AdminKnowledgeListFilters,
  AdminKnowledgeListItemView,
  AdminKnowledgeWritePayload,
  BulkKnowledgeSubmissionView,
  KnowledgeDetailView,
  KnowledgeFormValues,
  KnowledgeListFilters,
  KnowledgeListItemView,
  KnowledgeOccurrenceView,
} from "./types";

function formatAdminDateLabel(value: string) {
  return dayjs(value).format("MMM D, YYYY");
}

function mapSense(sense: {
  example: string;
  example_zh: string;
  grammatical_note?: string;
  meaning_en: string;
  meaning_zh: string;
  order: number;
}) {
  return {
    example: sense.example,
    exampleZh: sense.example_zh,
    grammaticalNote: sense.grammatical_note ?? null,
    meaningEn: sense.meaning_en,
    meaningZh: sense.meaning_zh,
    order: sense.order,
  };
}

export function mapKnowledgeListItem(item: KnowledgePointSummary): KnowledgeListItemView {
  return {
    communicativeFunction: item.communicativeFunction,
    firstLearnedAt: item.createdAt,
    fixednessLevel: item.fixednessLevel,
    id: item.id,
    occurrenceCount: item.totalOccurrences,
    pattern: item.pattern,
    patternType: item.patternType,
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
      .map(mapSense),
    sessionCount: detail.sessionCount,
    patternType: detail.patternType,
  };
}

export function mapAdminKnowledgeListItem(item: AdminKnowledgeListItem): AdminKnowledgeListItemView {
  return {
    communicativeFunction: item.communicativeFunction,
    fixednessLevel: item.fixednessLevel,
    id: item.id,
    isPendingReview: item.isPendingReview,
    pattern: item.pattern,
    reviewStatus: item.isPendingReview ? "pendingReview" : "approved",
    patternType: item.patternType,
    updatedAt: item.updatedAt,
    updatedAtLabel: formatAdminDateLabel(item.updatedAt),
  };
}

export function mapAdminKnowledgeDetail(detail: AdminKnowledgeDetail): AdminKnowledgeDetailView {
  return {
    ...mapAdminKnowledgeListItem(detail),
    createdAt: detail.createdAt,
    createdAtLabel: formatAdminDateLabel(detail.createdAt),
    senses: detail.senses
      .slice()
      .sort((left, right) => left.order - right.order)
      .map(mapSense),
  };
}

export function createEmptyKnowledgeFormValues(partial?: Partial<KnowledgeFormValues>): KnowledgeFormValues {
  return {
    communicativeFunction: "",
    fixednessLevel: "",
    isPendingReview: false,
    pattern: "",
    senses: [
      {
        example: "",
        exampleZh: "",
        grammaticalNote: "",
        meaningEn: "",
        meaningZh: "",
        order: 1,
      },
    ],
    patternType: "",
    ...partial,
  };
}

export function mapAdminKnowledgeDetailToFormValues(detail: AdminKnowledgeDetailView): KnowledgeFormValues {
  return createEmptyKnowledgeFormValues({
    communicativeFunction: detail.communicativeFunction ?? "",
    fixednessLevel: detail.fixednessLevel ?? "",
    isPendingReview: detail.isPendingReview,
    pattern: detail.pattern,
    senses: detail.senses.length
      ? detail.senses.map((sense) => ({
          example: sense.example,
          exampleZh: sense.exampleZh,
          grammaticalNote: sense.grammaticalNote ?? "",
          meaningEn: sense.meaningEn,
          meaningZh: sense.meaningZh,
          order: sense.order,
        }))
      : createEmptyKnowledgeFormValues().senses,
    patternType: detail.patternType ?? "",
  });
}

export function mapKnowledgeFormValuesToAdminPayload(values: KnowledgeFormValues): AdminKnowledgeWritePayload {
  return {
    communicativeFunction: values.communicativeFunction || null,
    fixednessLevel: values.fixednessLevel || null,
    isPendingReview: values.isPendingReview,
    pattern: values.pattern.trim(),
    senses: values.senses.map((sense, index) => ({
      example: sense.example.trim(),
      example_zh: sense.exampleZh.trim(),
      grammatical_note: sense.grammaticalNote.trim() || undefined,
      meaning_en: sense.meaningEn.trim(),
      meaning_zh: sense.meaningZh.trim(),
      order: index + 1,
    })),
    patternType: values.patternType || null,
  };
}

export function mapBulkKnowledgeSubmission(response: KnowledgeGenerateSubmissionResponse): BulkKnowledgeSubmissionView {
  const queuedCount = response.results.filter((result) => result.status === "queued").length;

  return {
    kind: "knowledge.generate",
    queuedCount,
    submissionId: response.submissionId,
    totalCount: response.summary.total,
  };
}

export function filterKnowledgeListItems(items: KnowledgeListItemView[], filters: KnowledgeListFilters) {
  return items.filter((item) => {
    if (filters.patternType && item.patternType !== filters.patternType) {
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

export function filterAdminKnowledgeListItems(items: AdminKnowledgeListItemView[], filters: AdminKnowledgeListFilters) {
  return items.filter((item) => {
    if (filters.reviewStatus && item.reviewStatus !== filters.reviewStatus) {
      return false;
    }

    if (filters.patternType && item.patternType !== filters.patternType) {
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
