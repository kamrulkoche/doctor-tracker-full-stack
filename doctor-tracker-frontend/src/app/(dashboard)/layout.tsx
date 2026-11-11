import { Suspense, type ReactNode } from "react";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AppShellSkeleton } from "@/components/shared/loading-skeleton";

/**
 * This segment is an auth gate: until `GET /auth/me` has answered in the browser, the
 * shell renders a skeleton instead of the page. That is a deliberate block, so the
 * segment opts out of Next.js "instant navigation" validation (which would otherwise
 * report every protected page as a dropped segment in development).
 */
export const instant = false;

/**
 * Everything under (dashboard) is behind the client-side auth guard in DashboardLayout.
 * The Suspense boundary lets the shell (which reads the pathname) resolve on dynamic
 * routes while the static skeleton is prerendered.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <DashboardLayout>{children}</DashboardLayout>
    </Suspense>
  );
}
