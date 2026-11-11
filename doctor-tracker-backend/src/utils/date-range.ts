export type Interval = 'day' | 'week' | 'month';

export interface DateRangeInput {
  /** `YYYY-MM-DD`, inclusive from 00:00:00.000Z */
  from?: string;
  /** `YYYY-MM-DD`, inclusive until 23:59:59.999Z */
  to?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface CreatedAtCondition {
  $gte?: Date;
  $lte?: Date;
}

const DAY_MS = 86_400_000;

/** Number of buckets shown when the caller gives no explicit range. */
const DEFAULT_BUCKETS: Record<Interval, number> = { day: 30, week: 12, month: 12 };

export function startOfDayUtc(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function endOfDayUtc(day: string): Date {
  return new Date(`${day}T23:59:59.999Z`);
}

export function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** True for a real calendar day written as `YYYY-MM-DD` (rejects e.g. 2025-02-30). */
export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = startOfDayUtc(day);
  return !Number.isNaN(date.getTime()) && toDayString(date) === day;
}

/** Builds the `createdAt` condition shared by every list and dashboard query. */
export function buildCreatedAtCondition(input: DateRangeInput): CreatedAtCondition | undefined {
  if (!input.from && !input.to) return undefined;
  return {
    ...(input.from ? { $gte: startOfDayUtc(input.from) } : {}),
    ...(input.to ? { $lte: endOfDayUtc(input.to) } : {}),
  };
}

export function startOfMonthUtc(date: Date, monthOffset = 0): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthOffset, 1));
}

/** Truncates a date to the start of its UTC bucket. Weeks start on Monday. */
export function startOfBucket(date: Date, interval: Interval): Date {
  const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (interval === 'day') return new Date(dayStart);
  if (interval === 'week') {
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    return new Date(dayStart - daysSinceMonday * DAY_MS);
  }
  return startOfMonthUtc(date);
}

export function addBuckets(bucketStart: Date, interval: Interval, amount: number): Date {
  if (interval === 'day') return new Date(bucketStart.getTime() + amount * DAY_MS);
  if (interval === 'week') return new Date(bucketStart.getTime() + amount * 7 * DAY_MS);
  return new Date(Date.UTC(bucketStart.getUTCFullYear(), bucketStart.getUTCMonth() + amount, 1));
}

/**
 * Resolves the effective range of a time series. A missing `to` means "today"; a missing
 * `from` means "the last N buckets ending at `to`" (30 days / 12 weeks / 12 months).
 */
export function resolveSeriesRange(input: DateRangeInput, interval: Interval, now: Date = new Date()): DateRange {
  const to = endOfDayUtc(input.to ?? toDayString(now));
  const from = input.from
    ? startOfDayUtc(input.from)
    : addBuckets(startOfBucket(to, interval), interval, -(DEFAULT_BUCKETS[interval] - 1));
  return { from, to };
}

/** Start of every bucket that overlaps the range, in ascending order. */
export function listBucketStarts(range: DateRange, interval: Interval): Date[] {
  const buckets: Date[] = [];
  for (
    let cursor = startOfBucket(range.from, interval);
    cursor.getTime() <= range.to.getTime();
    cursor = addBuckets(cursor, interval, 1)
  ) {
    buckets.push(cursor);
  }
  return buckets;
}

/** Cheap upper bound on the bucket count, used to reject absurd ranges before querying. */
export function estimateBucketCount(range: DateRange, interval: Interval): number {
  const days = Math.max(0, (range.to.getTime() - range.from.getTime()) / DAY_MS);
  if (interval === 'day') return Math.ceil(days) + 1;
  if (interval === 'week') return Math.ceil(days / 7) + 1;
  return Math.ceil(days / 28) + 1;
}
