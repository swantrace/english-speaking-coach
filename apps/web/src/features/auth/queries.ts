import { queryOptions, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { getCurrentUser } from "./api";

export const authQueryKeys = {
  all: ["auth"] as const,
  currentUser: () => [...authQueryKeys.all, "current-user"] as const,
};

function shouldRetryCurrentUserQuery(failureCount: number, error: unknown) {
  if (failureCount >= 1) {
    return false;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      return false;
    }
  }

  return true;
}

export function currentUserQueryOptions() {
  return queryOptions({
    gcTime: 5 * 60_000,
    queryFn: getCurrentUser,
    queryKey: authQueryKeys.currentUser(),
    retry: shouldRetryCurrentUserQuery,
    staleTime: 60_000,
  });
}

export function useCurrentUserQuery() {
  return useQuery(currentUserQueryOptions());
}
