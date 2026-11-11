"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { SuggestionInput } from "@/components/forms/suggestion-input";
import { FormDialog } from "@/components/shared/form-dialog";
import { Input } from "@/components/ui/input";
import { COMMON_SPECIALIZATIONS } from "@/constants/app";
import { useCreateDoctor, useUpdateDoctor } from "@/features/doctors/hooks/use-doctor-mutations";
import { useDoctorFilters } from "@/features/doctors/hooks/use-doctor-queries";
import {
  DOCTOR_FORM_FIELDS,
  doctorSchema,
  doctorToFormValues,
  EMPTY_DOCTOR_FORM,
  toDoctorInput,
  type DoctorFormValues,
} from "@/features/doctors/schemas";
import { applyServerErrors, mergeSuggestions } from "@/lib/form-errors";
import type { Doctor } from "@/types/models";

type DoctorFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; omitted when adding. */
  doctor?: Doctor | null;
  onSaved?: (doctor: Doctor) => void;
};

export function DoctorFormDialog({ open, onOpenChange, doctor, onSaved }: DoctorFormDialogProps) {
  const isEdit = Boolean(doctor);
  const createDoctor = useCreateDoctor();
  const updateDoctor = useUpdateDoctor();
  const isPending = createDoctor.isPending || updateDoctor.isPending;
  const { data: filters } = useDoctorFilters();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    mode: "onTouched",
    defaultValues: EMPTY_DOCTOR_FORM,
  });

  // Each time the dialog opens it starts from the record being edited (or a blank form).
  useEffect(() => {
    if (open) reset(doctor ? doctorToFormValues(doctor) : EMPTY_DOCTOR_FORM);
  }, [open, doctor, reset]);

  const specializationSuggestions = useMemo(
    () => mergeSuggestions(filters?.specializations, COMMON_SPECIALIZATIONS),
    [filters?.specializations],
  );
  const hospitalSuggestions = useMemo(() => mergeSuggestions(filters?.hospitals), [filters?.hospitals]);

  const close = (next: boolean) => {
    if (!next) setFormError(null);
    onOpenChange(next);
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const input = toDoctorInput(values);
    const callbacks = {
      onSuccess: (saved: Doctor) => {
        close(false);
        onSaved?.(saved);
      },
      onError: (error: unknown) => {
        const message = applyServerErrors(error, setError, DOCTOR_FORM_FIELDS);
        if (message) {
          setFormError(message);
          toast.error(isEdit ? "Couldn't update doctor" : "Couldn't add doctor", {
            description: message,
            duration: 6000,
          });
        }
      },
    };
    if (doctor) updateDoctor.mutate({ id: doctor.id, input }, callbacks);
    else createDoctor.mutate(input, callbacks);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={close}
      title={isEdit ? "Edit doctor" : "Add doctor"}
      description={
        isEdit
          ? "Update this doctor's profile and contact details."
          : "Create a doctor profile. All fields are required."
      }
      submitLabel={isEdit ? "Save changes" : "Add doctor"}
      onSubmit={onSubmit}
      isPending={isPending}
      isDirty={isDirty}
      formError={formError}
    >
      <FormField id="doctor-name" label="Full name" required error={errors.name?.message}>
        {(control) => (
          <Input
            {...control}
            {...register("name")}
            autoComplete="off"
            placeholder="Dr. Sara Khan"
            maxLength={100}
          />
        )}
      </FormField>
      <FormField
        id="doctor-specialization"
        label="Specialization"
        required
        error={errors.specialization?.message}
        help="Pick an existing one or type a new one."
      >
        {(control) => (
          <SuggestionInput
            {...control}
            {...register("specialization")}
            suggestions={specializationSuggestions}
            placeholder="Cardiology"
            maxLength={80}
          />
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="doctor-hospital" label="Hospital" required error={errors.hospital?.message}>
          {(control) => (
            <SuggestionInput
              {...control}
              {...register("hospital")}
              suggestions={hospitalSuggestions}
              placeholder="City General Hospital"
              maxLength={120}
            />
          )}
        </FormField>
        <FormField id="doctor-phone" label="Phone" required error={errors.phone?.message}>
          {(control) => (
            <Input
              {...control}
              {...register("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="+880 1700 000000"
              maxLength={20}
              className="tabular-nums"
            />
          )}
        </FormField>
      </div>
      <FormField
        id="doctor-email"
        label="Email"
        required
        error={errors.email?.message}
        help="Must be unique. Stored in lowercase."
      >
        {(control) => (
          <Input
            {...control}
            {...register("email")}
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="sara.khan@hospital.org"
            maxLength={254}
          />
        )}
      </FormField>
    </FormDialog>
  );
}
