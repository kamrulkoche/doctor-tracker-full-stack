"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { SuggestionInput } from "@/components/forms/suggestion-input";
import { FormDialog } from "@/components/shared/form-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COMMON_CONDITIONS, GENDER_OPTIONS } from "@/constants/app";
import { DoctorCombobox, type DoctorChoice } from "@/features/doctors/components/doctor-combobox";
import { useCreatePatient, useUpdatePatient } from "@/features/patients/hooks/use-patient-mutations";
import { usePatientFilters } from "@/features/patients/hooks/use-patient-queries";
import {
  EMPTY_PATIENT_FORM,
  PATIENT_FORM_FIELDS,
  patientSchema,
  patientToFormValues,
  toPatientInput,
  type PatientFormValues,
} from "@/features/patients/schemas";
import { applyServerErrors, mergeSuggestions } from "@/lib/form-errors";
import type { Patient } from "@/types/models";

const NO_GENDER = "__none__";

type PatientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; omitted when adding. */
  patient?: Patient | null;
  /**
   * Adding from a doctor's context: the doctor is pre-selected and locked, and the
   * patient is created through `POST /doctors/:id/patients`.
   */
  lockedDoctor?: DoctorChoice | null;
  onSaved?: (patient: Patient) => void;
};

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  lockedDoctor,
  onSaved,
}: PatientFormDialogProps) {
  const isEdit = Boolean(patient);
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const isPending = createPatient.isPending || updatePatient.isPending;
  const { data: filters } = usePatientFilters();
  const [formError, setFormError] = useState<string | null>(null);
  const [pickedDoctor, setPickedDoctor] = useState<DoctorChoice | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    mode: "onTouched",
    defaultValues: EMPTY_PATIENT_FORM,
  });

  const lockedDoctorId = lockedDoctor?.id;
  useEffect(() => {
    if (!open) return;
    if (patient) reset(patientToFormValues(patient));
    else reset({ ...EMPTY_PATIENT_FORM, doctorId: lockedDoctorId ?? "" });
  }, [open, patient, lockedDoctorId, reset]);

  const doctorId = useWatch({ control, name: "doctorId" });
  const notesLength = useWatch({ control, name: "notes" }).length;

  // Label for the selected id without a lookup, whenever one of the known doctors matches.
  const selectedDoctor =
    [pickedDoctor, patient?.doctor, lockedDoctor].find((doctor) => doctor && doctor.id === doctorId) ?? null;

  const conditionSuggestions = useMemo(
    () => mergeSuggestions(filters?.conditions, COMMON_CONDITIONS),
    [filters?.conditions],
  );

  const close = (next: boolean) => {
    if (!next) setFormError(null);
    onOpenChange(next);
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const input = toPatientInput(values);
    const callbacks = {
      onSuccess: (saved: Patient) => {
        close(false);
        onSaved?.(saved);
      },
      onError: (error: unknown) => {
        const message = applyServerErrors(error, setError, PATIENT_FORM_FIELDS);
        if (message) {
          setFormError(message);
          toast.error(isEdit ? "Couldn't update patient" : "Couldn't add patient", {
            description: message,
            duration: 6000,
          });
        }
      },
    };
    if (patient) {
      updatePatient.mutate({ id: patient.id, input, previousDoctorId: patient.doctor.id }, callbacks);
    } else {
      createPatient.mutate({ input, underDoctor: Boolean(lockedDoctor) }, callbacks);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={close}
      title={isEdit ? "Edit patient" : "Add patient"}
      description={
        isEdit
          ? "Update this patient's details or assigned doctor."
          : lockedDoctor
            ? `The new patient will be assigned to ${lockedDoctor.name}.`
            : "Create a patient record and assign it to a doctor."
      }
      submitLabel={isEdit ? "Save changes" : "Add patient"}
      onSubmit={onSubmit}
      isPending={isPending}
      isDirty={isDirty}
      formError={formError}
    >
      <FormField id="patient-name" label="Full name" required error={errors.name?.message}>
        {(field) => (
          <Input {...field} {...register("name")} autoComplete="off" placeholder="Amir Ali" maxLength={100} />
        )}
      </FormField>

      <FormField
        id="patient-doctor"
        label="Assigned doctor"
        required
        error={errors.doctorId?.message}
        help={
          lockedDoctor && !isEdit ? "Locked because you are adding from this doctor's record." : undefined
        }
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
                locked={Boolean(lockedDoctor) && !isEdit}
                onChange={(doctor) => {
                  setPickedDoctor(doctor);
                  controller.onChange(doctor?.id ?? "");
                  controller.onBlur();
                }}
              />
            )}
          />
        )}
      </FormField>

      <FormField
        id="patient-condition"
        label="Condition"
        required
        error={errors.condition?.message}
        help="Pick an existing one or type a new one."
      >
        {(field) => (
          <SuggestionInput
            {...field}
            {...register("condition")}
            suggestions={conditionSuggestions}
            placeholder="Hypertension"
            maxLength={120}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="patient-age" label="Age" error={errors.age?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("age")}
              inputMode="numeric"
              autoComplete="off"
              placeholder="34"
              maxLength={3}
              className="tabular-nums"
            />
          )}
        </FormField>
        <FormField id="patient-gender" label="Gender" error={errors.gender?.message}>
          {(field) => (
            <Controller
              control={control}
              name="gender"
              render={({ field: controller }) => (
                <Select
                  value={controller.value === "" ? NO_GENDER : controller.value}
                  onValueChange={(value) => controller.onChange(value === NO_GENDER ? "" : value)}
                >
                  <SelectTrigger {...field} className="h-10 w-full md:h-9" onBlur={controller.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_GENDER}>Not specified</SelectItem>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="patient-phone" label="Phone" error={errors.phone?.message}>
          {(field) => (
            <Input
              {...field}
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
        <FormField id="patient-email" label="Email" error={errors.email?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("email")}
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="amir.ali@example.com"
              maxLength={254}
            />
          )}
        </FormField>
      </div>

      <FormField
        id="patient-notes"
        label="Notes"
        error={errors.notes?.message}
        help={`${notesLength} / 2000 characters`}
      >
        {(field) => (
          <Textarea
            {...field}
            {...register("notes")}
            rows={4}
            maxLength={2000}
            placeholder="Relevant history, allergies, follow-up instructions"
            className="resize-y"
          />
        )}
      </FormField>
    </FormDialog>
  );
}
