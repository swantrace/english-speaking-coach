import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchStudentDashboardSummary } from "./api";

export function useStudentDashboardQuery() {
  return useQuery({
    queryFn: fetchStudentDashboardSummary,
    queryKey: queryKeys.dashboard.student(),
    staleTime: 60_000,
  });
}
