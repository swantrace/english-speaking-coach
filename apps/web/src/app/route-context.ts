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
};
