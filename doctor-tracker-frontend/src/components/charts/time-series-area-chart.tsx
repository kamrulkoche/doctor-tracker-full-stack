"use client";

import { memo, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_TICK, ChartDataTable, ChartTooltipBox, isRecord } from "@/components/charts/chart-primitives";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { formatBucket, formatDate, formatNumber } from "@/lib/format";
import type { TimeInterval, TimeSeriesPoint } from "@/types/models";

export type TimeSeriesChartProps = {
  points: readonly TimeSeriesPoint[];
  interval: TimeInterval;
  /** Name of the series, e.g. "New patients". */
  seriesLabel: string;
  /** One-sentence summary used as the accessible name. */
  ariaLabel: string;
};

const CONFIG = { count: { label: "Count", color: "var(--chart-1)" } } satisfies ChartConfig;

const BUCKET_PREFIX: Record<TimeInterval, string> = { day: "", week: "Week of ", month: "" };

function bucketTitle(date: string, interval: TimeInterval): string {
  if (interval === "month") return formatBucket(date, "month");
  return `${BUCKET_PREFIX[interval]}${formatDate(date)}`;
}

/** Single-series area chart for counts per day/week/month. */
export const TimeSeriesAreaChart = memo(function TimeSeriesAreaChart({
  points,
  interval,
  seriesLabel,
  ariaLabel,
}: TimeSeriesChartProps) {
  const reducedMotion = usePrefersReducedMotion();
  const data = useMemo(() => points.map((point) => ({ ...point })), [points]);

  return (
    <div role="img" aria-label={ariaLabel}>
      <ChartContainer config={CONFIG} className="aspect-auto h-[220px] w-full md:h-[280px] lg:h-[380px]">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            minTickGap={24}
            tick={AXIS_TICK}
            tickFormatter={(value: string) => formatBucket(value, interval)}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            width={32}
            allowDecimals={false}
            tick={AXIS_TICK}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload }) => {
              const point = active ? payload?.[0]?.payload : undefined;
              if (!isRecord(point) || typeof point.date !== "string") return null;
              return (
                <ChartTooltipBox
                  title={bucketTitle(point.date, interval)}
                  rows={[
                    { name: seriesLabel, value: formatNumber(Number(point.count)) },
                    {
                      name: "Running total",
                      value: formatNumber(Number(point.cumulative)),
                      color: "var(--chart-other)",
                    },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name={seriesLabel}
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="var(--chart-1)"
            fillOpacity={0.12}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={!reducedMotion}
            animationDuration={300}
          />
        </AreaChart>
      </ChartContainer>
      <ChartDataTable
        caption={ariaLabel}
        headers={["Period", seriesLabel, "Running total"]}
        rows={points.map((point) => [bucketTitle(point.date, interval), point.count, point.cumulative])}
      />
    </div>
  );
});

export default TimeSeriesAreaChart;
