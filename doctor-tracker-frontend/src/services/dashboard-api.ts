import { compactQuery } from "@/lib/url-filters";
import { getData } from "@/services/api-client";
import type { DateRange } from "@/types/api";
import type {
  ConditionDistribution,
  DashboardStats,
  DoctorPatientCount,
  DoctorStatistics,
  RecentActivity,
  TimeInterval,
  TimeSeries,
} from "@/types/models";

export type TimeSeriesQuery = DateRange & { interval: TimeInterval };
export type RankedQuery = DateRange & { limit?: number };

export const dashboardApi = {
  stats(signal?: AbortSignal): Promise<DashboardStats> {
    return getData<DashboardStats>("/dashboard/stats", { signal });
  },

  patientGrowth(query: TimeSeriesQuery, signal?: AbortSignal): Promise<TimeSeries> {
    return getData<TimeSeries>("/dashboard/patient-growth", { params: compactQuery(query), signal });
  },

  patientsPerDoctor(query: RankedQuery, signal?: AbortSignal): Promise<DoctorPatientCount[]> {
    return getData<DoctorPatientCount[]>("/dashboard/patients-per-doctor", {
      params: compactQuery(query),
      signal,
    });
  },

  conditionDistribution(query: RankedQuery, signal?: AbortSignal): Promise<ConditionDistribution> {
    return getData<ConditionDistribution>("/dashboard/condition-distribution", {
      params: compactQuery(query),
      signal,
    });
  },

  doctorStatistics(query: TimeSeriesQuery, signal?: AbortSignal): Promise<DoctorStatistics> {
    return getData<DoctorStatistics>("/dashboard/doctor-statistics", { params: compactQuery(query), signal });
  },

  recentActivity(query: { limit?: number }, signal?: AbortSignal): Promise<RecentActivity> {
    return getData<RecentActivity>("/dashboard/recent-activity", { params: compactQuery(query), signal });
  },
};
