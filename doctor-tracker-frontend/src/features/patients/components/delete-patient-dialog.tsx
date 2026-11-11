"use client";

import { toast } from "sonner";

import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { useDeletePatient } from "@/features/patients/hooks/use-patient-mutations";
import { getErrorMessage } from "@/lib/api-error";
import type { Patient } from "@/types/models";

type DeletePatientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Pick<Patient, "id" | "name" | "doctor"> | null;
  onDeleted?: () => void;
};

export function DeletePatientDialog({ open, onOpenChange, patient, onDeleted }: DeletePatientDialogProps) {
  const deletePatient = useDeletePatient();
  const name = patient?.name ?? "this patient";

  const confirm = () => {
    if (!patient) return;
    deletePatient.mutate(
      { id: patient.id, name: patient.name, doctorId: patient.doctor.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDeleted?.();
        },
        onError: (error) => {
          toast.error("Couldn't delete patient", { description: getErrorMessage(error), duration: 6000 });
        },
      },
    );
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${name}?`}
      description={
        patient
          ? `This permanently removes the patient record and takes it off ${patient.doctor.name}'s list. This cannot be undone.`
          : "This permanently removes the patient record. This cannot be undone."
      }
      confirmLabel="Delete"
      destructive
      onConfirm={confirm}
      isPending={deletePatient.isPending}
    />
  );
}
