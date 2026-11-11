import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { getErrorMessage, hasFieldErrors, splitFieldErrors } from "@/lib/api-error";

/**
 * Maps `VALIDATION_ERROR` / `DUPLICATE_EMAIL` details onto React Hook Form fields.
 * Returns the message that could NOT be attached to a field (to show as a form-level
 * alert / toast), or `null` when every problem landed on a field.
 */
export function applyServerErrors<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  fields: readonly Path<TValues>[],
): string | null {
  if (!hasFieldErrors(error)) return getErrorMessage(error);

  const { fieldErrors, unmatched } = splitFieldErrors(error, fields);
  const entries = Object.entries(fieldErrors) as [Path<TValues>, string][];
  entries.forEach(([field, message], index) => {
    setError(field, { type: "server", message }, { shouldFocus: index === 0 });
  });

  if (entries.length === 0) {
    const first = unmatched[0];
    return first ? `${error.message}: ${first.message}` : error.message;
  }
  return null;
}

/** Sorted, case-insensitively de-duplicated union of suggestion lists. */
export function mergeSuggestions(...lists: readonly (readonly string[] | undefined)[]): string[] {
  const byKey = new Map<string, string>();
  for (const list of lists) {
    for (const item of list ?? []) {
      const value = item.trim();
      const key = value.toLowerCase();
      if (value && !byKey.has(key)) byKey.set(key, value);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}
