"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query-client";
import { doctorKeys } from "@/lib/query-keys";
import { doctorApi } from "@/services/doctor-api";
import type { DoctorListQuery, DoctorPatientListQuery } from "@/types/models";

/** Paginated doctors. The previous page stays on screen while the next one loads. */
export function useDoctors(query: DoctorListQuery) {
  return useQuery({
    queryKey: doctorKeys.list(query),
    queryFn: ({ signal }) => doctorApi.list(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useDoctor(id: string | undefined) {
  return useQuery({
    queryKey: doctorKeys.detail(id ?? ""),
    queryFn: ({ signal }) => doctorApi.get(id ?? "", signal),
    enabled: Boolean(id),
  });
}

/** Distinct specializations and hospitals for filters and form suggestions. */
export function useDoctorFilters() {
  return useQuery({
    queryKey: doctorKeys.filters(),
    queryFn: ({ signal }) => doctorApi.filters(signal),
    staleTime: STALE_TIME.reference,
  });
}

/** Options for the "assigned doctor" combobox; `search` should already be debounced. */
export function useDoctorOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: doctorKeys.option(search),
    queryFn: ({ signal }) => doctorApi.options({ search: search || undefined, limit: 20 }, signal),
    enabled,
    staleTime: STALE_TIME.reference,
    placeholderData: keepPreviousData,
  });
}

export function useDoctorPatients(id: string, query: DoctorPatientListQuery, enabled = true) {
  return useQuery({
    queryKey: doctorKeys.patientList(id, query),
    queryFn: ({ signal }) => doctorApi.patients(id, query, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}
