import type { ReactNode } from "react";

import { EM_DASH } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DetailItem = {
  label: string;
  /** `null` / `undefined` / "" render as an em dash. */
  value: ReactNode;
  /** Span the full width of the grid (long text such as notes). */
  wide?: boolean;
};

type DetailListProps = {
  items: readonly DetailItem[];
  /** Number of columns on `sm+`. */
  columns?: 1 | 2;
  className?: string;
};

/** Caption-over-value description list used by the detail pages. */
export function DetailList({ items, columns = 1, className }: DetailListProps) {
  return (
    <dl className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0", item.wide && columns === 2 && "sm:col-span-2")}>
          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 min-w-0 text-sm break-words">
            {item.value === null || item.value === undefined || item.value === "" ? (
              <span className="text-muted-foreground">{EM_DASH}</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
