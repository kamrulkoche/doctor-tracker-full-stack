"use client";

import { ArrowLeftRight, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { EntityAvatar } from "@/components/shared/entity-avatar";
import { TagBadge } from "@/components/shared/tag-badge";
import { DateCell, IdentityCell, TextCell } from "@/components/tables/cells";
import type { DataTableColumn } from "@/components/tables/data-table";
import { RowActionsMenu } from "@/components/tables/row-actions-menu";
import { ROUTES } from "@/constants/app";
import { formatAgeGender } from "@/lib/format";
import type { Patient, PatientSortField } from "@/types/models";

type PatientColumnOptions = {
  /** Hidden on a doctor's own page, where every row has the same doctor. */
  showDoctor: boolean;
  onEdit: (patient: Patient) => void;
  onReassign: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
};

/** Column definitions for every patients table; memoised on the (stable) handlers. */
export function usePatientColumns({
  showDoctor,
  onEdit,
  onReassign,
  onDelete,
}: PatientColumnOptions): DataTableColumn<Patient, PatientSortField>[] {
  return useMemo(() => {
    const columns: DataTableColumn<Patient, PatientSortField>[] = [
      {
        id: "patient",
        header: "Patient",
        sortKey: "name",
        mobile: "title",
        className: showDoctor ? "w-[24%]" : "w-[30%]",
        cell: (patient) => (
          <IdentityCell name={patient.name} href={ROUTES.patient(patient.id)} secondary={patient.email} />
        ),
      },
      {
        id: "ageGender",
        header: "Age / gender",
        sortKey: "age",
        className: "w-32",
        cell: (patient) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatAgeGender(patient.age, patient.gender)}
          </span>
        ),
      },
      {
        id: "condition",
        header: "Condition",
        sortKey: "condition",
        cell: (patient) => <TagBadge label={patient.condition} />,
      },
    ];

    if (showDoctor) {
      columns.push({
        id: "doctor",
        header: "Assigned doctor",
        className: "w-[20%]",
        mobileWide: true,
        cell: (patient) => (
          <Link
            href={ROUTES.doctor(patient.doctor.id)}
            title={`${patient.doctor.name} · ${patient.doctor.specialization}`}
            className="inline-flex max-w-full min-w-0 items-center gap-2 underline-offset-4 hover:text-primary hover:underline"
          >
            <EntityAvatar name={patient.doctor.name} size="xs" />
            <span className="truncate">{patient.doctor.name}</span>
          </Link>
        ),
      });
    }

    columns.push(
      {
        id: "phone",
        header: "Phone",
        // On a doctor's page the table shares the row with the profile card, so the phone waits for more room.
        className: showDoctor ? "hidden w-[15%] lg:table-cell" : "hidden w-[20%] 2xl:table-cell",
        cell: (patient) => <TextCell value={patient.phone} numeric />,
      },
      {
        id: "created",
        header: "Created",
        sortKey: "createdAt",
        className: "hidden w-32 lg:table-cell",
        cell: (patient) => <DateCell value={patient.createdAt} />,
      },
      {
        id: "actions",
        header: "Actions",
        mobile: "actions",
        cell: (patient) => (
          <RowActionsMenu
            recordName={patient.name}
            actions={[
              { label: "View", icon: Eye, href: ROUTES.patient(patient.id) },
              { label: "Edit", icon: Pencil, onSelect: () => onEdit(patient) },
              { label: "Reassign doctor", icon: ArrowLeftRight, onSelect: () => onReassign(patient) },
              {
                label: "Delete",
                icon: Trash2,
                onSelect: () => onDelete(patient),
                destructive: true,
                separated: true,
              },
            ]}
          />
        ),
      },
    );

    return columns;
  }, [showDoctor, onEdit, onReassign, onDelete]);
}
