"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { invalidateAfterDoctorChange } from "@/lib/cache-invalidation";
import { doctorKeys } from "@/lib/query-keys";
import { doctorApi } from "@/services/doctor-api";
import type { Doctor, DoctorInput } from "@/types/models";

/**
 * Mutations own their cache effects and success toasts; the calling form owns error
 * presentation (field errors need the form). Invalidation is not awaited, so the dialog
 * closes immediately and lists refresh in the background.
 */

export function useCreateDoctor() {
  const queryClient = useQueryClient();
  return useMutation<Doctor, unknown, DoctorInput>({
    mutationFn: (input) => doctorApi.create(input),
    onSuccess: (doctor) => {
      queryClient.setQueryData(doctorKeys.detail(doctor.id), doctor);
      void invalidateAfterDoctorChange(queryClient);
      toast.success("Doctor added", { description: doctor.name });
    },
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();
  return useMutation<Doctor, unknown, { id: string; input: DoctorInput }>({
    mutationFn: ({ id, input }) => doctorApi.update(id, input),
    onSuccess: (doctor) => {
      queryClient.setQueryData(doctorKeys.detail(doctor.id), doctor);
      void invalidateAfterDoctorChange(queryClient, { doctorId: doctor.id, embeddedFieldsChanged: true });
      toast.success("Doctor updated", { description: doctor.name });
    },
  });
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, { id: string; name: string }>({
    mutationFn: ({ id }) => doctorApi.remove(id),
    onSuccess: (_data, { id, name }) => {
      queryClient.removeQueries({ queryKey: doctorKeys.detail(id) });
      void invalidateAfterDoctorChange(queryClient);
      toast.success("Doctor deleted", { description: name });
    },
  });
}
