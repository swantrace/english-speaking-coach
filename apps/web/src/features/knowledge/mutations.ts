import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  approveAdminKnowledge,
  bulkApproveAdminKnowledge,
  bulkDeleteAdminKnowledge,
  createAdminKnowledge,
  deleteAdminKnowledge,
  mapKnowledgeApiError,
  submitBulkKnowledgeGeneration,
  updateAdminKnowledge,
} from "./api";
import type { AdminKnowledgeWritePayload } from "./types";

function useKnowledgeMutationInvalidation() {
  const queryClient = useQueryClient();

  return async function invalidateKnowledgeData(knowledgeId?: string) {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.knowledge.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.occurrences.all() }),
    ];

    if (knowledgeId) {
      invalidations.push(queryClient.invalidateQueries({ queryKey: queryKeys.admin.knowledge.detail(knowledgeId) }));
    }

    await Promise.all(invalidations);
  };
}

export function useCreateAdminKnowledgeMutation() {
  const invalidateKnowledgeData = useKnowledgeMutationInvalidation();

  return useMutation({
    mutationFn: createAdminKnowledge,
    onSuccess: async (result) => invalidateKnowledgeData(result.id),
    throwOnError: false,
  });
}

export function useUpdateAdminKnowledgeMutation() {
  const invalidateKnowledgeData = useKnowledgeMutationInvalidation();

  return useMutation({
    mutationFn: ({ knowledgeId, values }: { knowledgeId: string; values: Partial<AdminKnowledgeWritePayload> }) =>
      updateAdminKnowledge(knowledgeId, values),
    onSuccess: async (result) => invalidateKnowledgeData(result.id),
    throwOnError: false,
  });
}

export function useDeleteAdminKnowledgeMutation() {
  const invalidateKnowledgeData = useKnowledgeMutationInvalidation();

  return useMutation({
    mutationFn: deleteAdminKnowledge,
    onSuccess: async (_, knowledgeId) => invalidateKnowledgeData(knowledgeId),
    throwOnError: false,
  });
}

export function useApproveAdminKnowledgeMutation() {
  const invalidateKnowledgeData = useKnowledgeMutationInvalidation();

  return useMutation({
    mutationFn: approveAdminKnowledge,
    onSuccess: async (result) => invalidateKnowledgeData(result.id),
    throwOnError: false,
  });
}

export function useBulkApproveAdminKnowledgeMutation() {
  const invalidateKnowledgeData = useKnowledgeMutationInvalidation();

  return useMutation({
    mutationFn: bulkApproveAdminKnowledge,
    onSuccess: async () => invalidateKnowledgeData(),
    throwOnError: false,
  });
}

export function useBulkDeleteAdminKnowledgeMutation() {
  const invalidateKnowledgeData = useKnowledgeMutationInvalidation();

  return useMutation({
    mutationFn: bulkDeleteAdminKnowledge,
    onSuccess: async () => invalidateKnowledgeData(),
    throwOnError: false,
  });
}

export function useBulkKnowledgeGenerationMutation() {
  return useMutation({
    mutationFn: submitBulkKnowledgeGeneration,
    throwOnError: false,
  });
}

export function createKnowledgeMutationError(error: unknown, fallbackMessage: string) {
  return mapKnowledgeApiError(error, fallbackMessage);
}
