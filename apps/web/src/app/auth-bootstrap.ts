import type { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import { resolveAccessState } from "@/features/auth/guards";
import { useCurrentUserQuery } from "@/features/auth/queries";
import type { AuthBootstrapState, AuthUser } from "@/features/auth/types";

export interface AuthBootstrapResult extends AuthBootstrapState {
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<AuthUser | null, unknown>>;
}

function createAuthBootstrapState(params: {
  isError: boolean;
  isLoading: boolean;
  user: AuthUser | null;
}): AuthBootstrapState {
  const { isError, isLoading, user } = params;

  return {
    accessState: resolveAccessState(user),
    isError,
    isLoading,
    isReady: !isLoading,
    user,
  };
}

export function useAuthBootstrap(): AuthBootstrapResult {
  const currentUserQuery = useCurrentUserQuery();
  const user = currentUserQuery.isError ? null : (currentUserQuery.data ?? null);

  return {
    ...createAuthBootstrapState({
      isError: currentUserQuery.isError,
      isLoading: currentUserQuery.isPending,
      user,
    }),
    refetch: currentUserQuery.refetch,
  };
}

export function createAnonymousAuthBootstrapState(): AuthBootstrapState {
  return createAuthBootstrapState({
    isError: false,
    isLoading: false,
    user: null,
  });
}
