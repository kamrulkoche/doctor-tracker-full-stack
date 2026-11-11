"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { memo, useId, type ReactNode } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { TableRowsSkeleton } from "@/components/shared/loading-skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsDesktop } from "@/hooks/use-media-query";
import { nextSort } from "@/lib/url-filters";
import { cn } from "@/lib/utils";
import type { SortOrder } from "@/types/api";

export type DataTableColumn<TRow, TSort extends string = string> = {
  id: string;
  /** Sentence-case header text; also the `dt` label in the mobile card. */
  header: string;
  cell: (row: TRow) => ReactNode;
  /** Makes the header a sort button for this server-side sort field. */
  sortKey?: TSort;
  /** Purely numeric columns are right-aligned. */
  align?: "left" | "right";
  /** Extra classes for both `th` and `td`: the column width (the table is `table-fixed`) and
   *  responsive visibility, e.g. `w-[18%] hidden lg:table-cell`. */
  className?: string;
  /**
   * Where the column goes in the mobile card: `title` (top row, next to the actions),
   * `field` (label/value grid, default), `actions` (top-right menu) or `hidden`.
   */
  mobile?: "title" | "field" | "actions" | "hidden";
  /** Mobile only: let this field span both grid columns. */
  mobileWide?: boolean;
};

export type DataTableSort<TSort extends string> = {
  sortBy: TSort | undefined;
  sortOrder: SortOrder;
};

type DataTableProps<TRow, TSort extends string> = {
  /** Accessible name of the table. */
  caption: string;
  columns: readonly DataTableColumn<TRow, TSort>[];
  rows: readonly TRow[] | undefined;
  getRowId: (row: TRow) => string;
  sort?: DataTableSort<TSort>;
  /** Receives the next sort state; `undefined` means "back to the default order". */
  onSortChange?: (sortBy: TSort | undefined, sortOrder: SortOrder | undefined) => void;
  /** First load: skeleton rows. */
  isLoading?: boolean;
  /** Background refetch with previous rows on screen: dim, do not flash. */
  isRefreshing?: boolean;
  error?: { title: string; description: string } | null;
  onRetry?: () => void;
  /** Rendered instead of the table when there are no rows. */
  emptyState: ReactNode;
  skeletonRows?: number;
};

const DEFAULT_SORT = "__default__";

function DataTableInner<TRow, TSort extends string>({
  caption,
  columns,
  rows,
  getRowId,
  sort,
  onSortChange,
  isLoading = false,
  isRefreshing = false,
  error,
  onRetry,
  emptyState,
  skeletonRows = 8,
}: DataTableProps<TRow, TSort>) {
  const sortSelectId = useId();
  // Exactly one variant is mounted (table on md+, stacked cards below), so cells and their
  // menus are never rendered twice.
  const isDesktop = useIsDesktop();
  const sortableColumns = columns.filter(
    (column): column is DataTableColumn<TRow, TSort> & { sortKey: TSort } => column.sortKey !== undefined,
  );

  if (isLoading) {
    return (
      <div className="overflow-hidden md:rounded-lg md:border md:bg-card">
        <div className="hidden h-10 border-b bg-muted/50 md:block" />
        <TableRowsSkeleton rows={skeletonRows} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-card">
        <ErrorState
          title={error.title}
          description={error.description}
          onRetry={onRetry}
          isRetrying={isRefreshing}
        />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <div className="rounded-lg border bg-card">{emptyState}</div>;
  }

  const titleColumn = columns.find((column) => column.mobile === "title");
  const actionsColumn = columns.find((column) => column.mobile === "actions");
  const fieldColumns = columns.filter((column) => (column.mobile ?? "field") === "field");
  const mobileSortValue = sort?.sortBy ? `${sort.sortBy}:${sort.sortOrder}` : DEFAULT_SORT;

  return (
    <div
      aria-busy={isRefreshing}
      className={cn("transition-opacity duration-150", isRefreshing && "opacity-60")}
    >
      {isDesktop ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full table-fixed border-collapse text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="h-10 border-b bg-muted/50">
                {columns.map((column) => {
                  const isActions = column.mobile === "actions";
                  const isSorted = column.sortKey !== undefined && sort?.sortBy === column.sortKey;
                  const ariaSort = !column.sortKey
                    ? undefined
                    : isSorted
                      ? sort?.sortOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : "none";
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={ariaSort}
                      className={cn(
                        "px-4 text-xs font-medium whitespace-nowrap text-muted-foreground",
                        column.align === "right" ? "text-right" : "text-left",
                        isActions && "w-14 px-2",
                        column.className,
                      )}
                    >
                      {isActions ? (
                        <span className="sr-only">{column.header}</span>
                      ) : column.sortKey && sort && onSortChange ? (
                        <SortButton
                          label={column.header}
                          direction={isSorted ? sort.sortOrder : undefined}
                          alignRight={column.align === "right"}
                          onClick={() => {
                            const next = nextSort(sort, column.sortKey as TSort);
                            onSortChange(next.sortBy, next.sortOrder);
                          }}
                        />
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={getRowId(row)}
                  className="h-12 border-b transition-colors duration-150 last:border-0 hover:bg-muted/50"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "overflow-hidden px-4 py-2",
                        column.align === "right" && "text-right tabular-nums",
                        column.mobile === "actions" && "w-14 px-2",
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          {sortableColumns.length > 0 && sort && onSortChange ? (
            <div className="mb-3 flex items-center gap-2">
              <label htmlFor={sortSelectId} className="text-sm text-muted-foreground">
                Sort
              </label>
              <Select
                value={mobileSortValue}
                onValueChange={(value) => {
                  if (value === DEFAULT_SORT) {
                    onSortChange(undefined, undefined);
                    return;
                  }
                  const [field, order] = value.split(":");
                  onSortChange(field as TSort, order === "desc" ? "desc" : "asc");
                }}
              >
                <SelectTrigger id={sortSelectId} className="h-10 min-w-0 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_SORT}>Newest first</SelectItem>
                  {sortableColumns.flatMap((column) => [
                    <SelectItem key={`${column.sortKey}:asc`} value={`${column.sortKey}:asc`}>
                      {column.header}, ascending
                    </SelectItem>,
                    <SelectItem key={`${column.sortKey}:desc`} value={`${column.sortKey}:desc`}>
                      {column.header}, descending
                    </SelectItem>,
                  ])}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <ul aria-label={caption} className="space-y-3">
            {rows.map((row) => (
              <li key={getRowId(row)} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">{titleColumn?.cell(row)}</div>
                  {actionsColumn ? (
                    <div className="-mt-1.5 -mr-2 shrink-0">{actionsColumn.cell(row)}</div>
                  ) : null}
                </div>
                {fieldColumns.length > 0 ? (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    {fieldColumns.map((column) => (
                      <div key={column.id} className={cn("min-w-0", column.mobileWide && "col-span-2")}>
                        <dt className="text-xs text-muted-foreground">{column.header}</dt>
                        <dd className="mt-0.5 min-w-0 text-sm">{column.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

type SortButtonProps = {
  label: string;
  direction: SortOrder | undefined;
  alignRight: boolean;
  onClick: () => void;
};

function SortButton({ label, direction, alignRight, onClick }: SortButtonProps) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        direction === "asc"
          ? `Sorted ascending. Click to sort descending.`
          : direction === "desc"
            ? `Sorted descending. Click to clear sorting.`
            : `Sort by ${label.toLowerCase()}`
      }
      className={cn(
        "-mx-1 inline-flex h-8 items-center gap-1 rounded-sm px-1 transition-colors duration-150 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        alignRight && "flex-row-reverse",
        direction && "text-foreground",
      )}
    >
      {label}
      <Icon className={cn("size-3.5", !direction && "opacity-50")} aria-hidden="true" />
    </button>
  );
}

/**
 * Generic, typed, server-driven table (design system 6.3): sortable headers with
 * `aria-sort`, skeleton / empty / error states, and a stacked-card variant below `md`.
 * Memoised — with stable `columns` and callbacks it only re-renders when rows change.
 */
export const DataTable = memo(DataTableInner) as typeof DataTableInner;
