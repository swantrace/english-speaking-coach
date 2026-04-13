import type { Session } from "@english-coach/backend/auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "./query-client";
import { type AppRouterContext, defaultAuthBootstrapResult } from "./route-context";
import { router } from "./router";

function AuthAwareRouterProvider() {
  const { data, isPending, refetch } = authClient.useSession();

  const routerContext: AppRouterContext = useMemo(
    () => ({
      queryClient,
      auth: {
        session: data?.session ?? defaultAuthBootstrapResult.session,
        user: (data?.user ?? defaultAuthBootstrapResult.user) as Session["user"] | null,
        isLoading: isPending,
        refetch,
      },
    }),
    [data, isPending, refetch],
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
