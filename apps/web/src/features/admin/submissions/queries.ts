import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAdminSubmissions } from "./api";
import type { AdminSubmissionListFilters } from "./types";

export function useAdminSubmissionsQuery(filters: AdminSubmissionListFilters = {}) {
  return useQuery({
    queryFn: () => fetchAdminSubmissions(filters),
    queryKey: queryKeys.admin.submissions.list(filters),
    staleTime: 15_000,
  });
}
