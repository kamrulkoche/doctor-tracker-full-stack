"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { memo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";

type FilterBarProps = {
  search: ReactNode;
  /** Filter controls; rendered inline on `md+` and inside a bottom sheet on phones. */
  children: ReactNode;
  /** Number of active filters (search excluded), shown on the mobile "Filters" button. */
  activeCount: number;
  /** True when anything (search, filter, sort) differs from the defaults. */
  canReset: boolean;
  onReset: () => void;
};

/**
 * List toolbar (design system 6.4). The filter controls are mounted exactly once —
 * inline or in the sheet — so there are no duplicate ids or doubled requests.
 */
export function FilterBar({ search, children, activeCount, canReset, onReset }: FilterBarProps) {
  const isDesktop = useIsDesktop();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isDesktop) {
    return (
      <div role="search" className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        {search}
        <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-center">{children}</div>
        {canReset ? (
          <Button variant="ghost" className="self-start lg:ml-auto lg:self-auto" onClick={onReset}>
            <X className="size-4" aria-hidden="true" />
            Reset
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div role="search" className="flex items-center gap-2">
      <div className="min-w-0 flex-1">{search}</div>
      <Button
        variant="outline"
        className="h-10 shrink-0 px-3"
        onClick={() => setSheetOpen(true)}
        aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters
        {activeCount > 0 ? (
          <span
            aria-hidden="true"
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1 text-xs font-medium text-primary-foreground tabular-nums"
          >
            {activeCount}
          </span>
        ) : null}
      </Button>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[92dvh] gap-0 rounded-t-xl">
          <SheetHeader className="border-b">
            <SheetTitle className="text-lg font-semibold">Filters</SheetTitle>
            <SheetDescription>Narrow down the list. Changes apply immediately.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 overflow-y-auto p-4">{children}</div>
          <SheetFooter className="flex-col-reverse border-t">
            <Button variant="outline" className="h-10" disabled={!canReset} onClick={onReset}>
              Reset
            </Button>
            <Button className="h-10" onClick={() => setSheetOpen(false)}>
              Show results
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export type FilterChip = {
  key: string;
  /** "Specialization: Cardiology" */
  label: string;
  onRemove: () => void;
};

type FilterChipsProps = {
  chips: readonly FilterChip[];
  onClearAll: () => void;
};

/** Active-filter chips; rendered only when at least one filter is set. */
export const FilterChips = memo(function FilterChips({ chips, onClearAll }: FilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li
          key={chip.key}
          className="inline-flex h-8 max-w-full items-center gap-1 rounded-md border bg-muted pr-1 pl-2 text-xs md:h-6"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove filter ${chip.label}`}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:size-4"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </li>
      ))}
      <li>
        <Button variant="ghost" size="xs" className="h-8 px-2 text-xs md:h-6" onClick={onClearAll}>
          Clear all
        </Button>
      </li>
    </ul>
  );
});
