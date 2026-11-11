import type { Metadata } from "next";
import { Suspense } from "react";

import { ListPageSkeleton } from "@/components/shared/loading-skeleton";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

// Rendered behind the client-side auth gate of the (dashboard) layout; see the note there.
export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Totals, patient growth and distribution charts for doctors and patients.",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <DashboardView />
    </Suspense>
  );
}
