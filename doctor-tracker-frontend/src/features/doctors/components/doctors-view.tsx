"use client";

import { Plus, SearchX, Stethoscope } from "lucide-react";
import { useCallback, useMemo } from "react";

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
import { DeleteDoctorDialog } from "@/features/doctors/components/delete-doctor-dialog";
import { useDoctorColumns } from "@/features/doctors/components/doctor-columns";
import { DoctorFormDialog } from "@/features/doctors/components/doctor-form-dialog";
import { useDoctorFilters, useDoctors } from "@/features/doctors/hooks/use-doctor-queries";
import { DOCTOR_LIST_PARAM_KEYS, parseDoctorListState, toDoctorListQuery } from "@/features/doctors/schemas";
import { PatientFormDialog } from "@/features/patients/components/patient-form-dialog";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useListControls } from "@/hooks/use-list-controls";
import { getErrorMessage } from "@/lib/api-error";
import { formatDateRange, pluralize } from "@/lib/format";
import type { Doctor } from "@/types/models";

const getDoctorId = (doctor: Doctor) => doctor.id;
const EMPTY_OPTIONS: readonly string[] = [];

export function DoctorsView() {
  const controls = useListControls(DOCTOR_LIST_PARAM_KEYS);
  const { searchParams, onFilterChange, onDateRangeChange, onReset } = controls;

  // URL -> typed state -> API query. Both are memoised on the query string, so the
  // query key (and everything derived from it) is stable between unrelated renders.
  const state = useMemo(() => parseDoctorListState(searchParams), [searchParams]);
  const query = useMemo(() => toDoctorListQuery(state), [state]);

  const doctors = useDoctors(query);
  const filters = useDoctorFilters();

  /** `null` target = "add", a doctor = "edit". */
  const formDialog = useDialogState<Doctor | null>();
  const deleteDialog = useDialogState<Doctor>();
  const addPatientDialog = useDialogState<Doctor>();

  const columns = useDoctorColumns({
    onEdit: formDialog.show,
    onAddPatient: addPatientDialog.show,
    onDelete: deleteDialog.show,
  });

  const showFormDialog = formDialog.show;
  const openCreate = useCallback(() => showFormDialog(null), [showFormDialog]);
  const onSpecializationChange = useCallback(
    (value: string | undefined) => onFilterChange("specialization", value),
    [onFilterChange],
  );
  const onHospitalChange = useCallback(
    (value: string | undefined) => onFilterChange("hospital", value),
    [onFilterChange],
  );

  const dateRange = useMemo(() => ({ from: state.from, to: state.to }), [state.from, state.to]);
  const sort = useMemo(
    () => ({ sortBy: state.sortBy, sortOrder: state.sortOrder }),
    [state.sortBy, state.sortOrder],
  );

  const chips = useMemo<FilterChip[]>(() => {
    const list: FilterChip[] = [];
    if (state.specialization) {
      list.push({
        key: "specialization",
        label: `Specialization: ${state.specialization}`,
        onRemove: () => onFilterChange("specialization", undefined),
      });
    }
    if (state.hospital) {
      list.push({
        key: "hospital",
        label: `Hospital: ${state.hospital}`,
        onRemove: () => onFilterChange("hospital", undefined),
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
  }, [state.specialization, state.hospital, state.from, state.to, onFilterChange, onDateRangeChange]);

  const hasCriteria = chips.length > 0 || state.search !== "";
  const canReset = hasCriteria || state.sortBy !== undefined;
  const pagination = doctors.data?.pagination;
  const total = pagination?.total;

  const emptyState = hasCriteria ? (
    <EmptyState
      icon={SearchX}
      title="No doctors match your filters"
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
      icon={Stethoscope}
      title="No doctors yet"
      description="Add your first doctor to start tracking patients."
      action={
        <Button onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          Add doctor
        </Button>
      }
    />
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Doctors"
        description={
          total === undefined ? (
            doctors.isError ? (
              "Doctors could not be loaded"
            ) : (
              <Skeleton className="h-5 w-24" />
            )
          ) : hasCriteria ? (
            `${pluralize(total, "doctor")} found`
          ) : (
            pluralize(total, "doctor")
          )
        }
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden="true" />
            Add doctor
          </Button>
        }
      />

      <div className="space-y-3">
        <FilterBar
          search={
            <SearchInput
              label="Search doctors"
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
            label="Specialization"
            allLabel="All specializations"
            value={state.specialization}
            options={filters.data?.specializations ?? EMPTY_OPTIONS}
            onChange={onSpecializationChange}
          />
          <FilterDropdown
            label="Hospital"
            allLabel="All hospitals"
            value={state.hospital}
            options={filters.data?.hospitals ?? EMPTY_OPTIONS}
            onChange={onHospitalChange}
          />
          <DateRangePicker
            label="Created"
            placeholder="Created: any time"
            value={dateRange}
            onChange={onDateRangeChange}
            className="col-span-2 lg:col-span-1"
          />
        </FilterBar>
        <FilterChips chips={chips} onClearAll={onReset} />
      </div>

      <DataTable
        caption="Doctors"
        columns={columns}
        rows={doctors.data?.items}
        getRowId={getDoctorId}
        sort={sort}
        onSortChange={controls.onSortChange}
        isLoading={doctors.isPending}
        isRefreshing={doctors.isPlaceholderData || (doctors.isError && doctors.isFetching)}
        error={
          doctors.isError && !doctors.data
            ? { title: "Couldn't load doctors", description: getErrorMessage(doctors.error) }
            : null
        }
        onRetry={doctors.refetch}
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
          itemLabel="doctors"
        />
      ) : null}

      <DoctorFormDialog open={formDialog.open} onOpenChange={formDialog.setOpen} doctor={formDialog.target} />
      <DeleteDoctorDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.setOpen}
        doctor={deleteDialog.target}
      />
      <PatientFormDialog
        open={addPatientDialog.open}
        onOpenChange={addPatientDialog.setOpen}
        lockedDoctor={addPatientDialog.target}
      />
    </div>
  );
}
