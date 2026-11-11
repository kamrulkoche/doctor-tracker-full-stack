"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { createQueryClient } from "@/lib/query-client";
import { authKeys } from "@/lib/query-keys";
import { onUnauthenticated } from "@/services/api-client";

// next-themes renders an inline script; React warns about script tags rendered on the
// client, so the script is typed as inert there (it already ran from the server HTML).
const THEME_SCRIPT_PROPS = {
  type: typeof window === "undefined" ? "text/javascript" : "text/plain",
} as const;

/**
 * `401 UNAUTHENTICATED` from any non-auth request means the session is gone: mark the
 * user as signed out. The dashboard guard observes that single cache entry, unmounts
 * the protected pages, clears their cached data and redirects to `/login?next=…`.
 */
function useSessionExpiryHandler(queryClient: QueryClient) {
  useEffect(
    () =>
      onUnauthenticated(() => {
        queryClient.setQueryData(authKeys.me(), null);
      }),
    [queryClient],
  );
}

function AppToaster() {
  const isDesktop = useMediaQuery("(min-width: 768px)", true);
  return (
    <Toaster
      position={isDesktop ? "bottom-right" : "top-center"}
      richColors={false}
      closeButton
      duration={4000}
      toastOptions={{ classNames: { toast: "cn-toast" } }}
    />
  );
}

/**
 * Client-side providers. Deliberately small and static: server state lives in the
 * TanStack Query cache and list state in the URL, so there is no app-wide context
 * whose changes would re-render the tree.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  useSessionExpiryHandler(queryClient);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      scriptProps={THEME_SCRIPT_PROPS}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <AppToaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
