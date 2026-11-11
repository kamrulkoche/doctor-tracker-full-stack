import type { Metadata } from "next";
import { Suspense } from "react";

import { DetailPageSkeleton } from "@/components/shared/loading-skeleton";
import { PatientDetailView } from "@/features/patients/components/patient-detail-view";

// Rendered behind the client-side auth gate of the (dashboard) layout; see the note there.
export const instant = false;

export const metadata: Metadata = {
  title: "Patient details",
  description: "A patient's record, notes and assigned doctor.",
};

type PatientPageProps = {
  params: Promise<{ id: string }>;
};

export default function PatientPage({ params }: PatientPageProps) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      {params.then(({ id }) => (
        <PatientDetailView id={id} />
      ))}
    </Suspense>
  );
}
