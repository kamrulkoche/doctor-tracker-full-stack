"use client";

import { Eye, Pencil, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { TagBadge } from "@/components/shared/tag-badge";
import { DateCell, IdentityCell, TextCell } from "@/components/tables/cells";
import type { DataTableColumn } from "@/components/tables/data-table";
import { RowActionsMenu } from "@/components/tables/row-actions-menu";
import { ROUTES } from "@/constants/app";
import { formatNumber } from "@/lib/format";
import type { Doctor, DoctorSortField } from "@/types/models";

type DoctorColumnHandlers = {
  onEdit: (doctor: Doctor) => void;
  onAddPatient: (doctor: Doctor) => void;
  onDelete: (doctor: Doctor) => void;
};

/**
 * Column definitions for the doctors table. Memoised on the (stable) handlers, so the
 * memoised DataTable does not re-render when unrelated page state changes.
 */
export function useDoctorColumns({
  onEdit,
  onAddPatient,
  onDelete,
}: DoctorColumnHandlers): DataTableColumn<Doctor, DoctorSortField>[] {
  return useMemo(
    () => [
      {
        id: "doctor",
        header: "Doctor",
        sortKey: "name",
        mobile: "title",
        className: "w-[26%]",
        cell: (doctor) => (
          <IdentityCell name={doctor.name} href={ROUTES.doctor(doctor.id)} secondary={doctor.email} />
        ),
      },
      {
        id: "specialization",
        header: "Specialization",
        sortKey: "specialization",
        className: "w-[17%]",
        cell: (doctor) => <TagBadge label={doctor.specialization} />,
      },
      {
        id: "hospital",
        header: "Hospital",
        sortKey: "hospital",
        cell: (doctor) => <TextCell value={doctor.hospital} />,
      },
      {
        id: "phone",
        header: "Phone",
        className: "hidden w-[15%] lg:table-cell",
        cell: (doctor) => <TextCell value={doctor.phone} numeric />,
      },
      {
        id: "patients",
        header: "Patients",
        align: "right",
        className: "w-24",
        cell: (doctor) => (
          <Link
            href={`${ROUTES.patients}?doctorId=${doctor.id}`}
            aria-label={`${formatNumber(doctor.patientCount)} patients of ${doctor.name}`}
            className="tabular-nums underline-offset-4 hover:text-primary hover:underline"
          >
            {formatNumber(doctor.patientCount)}
          </Link>
        ),
      },
      {
        id: "created",
        header: "Created",
        sortKey: "createdAt",
        className: "hidden w-32 lg:table-cell",
        cell: (doctor) => <DateCell value={doctor.createdAt} />,
      },
      {
        id: "actions",
        header: "Actions",
        mobile: "actions",
        cell: (doctor) => (
          <RowActionsMenu
            recordName={doctor.name}
            actions={[
              { label: "View", icon: Eye, href: ROUTES.doctor(doctor.id) },
              { label: "Edit", icon: Pencil, onSelect: () => onEdit(doctor) },
              { label: "Add patient", icon: UserPlus, onSelect: () => onAddPatient(doctor) },
              {
                label: "Delete",
                icon: Trash2,
                onSelect: () => onDelete(doctor),
                destructive: true,
                separated: true,
              },
            ]}
          />
        ),
      },
    ],
    [onEdit, onAddPatient, onDelete],
  );
}
