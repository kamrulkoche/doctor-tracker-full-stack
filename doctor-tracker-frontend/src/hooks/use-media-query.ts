"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query without an effect + state pair, so there is no
 * extra render after mount. `serverFallback` is what the prerender assumes.
 */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

/** Tailwind `md` and up: the real table, inline filters and the docked sidebar. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)", true);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}
