"use client";

import { memo, useMemo } from "react";
import { Pie, PieChart, Tooltip } from "recharts";

import { ChartTooltipBox, isRecord } from "@/components/charts/chart-primitives";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { formatNumber } from "@/lib/format";

export type DonutSlice = {
  name: string;
  value: number;
  percentage: number;
  /** A CSS colour, normally one of the `--chart-*` tokens. */
  color: string;
};

export type DonutChartProps = {
  slices: readonly DonutSlice[];
  total: number;
  /** Caption under the centre total, e.g. "patients". */
  totalLabel: string;
  ariaLabel: string;
};

const CONFIG = {} satisfies ChartConfig;

/**
 * Donut with the total in the centre. Slices are separated by a 2px card-coloured gap and
 * the adjacent legend (rendered by the caller) carries names and values, so colour is
 * never the only signal.
 */
export const DonutChart = memo(function DonutChart({
  slices,
  total,
  totalLabel,
  ariaLabel,
}: DonutChartProps) {
  const reducedMotion = usePrefersReducedMotion();
  const data = useMemo(() => slices.map((slice) => ({ ...slice, fill: slice.color })), [slices]);

  return (
    <div role="img" aria-label={ariaLabel} className="relative mx-auto h-[240px] w-full max-w-[280px]">
      <ChartContainer config={CONFIG} className="aspect-auto h-full w-full">
        <PieChart accessibilityLayer={false}>
          <Tooltip
            content={({ active, payload }) => {
              const slice = active ? payload?.[0]?.payload : undefined;
              if (!isRecord(slice) || typeof slice.name !== "string") return null;
              return (
                <ChartTooltipBox
                  rows={[
                    {
                      name: slice.name,
                      value: `${formatNumber(Number(slice.value))} (${Number(slice.percentage)}%)`,
                      color: typeof slice.color === "string" ? slice.color : undefined,
                    },
                  ]}
                />
              );
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            stroke="var(--card)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={!reducedMotion}
            animationDuration={300}
          />
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{formatNumber(total)}</span>
        <span className="text-xs font-medium text-muted-foreground">{totalLabel}</span>
      </div>
    </div>
  );
});

export default DonutChart;
