import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAdminUsers } from "./api";
import type { AdminUserFilters } from "./types";

export function useAdminUsersQuery(filters: AdminUserFilters = {}) {
  return useQuery({
    queryFn: () => fetchAdminUsers(filters),
    queryKey: queryKeys.admin.users.list(filters),
    staleTime: 30_000,
  });
}
