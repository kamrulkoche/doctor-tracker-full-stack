import { BarChart3, type LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type WidgetCardProps = {
  title: string;
  subtitle?: ReactNode;
  /** Controls or a "View all" link, shown on the right of the header. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Card frame for every dashboard widget (design system 6.14): title + subtitle left, controls right. */
export function WidgetCard({ title, subtitle, action, className, children }: WidgetCardProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 md:p-5", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 id={titleId} className="text-sm font-medium">
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

type WidgetStateProps = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  isRetrying?: boolean;
  /** Dim the content while a new range is loading over the previous data. */
  isRefreshing?: boolean;
  isEmpty: boolean;
  skeleton: ReactNode;
  errorTitle: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  children: ReactNode;
};

/**
 * The four states of a widget body. Each widget owns its own query, so one failed request
 * shows an inline error with retry here and never blanks the rest of the dashboard.
 */
export function WidgetState({
  isPending,
  isError,
  error,
  onRetry,
  isRetrying,
  isRefreshing,
  isEmpty,
  skeleton,
  errorTitle,
  emptyIcon = BarChart3,
  emptyTitle = "No data for this period",
  emptyDescription,
  emptyAction,
  children,
}: WidgetStateProps) {
  if (isPending) return <>{skeleton}</>;
  if (isError) {
    return (
      <ErrorState
        title={errorTitle}
        description={getErrorMessage(error)}
        onRetry={onRetry}
        isRetrying={isRetrying}
        className="py-8"
      />
    );
  }
  if (isEmpty) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className="py-8"
      />
    );
  }
  return (
    <div
      aria-busy={isRefreshing}
      className={cn("transition-opacity duration-150", isRefreshing && "opacity-60")}
    >
      {children}
    </div>
  );
}
