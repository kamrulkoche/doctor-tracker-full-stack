import type { Metadata } from "next";
import { Suspense } from "react";

import { ListPageSkeleton } from "@/components/shared/loading-skeleton";
import { PatientsView } from "@/features/patients/components/patients-view";

// Rendered behind the client-side auth gate of the (dashboard) layout; see the note there.
export const instant = false;

export const metadata: Metadata = {
  title: "Patients",
  description: "Search, filter and manage patients and their assigned doctors.",
};

export default function PatientsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PatientsView />
    </Suspense>
  );
}
