import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

type NotFoundStateProps = {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
};

/** In-shell 404 for unknown or malformed record ids. */
export function NotFoundState({ title, description, backHref, backLabel }: NotFoundStateProps) {
  return (
    <div className="rounded-lg border bg-card" data-testid="not-found-state">
      <EmptyState
        icon={FileQuestion}
        title={title}
        description={description}
        action={
          <Button asChild variant="outline">
            <Link href={backHref}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              {backLabel}
            </Link>
          </Button>
        }
      />
    </div>
  );
}
