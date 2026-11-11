"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query-client";
import { dashboardKeys } from "@/lib/query-keys";
import { dashboardApi, type RankedQuery, type TimeSeriesQuery } from "@/services/dashboard-api";

/**
 * One hook per endpoint, so every widget loads, fails and retries on its own.
 * Range-driven queries keep the previous data on screen while the new range loads.
 */

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: ({ signal }) => dashboardApi.stats(signal),
    staleTime: STALE_TIME.dashboard,
  });
}

export function usePatientGrowth(query: TimeSeriesQuery) {
  return useQuery({
    queryKey: dashboardKeys.patientGrowth(query),
    queryFn: ({ signal }) => dashboardApi.patientGrowth(query, signal),
    staleTime: STALE_TIME.dashboard,
    placeholderData: keepPreviousData,
  });
}

export function usePatientsPerDoctor(query: RankedQuery) {
  return useQuery({
    queryKey: dashboardKeys.patientsPerDoctor(query),
    queryFn: ({ signal }) => dashboardApi.patientsPerDoctor(query, signal),
    staleTime: STALE_TIME.dashboard,
    placeholderData: keepPreviousData,
  });
}

export function useConditionDistribution(query: RankedQuery) {
  return useQuery({
    queryKey: dashboardKeys.conditionDistribution(query),
    queryFn: ({ signal }) => dashboardApi.conditionDistribution(query, signal),
    staleTime: STALE_TIME.dashboard,
    placeholderData: keepPreviousData,
  });
}

/** Shared by "Doctors added over time" and "Specialization distribution" (one request, two widgets). */
export function useDoctorStatistics(query: TimeSeriesQuery) {
  return useQuery({
    queryKey: dashboardKeys.doctorStatistics(query),
    queryFn: ({ signal }) => dashboardApi.doctorStatistics(query, signal),
    staleTime: STALE_TIME.dashboard,
    placeholderData: keepPreviousData,
  });
}

/** Shared by "Recent doctors", "Recent patients" and "Top doctors" (one request, three widgets). */
export function useRecentActivity(limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(limit),
    queryFn: ({ signal }) => dashboardApi.recentActivity({ limit }, signal),
    staleTime: STALE_TIME.dashboard,
  });
}
