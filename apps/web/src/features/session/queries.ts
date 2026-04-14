import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchLiveSessionBootstrap } from "./api";
import { mapLiveSessionBootstrap } from "./mappers";

export function useLiveSessionBootstrapQuery(sessionId: string) {
  return useQuery({
    enabled: sessionId.trim().length > 0,
    queryFn: async () => mapLiveSessionBootstrap(await fetchLiveSessionBootstrap(sessionId)),
    queryKey: queryKeys.sessions.liveBootstrap(sessionId),
    staleTime: 15_000,
  });
}
