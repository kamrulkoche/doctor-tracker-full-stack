import type { Metadata } from "next";

import { NotFoundState } from "@/components/shared/not-found-state";
import { ROUTES } from "@/constants/app";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md">
        <NotFoundState
          title="Page not found"
          description="The page you are looking for does not exist or has moved."
          backHref={ROUTES.home}
          backLabel="Back to home"
        />
      </div>
    </main>
  );
}
