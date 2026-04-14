import type { QueryClient } from "@tanstack/react-query";
import type { AuthBootstrapResult } from "./auth-bootstrap";
import { createAnonymousAuthBootstrapState } from "./auth-bootstrap";

export interface AppRouterContext {
  queryClient: QueryClient;
  auth: AuthBootstrapResult;
}

export const defaultAuthBootstrapResult: AuthBootstrapResult = {
  ...createAnonymousAuthBootstrapState(),
  isLoading: true,
  isReady: false,
  refetch: async () =>
    ({
      data: null,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      status: "success",
    }) as never,
};
