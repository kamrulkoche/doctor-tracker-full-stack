"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { patientToInput } from "@/features/patients/schemas";
import { invalidateAfterPatientChange } from "@/lib/cache-invalidation";
import { patientKeys } from "@/lib/query-keys";
import { doctorApi } from "@/services/doctor-api";
import { patientApi } from "@/services/patient-api";
import type { DoctorOption, Patient, PatientInput } from "@/types/models";

type CreatePatientVariables = {
  input: PatientInput;
  /**
   * True when adding from a doctor's page: uses `POST /doctors/:id/patients`,
   * where the doctor comes from the path and `doctorId` is not part of the body.
   */
  underDoctor?: boolean;
};

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation<Patient, unknown, CreatePatientVariables>({
    mutationFn: ({ input, underDoctor }) => {
      if (!underDoctor) return patientApi.create(input);
      const { doctorId, ...body } = input;
      return doctorApi.addPatient(doctorId, body);
    },
    onSuccess: (patient) => {
      queryClient.setQueryData(patientKeys.detail(patient.id), patient);
      void invalidateAfterPatientChange(queryClient, [patient.doctor.id]);
      toast.success("Patient added", { description: `${patient.name} · ${patient.doctor.name}` });
    },
  });
}

type UpdatePatientVariables = {
  id: string;
  input: PatientInput;
  /** The doctor before the edit, so their count is refreshed if the patient moved. */
  previousDoctorId: string;
};

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation<Patient, unknown, UpdatePatientVariables>({
    mutationFn: ({ id, input }) => patientApi.update(id, input),
    onSuccess: (patient, { previousDoctorId }) => {
      queryClient.setQueryData(patientKeys.detail(patient.id), patient);
      void invalidateAfterPatientChange(queryClient, [previousDoctorId, patient.doctor.id]);
      toast.success("Patient updated", { description: patient.name });
    },
  });
}

type ReassignPatientVariables = {
  patient: Patient;
  doctor: Pick<DoctorOption, "id" | "name">;
};

/** Changes only the assigned doctor (PUT is a full replace, so the other fields are sent back as-is). */
export function useReassignPatient() {
  const queryClient = useQueryClient();
  return useMutation<Patient, unknown, ReassignPatientVariables>({
    mutationFn: ({ patient, doctor }) => patientApi.update(patient.id, patientToInput(patient, doctor.id)),
    onSuccess: (updated, { patient }) => {
      queryClient.setQueryData(patientKeys.detail(updated.id), updated);
      void invalidateAfterPatientChange(queryClient, [patient.doctor.id, updated.doctor.id]);
      toast.success("Patient reassigned", {
        description: `${updated.name} is now with ${updated.doctor.name}`,
      });
    },
  });
}

type DeletePatientVariables = {
  id: string;
  name: string;
  doctorId: string;
};

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, DeletePatientVariables>({
    mutationFn: ({ id }) => patientApi.remove(id),
    onSuccess: (_data, { id, name, doctorId }) => {
      queryClient.removeQueries({ queryKey: patientKeys.detail(id) });
      void invalidateAfterPatientChange(queryClient, [doctorId]);
      toast.success("Patient deleted", { description: name });
    },
  });
}
