import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchAdminDashboardOverview, fetchStudentDashboardSummary } from "./api";

export function useAdminDashboardQuery() {
  return useQuery({
    queryFn: fetchAdminDashboardOverview,
    queryKey: queryKeys.admin.dashboard(),
    staleTime: 60_000,
  });
}

export function useStudentDashboardQuery() {
  return useQuery({
    queryFn: fetchStudentDashboardSummary,
    queryKey: queryKeys.dashboard.student(),
    staleTime: 60_000,
  });
}
