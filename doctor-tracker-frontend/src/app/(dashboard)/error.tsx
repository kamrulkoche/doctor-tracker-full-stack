"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/app";

/** Route-level error boundary, rendered inside the shell so navigation keeps working. */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-lg border bg-card">
      <ErrorState
        title="This page couldn't be displayed"
        description="An unexpected error occurred while rendering this page."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => retry()}>
              Try again
            </Button>
            <Button asChild variant="ghost">
              <Link href={ROUTES.dashboard}>Back to dashboard</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
