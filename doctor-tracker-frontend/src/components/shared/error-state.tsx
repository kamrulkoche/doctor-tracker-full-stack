import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title: string;
  /** Human-readable cause; never a raw error object. */
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  /** Replaces the retry button (e.g. a "Back to dashboard" link). */
  action?: ReactNode;
  className?: string;
};

export function ErrorState({ title, description, onRetry, isRetrying, action, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}
    >
      <span
        aria-hidden="true"
        className="inline-flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
      >
        <AlertTriangle className="size-5" strokeWidth={1.75} />
      </span>
      <div className="grid gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ??
        (onRetry ? (
          <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
            <RotateCw className={cn("size-4", isRetrying && "animate-spin")} aria-hidden="true" />
            Try again
          </Button>
        ) : null)}
    </div>
  );
}
