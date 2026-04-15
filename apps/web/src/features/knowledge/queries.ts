import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchKnowledgeDetail, fetchKnowledgeList } from "./api";
import { mapKnowledgeDetail, mapKnowledgeListItem } from "./mappers";
import type { KnowledgeListFilters } from "./types";

export function useKnowledgeListQuery(filters: KnowledgeListFilters) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const response = await fetchKnowledgeList(filters);

      return {
        items: response.items.map(mapKnowledgeListItem),
        total: response.total,
      };
    },
    queryKey: queryKeys.knowledge.list({ search: filters.search }),
    staleTime: 60_000,
  });
}

export function useKnowledgeDetailQuery(knowledgeId: string) {
  return useQuery({
    enabled: knowledgeId.trim().length > 0,
    queryFn: async () => mapKnowledgeDetail(await fetchKnowledgeDetail(knowledgeId)),
    queryKey: queryKeys.knowledge.detail(knowledgeId),
    staleTime: 60_000,
  });
}
