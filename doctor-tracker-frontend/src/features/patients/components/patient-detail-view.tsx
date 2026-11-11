"use client";

import { ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { DetailList, type DetailItem } from "@/components/shared/detail-list";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { ErrorState } from "@/components/shared/error-state";
import { DetailPageSkeleton } from "@/components/shared/loading-skeleton";
import { NotFoundState } from "@/components/shared/not-found-state";
import { TagBadge } from "@/components/shared/tag-badge";
import { RowActionsMenu } from "@/components/tables/row-actions-menu";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/app";
import {
  PatientActionDialogs,
  usePatientActions,
} from "@/features/patients/components/patient-action-dialogs";
import { usePatient } from "@/features/patients/hooks/use-patient-queries";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getErrorMessage, isNotFoundError } from "@/lib/api-error";
import { formatAgeGender, formatDateTime, formatGender } from "@/lib/format";

export function PatientDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: patient, isPending, isError, error, refetch, isRefetching } = usePatient(id);
  const actions = usePatientActions();
  useDocumentTitle(patient?.name);

  const goToList = useCallback(() => router.push(ROUTES.patients), [router]);

  const details = useMemo<DetailItem[]>(() => {
    if (!patient) return [];
    return [
      {
        label: "Age",
        value: patient.age === null ? null : <span className="tabular-nums">{patient.age}</span>,
      },
      { label: "Gender", value: patient.gender ? formatGender(patient.gender) : null },
      { label: "Condition", value: <TagBadge label={patient.condition} /> },
      {
        label: "Phone",
        value: patient.phone ? (
          <a href={`tel:${patient.phone}`} className="tabular-nums underline-offset-4 hover:underline">
            {patient.phone}
          </a>
        ) : null,
      },
      {
        label: "Email",
        value: patient.email ? (
          <a href={`mailto:${patient.email}`} className="break-all underline-offset-4 hover:underline">
            {patient.email}
          </a>
        ) : null,
      },
      { label: "Patient ID", value: <span className="font-mono text-xs">{patient.id}</span> },
      { label: "Created", value: <span className="tabular-nums">{formatDateTime(patient.createdAt)}</span> },
      {
        label: "Last updated",
        value: <span className="tabular-nums">{formatDateTime(patient.updatedAt)}</span>,
      },
      {
        label: "Notes",
        wide: true,
        value: patient.notes ? <p className="max-w-prose whitespace-pre-wrap">{patient.notes}</p> : null,
      },
    ];
  }, [patient]);

  if (isPending) return <DetailPageSkeleton />;

  if (isError || !patient) {
    if (isNotFoundError(error)) {
      return (
        <NotFoundState
          title="Patient not found"
          description="This patient does not exist or has been deleted."
          backHref={ROUTES.patients}
          backLabel="Back to patients"
        />
      );
    }
    return (
      <div className="rounded-lg border bg-card">
        <ErrorState
          title="Couldn't load this patient"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="rounded-lg border bg-card p-4 md:p-5">
        <div className="flex items-start gap-4">
          <EntityAvatar name={patient.name} size="lg" className="max-sm:size-12 max-sm:text-base" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight md:text-2xl">
                {patient.name}
              </h1>
              <TagBadge label={patient.condition} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {formatAgeGender(patient.age, patient.gender)}
              <span aria-hidden="true"> · </span>
              Assigned to{" "}
              <Link
                href={ROUTES.doctor(patient.doctor.id)}
                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {patient.doctor.name}
              </Link>
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Button variant="outline" onClick={() => actions.onEdit(patient)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Button>
            <Button variant="outline" onClick={() => actions.onReassign(patient)}>
              <ArrowLeftRight className="size-4" aria-hidden="true" />
              Reassign
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => actions.onDelete(patient)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
          <div className="-mt-1 -mr-2 shrink-0 md:hidden">
            <RowActionsMenu
              recordName={patient.name}
              actions={[
                { label: "Edit", icon: Pencil, onSelect: () => actions.onEdit(patient) },
                {
                  label: "Reassign doctor",
                  icon: ArrowLeftRight,
                  onSelect: () => actions.onReassign(patient),
                },
                {
                  label: "Delete",
                  icon: Trash2,
                  onSelect: () => actions.onDelete(patient),
                  destructive: true,
                  separated: true,
                },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section
          aria-labelledby="patient-info-title"
          className="rounded-lg border bg-card p-4 md:p-5 lg:col-span-2"
        >
          <h2 id="patient-info-title" className="text-base font-semibold">
            Patient information
          </h2>
          <DetailList items={details} columns={2} className="mt-4" />
        </section>

        <section aria-labelledby="patient-doctor-title" className="rounded-lg border bg-card p-4 md:p-5">
          <h2 id="patient-doctor-title" className="text-base font-semibold">
            Assigned doctor
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <EntityAvatar name={patient.doctor.name} size="md" />
            <div className="grid min-w-0">
              <Link
                href={ROUTES.doctor(patient.doctor.id)}
                className="truncate text-sm font-medium underline-offset-4 hover:text-primary hover:underline"
              >
                {patient.doctor.name}
              </Link>
              <span className="truncate text-xs text-muted-foreground">{patient.doctor.hospital}</span>
            </div>
          </div>
          <div className="mt-3">
            <TagBadge label={patient.doctor.specialization} />
          </div>
          <div className="mt-4 grid gap-2">
            <Button asChild variant="outline" className="h-10 md:h-9">
              <Link href={ROUTES.doctor(patient.doctor.id)}>View doctor</Link>
            </Button>
            <Button variant="ghost" className="h-10 md:h-9" onClick={() => actions.onReassign(patient)}>
              <ArrowLeftRight className="size-4" aria-hidden="true" />
              Change assigned doctor
            </Button>
          </div>
        </section>
      </div>

      <PatientActionDialogs actions={actions} onDeleted={goToList} />
    </div>
  );
}
