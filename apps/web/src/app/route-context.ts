import type { QueryClient } from "@tanstack/react-query";
import type { authClient } from "@/lib/auth-client";

type SessionHookResult = ReturnType<typeof authClient.useSession>;

type SessionData = SessionHookResult["data"];
type SessionRefetch = SessionHookResult["refetch"];

type AuthSession = NonNullable<SessionData>["session"] | null;
type AuthUser = NonNullable<SessionData>["user"] | null;

export interface AuthBootstrapResult {
  session: AuthSession;
  user: AuthUser;
  isLoading: boolean;
  refetch: SessionRefetch;
}

export interface AppRouterContext {
  queryClient: QueryClient;
  auth: AuthBootstrapResult;
}

export const defaultAuthBootstrapResult: AuthBootstrapResult = {
  session: null,
  user: null,
  isLoading: true,
  refetch: (async () => undefined) as SessionRefetch,
};
