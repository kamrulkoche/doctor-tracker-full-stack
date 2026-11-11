"use client";

import { memo, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_TICK, ChartDataTable, ChartTooltipBox, isRecord } from "@/components/charts/chart-primitives";
import type { TimeSeriesChartProps } from "@/components/charts/time-series-area-chart";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { formatBucket, formatDate, formatNumber } from "@/lib/format";

const CONFIG = { count: { label: "Count", color: "var(--chart-1)" } } satisfies ChartConfig;

/** Single-colour vertical bars for counts per period (doctors added over time). */
export const TimeSeriesBarChart = memo(function TimeSeriesBarChart({
  points,
  interval,
  seriesLabel,
  ariaLabel,
}: TimeSeriesChartProps) {
  const reducedMotion = usePrefersReducedMotion();
  const data = useMemo(() => points.map((point) => ({ ...point })), [points]);
  const title = (date: string) =>
    interval === "month"
      ? formatBucket(date, "month")
      : `${interval === "week" ? "Week of " : ""}${formatDate(date)}`;

  return (
    <div role="img" aria-label={ariaLabel}>
      <ChartContainer config={CONFIG} className="aspect-auto h-[220px] w-full md:h-[280px]">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer={false}>
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
            cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              const point = active ? payload?.[0]?.payload : undefined;
              if (!isRecord(point) || typeof point.date !== "string") return null;
              return (
                <ChartTooltipBox
                  title={title(point.date)}
                  rows={[{ name: seriesLabel, value: formatNumber(Number(point.count)) }]}
                />
              );
            }}
          />
          <Bar
            dataKey="count"
            name={seriesLabel}
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
            isAnimationActive={!reducedMotion}
            animationDuration={300}
          />
        </BarChart>
      </ChartContainer>
      <ChartDataTable
        caption={ariaLabel}
        headers={["Period", seriesLabel]}
        rows={points.map((point) => [title(point.date), point.count])}
      />
    </div>
  );
});

export default TimeSeriesBarChart;
