"use client";

import { Pencil, Plus, SearchX, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { DetailList, type DetailItem } from "@/components/shared/detail-list";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { ErrorState } from "@/components/shared/error-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { DetailPageSkeleton } from "@/components/shared/loading-skeleton";
import { NotFoundState } from "@/components/shared/not-found-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { TagBadge } from "@/components/shared/tag-badge";
import { DataTable } from "@/components/tables/data-table";
import { RowActionsMenu } from "@/components/tables/row-actions-menu";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/app";
import { DeleteDoctorDialog } from "@/features/doctors/components/delete-doctor-dialog";
import { DoctorFormDialog } from "@/features/doctors/components/doctor-form-dialog";
import { useDoctor, useDoctorPatients } from "@/features/doctors/hooks/use-doctor-queries";
import {
  PatientActionDialogs,
  usePatientActions,
} from "@/features/patients/components/patient-action-dialogs";
import { usePatientColumns } from "@/features/patients/components/patient-columns";
import { PatientFormDialog } from "@/features/patients/components/patient-form-dialog";
import { usePatientFilters } from "@/features/patients/hooks/use-patient-queries";
import {
  PATIENT_LIST_PARAM_KEYS,
  parsePatientListState,
  toDoctorPatientListQuery,
} from "@/features/patients/schemas";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useListControls } from "@/hooks/use-list-controls";
import { getErrorMessage, isNotFoundError } from "@/lib/api-error";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Doctor, Patient } from "@/types/models";

const getPatientId = (patient: Patient) => patient.id;
const EMPTY_OPTIONS: readonly string[] = [];

export function DoctorDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: doctor, isPending, isError, error, refetch, isRefetching } = useDoctor(id);
  const editDialog = useDialogState();
  const deleteDialog = useDialogState();
  useDocumentTitle(doctor?.name);

  const goToList = useCallback(() => router.push(ROUTES.doctors), [router]);

  const details = useMemo<DetailItem[]>(() => {
    if (!doctor) return [];
    return [
      {
        label: "Email",
        value: (
          <a href={`mailto:${doctor.email}`} className="break-all underline-offset-4 hover:underline">
            {doctor.email}
          </a>
        ),
      },
      {
        label: "Phone",
        value: (
          <a href={`tel:${doctor.phone}`} className="tabular-nums underline-offset-4 hover:underline">
            {doctor.phone}
          </a>
        ),
      },
      { label: "Hospital", value: doctor.hospital },
      { label: "Specialization", value: <TagBadge label={doctor.specialization} /> },
      { label: "Doctor ID", value: <span className="font-mono text-xs">{doctor.id}</span> },
      { label: "Created", value: <span className="tabular-nums">{formatDateTime(doctor.createdAt)}</span> },
      {
        label: "Last updated",
        value: <span className="tabular-nums">{formatDateTime(doctor.updatedAt)}</span>,
      },
    ];
  }, [doctor]);

  if (isPending) return <DetailPageSkeleton />;

  if (isError || !doctor) {
    if (isNotFoundError(error)) {
      return (
        <NotFoundState
          title="Doctor not found"
          description="This doctor does not exist or has been deleted."
          backHref={ROUTES.doctors}
          backLabel="Back to doctors"
        />
      );
    }
    return (
      <div className="rounded-lg border bg-card">
        <ErrorState
          title="Couldn't load this doctor"
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
          <EntityAvatar name={doctor.name} size="lg" className="max-sm:size-12 max-sm:text-base" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight md:text-2xl">
                {doctor.name}
              </h1>
              <TagBadge label={doctor.specialization} />
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {doctor.email}
              <span aria-hidden="true"> · </span>
              {doctor.hospital}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Button variant="outline" onClick={() => editDialog.show(true)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteDialog.show(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
          <div className="-mt-1 -mr-2 shrink-0 md:hidden">
            <RowActionsMenu
              recordName={doctor.name}
              actions={[
                { label: "Edit", icon: Pencil, onSelect: () => editDialog.show(true) },
                {
                  label: "Delete",
                  icon: Trash2,
                  onSelect: () => deleteDialog.show(true),
                  destructive: true,
                  separated: true,
                },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <section
          aria-labelledby="doctor-info-title"
          className="rounded-lg border bg-card p-4 md:p-5 lg:col-span-4"
        >
          <h2 id="doctor-info-title" className="text-base font-semibold">
            Contact and profile
          </h2>
          <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <span
              aria-hidden="true"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"
            >
              <Users className="size-4" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assigned patients</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {formatNumber(doctor.patientCount)}
              </p>
            </div>
          </div>
          <DetailList items={details} className="mt-4" />
        </section>

        <DoctorPatientsSection doctor={doctor} />
      </div>

      <DoctorFormDialog open={editDialog.open} onOpenChange={editDialog.setOpen} doctor={doctor} />
      <DeleteDoctorDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.setOpen}
        doctor={doctor}
        onDeleted={goToList}
      />
    </div>
  );
}

/**
 * The doctor's own patients (`GET /doctors/:id/patients`) with search, condition filter,
 * sorting and pagination kept in this page's URL. A separate component, so typing in its
 * search box or paging never re-renders the profile above.
 */
function DoctorPatientsSection({ doctor }: { doctor: Doctor }) {
  const controls = useListControls(PATIENT_LIST_PARAM_KEYS);
  const { searchParams, onFilterChange, onReset } = controls;

  const state = useMemo(() => parsePatientListState(searchParams), [searchParams]);
  const query = useMemo(() => toDoctorPatientListQuery(state), [state]);

  const patients = useDoctorPatients(doctor.id, query);
  const filters = usePatientFilters();

  const addDialog = useDialogState();
  const actions = usePatientActions();
  const columns = usePatientColumns({
    showDoctor: false,
    onEdit: actions.onEdit,
    onReassign: actions.onReassign,
    onDelete: actions.onDelete,
  });

  const lockedDoctor = useMemo(
    () => ({ id: doctor.id, name: doctor.name, specialization: doctor.specialization }),
    [doctor.id, doctor.name, doctor.specialization],
  );
  const onConditionChange = useCallback(
    (value: string | undefined) => onFilterChange("condition", value),
    [onFilterChange],
  );
  const sort = useMemo(
    () => ({ sortBy: state.sortBy, sortOrder: state.sortOrder }),
    [state.sortBy, state.sortOrder],
  );

  const hasCriteria = state.search !== "" || Boolean(state.condition);
  const canReset = hasCriteria || state.sortBy !== undefined;
  const pagination = patients.data?.pagination;

  const addButton = (
    <Button onClick={() => addDialog.show(true)}>
      <Plus className="size-4" aria-hidden="true" />
      Add patient
    </Button>
  );

  return (
    <section aria-labelledby="doctor-patients-title" className="min-w-0 space-y-3 lg:col-span-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="doctor-patients-title" className="text-base font-semibold tabular-nums">
            Patients ({formatNumber(pagination && !hasCriteria ? pagination.total : doctor.patientCount)})
          </h2>
          <p className="text-sm text-muted-foreground">
            Everyone assigned to {doctor.name}.{" "}
            <Link
              href={`${ROUTES.patients}?doctorId=${doctor.id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Open in patients
            </Link>
          </p>
        </div>
        <div className="[&>*]:h-10 [&>*]:w-full sm:[&>*]:h-9 sm:[&>*]:w-auto">{addButton}</div>
      </div>

      <FilterBar
        search={
          <SearchInput
            label={`Search ${doctor.name}'s patients`}
            placeholder="Search by name, email or phone"
            value={state.search}
            onChange={controls.onSearchChange}
          />
        }
        activeCount={state.condition ? 1 : 0}
        canReset={canReset}
        onReset={onReset}
      >
        <FilterDropdown
          label="Condition"
          allLabel="All conditions"
          value={state.condition}
          options={filters.data?.conditions ?? EMPTY_OPTIONS}
          onChange={onConditionChange}
        />
      </FilterBar>

      <DataTable
        caption={`Patients of ${doctor.name}`}
        columns={columns}
        rows={patients.data?.items}
        getRowId={getPatientId}
        sort={sort}
        onSortChange={controls.onSortChange}
        isLoading={patients.isPending}
        isRefreshing={patients.isPlaceholderData || (patients.isError && patients.isFetching)}
        error={
          patients.isError && !patients.data
            ? { title: "Couldn't load patients", description: getErrorMessage(patients.error) }
            : null
        }
        onRetry={patients.refetch}
        skeletonRows={5}
        emptyState={
          hasCriteria ? (
            <EmptyState
              icon={SearchX}
              title="No patients match your filters"
              description="Try a different search term or condition."
              action={
                <Button variant="outline" onClick={onReset}>
                  Clear filters
                </Button>
              }
            />
          ) : state.page > 1 ? (
            <EmptyState
              icon={SearchX}
              title="Nothing on this page"
              description="This page is past the end of the list."
              action={
                <Button variant="outline" onClick={() => controls.onPageChange(1)}>
                  Go to first page
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No patients assigned"
              description={`Add the first patient under ${doctor.name}.`}
              action={addButton}
            />
          )
        }
      />

      {pagination ? (
        <Pagination
          page={state.page}
          limit={state.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={controls.onPageChange}
          onLimitChange={controls.onLimitChange}
          itemLabel="patients"
        />
      ) : null}

      <PatientFormDialog open={addDialog.open} onOpenChange={addDialog.setOpen} lockedDoctor={lockedDoctor} />
      <PatientActionDialogs actions={actions} />
    </section>
  );
}
