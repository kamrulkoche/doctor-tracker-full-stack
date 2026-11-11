import { GENDER_LABELS, ISO_DATE_PATTERN } from "@/constants/app";
import type { Gender, TimeInterval } from "@/types/models";

// Dates are formatted by hand (UTC, like the API) rather than with Intl month names:
// ICU versions disagree on abbreviations ("Sep" vs "Sept"), and the same date must read
// identically in Node, in every browser and in tests.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const pad = (value: number) => String(value).padStart(2, "0");
const monthOf = (date: Date) => MONTHS[date.getUTCMonth()] ?? "";

const DATE_FORMAT = {
  format: (date: Date) => `${pad(date.getUTCDate())} ${monthOf(date)} ${date.getUTCFullYear()}`,
};
const SHORT_DATE_FORMAT = {
  format: (date: Date) => `${date.getUTCDate()} ${monthOf(date)}`,
};
const MONTH_FORMAT = {
  format: (date: Date) => `${monthOf(date)} ${pad(date.getUTCFullYear() % 100)}`,
};
const DATE_TIME_FORMAT = {
  format: (date: Date) =>
    `${DATE_FORMAT.format(date)}, ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`,
};
const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");

export const EM_DASH = "—";

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `12 Nov 2026` — the single date format used across the app (UTC, like the API). */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE_FORMAT.format(date) : EM_DASH;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE_TIME_FORMAT.format(date) : EM_DASH;
}

export function formatNumber(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? NUMBER_FORMAT.format(value) : EM_DASH;
}

/** Axis/tooltip label for a time-series bucket. */
export function formatBucket(value: string, interval: TimeInterval): string {
  const date = toDate(value);
  if (!date) return "";
  return interval === "month" ? MONTH_FORMAT.format(date) : SHORT_DATE_FORMAT.format(date);
}

/** `YYYY-MM-DD` from a local calendar date (what the user picked in the calendar). */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses `YYYY-MM-DD` into a local-midnight Date; rejects impossible dates such as 2026-02-31. */
export function parseISODate(value: string | null | undefined): Date | undefined {
  if (!value || !ISO_DATE_PATTERN.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? date : undefined;
}

export function isValidISODate(value: string | null | undefined): value is string {
  return parseISODate(value) !== undefined;
}

/** `1 Oct – 31 Oct 2026`, `From 01 Oct 2026`, `Until 31 Oct 2026`, or the fallback. */
export function formatDateRange(
  from: string | undefined,
  to: string | undefined,
  fallback = "Any time",
): string {
  const start = toDate(from ? `${from.slice(0, 10)}T00:00:00Z` : undefined);
  const end = toDate(to ? `${to.slice(0, 10)}T00:00:00Z` : undefined);
  if (start && end) {
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
    const left = sameYear ? SHORT_DATE_FORMAT.format(start) : DATE_FORMAT.format(start);
    return `${left} – ${DATE_FORMAT.format(end)}`;
  }
  if (start) return `From ${DATE_FORMAT.format(start)}`;
  if (end) return `Until ${DATE_FORMAT.format(end)}`;
  return fallback;
}

const TITLES = new Set(["dr", "dr.", "prof", "prof.", "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "md"]);

/** First letter of the first and last word, ignoring titles such as "Dr.". */
export function getInitials(name: string | null | undefined): string {
  const words = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && !TITLES.has(word.toLowerCase()));
  if (words.length === 0) return "?";
  const first = Array.from(words[0] ?? "")[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1] ?? "")[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function formatGender(gender: Gender | null | undefined): string {
  return gender ? GENDER_LABELS[gender] : EM_DASH;
}

/** `34 · Female`, `34`, `Female`, or an em dash when both are unset. */
export function formatAgeGender(age: number | null | undefined, gender: Gender | null | undefined): string {
  const parts: string[] = [];
  if (typeof age === "number") parts.push(String(age));
  if (gender) parts.push(GENDER_LABELS[gender]);
  return parts.length > 0 ? parts.join(" · ") : EM_DASH;
}

export type Delta = {
  direction: "up" | "down" | "flat";
  /** Signed, e.g. "+12", "-3", "0". */
  label: string;
};

export function getDelta(current: number, previous: number): Delta {
  const diff = current - previous;
  if (diff > 0) return { direction: "up", label: `+${formatNumber(diff)}` };
  if (diff < 0) return { direction: "down", label: `−${formatNumber(Math.abs(diff))}` };
  return { direction: "flat", label: "0" };
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
