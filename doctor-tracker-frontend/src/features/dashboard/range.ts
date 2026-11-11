import { formatDateRange } from "@/lib/format";
import { parseDateParam, parseEnum, type SearchParamsLike } from "@/lib/url-filters";
import type { DateRange } from "@/types/api";
import type { TimeInterval } from "@/types/models";

/**
 * Dashboard date-range state, kept in the URL as `?range=…` (+ `from`/`to` for a custom
 * range) and `?interval=…`. Pure functions: "today" is passed in.
 */

export const RANGE_PRESETS = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
  { id: "all", label: "All time" },
] as const;

export type RangePresetId = (typeof RANGE_PRESETS)[number]["id"];
export type RangeId = RangePresetId | "custom";

export const DEFAULT_RANGE: RangePresetId = "12m";
const PRESET_IDS = RANGE_PRESETS.map((preset) => preset.id);
const INTERVALS = ["day", "week", "month"] as const satisfies readonly TimeInterval[];

export type DashboardRangeState = {
  rangeId: RangeId;
  /** What is sent to the API. Empty for "All time". */
  range: DateRange;
  /** Human label: the preset name or the formatted custom range. */
  label: string;
  /** Bucket size for the time-series charts (the user's choice, or derived from the span). */
  interval: TimeInterval;
  /** Intervals the toggle may offer for this range (bucket cap). */
  allowedIntervals: TimeInterval[];
};

/** `YYYY-MM-DD` for the current UTC day (the API buckets in UTC). */
export function todayUTC(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function shiftDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftMonths(isoDate: string, months: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  // Clamp to the last day of the target month (31 Mar - 1 month -> 28/29 Feb).
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

/** Inclusive `from`/`to` for a preset, ending today. */
export function resolvePresetRange(preset: RangePresetId, today: string): DateRange {
  switch (preset) {
    case "30d":
      return { from: shiftDays(today, -29), to: today };
    case "90d":
      return { from: shiftDays(today, -89), to: today };
    case "6m":
      return { from: shiftDays(shiftMonths(today, -6), 1), to: today };
    case "12m":
      return { from: shiftDays(shiftMonths(today, -12), 1), to: today };
    case "all":
      return {};
  }
}

export function daysInRange(range: DateRange): number | undefined {
  if (!range.from || !range.to) return undefined;
  const ms = Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** A readable number of buckets for the span: days up to ~6 weeks, weeks up to ~6 months, then months. */
export function defaultIntervalFor(range: DateRange): TimeInterval {
  const days = daysInRange(range);
  if (days === undefined) return "month";
  if (days <= 45) return "day";
  if (days <= 185) return "week";
  return "month";
}

/** The API refuses a time series that needs more than this many buckets (VALIDATION_ERROR on `from`). */
export const MAX_SERIES_BUCKETS = 750;
const DAYS_PER_BUCKET: Record<TimeInterval, number> = { day: 1, week: 7, month: 28 };

/**
 * Intervals that stay under the bucket cap for a range. Open-ended ranges ("All time", or a
 * custom range without both ends) use the server defaults, which are always small.
 */
export function allowedIntervalsFor(range: DateRange): TimeInterval[] {
  const days = daysInRange(range);
  if (days === undefined) return range.from ? ["month"] : [...INTERVALS];
  return INTERVALS.filter(
    (interval) => Math.ceil(days / DAYS_PER_BUCKET[interval]) + 1 <= MAX_SERIES_BUCKETS,
  );
}

export function parseDashboardRange(params: SearchParamsLike, today: string): DashboardRangeState {
  const from = parseDateParam(params.get("from"));
  const to = parseDateParam(params.get("to"));
  const requested = parseEnum(params.get("range"), [...PRESET_IDS, "custom"] as const);

  let rangeId: RangeId = requested ?? DEFAULT_RANGE;
  let range: DateRange;
  let label: string;

  const customIsValid = Boolean(from || to) && !(from && to && from > to);
  if (rangeId === "custom" && customIsValid) {
    range = { from, to };
    label = formatDateRange(from, to);
  } else {
    if (rangeId === "custom") rangeId = DEFAULT_RANGE;
    range = resolvePresetRange(rangeId, today);
    label = RANGE_PRESETS.find((preset) => preset.id === rangeId)?.label ?? "";
  }

  const allowedIntervals = allowedIntervalsFor(range);
  const explicit = parseEnum(params.get("interval"), allowedIntervals);
  const derived = defaultIntervalFor(range);
  return {
    rangeId,
    range,
    label,
    interval: explicit ?? (allowedIntervals.includes(derived) ? derived : "month"),
    allowedIntervals,
  };
}
