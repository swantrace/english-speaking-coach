import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";
import { queryClient } from "./query-client";
import { type AppRouterContext, defaultAuthBootstrapResult } from "./route-context";

const initialRouterContext: AppRouterContext = {
  queryClient,
  auth: defaultAuthBootstrapResult,
};

export const router = createRouter({
  routeTree,
  context: initialRouterContext,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
