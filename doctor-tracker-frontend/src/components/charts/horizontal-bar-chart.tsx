"use client";

import { memo, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS_TICK, ChartDataTable, ChartTooltipBox, isRecord } from "@/components/charts/chart-primitives";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { formatNumber } from "@/lib/format";

export type BarDatum = {
  id: string;
  label: string;
  value: number;
  /** Second tooltip line, e.g. the specialization. */
  detail?: string;
};

export type HorizontalBarChartProps = {
  data: readonly BarDatum[];
  /** Name of the measure, e.g. "Patients". */
  valueLabel: string;
  /** Header for the category column in the text alternative. */
  categoryLabel: string;
  ariaLabel: string;
  /** Makes bars clickable (drill-down to a filtered list). */
  onSelect?: (datum: BarDatum) => void;
};

const CONFIG = { value: { label: "Value", color: "var(--chart-1)" } } satisfies ChartConfig;
const ROW_HEIGHT = 34;

function truncateLabel(label: string, max = 16): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

/**
 * Ranked horizontal bars. Categories are named on the axis, so every bar uses the same
 * colour (no rainbow) and the value is printed at the bar end.
 */
export const HorizontalBarChart = memo(function HorizontalBarChart({
  data,
  valueLabel,
  categoryLabel,
  ariaLabel,
  onSelect,
}: HorizontalBarChartProps) {
  const reducedMotion = usePrefersReducedMotion();
  const rows = useMemo(() => data.map((datum) => ({ ...datum })), [data]);
  const height = Math.max(rows.length * ROW_HEIGHT + 16, 120);

  return (
    <div role="img" aria-label={ariaLabel}>
      <ChartContainer config={CONFIG} className="aspect-auto w-full" style={{ height }}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
          accessibilityLayer={false}
        >
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            width={124}
            interval={0}
            tick={AXIS_TICK}
            tickFormatter={(value: string) => truncateLabel(value)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
            content={({ active, payload }) => {
              const datum = active ? payload?.[0]?.payload : undefined;
              if (!isRecord(datum) || typeof datum.label !== "string") return null;
              return (
                <ChartTooltipBox
                  title={
                    <>
                      {datum.label}
                      {typeof datum.detail === "string" ? (
                        <span className="block font-normal text-muted-foreground">{datum.detail}</span>
                      ) : null}
                    </>
                  }
                  rows={[{ name: valueLabel, value: formatNumber(Number(datum.value)) }]}
                />
              );
            }}
          />
          <Bar
            dataKey="value"
            name={valueLabel}
            fill="var(--chart-1)"
            radius={[0, 4, 4, 0]}
            barSize={16}
            cursor={onSelect ? "pointer" : undefined}
            isAnimationActive={!reducedMotion}
            animationDuration={300}
            onClick={(_entry, index) => {
              const datum = data[index];
              if (datum) onSelect?.(datum);
            }}
          >
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              className="fill-foreground"
              fontSize={12}
              formatter={(value: unknown) => formatNumber(Number(value))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <ChartDataTable
        caption={ariaLabel}
        headers={[categoryLabel, valueLabel]}
        rows={data.map((datum) => [datum.label, datum.value])}
      />
    </div>
  );
});

export default HorizontalBarChart;
