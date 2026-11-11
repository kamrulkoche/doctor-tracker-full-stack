"use client";

import { useCallback, useMemo } from "react";

import { useUrlFilters } from "@/hooks/use-url-filters";
import type { DateRange, SortOrder } from "@/types/api";

/**
 * The handlers every list view needs, all writing to the URL and all referentially
 * stable. Anything that changes the result set resets `page` to 1 (see `mergeSearchParams`);
 * only `onPageChange` sets the page itself.
 */
export function useListControls(resetKeys: readonly string[]) {
  const { searchParams, setParams, clearParams } = useUrlFilters();

  const onSearchChange = useCallback(
    (search: string) => setParams({ search }, { history: "replace" }),
    [setParams],
  );

  const onFilterChange = useCallback(
    (key: string, value: string | undefined) => setParams({ [key]: value }),
    [setParams],
  );

  const onDateRangeChange = useCallback(
    (range: DateRange) => setParams({ from: range.from, to: range.to }),
    [setParams],
  );

  const onSortChange = useCallback(
    (sortBy: string | undefined, sortOrder: SortOrder | undefined) => setParams({ sortBy, sortOrder }),
    [setParams],
  );

  const onPageChange = useCallback((page: number) => setParams({ page }), [setParams]);

  const onLimitChange = useCallback((limit: number) => setParams({ limit }), [setParams]);

  const onReset = useCallback(() => clearParams(resetKeys), [clearParams, resetKeys]);

  return useMemo(
    () => ({
      searchParams,
      onSearchChange,
      onFilterChange,
      onDateRangeChange,
      onSortChange,
      onPageChange,
      onLimitChange,
      onReset,
    }),
    [
      searchParams,
      onSearchChange,
      onFilterChange,
      onDateRangeChange,
      onSortChange,
      onPageChange,
      onLimitChange,
      onReset,
    ],
  );
}
