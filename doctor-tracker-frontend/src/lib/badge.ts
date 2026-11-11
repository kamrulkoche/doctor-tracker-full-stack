/**
 * Specialization / condition badge tints (design system 6.6). Class strings stay full
 * literals so Tailwind can see them. Red and green are excluded on purpose.
 */
export const BADGE_TINTS = [
  "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/20",
  "bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/20",
  "bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
  "bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/20",
  "bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20",
  "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-600/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-300 dark:ring-fuchsia-400/20",
  "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  "bg-lime-50 text-lime-800 ring-lime-600/20 dark:bg-lime-400/10 dark:text-lime-300 dark:ring-lime-400/20",
] as const;

export type BadgeTint = (typeof BADGE_TINTS)[number];

/** Deterministic: the same label gets the same tint on every page and in both themes. */
export function badgeTintIndex(label: string): number {
  let hash = 0;
  for (const ch of label.trim().toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % BADGE_TINTS.length;
}

export function badgeTint(label: string): BadgeTint {
  return BADGE_TINTS[badgeTintIndex(label)] ?? BADGE_TINTS[0];
}
