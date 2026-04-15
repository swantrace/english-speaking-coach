import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { approveAdminUser, mapAdminApiError, rejectAdminUser, setAdminUserRole, softDeleteAdminUser } from "./api";

function useAdminMutationInvalidation() {
  const queryClient = useQueryClient();

  return async function invalidateAdminData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() }),
    ]);
  };
}

export function useApproveAdminUserMutation() {
  const invalidateAdminData = useAdminMutationInvalidation();

  return useMutation({
    mutationFn: approveAdminUser,
    onSuccess: invalidateAdminData,
    throwOnError: false,
  });
}

export function useRejectAdminUserMutation() {
  const invalidateAdminData = useAdminMutationInvalidation();

  return useMutation({
    mutationFn: rejectAdminUser,
    onSuccess: invalidateAdminData,
    throwOnError: false,
  });
}

export function useSetAdminUserRoleMutation() {
  const invalidateAdminData = useAdminMutationInvalidation();

  return useMutation({
    mutationFn: ({ role, userId }: { userId: string; role: "student" | "admin" }) => setAdminUserRole(userId, role),
    onSuccess: invalidateAdminData,
    throwOnError: false,
  });
}

export function useSoftDeleteAdminUserMutation() {
  const invalidateAdminData = useAdminMutationInvalidation();

  return useMutation({
    mutationFn: softDeleteAdminUser,
    onSuccess: invalidateAdminData,
    throwOnError: false,
  });
}

export function createAdminUserMutationError(error: unknown, fallbackMessage: string) {
  return mapAdminApiError(error, fallbackMessage);
}
