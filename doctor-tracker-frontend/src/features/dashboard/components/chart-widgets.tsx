"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo } from "react";

import { CHART_COLORS, CHART_OTHER_COLOR } from "@/components/charts/chart-primitives";
import type { DonutSlice } from "@/components/charts/donut-chart";
import type { BarDatum } from "@/components/charts/horizontal-bar-chart";
import {
  LazyDonutChart,
  LazyHorizontalBarChart,
  LazyTimeSeriesAreaChart,
  LazyTimeSeriesBarChart,
} from "@/components/charts/lazy";
import { WidgetCard, WidgetState } from "@/components/charts/widget-card";
import { ChartSkeleton, ListRowsSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { INTERVAL_OPTIONS, ROUTES } from "@/constants/app";
import {
  useConditionDistribution,
  useDoctorStatistics,
  usePatientGrowth,
  usePatientsPerDoctor,
} from "@/features/dashboard/hooks/use-dashboard";
import { formatDateRange, formatNumber, pluralize } from "@/lib/format";
import type { DateRange } from "@/types/api";
import type { TimeInterval, TimeSeries } from "@/types/models";

const OTHER_BUCKET = "Other";
const BAR_LIMIT = 8;
const DONUT_LIMIT = 5;

/** The period a time series actually covers, as reported by the API (not what was requested). */
function coveredPeriod(series: TimeSeries | undefined, fallback: string): string {
  if (!series) return fallback;
  return formatDateRange(series.from.slice(0, 10), series.to.slice(0, 10), fallback);
}

/* --------------------------------------------------------- patient growth -- */

type PatientGrowthCardProps = {
  range: DateRange;
  rangeLabel: string;
  interval: TimeInterval;
  /** Intervals that keep the series under the API bucket cap for this range. */
  allowedIntervals: readonly TimeInterval[];
  onIntervalChange: (interval: TimeInterval) => void;
  className?: string;
};

export const PatientGrowthCard = memo(function PatientGrowthCard({
  range,
  rangeLabel,
  interval,
  allowedIntervals,
  onIntervalChange,
  className,
}: PatientGrowthCardProps) {
  const query = useMemo(
    () => ({ interval, from: range.from, to: range.to }),
    [interval, range.from, range.to],
  );
  const growth = usePatientGrowth(query);
  const series = growth.data;
  const period = coveredPeriod(series, rangeLabel);

  return (
    <WidgetCard
      title="Patient growth"
      subtitle={series ? `${pluralize(series.total, "new patient")} · ${period}` : rangeLabel}
      className={className}
      action={
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          spacing={0}
          value={interval}
          onValueChange={(value) => {
            // Radix sends "" when the active item is pressed again; an interval is always required.
            if (value === "day" || value === "week" || value === "month") onIntervalChange(value);
          }}
          aria-label="Group patient growth by"
        >
          {INTERVAL_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              disabled={!allowedIntervals.includes(option.value)}
              title={allowedIntervals.includes(option.value) ? undefined : "Range too long for this grouping"}
              className="h-10 px-3 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground md:h-8"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
    >
      <WidgetState
        isPending={growth.isPending}
        isError={growth.isError}
        error={growth.error}
        onRetry={() => void growth.refetch()}
        isRetrying={growth.isRefetching}
        isRefreshing={growth.isPlaceholderData}
        isEmpty={!series || series.total === 0}
        skeleton={<ChartSkeleton />}
        errorTitle="Couldn't load patient growth"
        emptyDescription="No patients were added in this period. Try a wider date range."
      >
        {series ? (
          <LazyTimeSeriesAreaChart
            points={series.points}
            interval={series.interval}
            seriesLabel="New patients"
            ariaLabel={`Patient growth by ${series.interval}, ${period}: ${pluralize(series.total, "new patient")}`}
          />
        ) : null}
      </WidgetState>
    </WidgetCard>
  );
});

/* -------------------------------------------------- condition distribution -- */

type RangeCardProps = {
  range: DateRange;
  rangeLabel: string;
  className?: string;
};

export const ConditionDistributionCard = memo(function ConditionDistributionCard({
  range,
  rangeLabel,
  className,
}: RangeCardProps) {
  const query = useMemo(
    () => ({ limit: DONUT_LIMIT, from: range.from, to: range.to }),
    [range.from, range.to],
  );
  const distribution = useConditionDistribution(query);
  const data = distribution.data;

  const slices = useMemo<DonutSlice[]>(() => {
    if (!data) return [];
    let colorIndex = 0;
    return data.items.map((item) => ({
      name: item.condition,
      value: item.count,
      percentage: item.percentage,
      color:
        item.condition === OTHER_BUCKET
          ? CHART_OTHER_COLOR
          : (CHART_COLORS[colorIndex++ % CHART_COLORS.length] ?? CHART_OTHER_COLOR),
    }));
  }, [data]);

  // When "Other" dominates, a donut hides the detail: fall back to single-colour bars.
  const otherShare = data?.items.find((item) => item.condition === OTHER_BUCKET)?.percentage ?? 0;
  const useBars = otherShare > 40;
  const bars = useMemo<BarDatum[]>(
    () => slices.map((slice) => ({ id: slice.name, label: slice.name, value: slice.value })),
    [slices],
  );
  const summary = `Patients by condition, ${rangeLabel.toLowerCase()}: ${slices
    .map((slice) => `${slice.name} ${slice.value}`)
    .join(", ")}`;

  return (
    <WidgetCard
      title="Condition distribution"
      subtitle={`Top conditions · ${rangeLabel}`}
      className={className}
    >
      <WidgetState
        isPending={distribution.isPending}
        isError={distribution.isError}
        error={distribution.error}
        onRetry={() => void distribution.refetch()}
        isRetrying={distribution.isRefetching}
        isRefreshing={distribution.isPlaceholderData}
        isEmpty={!data || data.total === 0}
        skeleton={
          <div className="grid gap-4">
            <Skeleton className="mx-auto size-[240px] rounded-full" />
            <ListRowsSkeleton rows={3} />
          </div>
        }
        errorTitle="Couldn't load conditions"
        emptyDescription="No patients were added in this period."
      >
        {data ? (
          <div className="grid gap-4">
            {useBars ? (
              <LazyHorizontalBarChart
                data={bars}
                valueLabel="Patients"
                categoryLabel="Condition"
                ariaLabel={summary}
              />
            ) : (
              <LazyDonutChart slices={slices} total={data.total} totalLabel="patients" ariaLabel={summary} />
            )}
            <ul aria-label="Conditions" className="grid gap-1.5 text-xs">
              {slices.map((slice) => (
                <li key={slice.name} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: useBars ? CHART_COLORS[0] : slice.color }}
                  />
                  {slice.name === OTHER_BUCKET ? (
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">Other conditions</span>
                  ) : (
                    <Link
                      href={`${ROUTES.patients}?condition=${encodeURIComponent(slice.name)}`}
                      title={`Show patients with ${slice.name}`}
                      className="min-w-0 flex-1 truncate py-1 text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      {slice.name}
                    </Link>
                  )}
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {formatNumber(slice.value)} · {slice.percentage}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </WidgetState>
    </WidgetCard>
  );
});

/* ------------------------------------------------------ patients per doctor -- */

export const PatientsPerDoctorCard = memo(function PatientsPerDoctorCard({
  range,
  rangeLabel,
  className,
}: RangeCardProps) {
  const router = useRouter();
  const query = useMemo(() => ({ limit: BAR_LIMIT, from: range.from, to: range.to }), [range.from, range.to]);
  const perDoctor = usePatientsPerDoctor(query);

  const bars = useMemo<BarDatum[]>(
    () =>
      (perDoctor.data ?? [])
        .filter((item) => item.patientCount > 0)
        .map((item) => ({
          id: item.doctorId,
          label: item.name,
          value: item.patientCount,
          detail: `${item.specialization} · ${item.hospital}`,
        })),
    [perDoctor.data],
  );

  const openDoctorPatients = useCallback(
    (datum: BarDatum) => router.push(`${ROUTES.patients}?doctorId=${datum.id}`),
    [router],
  );

  return (
    <WidgetCard
      title="Patients per doctor"
      subtitle={`Top ${BAR_LIMIT} by patients added · ${rangeLabel}`}
      className={className}
      action={
        <Link
          href={ROUTES.doctors}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          View all
        </Link>
      }
    >
      <WidgetState
        isPending={perDoctor.isPending}
        isError={perDoctor.isError}
        error={perDoctor.error}
        onRetry={() => void perDoctor.refetch()}
        isRetrying={perDoctor.isRefetching}
        isRefreshing={perDoctor.isPlaceholderData}
        isEmpty={bars.length === 0}
        skeleton={<ChartSkeleton />}
        errorTitle="Couldn't load patients per doctor"
        emptyDescription="No patients were assigned in this period."
      >
        <LazyHorizontalBarChart
          data={bars}
          valueLabel="Patients"
          categoryLabel="Doctor"
          ariaLabel={`Patients per doctor, ${rangeLabel.toLowerCase()}: ${bars
            .map((bar) => `${bar.label} ${bar.value}`)
            .join(", ")}`}
          onSelect={openDoctorPatients}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Select a bar to open that doctor&apos;s patients.
        </p>
      </WidgetState>
    </WidgetCard>
  );
});

/* ------------------------------------------------- doctors added over time -- */

type DoctorStatsCardProps = RangeCardProps & { interval: TimeInterval };

export const DoctorsOverTimeCard = memo(function DoctorsOverTimeCard({
  range,
  rangeLabel,
  interval,
  className,
}: DoctorStatsCardProps) {
  const query = useMemo(
    () => ({ interval, from: range.from, to: range.to }),
    [interval, range.from, range.to],
  );
  const statistics = useDoctorStatistics(query);
  const series = statistics.data?.doctorsOverTime;
  const period = coveredPeriod(series, rangeLabel);

  return (
    <WidgetCard
      title="Doctors added over time"
      subtitle={series ? `${pluralize(series.total, "doctor")} added · ${period}` : rangeLabel}
      className={className}
    >
      <WidgetState
        isPending={statistics.isPending}
        isError={statistics.isError}
        error={statistics.error}
        onRetry={() => void statistics.refetch()}
        isRetrying={statistics.isRefetching}
        isRefreshing={statistics.isPlaceholderData}
        isEmpty={!series || series.total === 0}
        skeleton={<ChartSkeleton />}
        errorTitle="Couldn't load doctor statistics"
        emptyDescription="No doctors were added in this period."
      >
        {series ? (
          <LazyTimeSeriesBarChart
            points={series.points}
            interval={series.interval}
            seriesLabel="Doctors added"
            ariaLabel={`Doctors added by ${series.interval}, ${period}: ${pluralize(series.total, "doctor")}`}
          />
        ) : null}
      </WidgetState>
    </WidgetCard>
  );
});

/* ------------------------------------------- specialization distribution -- */

export const SpecializationDistributionCard = memo(function SpecializationDistributionCard({
  range,
  rangeLabel,
  interval,
  className,
}: DoctorStatsCardProps) {
  const router = useRouter();
  // Same query object shape as DoctorsOverTimeCard -> same cache entry, one request.
  const query = useMemo(
    () => ({ interval, from: range.from, to: range.to }),
    [interval, range.from, range.to],
  );
  const statistics = useDoctorStatistics(query);
  const items = statistics.data?.specializationDistribution;

  const bars = useMemo<BarDatum[]>(
    () =>
      (items ?? []).slice(0, BAR_LIMIT).map((item) => ({
        id: item.specialization,
        label: item.specialization,
        value: item.doctorCount,
        detail: pluralize(item.patientCount, "patient"),
      })),
    [items],
  );
  const hidden = Math.max((items?.length ?? 0) - BAR_LIMIT, 0);

  const openSpecialization = useCallback(
    (datum: BarDatum) => router.push(`${ROUTES.doctors}?specialization=${encodeURIComponent(datum.id)}`),
    [router],
  );

  return (
    <WidgetCard
      title="Specialization distribution"
      subtitle={`Doctors per specialization · ${rangeLabel}`}
      className={className}
    >
      <WidgetState
        isPending={statistics.isPending}
        isError={statistics.isError}
        error={statistics.error}
        onRetry={() => void statistics.refetch()}
        isRetrying={statistics.isRefetching}
        isRefreshing={statistics.isPlaceholderData}
        isEmpty={bars.length === 0}
        skeleton={<ChartSkeleton />}
        errorTitle="Couldn't load specializations"
        emptyDescription="No doctors were added in this period."
      >
        <LazyHorizontalBarChart
          data={bars}
          valueLabel="Doctors"
          categoryLabel="Specialization"
          ariaLabel={`Doctors per specialization, ${rangeLabel.toLowerCase()}: ${bars
            .map((bar) => `${bar.label} ${bar.value}`)
            .join(", ")}`}
          onSelect={openSpecialization}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {hidden > 0
            ? `Top ${BAR_LIMIT} shown, ${pluralize(hidden, "more specialization")} not listed. `
            : ""}
          Select a bar to filter the doctors list.
        </p>
      </WidgetState>
    </WidgetCard>
  );
});
