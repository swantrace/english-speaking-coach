import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "./query-client";
import { type AppRouterContext, defaultAuthBootstrapResult } from "./route-context";
import { router } from "./router";

function AuthAwareRouterProvider() {
  const sessionState = authClient.useSession();

  const routerContext: AppRouterContext = useMemo(
    () => ({
      queryClient,
      auth: {
        session: sessionState.data?.session ?? defaultAuthBootstrapResult.session,
        user: sessionState.data?.user ?? defaultAuthBootstrapResult.user,
        isLoading: sessionState.isPending,
        refetch: sessionState.refetch,
      },
    }),
    [sessionState.data, sessionState.isPending, sessionState.refetch],
  );

  return <RouterProvider router={router} context={routerContext} />;
}

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthAwareRouterProvider />
    </QueryClientProvider>
  );
}
