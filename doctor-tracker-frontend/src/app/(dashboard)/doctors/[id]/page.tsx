import type { Metadata } from "next";
import { Suspense } from "react";

import { DetailPageSkeleton } from "@/components/shared/loading-skeleton";
import { DoctorDetailView } from "@/features/doctors/components/doctor-detail-view";

// Rendered behind the client-side auth gate of the (dashboard) layout; see the note there.
export const instant = false;

export const metadata: Metadata = {
  title: "Doctor details",
  description: "A doctor's profile, contact details and assigned patients.",
};

type DoctorPageProps = {
  params: Promise<{ id: string }>;
};

/** `params` is a promise in this Next.js version; it resolves inside the Suspense boundary. */
export default function DoctorPage({ params }: DoctorPageProps) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      {params.then(({ id }) => (
        <DoctorDetailView id={id} />
      ))}
    </Suspense>
  );
}
