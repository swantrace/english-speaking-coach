import {
  type AdminApproveKnowledgeOccurrenceInput,
  type AdminKnowledgeOccurrenceDetail,
  type AdminKnowledgeOccurrenceListItem,
  adminApproveKnowledgeOccurrenceResponseSchema,
  adminKnowledgeOccurrenceDetailSchema,
  adminKnowledgeOccurrenceListQueryWithStatusSchema,
  adminKnowledgeOccurrenceListResponseWithStatusSchema,
  adminLinkKnowledgeOccurrenceResponseSchema,
  adminRejectKnowledgeOccurrenceResponseSchema,
} from "@english-coach/contract/knowledge";
import { mapKnowledgeApiError } from "@/features/knowledge/api";
import { apiClient } from "@/lib/axios";
import { normalizeAdminOccurrenceListQueryKeyInput } from "@/lib/query-keys";
import type { ProposedOccurrenceListFilters, ProposedOccurrenceListItemView } from "./types";

const occurrenceEndpoints = {
  approve: (occurrenceId: string) => `/api/admin/knowledge-occurrences/${occurrenceId}/approve`,
  detail: (occurrenceId: string) => `/api/admin/knowledge-occurrences/${occurrenceId}`,
  enrich: "/api/admin/knowledge-occurrences/resolve",
  linkExisting: (occurrenceId: string) => `/api/admin/knowledge-occurrences/${occurrenceId}`,
  list: "/api/admin/knowledge-occurrences",
  reject: (occurrenceId: string) => `/api/admin/knowledge-occurrences/${occurrenceId}/reject`,
} as const;

function mapOccurrenceListItem(
  item: AdminKnowledgeOccurrenceDetail | AdminKnowledgeOccurrenceListItem,
): ProposedOccurrenceListItemView {
  return {
    draftError: "draftError" in item ? item.draftError : undefined,
    draftStatus: "draftStatus" in item ? item.draftStatus : undefined,
    id: item.id,
    knowledgeItemId: item.knowledgeItemId,
    proposedCommunicativeFunction: item.proposedCommunicativeFunction,
    proposedFixednessLevel: item.proposedFixednessLevel,
    proposedPattern: item.proposedPattern,
    proposedPatternType: item.proposedPatternType,
    proposedSenses:
      item.proposedSenses?.map((sense) => ({
        example: sense.example,
        exampleZh: sense.example_zh,
        grammaticalNote: sense.grammatical_note ?? null,
        meaningEn: sense.meaning_en,
        meaningZh: sense.meaning_zh,
        order: sense.order,
      })) ?? null,
    reviewedAt: item.reviewedAt,
    sessionHistoryId: item.sessionHistoryId,
    sessionReference: item.sessionTitle ?? "Practice session",
    status: item.status,
    transcriptExcerpt: item.transcriptExcerpt,
    transcriptTurnIndex: item.transcriptTurnIndex,
    transcriptTurnLabel: `Turn ${item.transcriptTurnIndex + 1}`,
    utterance: item.utterance,
  };
}

export async function fetchAdminOccurrence(occurrenceId: string) {
  const response = await apiClient.get(occurrenceEndpoints.detail(occurrenceId));
  return mapOccurrenceListItem(adminKnowledgeOccurrenceDetailSchema.parse(response.data));
}

export async function approveOccurrence(occurrenceId: string, input: AdminApproveKnowledgeOccurrenceInput) {
  const response = await apiClient.post(occurrenceEndpoints.approve(occurrenceId), input);
  return adminApproveKnowledgeOccurrenceResponseSchema.parse(response.data);
}

export async function enrichOccurrence(occurrenceId: string) {
  const response = await apiClient.post(occurrenceEndpoints.enrich, { occurrenceId });
  return response.data as { jobId: string; occurrenceId: string };
}

export async function fetchAdminOccurrenceList(filters: ProposedOccurrenceListFilters = {}) {
  const normalizedFilters = normalizeAdminOccurrenceListQueryKeyInput(filters);
  const query = adminKnowledgeOccurrenceListQueryWithStatusSchema.parse({
    page: 1,
    pageSize: 100,
    search: normalizedFilters.search || undefined,
    status: normalizedFilters.status || undefined,
  });
  const response = await apiClient.get(occurrenceEndpoints.list, {
    params: query,
  });
  const data = adminKnowledgeOccurrenceListResponseWithStatusSchema.parse(response.data);

  return {
    items: data.items.map(mapOccurrenceListItem),
    total: data.total,
  };
}

export async function linkOccurrenceToKnowledge(occurrenceId: string, knowledgeItemId: string) {
  const response = await apiClient.patch(occurrenceEndpoints.linkExisting(occurrenceId), {
    knowledgeItemId,
  });
  return adminLinkKnowledgeOccurrenceResponseSchema.parse(response.data);
}

export async function rejectOccurrence(occurrenceId: string) {
  const response = await apiClient.post(occurrenceEndpoints.reject(occurrenceId), {});
  return adminRejectKnowledgeOccurrenceResponseSchema.parse(response.data);
}

export function mapOccurrenceApiError(error: unknown, fallbackMessage: string) {
  return mapKnowledgeApiError(error, fallbackMessage);
}
