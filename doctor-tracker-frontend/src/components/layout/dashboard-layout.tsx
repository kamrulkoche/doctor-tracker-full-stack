"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ErrorState } from "@/components/shared/error-state";
import { AppShellSkeleton } from "@/components/shared/loading-skeleton";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useCurrentUser, useLogout } from "@/features/auth/hooks/use-auth";
import { consumeIntentionalSignOut } from "@/features/auth/session";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getErrorMessage } from "@/lib/api-error";
import { authKeys } from "@/lib/query-keys";
import { getSidebarPreference, setSidebarPreference, subscribeSidebarPreference } from "@/lib/sidebar-store";
import { buildLoginUrl } from "@/lib/url-filters";

const SIDEBAR_STYLE = {
  "--sidebar-width": "15rem",
  "--sidebar-width-icon": "3.5rem",
} as CSSProperties;

/** Persisted preference, falling back to the breakpoint default (expanded ≥1024px, rail below). */
function useSidebarOpen(): [boolean, (open: boolean) => void] {
  const preference = useSyncExternalStore(subscribeSidebarPreference, getSidebarPreference, () => null);
  const isWide = useMediaQuery("(min-width: 1024px)", true);
  const open = preference === null ? isWide : preference === "expanded";
  return [open, setSidebarPreference];
}

/**
 * Authenticated shell + client-side route guard.
 *
 * The session cookie belongs to the API origin, which Next.js cannot read when the two are
 * deployed on different sites, so the guard resolves `GET /auth/me` in the browser:
 * skeleton while pending, redirect to `/login?next=…` on 401, shell + page once signed in.
 * This is a UX guard only — every API route enforces the session itself.
 */
export function DashboardLayout({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isPending, isError, error, refetch, isRefetching } = useCurrentUser();
  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();

  const signedOut = user === null;

  useEffect(() => {
    if (!signedOut) return;
    // The protected pages are already unmounted at this point; drop everything they cached.
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeys.all[0] });
    const target = consumeIntentionalSignOut()
      ? buildLoginUrl(null)
      : buildLoginUrl(`${window.location.pathname}${window.location.search}`);
    // A full document navigation, not router.replace: Next.js keeps recently visited routes
    // mounted (hidden) for back/forward, and nothing a signed-in admin had on screen may
    // survive the end of the session. It also drops the in-memory CSRF token.
    window.location.replace(target);
  }, [signedOut, queryClient]);

  const { mutate: signOut, isPending: isSigningOut } = logout;
  const handleSignOut = useCallback(() => {
    signOut(undefined, {
      onError: (logoutError) => {
        toast.error("Couldn't sign out", { description: getErrorMessage(logoutError), duration: 6000 });
      },
    });
  }, [signOut]);

  if (isPending || signedOut) {
    return <AppShellSkeleton />;
  }

  if (isError || !user) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <ErrorState
          title="Couldn't load your session"
          description={getErrorMessage(error, "The server did not respond. Check that the API is running.")}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      </div>
    );
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} style={SIDEBAR_STYLE}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Header user={user} onSignOut={handleSignOut} isSigningOut={isSigningOut} />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 outline-none md:px-6 md:py-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
