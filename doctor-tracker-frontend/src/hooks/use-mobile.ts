"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

const MOBILE_BREAKPOINT = 768;

/** Used by the shadcn Sidebar to switch to the drawer below Tailwind's `md`. */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`, false);
}
