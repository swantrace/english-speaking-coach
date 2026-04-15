import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  approveAdminScenario,
  bulkApproveAdminScenarios,
  bulkDeleteAdminScenarios,
  createAdminScenario,
  deleteAdminScenario,
  mapScenarioApiError,
  submitBulkScenarioGeneration,
  updateAdminScenario,
} from "./api";
import type { AdminScenarioWritePayload } from "./types";

function useScenarioMutationInvalidation() {
  const queryClient = useQueryClient();

  return async function invalidateScenarioData(scenarioId?: string) {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.scenarios.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.studentList() }),
    ];

    if (scenarioId) {
      invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.admin.scenarios.detail(scenarioId) }));
      invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.detail(scenarioId) }));
    }

    await Promise.all(invalidations);
  };
}

export function useCreateAdminScenarioMutation() {
  const invalidateScenarioData = useScenarioMutationInvalidation();

  return useMutation({
    mutationFn: createAdminScenario,
    onSuccess: async (result) => invalidateScenarioData(result.id),
    throwOnError: false,
  });
}

export function useUpdateAdminScenarioMutation() {
  const invalidateScenarioData = useScenarioMutationInvalidation();

  return useMutation({
    mutationFn: ({ scenarioId, values }: { scenarioId: string; values: Partial<AdminScenarioWritePayload> }) =>
      updateAdminScenario(scenarioId, values),
    onSuccess: async (result) => invalidateScenarioData(result.id),
    throwOnError: false,
  });
}

export function useDeleteAdminScenarioMutation() {
  const invalidateScenarioData = useScenarioMutationInvalidation();

  return useMutation({
    mutationFn: deleteAdminScenario,
    onSuccess: async (_, scenarioId) => invalidateScenarioData(scenarioId),
    throwOnError: false,
  });
}

export function useApproveAdminScenarioMutation() {
  const invalidateScenarioData = useScenarioMutationInvalidation();

  return useMutation({
    mutationFn: approveAdminScenario,
    onSuccess: async (result) => invalidateScenarioData(result.id),
    throwOnError: false,
  });
}

export function useBulkApproveAdminScenariosMutation() {
  const invalidateScenarioData = useScenarioMutationInvalidation();

  return useMutation({
    mutationFn: bulkApproveAdminScenarios,
    onSuccess: async () => invalidateScenarioData(),
    throwOnError: false,
  });
}

export function useBulkDeleteAdminScenariosMutation() {
  const invalidateScenarioData = useScenarioMutationInvalidation();

  return useMutation({
    mutationFn: bulkDeleteAdminScenarios,
    onSuccess: async () => invalidateScenarioData(),
    throwOnError: false,
  });
}

export function useBulkScenarioGenerationMutation() {
  return useMutation({
    mutationFn: submitBulkScenarioGeneration,
    throwOnError: false,
  });
}

export function createScenarioMutationError(error: unknown, fallbackMessage: string) {
  return mapScenarioApiError(error, fallbackMessage);
}
