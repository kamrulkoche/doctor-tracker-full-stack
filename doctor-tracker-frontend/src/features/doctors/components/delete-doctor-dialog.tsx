"use client";

import { ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { ROUTES } from "@/constants/app";
import { useDeleteDoctor } from "@/features/doctors/hooks/use-doctor-mutations";
import { getErrorMessage, isApiError } from "@/lib/api-error";
import { pluralize } from "@/lib/format";
import type { Doctor } from "@/types/models";

type DeleteDoctorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: Pick<Doctor, "id" | "name" | "patientCount"> | null;
  onDeleted?: () => void;
};

/** Patient count reported by `409 DOCTOR_HAS_PATIENTS` (`details: [{ path: "patientCount", message: "<n>" }]`). */
function blockedCountFromError(error: unknown): number | null {
  if (!isApiError(error) || error.code !== "DOCTOR_HAS_PATIENTS") return null;
  const count = Number(error.detail("patientCount"));
  return Number.isFinite(count) && count > 0 ? count : 1;
}

/**
 * Delete confirmation for a doctor. The API refuses to delete a doctor who still has
 * patients; that is explained up front when the count is already known, and again if the
 * server answers 409 (the cached count can be stale).
 */
export function DeleteDoctorDialog({ open, onOpenChange, doctor, onDeleted }: DeleteDoctorDialogProps) {
  const deleteDoctor = useDeleteDoctor();
  const name = doctor?.name ?? "this doctor";
  const blockedCount =
    blockedCountFromError(deleteDoctor.error) ??
    (doctor && doctor.patientCount > 0 ? doctor.patientCount : null);
  const isBlocked = blockedCount !== null;

  const handleOpenChange = (next: boolean) => {
    if (!next) deleteDoctor.reset();
    onOpenChange(next);
  };

  const confirm = () => {
    if (!doctor) return;
    deleteDoctor.mutate(
      { id: doctor.id, name: doctor.name },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDeleted?.();
        },
        onError: (error) => {
          // The 409 is explained inside the dialog; anything else is unexpected.
          if (blockedCountFromError(error) === null) {
            toast.error("Couldn't delete doctor", { description: getErrorMessage(error), duration: 6000 });
          }
        },
      },
    );
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isBlocked ? `${name} can't be deleted yet` : `Delete ${name}?`}
      description={
        isBlocked
          ? `${name} still has ${pluralize(blockedCount, "assigned patient")}. Reassign or remove these patients first, then delete the doctor.`
          : "This permanently removes the doctor's profile. This cannot be undone."
      }
      confirmLabel="Delete"
      destructive
      onConfirm={confirm}
      isPending={deleteDoctor.isPending}
      hideConfirm={isBlocked}
    >
      {isBlocked && doctor ? (
        <div
          className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm"
          data-testid="doctor-delete-blocked"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          <div className="grid gap-1">
            <p>Patients must always have an assigned doctor, so a doctor with patients cannot be removed.</p>
            <Link
              href={`${ROUTES.patients}?doctorId=${doctor.id}`}
              onClick={() => handleOpenChange(false)}
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              View this doctor&apos;s patients
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : null}
    </ConfirmationDialog>
  );
}
