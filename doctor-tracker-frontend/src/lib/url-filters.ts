import { DEFAULT_PAGE_SIZE, OBJECT_ID_PATTERN, PAGE_SIZES, SEARCH_MAX_LENGTH } from "@/constants/app";
import { isValidISODate } from "@/lib/format";
import type { SortOrder } from "@/types/api";

/**
 * Pure helpers that translate between URL search params and typed list state.
 * The URL is the single source of truth for page, page size, search, filters,
 * sort and date range, so every list view is shareable and survives refresh/back.
 */

export type SearchParamsLike = Pick<URLSearchParams, "get">;

export type ParamValue = string | number | null | undefined;
export type ParamPatch = Record<string, ParamValue>;

export type BaseListState<TSort extends string> = {
  page: number;
  limit: number;
  search: string;
  sortBy: TSort | undefined;
  sortOrder: SortOrder;
  from: string | undefined;
  to: string | undefined;
};

export function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function parseLimit(value: string | null): number {
  const limit = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(limit) ? limit : DEFAULT_PAGE_SIZE;
}

export function parseText(value: string | null, maxLength = 200): string | undefined {
  const text = value?.trim().slice(0, maxLength);
  return text ? text : undefined;
}

export function parseEnum<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((item) => item === value);
}

export function parseObjectId(value: string | null): string | undefined {
  return value && OBJECT_ID_PATTERN.test(value) ? value : undefined;
}

export function parseDateParam(value: string | null): string | undefined {
  return isValidISODate(value) ? value : undefined;
}

export function parseBaseListState<TSort extends string>(
  params: SearchParamsLike,
  sortFields: readonly TSort[],
): BaseListState<TSort> {
  const sortBy = parseEnum(params.get("sortBy"), sortFields);
  const from = parseDateParam(params.get("from"));
  const to = parseDateParam(params.get("to"));
  // An inverted range would be rejected by the API (VALIDATION_ERROR); drop the end instead.
  const validRange = !(from && to && from > to);
  return {
    page: parsePage(params.get("page")),
    limit: parseLimit(params.get("limit")),
    search: parseText(params.get("search"), SEARCH_MAX_LENGTH) ?? "",
    sortBy,
    sortOrder: sortBy ? (parseEnum(params.get("sortOrder"), ["asc", "desc"] as const) ?? "asc") : "desc",
    from,
    to: validRange ? to : undefined,
  };
}

/**
 * Applies a patch to the current query string.
 * `null`, `undefined` and `""` remove a key. Unless the patch itself sets `page`,
 * the page is reset to 1 (i.e. removed) because the result set changed.
 */
export function mergeSearchParams(current: string | URLSearchParams, patch: ParamPatch): string {
  const next = new URLSearchParams(typeof current === "string" ? current : current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  if (!("page" in patch)) next.delete("page");
  if (next.get("page") === "1") next.delete("page");
  if (next.get("limit") === String(DEFAULT_PAGE_SIZE)) next.delete("limit");
  next.sort();
  return next.toString();
}

/** Removes every listed key (used by "Reset" / "Clear all"), keeping unrelated params. */
export function clearSearchParams(current: string | URLSearchParams, keys: readonly string[]): string {
  const patch: ParamPatch = { page: null };
  for (const key of keys) patch[key] = null;
  return mergeSearchParams(current, patch);
}

/** Drops unset values so they never reach the wire or the query key. */
export function compactQuery<T extends Record<string, unknown>>(query: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(query) as (keyof T)[]) {
    const value = query[key];
    if (value !== undefined && value !== null && value !== "") result[key] = value;
  }
  return result;
}

/** Sort header cycle: none → asc → desc → none. */
export function nextSort<TSort extends string>(
  current: { sortBy: TSort | undefined; sortOrder: SortOrder },
  field: TSort,
): { sortBy: TSort | undefined; sortOrder: SortOrder | undefined } {
  if (current.sortBy !== field) return { sortBy: field, sortOrder: "asc" };
  if (current.sortOrder === "asc") return { sortBy: field, sortOrder: "desc" };
  return { sortBy: undefined, sortOrder: undefined };
}

/** Only same-origin relative paths are accepted as a post-login destination. */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) return fallback;
  return next;
}

export function buildLoginUrl(currentPath: string | null | undefined): string {
  const next = safeNextPath(currentPath, "");
  return next && next !== "/dashboard" ? `/login?next=${encodeURIComponent(next)}` : "/login";
}
