import type { ReactNode } from "react";

/** Series colours in their fixed order (design system: chart colour rules). */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;
export const CHART_OTHER_COLOR = "var(--chart-other)";

export const AXIS_TICK = { fontSize: 12, fill: "var(--muted-foreground)" } as const;

type TooltipRow = { name: string; value: string; color?: string };

/** Popover-styled tooltip body shared by every chart. */
export function ChartTooltipBox({ title, rows }: { title?: ReactNode; rows: readonly TooltipRow[] }) {
  return (
    <div className="grid min-w-32 gap-1.5 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
      {title ? <p className="font-medium">{title}</p> : null}
      {rows.map((row) => (
        <div key={row.name} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: row.color ?? CHART_COLORS[0] }}
          />
          <span className="text-muted-foreground">{row.name}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Text alternative for a chart: the same numbers as a visually hidden table, so the
 * data is reachable without a pointer and by assistive technology.
 */
export function ChartDataTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: readonly string[];
  rows: readonly (readonly (string | number)[])[];
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
