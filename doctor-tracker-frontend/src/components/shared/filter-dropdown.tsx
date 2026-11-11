"use client";

import { memo, useId, useMemo } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export type FilterOption = { value: string; label: string };

type FilterDropdownProps = {
  /** Dimension name, e.g. "Specialization". Always present as a label (visually hidden on desktop). */
  label: string;
  /** Text for the unset state, e.g. "All specializations". */
  allLabel: string;
  value: string | undefined;
  options: readonly FilterOption[] | readonly string[];
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  className?: string;
};

/** Single-select filter with an explicit "All" entry (design system 6.4). */
export const FilterDropdown = memo(function FilterDropdown({
  label,
  allLabel,
  value,
  options,
  onChange,
  disabled,
  className,
}: FilterDropdownProps) {
  const id = useId();

  const items = useMemo<FilterOption[]>(() => {
    const normalized = options.map((option) =>
      typeof option === "string" ? { value: option, label: option } : option,
    );
    // A deep-linked value that is not in the list (yet) must still be shown and removable.
    if (value && !normalized.some((option) => option.value === value)) {
      normalized.unshift({ value, label: value });
    }
    return normalized;
  }, [options, value]);

  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium md:sr-only">
        {label}
      </label>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? undefined : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="h-10 w-full md:h-9 lg:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {items.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
