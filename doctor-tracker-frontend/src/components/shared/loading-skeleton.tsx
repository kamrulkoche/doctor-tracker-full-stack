import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Wraps skeletons so assistive tech hears "Loading" instead of silence. */
export function LoadingRegion({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only" role="status">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Rows shaped like the data table body (48px rows, avatar + two bars). */
export function TableRowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <LoadingRegion label="Loading records">
      <div className="hidden divide-y divide-border md:block">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex h-12 items-center gap-3 px-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-6 h-4 w-24" />
            <Skeleton className="ml-auto hidden h-4 w-20 lg:block" />
          </div>
        ))}
      </div>
      <div className="space-y-3 p-0 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }, (_, index) => (
          <div key={index} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="grid gap-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion label="Loading chart">
      <Skeleton className={cn("h-[220px] w-full md:h-[280px]", className)} />
    </LoadingRegion>
  );
}

/** Compact avatar + two-line rows used by the dashboard lists. */
export function ListRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <LoadingRegion label="Loading list" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function DetailHeaderSkeleton() {
  return (
    <LoadingRegion label="Loading details" className="rounded-lg border bg-card p-4 md:p-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function InfoCardSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <LoadingRegion label="Loading details" className="rounded-lg border bg-card p-4 md:p-5">
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 grid gap-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid gap-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Route-level fallback for list pages: header, toolbar and table shapes. */
export function ListPageSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-full sm:w-32" />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <Skeleton className="h-9 w-full lg:w-72" />
        <Skeleton className="h-9 w-full lg:w-44" />
        <Skeleton className="hidden h-9 w-44 lg:block" />
      </div>
      <div className="overflow-hidden md:rounded-lg md:border md:bg-card">
        <div className="hidden h-10 bg-muted/50 md:block" />
        <TableRowsSkeleton />
      </div>
    </div>
  );
}

/** Route-level fallback for detail pages. */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <DetailHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <InfoCardSkeleton />
        </div>
        <div className="lg:col-span-8">
          <InfoCardSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}

/** Shown while the session is being resolved: the shell's outline, no spinner. */
export function AppShellSkeleton() {
  return (
    <LoadingRegion label="Loading Doctor Tracker" className="flex min-h-dvh w-full">
      <div className="hidden w-60 shrink-0 flex-col gap-2 border-r bg-sidebar p-3 lg:flex">
        <div className="flex h-8 items-center gap-2">
          <Skeleton className="size-8" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="mt-4 grid gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-9 rounded-full" />
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-4 md:px-6 md:py-6 lg:px-8">
          <ListPageSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}
