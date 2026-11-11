"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FormField } from "@/components/forms/form-field";
import { FormDialog } from "@/components/shared/form-dialog";
import { OBJECT_ID_PATTERN } from "@/constants/app";
import { DoctorCombobox, type DoctorChoice } from "@/features/doctors/components/doctor-combobox";
import { useReassignPatient } from "@/features/patients/hooks/use-patient-mutations";
import { applyServerErrors } from "@/lib/form-errors";
import type { Patient } from "@/types/models";

type ReassignValues = { doctorId: string };

type ReassignDoctorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
};

/** Focused "Change assigned doctor" dialog: one required field, nothing else to get wrong. */
export function ReassignDoctorDialog({ open, onOpenChange, patient }: ReassignDoctorDialogProps) {
  const reassign = useReassignPatient();
  const [formError, setFormError] = useState<string | null>(null);
  const [pickedDoctor, setPickedDoctor] = useState<DoctorChoice | null>(null);
  const currentDoctorId = patient?.doctor.id;

  const schema = useMemo(
    () =>
      z.object({
        doctorId: z
          .string()
          .regex(OBJECT_ID_PATTERN, "Select the new doctor")
          .refine((value) => value !== currentDoctorId, "Choose a different doctor to reassign"),
      }),
    [currentDoctorId],
  );

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ReassignValues>({
    resolver: zodResolver(schema),
    defaultValues: { doctorId: "" },
  });

  useEffect(() => {
    if (open) reset({ doctorId: currentDoctorId ?? "" });
  }, [open, currentDoctorId, reset]);

  const doctorId = useWatch({ control, name: "doctorId" });
  const selectedDoctor =
    [pickedDoctor, patient?.doctor].find((doctor) => doctor && doctor.id === doctorId) ?? null;

  const close = (next: boolean) => {
    if (!next) setFormError(null);
    onOpenChange(next);
  };

  const onSubmit = handleSubmit((values) => {
    if (!patient) return;
    setFormError(null);
    reassign.mutate(
      { patient, doctor: { id: values.doctorId, name: selectedDoctor?.name ?? "the selected doctor" } },
      {
        onSuccess: () => close(false),
        onError: (error) => {
          const message = applyServerErrors(error, setError, ["doctorId"]);
          if (message) {
            setFormError(message);
            toast.error("Couldn't reassign patient", { description: message, duration: 6000 });
          }
        },
      },
    );
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={close}
      title="Change assigned doctor"
      description={
        patient
          ? `${patient.name} is currently assigned to ${patient.doctor.name}.`
          : "Choose the doctor who takes over this patient."
      }
      submitLabel="Reassign patient"
      onSubmit={onSubmit}
      isPending={reassign.isPending}
      isDirty={isDirty}
      formError={formError}
    >
      <FormField
        id="reassign-doctor"
        label="New doctor"
        required
        error={errors.doctorId?.message}
        help="Search by name. The specialization is shown next to each doctor."
      >
        {(field) => (
          <Controller
            control={control}
            name="doctorId"
            render={({ field: controller }) => (
              <DoctorCombobox
                {...field}
                value={controller.value}
                selected={selectedDoctor}
                onChange={(doctor) => {
                  setPickedDoctor(doctor);
                  controller.onChange(doctor?.id ?? "");
                }}
              />
            )}
          />
        )}
      </FormField>
    </FormDialog>
  );
}
