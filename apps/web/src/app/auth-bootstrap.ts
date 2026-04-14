import { useMemo } from "react";
import { resolveAccessState } from "@/features/auth/guards";
import type { AuthBootstrapState } from "@/features/auth/types";
import { normalizeAuthUser } from "@/features/auth/utils";
import { authClient } from "@/lib/auth-client";

export type AuthBootstrapResult = AuthBootstrapState;

function createAuthBootstrapState(params: {
  isError: boolean;
  isLoading: boolean;
  user: AuthBootstrapState["user"];
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
  const sessionQuery = authClient.useSession();
  const sessionUser = sessionQuery.data?.user ?? null;
  const isError = sessionQuery.error !== null;
  const isLoading = sessionQuery.isPending;
  const user = useMemo(() => (isError ? null : normalizeAuthUser(sessionUser)), [isError, sessionUser]);

  return useMemo(
    () =>
      createAuthBootstrapState({
        isError,
        isLoading,
        user,
      }),
    [isError, isLoading, user],
  );
}

export function createAnonymousAuthBootstrapState(): AuthBootstrapState {
  return createAuthBootstrapState({
    isError: false,
    isLoading: false,
    user: null,
  });
}
