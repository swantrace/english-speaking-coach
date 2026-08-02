import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  fetchConversationPlaylist,
  fetchLiveSessionBootstrap,
  fetchSessionHistoryDetail,
  fetchSessionHistoryList,
} from "./api";
import { mapLiveSessionBootstrap, mapSessionHistoryDetail, mapSessionHistoryListItem } from "./mappers";
import type { SessionHistoryFilters } from "./types";

export function useLiveSessionBootstrapQuery(sessionId: string) {
  return useQuery({
    enabled: sessionId.trim().length > 0,
    queryFn: async () => mapLiveSessionBootstrap(await fetchLiveSessionBootstrap(sessionId)),
    queryKey: queryKeys.sessions.liveBootstrap(sessionId),
    staleTime: 15_000,
  });
}

export function useSessionHistoryListQuery(filters: SessionHistoryFilters) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const response = await fetchSessionHistoryList(filters);

      return {
        items: response.items.map(mapSessionHistoryListItem),
        total: response.total,
      };
    },
    queryKey: queryKeys.history.list(filters),
    staleTime: 60_000,
  });
}

export function useSessionHistoryDetailQuery(sessionId: string) {
  return useQuery({
    enabled: sessionId.trim().length > 0,
    queryFn: async () => mapSessionHistoryDetail(await fetchSessionHistoryDetail(sessionId)),
    queryKey: queryKeys.history.detail(sessionId),
    staleTime: 60_000,
  });
}

export function useConversationPlaylistQuery() {
  return useQuery({
    queryFn: fetchConversationPlaylist,
    queryKey: queryKeys.history.audioPlaylist(),
    staleTime: 60_000,
  });
}
