"use client";

import { Plus, SearchX, Users } from "lucide-react";
import { useCallback, useId, useMemo } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterChips, type FilterChip } from "@/components/shared/filter-bar";
import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GENDER_LABELS, GENDER_OPTIONS } from "@/constants/app";
import { DoctorCombobox, type DoctorChoice } from "@/features/doctors/components/doctor-combobox";
import { useDoctor } from "@/features/doctors/hooks/use-doctor-queries";
import {
  PatientActionDialogs,
  usePatientActions,
} from "@/features/patients/components/patient-action-dialogs";
import { usePatientColumns } from "@/features/patients/components/patient-columns";
import { PatientFormDialog } from "@/features/patients/components/patient-form-dialog";
import { usePatientFilters, usePatients } from "@/features/patients/hooks/use-patient-queries";
import {
  PATIENT_LIST_PARAM_KEYS,
  parsePatientListState,
  toPatientListQuery,
} from "@/features/patients/schemas";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useListControls } from "@/hooks/use-list-controls";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateRange, pluralize } from "@/lib/format";
import type { Patient } from "@/types/models";

const getPatientId = (patient: Patient) => patient.id;
const EMPTY_OPTIONS: readonly string[] = [];

export function PatientsView() {
  const doctorFilterId = useId();
  const controls = useListControls(PATIENT_LIST_PARAM_KEYS);
  const { searchParams, onFilterChange, onDateRangeChange, onReset } = controls;

  const state = useMemo(() => parsePatientListState(searchParams), [searchParams]);
  const query = useMemo(() => toPatientListQuery(state), [state]);

  const patients = usePatients(query);
  const filters = usePatientFilters();
  // Resolves the name behind a `?doctorId=` deep link (shared cache with the combobox lookup).
  const filteredDoctor = useDoctor(state.doctorId);

  const createDialog = useDialogState();
  const actions = usePatientActions();
  const columns = usePatientColumns({
    showDoctor: true,
    onEdit: actions.onEdit,
    onReassign: actions.onReassign,
    onDelete: actions.onDelete,
  });

  const showCreateDialog = createDialog.show;
  const openCreate = useCallback(() => showCreateDialog(true), [showCreateDialog]);
  const onConditionChange = useCallback(
    (value: string | undefined) => onFilterChange("condition", value),
    [onFilterChange],
  );
  const onGenderChange = useCallback(
    (value: string | undefined) => onFilterChange("gender", value),
    [onFilterChange],
  );
  const onDoctorChange = useCallback(
    (doctor: DoctorChoice | null) => onFilterChange("doctorId", doctor?.id),
    [onFilterChange],
  );

  const dateRange = useMemo(() => ({ from: state.from, to: state.to }), [state.from, state.to]);
  const sort = useMemo(
    () => ({ sortBy: state.sortBy, sortOrder: state.sortOrder }),
    [state.sortBy, state.sortOrder],
  );
  const doctorName = filteredDoctor.data?.name;

  const chips = useMemo<FilterChip[]>(() => {
    const list: FilterChip[] = [];
    if (state.condition) {
      list.push({
        key: "condition",
        label: `Condition: ${state.condition}`,
        onRemove: () => onFilterChange("condition", undefined),
      });
    }
    if (state.doctorId) {
      list.push({
        key: "doctorId",
        label: `Doctor: ${doctorName ?? "selected doctor"}`,
        onRemove: () => onFilterChange("doctorId", undefined),
      });
    }
    if (state.gender) {
      list.push({
        key: "gender",
        label: `Gender: ${GENDER_LABELS[state.gender]}`,
        onRemove: () => onFilterChange("gender", undefined),
      });
    }
    if (state.from || state.to) {
      list.push({
        key: "created",
        label: `Created: ${formatDateRange(state.from, state.to)}`,
        onRemove: () => onDateRangeChange({}),
      });
    }
    return list;
  }, [
    state.condition,
    state.doctorId,
    state.gender,
    state.from,
    state.to,
    doctorName,
    onFilterChange,
    onDateRangeChange,
  ]);

  const hasCriteria = chips.length > 0 || state.search !== "";
  const canReset = hasCriteria || state.sortBy !== undefined;
  const pagination = patients.data?.pagination;
  const total = pagination?.total;

  const emptyState = hasCriteria ? (
    <EmptyState
      icon={SearchX}
      title="No patients match your filters"
      description="Try a different search term or remove some filters."
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
      title="No patients yet"
      description="Add a patient and assign them to a doctor."
      action={
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Add patient
        </Button>
      }
    />
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Patients"
        description={
          total === undefined ? (
            patients.isError ? (
              "Patients could not be loaded"
            ) : (
              <Skeleton className="h-5 w-24" />
            )
          ) : hasCriteria ? (
            `${pluralize(total, "patient")} found`
          ) : (
            pluralize(total, "patient")
          )
        }
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Add patient
          </Button>
        }
      />

      <div className="space-y-3">
        <FilterBar
          search={
            <SearchInput
              label="Search patients"
              placeholder="Search by name, email or phone"
              value={state.search}
              onChange={controls.onSearchChange}
              enableShortcut
            />
          }
          activeCount={chips.length}
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
          <div className="grid min-w-0 gap-1.5">
            <label htmlFor={doctorFilterId} className="text-sm font-medium md:sr-only">
              Doctor
            </label>
            <DoctorCombobox
              id={doctorFilterId}
              value={state.doctorId}
              onChange={onDoctorChange}
              placeholder="All doctors"
              clearable
              className="lg:w-56"
            />
          </div>
          <FilterDropdown
            label="Gender"
            allLabel="All genders"
            value={state.gender}
            options={GENDER_OPTIONS}
            onChange={onGenderChange}
          />
          <DateRangePicker
            label="Created"
            placeholder="Created: any time"
            value={dateRange}
            onChange={onDateRangeChange}
          />
        </FilterBar>
        <FilterChips chips={chips} onClearAll={onReset} />
      </div>

      <DataTable
        caption="Patients"
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
        emptyState={emptyState}
        skeletonRows={state.limit > 10 ? 10 : 8}
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

      <PatientFormDialog open={createDialog.open} onOpenChange={createDialog.setOpen} />
      <PatientActionDialogs actions={actions} />
    </div>
  );
}
