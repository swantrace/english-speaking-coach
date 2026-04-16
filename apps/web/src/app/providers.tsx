import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuthBootstrap } from "./auth-bootstrap";
import { queryClient } from "./query-client";
import { router } from "./router";

function AuthAwareRouterProvider() {
  const auth = useAuthBootstrap();
  const routerContext = {
    queryClient,
    auth,
  };
  const authContextVersion = `${auth.accessState}:${auth.isError ? "1" : "0"}:${auth.isPending ? "1" : "0"}:${auth.user?.id ?? ""}`;

  useEffect(() => {
    void authContextVersion;
    void router.invalidate();
  }, [authContextVersion]);

  if (auth.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,232,209,0.65),_transparent_38%),linear-gradient(180deg,_#f8f4ec_0%,_#f3efe7_100%)] px-4">
        <div className="w-full max-w-md rounded-[2rem] border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Auth Bootstrap</p>
          <h1 className="mt-4 text-2xl text-slate-950">Loading your access state</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We&apos;re checking the current session before the app decides where protected routes should go.
          </p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} context={routerContext} />;
}

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthAwareRouterProvider />
    </QueryClientProvider>
  );
}
