"use client";

import { Layers, Stethoscope, UserPlus, Users } from "lucide-react";
import { memo } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingRegion } from "@/components/shared/loading-skeleton";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
import { useDashboardStats } from "@/features/dashboard/hooks/use-dashboard";
import { getErrorMessage } from "@/lib/api-error";
import { formatNumber, getDelta } from "@/lib/format";

const GRID = "grid grid-cols-2 gap-4 lg:grid-cols-4";

/** Headline numbers. Always global: `GET /dashboard/stats` ignores the date range. */
export const StatsGrid = memo(function StatsGrid() {
  const { data, isPending, isError, error, refetch, isRefetching } = useDashboardStats();

  if (isPending) {
    return (
      <LoadingRegion label="Loading statistics" className={GRID}>
        {Array.from({ length: 4 }, (_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </LoadingRegion>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border bg-card">
        <ErrorState
          title="Couldn't load statistics"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
          className="py-8"
        />
      </div>
    );
  }

  return (
    <section aria-label="Key statistics" className={GRID}>
      <StatCard
        label="Total doctors"
        value={formatNumber(data.totalDoctors)}
        icon={Stethoscope}
        context={`${formatNumber(data.newDoctorsThisMonth)} added this month`}
      />
      <StatCard
        label="Total patients"
        value={formatNumber(data.totalPatients)}
        icon={Users}
        context={`${formatNumber(data.averagePatientsPerDoctor)} per doctor on average`}
      />
      <StatCard
        label="Total specializations"
        value={formatNumber(data.totalSpecializations)}
        icon={Layers}
        context="Distinct across all doctors"
      />
      <StatCard
        label="New patients this month"
        value={formatNumber(data.newPatientsThisMonth)}
        icon={UserPlus}
        delta={getDelta(data.newPatientsThisMonth, data.newPatientsLastMonth)}
        context={`vs ${formatNumber(data.newPatientsLastMonth)} last month`}
      />
    </section>
  );
});
