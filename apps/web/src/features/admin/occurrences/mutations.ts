import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { linkOccurrenceToKnowledge, mapOccurrenceApiError, rejectOccurrence } from "./api";

function useOccurrenceMutationInvalidation() {
  const queryClient = useQueryClient();

  return async function invalidateOccurrenceData(knowledgeItemId?: string) {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.occurrences.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.knowledge.all() }),
    ];

    if (knowledgeItemId) {
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.knowledge.detail(knowledgeItemId) }),
      );
    }

    await Promise.all(invalidations);
  };
}

export function useLinkOccurrenceMutation() {
  const invalidateOccurrenceData = useOccurrenceMutationInvalidation();

  return useMutation({
    mutationFn: ({ knowledgeItemId, occurrenceId }: { knowledgeItemId: string; occurrenceId: string }) =>
      linkOccurrenceToKnowledge(occurrenceId, knowledgeItemId),
    onSuccess: async (result) => invalidateOccurrenceData(result.knowledgeItemId),
    throwOnError: false,
  });
}

export function useRejectOccurrenceMutation() {
  const invalidateOccurrenceData = useOccurrenceMutationInvalidation();

  return useMutation({
    mutationFn: rejectOccurrence,
    onSuccess: async () => invalidateOccurrenceData(),
    throwOnError: false,
  });
}

export function createOccurrenceMutationError(error: unknown, fallbackMessage: string) {
  return mapOccurrenceApiError(error, fallbackMessage);
}
