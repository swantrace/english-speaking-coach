import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAdminOccurrence, fetchAdminOccurrenceList } from "./api";
import type { ProposedOccurrenceListFilters } from "./types";

export function useAdminOccurrenceListQuery(filters: ProposedOccurrenceListFilters = {}) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchAdminOccurrenceList(filters),
    queryKey: queryKeys.admin.occurrences.list({
      search: filters.search,
      status: filters.status,
    }),
    staleTime: 30_000,
  });
}

export function useAdminOccurrenceQuery(occurrenceId: string) {
  return useQuery({
    queryFn: () => fetchAdminOccurrence(occurrenceId),
    queryKey: queryKeys.admin.occurrences.detail(occurrenceId),
    refetchInterval: (query) => {
      const occurrence = query.state.data;
      const draftIsIncomplete = occurrence?.status === "proposed" && occurrence.draftStatus === "generating";

      return draftIsIncomplete ? 2_000 : false;
    },
    staleTime: 30_000,
  });
}
