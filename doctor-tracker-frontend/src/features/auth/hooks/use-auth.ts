"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { markIntentionalSignOut } from "@/features/auth/session";
import { isApiError } from "@/lib/api-error";
import { STALE_TIME } from "@/lib/query-client";
import { authKeys } from "@/lib/query-keys";
import { authApi, type LoginInput } from "@/services/auth-api";
import type { User } from "@/types/models";

/**
 * The session, as seen by the client: `User` when signed in, `null` when the API says
 * 401 (that is an answer, not an error), `undefined` while unresolved.
 * Any other failure (network, 5xx) surfaces as a query error so the guard can offer a retry.
 */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: authKeys.me(),
    queryFn: async ({ signal }) => {
      try {
        return await authApi.me(signal);
      } catch (error) {
        if (isApiError(error) && error.code === "UNAUTHENTICATED") return null;
        throw error;
      }
    },
    staleTime: STALE_TIME.session,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<User, unknown, LoginInput>({
    mutationFn: (input) => authApi.login(input),
    onSuccess: (user) => {
      // A new session must never see data cached for a previous one.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeys.all[0] });
      queryClient.setQueryData<User | null>(authKeys.me(), user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      markIntentionalSignOut();
      // The dashboard guard reacts to `null`: it unmounts the pages, drops their cache and redirects.
      queryClient.setQueryData<User | null>(authKeys.me(), null);
    },
  });
}
