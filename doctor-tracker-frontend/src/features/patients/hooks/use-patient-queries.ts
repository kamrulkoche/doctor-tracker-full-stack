"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { STALE_TIME } from "@/lib/query-client";
import { patientKeys } from "@/lib/query-keys";
import { patientApi } from "@/services/patient-api";
import type { PatientListQuery } from "@/types/models";

/** Paginated patients. The previous page stays on screen while the next one loads. */
export function usePatients(query: PatientListQuery) {
  return useQuery({
    queryKey: patientKeys.list(query),
    queryFn: ({ signal }) => patientApi.list(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id ?? ""),
    queryFn: ({ signal }) => patientApi.get(id ?? "", signal),
    enabled: Boolean(id),
  });
}

/** Distinct conditions for the filter and for form suggestions. */
export function usePatientFilters() {
  return useQuery({
    queryKey: patientKeys.filters(),
    queryFn: ({ signal }) => patientApi.filters(signal),
    staleTime: STALE_TIME.reference,
  });
}
