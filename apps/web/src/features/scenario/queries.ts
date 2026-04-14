import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchStudentScenarioDetail, fetchStudentScenarioList } from "./api";
import type { ScenarioListFilters } from "./types";

export function useStudentScenarioListQuery(filters: ScenarioListFilters) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchStudentScenarioList(filters),
    queryKey: queryKeys.scenarios.studentList(filters),
    staleTime: 60_000,
  });
}

export function useStudentScenarioDetailQuery(scenarioId: string) {
  return useQuery({
    enabled: scenarioId.trim().length > 0,
    queryFn: () => fetchStudentScenarioDetail(scenarioId),
    queryKey: queryKeys.scenarios.detail(scenarioId),
    staleTime: 60_000,
  });
}
