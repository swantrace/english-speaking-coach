import { useMemo } from "react";
import { resolveAccessState } from "@/features/auth/guards";
import type { AuthBootstrapState } from "@/features/auth/types";
import { toAuthUser } from "@/features/auth/utils";
import { authClient } from "@/lib/auth-client";

export type AuthBootstrapResult = AuthBootstrapState;

export function useAuthBootstrap(): AuthBootstrapResult {
  const sessionQuery = authClient.useSession();
  const sessionUser = sessionQuery.data?.user ?? null;
  const isError = sessionQuery.error !== null;
  const isPending = sessionQuery.isPending;
  const user = useMemo(() => (isError ? null : toAuthUser(sessionUser)), [isError, sessionUser]);

  return useMemo(
    () => ({
      accessState: resolveAccessState(user),
      isError,
      isPending,
      isReady: !isPending,
      user,
    }),
    [isError, isPending, user],
  );
}

export function createAnonymousAuthBootstrapState(): AuthBootstrapState {
  return {
    accessState: resolveAccessState(null),
    isError: false,
    isPending: false,
    isReady: true,
    user: null,
  };
}
