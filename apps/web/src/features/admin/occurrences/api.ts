import {
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
  linkExisting: (occurrenceId: string) => `/api/admin/knowledge-occurrences/${occurrenceId}`,
  list: "/api/admin/knowledge-occurrences",
  reject: (occurrenceId: string) => `/api/admin/knowledge-occurrences/${occurrenceId}/reject`,
} as const;

function mapOccurrenceListItem(item: {
  id: string;
  knowledgeItemId: string | null;
  proposedPattern: string;
  reviewedAt: string | null;
  sessionHistoryId: string;
  sessionTitle: string | null;
  status: "proposed" | "approved" | "rejected";
  transcriptExcerpt: string;
  transcriptTurnIndex: number;
  utterance: string;
}): ProposedOccurrenceListItemView {
  return {
    id: item.id,
    knowledgeItemId: item.knowledgeItemId,
    proposedPattern: item.proposedPattern,
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
