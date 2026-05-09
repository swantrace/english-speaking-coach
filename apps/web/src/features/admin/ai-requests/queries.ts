import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAdminAiRequestDetail, fetchAdminAiRequestStats, fetchAdminAiRequests } from "./api";
import type { AdminAiRequestListFilters } from "./types";

export function useAdminAiRequestsQuery(filters: AdminAiRequestListFilters = {}) {
  return useQuery({
    queryFn: () => fetchAdminAiRequests(filters),
    queryKey: queryKeys.admin.aiRequests.list(filters),
    staleTime: 10_000,
  });
}

export function useAdminAiRequestStatsQuery(filters: AdminAiRequestListFilters = {}) {
  return useQuery({
    queryFn: () => fetchAdminAiRequestStats(filters),
    queryKey: queryKeys.admin.aiRequests.stats(filters),
    staleTime: 10_000,
  });
}

export function useAdminAiRequestDetailQuery(requestId: string) {
  return useQuery({
    enabled: Boolean(requestId),
    queryFn: () => fetchAdminAiRequestDetail(requestId),
    queryKey: queryKeys.admin.aiRequests.detail(requestId),
    staleTime: 10_000,
  });
}
