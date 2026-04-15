import {
  type KnowledgePointDetail,
  type KnowledgePointListQuery,
  type KnowledgePointListResponse,
  knowledgePointDetailSchema,
  knowledgePointListQuerySchema,
  knowledgePointListResponseSchema,
} from "@english-coach/contract";
import { apiClient } from "@/lib/axios";
import { normalizeKnowledgeListQueryKeyInput } from "@/lib/query-keys";
import type { KnowledgeListFilters } from "./types";

const knowledgeEndpoints = {
  detail: (knowledgeId: string) => `/api/knowledge-points/${knowledgeId}`,
  list: "/api/knowledge-points",
} as const;

export async function fetchKnowledgeList(filters: KnowledgeListFilters = {}): Promise<KnowledgePointListResponse> {
  const normalizedFilters = normalizeKnowledgeListQueryKeyInput(filters);
  const query: KnowledgePointListQuery = knowledgePointListQuerySchema.parse({
    page: 1,
    pageSize: 100,
    search: normalizedFilters.search || undefined,
    sortBy: "lastSeenAt",
    sortDirection: "desc",
  });
  const response = await apiClient.get(knowledgeEndpoints.list, {
    params: query,
  });

  return knowledgePointListResponseSchema.parse(response.data);
}

export async function fetchKnowledgeDetail(knowledgeId: string): Promise<KnowledgePointDetail> {
  const response = await apiClient.get(knowledgeEndpoints.detail(knowledgeId));
  return knowledgePointDetailSchema.parse(response.data);
}
