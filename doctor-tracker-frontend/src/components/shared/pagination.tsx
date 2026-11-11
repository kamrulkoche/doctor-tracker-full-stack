"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { memo, useId } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZES } from "@/constants/app";
import { formatNumber } from "@/lib/format";

type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  /** Noun for the count, e.g. "doctors". */
  itemLabel?: string;
};

/** Server-side pagination bar (design system 6.5). Hidden when there is nothing to page. */
export const Pagination = memo(function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  itemLabel = "results",
}: PaginationProps) {
  const selectId = useId();
  if (total === 0) return null;

  const lastPage = Math.max(totalPages, 1);
  const first = Math.min((page - 1) * limit + 1, total);
  const last = Math.min(page * limit, total);
  const isFirst = page <= 1;
  const isLast = page >= lastPage;

  return (
    <nav
      aria-label={`Pagination for ${itemLabel}`}
      className="flex flex-col gap-3 text-sm text-muted-foreground tabular-nums sm:flex-row sm:items-center sm:justify-between"
    >
      <p aria-live="polite">
        {first > last
          ? `No ${itemLabel} on this page`
          : `Showing ${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(total)}`}
      </p>
      <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor={selectId} className="whitespace-nowrap">
            Rows per page
          </label>
          <Select value={String(limit)} onValueChange={(value) => onLimitChange(Number(value))}>
            <SelectTrigger id={selectId} size="sm" className="h-10 w-[72px] text-foreground md:h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="hidden whitespace-nowrap sm:inline">
          Page {formatNumber(Math.min(page, lastPage))} of {formatNumber(lastPage)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label="First page"
            disabled={isFirst}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10 md:size-8"
            aria-label="Previous page"
            disabled={isFirst}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10 md:size-8"
            aria-label="Next page"
            disabled={isLast}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
            aria-label="Last page"
            disabled={isLast}
            onClick={() => onPageChange(lastPage)}
          >
            <ChevronsRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
});
