"use client";

import dynamic from "next/dynamic";

import { ChartSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts is the heaviest dependency in the app and only the dashboard needs it, so every
 * chart is its own lazily loaded chunk with a skeleton of the same height. `ssr: false`
 * because the charts measure their container in the browser.
 */

export const LazyTimeSeriesAreaChart = dynamic(() => import("@/components/charts/time-series-area-chart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export const LazyTimeSeriesBarChart = dynamic(() => import("@/components/charts/time-series-bar-chart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export const LazyHorizontalBarChart = dynamic(() => import("@/components/charts/horizontal-bar-chart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export const LazyDonutChart = dynamic(() => import("@/components/charts/donut-chart"), {
  ssr: false,
  loading: () => <Skeleton className="mx-auto size-[240px] rounded-full" />,
});
