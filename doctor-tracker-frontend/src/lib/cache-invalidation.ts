import type { QueryClient } from "@tanstack/react-query";

import { dashboardKeys, doctorKeys, patientKeys } from "@/lib/query-keys";

/**
 * Targeted invalidation after mutations. Only the slices a change can actually affect
 * are marked stale; active queries refetch in the background, inactive ones on next use.
 */

/** A doctor was created, edited or deleted. */
export function invalidateAfterDoctorChange(
  queryClient: QueryClient,
  options: { doctorId?: string; embeddedFieldsChanged?: boolean } = {},
): Promise<void[]> {
  const tasks: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: doctorKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: doctorKeys.filters() }),
    queryClient.invalidateQueries({ queryKey: doctorKeys.options() }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  ];
  if (options.doctorId) {
    tasks.push(queryClient.invalidateQueries({ queryKey: doctorKeys.detail(options.doctorId) }));
  }
  if (options.embeddedFieldsChanged) {
    // Patients embed their doctor's name / specialization / hospital.
    tasks.push(queryClient.invalidateQueries({ queryKey: patientKeys.lists() }));
    tasks.push(queryClient.invalidateQueries({ queryKey: patientKeys.details() }));
  }
  return Promise.all(tasks);
}

/**
 * A patient was created, edited, reassigned or deleted. `doctorIds` are the doctors whose
 * `patientCount` and patient list changed (both the old and the new one on reassignment).
 */
export function invalidateAfterPatientChange(
  queryClient: QueryClient,
  doctorIds: readonly (string | undefined)[],
): Promise<void[]> {
  const affected = Array.from(new Set(doctorIds.filter((id): id is string => Boolean(id))));
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: patientKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: patientKeys.filters() }),
    queryClient.invalidateQueries({ queryKey: doctorKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    // `detail(id)` is the parent key of that doctor's patient pages, so both go stale together.
    ...affected.map((id) => queryClient.invalidateQueries({ queryKey: doctorKeys.detail(id) })),
  ]);
}
