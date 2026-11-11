"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { clearSearchParams, mergeSearchParams, type ParamPatch } from "@/lib/url-filters";

type SetParamsOptions = {
  /** `replace` for high-frequency changes (typing in search), `push` for discrete ones. */
  history?: "push" | "replace";
};

/**
 * URL search params as list state.
 *
 * Writes go through the History API, which the Next.js router observes: `useSearchParams`
 * updates, but no server round-trip is made because these pages fetch on the client.
 * The setters read `window.location` at call time, so they are stable and never close
 * over a stale query string.
 *
 * Components calling this must sit under a `<Suspense>` boundary (Next.js requirement
 * for `useSearchParams`).
 */
export function useUrlFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const write = useCallback(
    (query: string, history: "push" | "replace") => {
      const url = query ? `${pathname}?${query}` : pathname;
      if (url === `${window.location.pathname}${window.location.search}`) return;
      if (history === "replace") window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    },
    [pathname],
  );

  /** Merges a patch; resets `page` to 1 unless the patch sets it. */
  const setParams = useCallback(
    (patch: ParamPatch, options: SetParamsOptions = {}) => {
      write(mergeSearchParams(window.location.search, patch), options.history ?? "push");
    },
    [write],
  );

  const clearParams = useCallback(
    (keys: readonly string[]) => {
      write(clearSearchParams(window.location.search, keys), "push");
    },
    [write],
  );

  return useMemo(() => ({ searchParams, setParams, clearParams }), [searchParams, setParams, clearParams]);
}
