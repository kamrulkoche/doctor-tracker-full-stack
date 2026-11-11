"use client";

import { useMemo } from "react";

import { DeletePatientDialog } from "@/features/patients/components/delete-patient-dialog";
import { PatientFormDialog } from "@/features/patients/components/patient-form-dialog";
import { ReassignDoctorDialog } from "@/features/patients/components/reassign-doctor-dialog";
import { useDialogState } from "@/hooks/use-dialog-state";
import type { Patient } from "@/types/models";

/**
 * State for the three per-patient dialogs (edit, reassign, delete). The `on*` callbacks are
 * stable, so they can be passed straight into memoised column definitions.
 */
export function usePatientActions() {
  const edit = useDialogState<Patient>();
  const reassign = useDialogState<Patient>();
  const remove = useDialogState<Patient>();

  return useMemo(
    () => ({
      edit,
      reassign,
      remove,
      onEdit: edit.show,
      onReassign: reassign.show,
      onDelete: remove.show,
    }),
    [edit, reassign, remove],
  );
}

type PatientActionDialogsProps = {
  actions: ReturnType<typeof usePatientActions>;
  onDeleted?: () => void;
};

/** Renders the dialogs once per view, outside the table, so opening one never re-renders rows. */
export function PatientActionDialogs({ actions, onDeleted }: PatientActionDialogsProps) {
  const { edit, reassign, remove } = actions;
  return (
    <>
      <PatientFormDialog open={edit.open} onOpenChange={edit.setOpen} patient={edit.target} />
      <ReassignDoctorDialog open={reassign.open} onOpenChange={reassign.setOpen} patient={reassign.target} />
      <DeletePatientDialog
        open={remove.open}
        onOpenChange={remove.setOpen}
        patient={remove.target}
        onDeleted={onDeleted}
      />
    </>
  );
}
