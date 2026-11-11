import type { Metadata } from "next";
import { Suspense } from "react";

import { ListPageSkeleton } from "@/components/shared/loading-skeleton";
import { DoctorsView } from "@/features/doctors/components/doctors-view";

// Rendered behind the client-side auth gate of the (dashboard) layout; see the note there.
export const instant = false;

export const metadata: Metadata = {
  title: "Doctors",
  description: "Search, filter and manage doctors.",
};

export default function DoctorsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <DoctorsView />
    </Suspense>
  );
}
