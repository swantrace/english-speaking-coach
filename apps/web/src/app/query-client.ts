import { type DefaultOptions, MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function getErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const maybeResponse = (error as { response?: { status?: unknown } }).response;

  return typeof maybeResponse?.status === "number" ? maybeResponse.status : null;
}

function shouldRetry(failureCount: number, error: unknown) {
  if (failureCount >= 1) {
    return false;
  }

  const status = getErrorStatus(error);

  if (status === null) {
    return true;
  }

  return RETRYABLE_STATUS_CODES.has(status);
}

export function handleGlobalQueryError(error: unknown) {
  if (import.meta.env.DEV) {
    console.error("Global query error", error);
  }
}

export function handleGlobalMutationError(error: unknown) {
  if (import.meta.env.DEV) {
    console.error("Global mutation error", error);
  }
}

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: shouldRetry,
  },
  mutations: {
    retry: false,
  },
};

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions,
    queryCache: new QueryCache({
      onError: handleGlobalQueryError,
    }),
    mutationCache: new MutationCache({
      onError: handleGlobalMutationError,
    }),
  });
}

export const queryClient = createAppQueryClient();
