"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/app";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error occurred. You can try again or go back to the dashboard."
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
    </main>
  );
}
