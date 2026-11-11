"use client";

import { CalendarDays } from "lucide-react";
import { memo, useId, useState } from "react";
import type { DateRange as CalendarRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsDesktop } from "@/hooks/use-media-query";
import { formatDateRange, parseISODate, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/types/api";

export type DateRangePreset = { id: string; label: string };

type DateRangePickerProps = {
  /** Dimension name, e.g. "Created". */
  label: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Trigger text when no range is set. */
  placeholder?: string;
  /** Overrides the trigger text (e.g. the active preset's name). */
  displayValue?: string;
  presets?: readonly DateRangePreset[];
  activePreset?: string;
  onPresetSelect?: (id: string) => void;
  align?: "start" | "center" | "end";
  /** Keep the label visible instead of visually hiding it on desktop. */
  labelVisible?: boolean;
  className?: string;
};

/**
 * Popover + calendar range picker. Values are `YYYY-MM-DD` strings (what the API takes).
 * The draft lives in the panel, which only mounts while open, so it always starts from
 * the committed value without a syncing effect.
 */
export const DateRangePicker = memo(function DateRangePicker({
  label,
  value,
  onChange,
  placeholder = "Any time",
  displayValue,
  presets,
  activePreset,
  onPresetSelect,
  align = "start",
  labelVisible = false,
  className,
}: DateRangePickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const hasValue = Boolean(value.from || value.to);
  const text = displayValue ?? formatDateRange(value.from, value.to, placeholder);

  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-sm font-medium", !labelVisible && "md:sr-only")}>
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "h-10 w-full justify-start gap-2 bg-transparent px-3 font-normal tabular-nums md:h-9 lg:w-auto lg:min-w-44",
              !hasValue && !displayValue && "text-muted-foreground",
            )}
          >
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{text}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-auto max-w-[calc(100vw-2rem)] p-0">
          {open ? (
            <RangePanel
              value={value}
              presets={presets}
              activePreset={activePreset}
              onPresetSelect={(preset) => {
                onPresetSelect?.(preset);
                setOpen(false);
              }}
              onApply={(range) => {
                onChange(range);
                setOpen(false);
              }}
            />
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
});

type RangePanelProps = {
  value: DateRange;
  presets?: readonly DateRangePreset[];
  activePreset?: string;
  onPresetSelect: (id: string) => void;
  onApply: (range: DateRange) => void;
};

function RangePanel({ value, presets, activePreset, onPresetSelect, onApply }: RangePanelProps) {
  const isDesktop = useIsDesktop();
  const [draft, setDraft] = useState<CalendarRange | undefined>(() => {
    const from = parseISODate(value.from);
    const to = parseISODate(value.to);
    return from || to ? { from, to } : undefined;
  });
  const [today] = useState(() => new Date());

  const apply = () => {
    const from = draft?.from;
    const to = draft?.to ?? draft?.from;
    onApply({ from: from ? toISODate(from) : undefined, to: to ? toISODate(to) : undefined });
  };

  return (
    <div className="flex flex-col sm:flex-row">
      {presets && presets.length > 0 ? (
        <div
          role="group"
          aria-label="Quick ranges"
          className="flex flex-wrap gap-1 border-b p-2 sm:w-36 sm:flex-col sm:flex-nowrap sm:border-r sm:border-b-0"
        >
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant="ghost"
              size="sm"
              aria-pressed={preset.id === activePreset}
              className={cn(
                "h-9 justify-start px-2.5 text-sm sm:h-8",
                preset.id === activePreset && "bg-accent text-accent-foreground",
              )}
              onClick={() => onPresetSelect(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col">
        <Calendar
          mode="range"
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={isDesktop ? 2 : 1}
          defaultMonth={draft?.from ?? today}
          disabled={{ after: today }}
          autoFocus
        />
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <p className="px-1 text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {draft?.from
              ? formatDateRange(toISODate(draft.from), toISODate(draft.to ?? draft.from))
              : "Pick a start and end date"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-8" onClick={() => onApply({})}>
              Clear
            </Button>
            <Button size="sm" className="h-8" onClick={apply} disabled={!draft?.from}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
