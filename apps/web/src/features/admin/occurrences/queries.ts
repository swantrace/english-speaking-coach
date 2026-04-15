import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAdminOccurrenceList } from "./api";
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
