import type { RankedQuery, TimeSeriesQuery } from "@/services/dashboard-api";
import type { DoctorListQuery, DoctorPatientListQuery, PatientListQuery } from "@/types/models";

/**
 * Central query-key factory. Keys are hierarchical so a mutation can invalidate
 * exactly the slice it affected (e.g. `doctorKeys.detail(id)` also covers that
 * doctor's patient pages, because they are nested under it).
 */
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export const doctorKeys = {
  all: ["doctors"] as const,
  lists: () => [...doctorKeys.all, "list"] as const,
  list: (query: DoctorListQuery) => [...doctorKeys.lists(), query] as const,
  filters: () => [...doctorKeys.all, "filters"] as const,
  options: () => [...doctorKeys.all, "options"] as const,
  option: (search: string) => [...doctorKeys.options(), search] as const,
  details: () => [...doctorKeys.all, "detail"] as const,
  detail: (id: string) => [...doctorKeys.details(), id] as const,
  patients: (id: string) => [...doctorKeys.detail(id), "patients"] as const,
  patientList: (id: string, query: DoctorPatientListQuery) => [...doctorKeys.patients(id), query] as const,
};

export const patientKeys = {
  all: ["patients"] as const,
  lists: () => [...patientKeys.all, "list"] as const,
  list: (query: PatientListQuery) => [...patientKeys.lists(), query] as const,
  filters: () => [...patientKeys.all, "filters"] as const,
  details: () => [...patientKeys.all, "detail"] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
  patientGrowth: (query: TimeSeriesQuery) => [...dashboardKeys.all, "patient-growth", query] as const,
  patientsPerDoctor: (query: RankedQuery) => [...dashboardKeys.all, "patients-per-doctor", query] as const,
  conditionDistribution: (query: RankedQuery) =>
    [...dashboardKeys.all, "condition-distribution", query] as const,
  doctorStatistics: (query: TimeSeriesQuery) => [...dashboardKeys.all, "doctor-statistics", query] as const,
  recentActivity: (limit: number) => [...dashboardKeys.all, "recent-activity", limit] as const,
};
