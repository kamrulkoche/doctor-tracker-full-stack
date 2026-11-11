import { QueryClient } from "@tanstack/react-query";

import { isApiError } from "@/lib/api-error";

/** Freshness windows, tuned per kind of data. */
export const STALE_TIME = {
  /** Paginated lists and detail records: fresh for a short while, then revalidated in the background. */
  list: 30_000,
  /** Aggregations: the dashboard does not need to be real-time. */
  dashboard: 60_000,
  /** Distinct filter values and option lists change rarely; mutations invalidate them anyway. */
  reference: 5 * 60_000,
  /** The signed-in user only changes on login/logout, which set the cache explicitly. */
  session: 5 * 60_000,
} as const;

/** 4xx answers are final; only network failures and 5xx are worth one more attempt. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (!isApiError(error)) return false;
  return error.code === "NETWORK_ERROR" || error.status >= 500;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME.list,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
