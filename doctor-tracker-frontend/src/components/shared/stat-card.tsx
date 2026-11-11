import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { memo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { Delta } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Signed comparison shown before `context` (icon + sign, never colour alone). */
  delta?: Delta;
  /** Muted context line, e.g. "vs last month". */
  context?: string;
};

const DELTA_STYLE = {
  up: { icon: ArrowUpRight, className: "text-success", word: "Up" },
  down: { icon: ArrowDownRight, className: "text-destructive", word: "Down" },
  flat: { icon: Minus, className: "text-muted-foreground", word: "No change" },
} as const;

export const StatCard = memo(function StatCard({ label, value, icon: Icon, delta, context }: StatCardProps) {
  const deltaStyle = delta ? DELTA_STYLE[delta.direction] : null;
  const DeltaIcon = deltaStyle?.icon;

  return (
    <div className="rounded-lg border bg-card p-4 md:p-5" data-testid="stat-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span
          aria-hidden="true"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums" data-testid="stat-value">
        {value}
      </p>
      {delta || context ? (
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground tabular-nums">
          {delta && deltaStyle && DeltaIcon ? (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", deltaStyle.className)}>
              <DeltaIcon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{deltaStyle.word}: </span>
              {delta.label}
            </span>
          ) : null}
          {context ? <span>{context}</span> : null}
        </p>
      ) : null}
    </div>
  );
});

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 md:p-5">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-8" />
      </div>
      <Skeleton className="mt-2 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}
