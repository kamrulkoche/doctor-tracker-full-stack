"use client";

import { Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Button } from "@/components/ui/button";
import {
  QuickActionsCard,
  RecentDoctorsCard,
  RecentPatientsCard,
  TopDoctorsCard,
} from "@/features/dashboard/components/activity-widgets";
import {
  ConditionDistributionCard,
  DoctorsOverTimeCard,
  PatientGrowthCard,
  PatientsPerDoctorCard,
  SpecializationDistributionCard,
} from "@/features/dashboard/components/chart-widgets";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { defaultIntervalFor, parseDashboardRange, RANGE_PRESETS, todayUTC } from "@/features/dashboard/range";
import { DoctorFormDialog } from "@/features/doctors/components/doctor-form-dialog";
import { PatientFormDialog } from "@/features/patients/components/patient-form-dialog";
import { useDialogState } from "@/hooks/use-dialog-state";
import { useUrlFilters } from "@/hooks/use-url-filters";
import type { DateRange } from "@/types/api";
import type { TimeInterval } from "@/types/models";

/**
 * Dashboard composition. The date range and interval live in the URL; every widget is a
 * memoised component with its own query, so a widget re-renders only when its own data or
 * the range changes — opening a dialog or one slow endpoint does not touch the others.
 */
export function DashboardView() {
  const { searchParams, setParams } = useUrlFilters();
  const [today] = useState(todayUTC);

  const { rangeId, range, label, interval, allowedIntervals } = useMemo(
    () => parseDashboardRange(searchParams, today),
    [searchParams, today],
  );
  // Stable object identity for the memoised widgets.
  const stableRange = useMemo<DateRange>(() => ({ from: range.from, to: range.to }), [range.from, range.to]);
  // Bar charts of doctors stay readable with span-derived buckets, whatever the growth toggle says.
  const doctorInterval = useMemo(() => {
    const derived = defaultIntervalFor(stableRange);
    return allowedIntervals.includes(derived) ? derived : "month";
  }, [stableRange, allowedIntervals]);

  const doctorDialog = useDialogState();
  const patientDialog = useDialogState();
  const showDoctorDialog = doctorDialog.show;
  const showPatientDialog = patientDialog.show;
  const openAddDoctor = useCallback(() => showDoctorDialog(true), [showDoctorDialog]);
  const openAddPatient = useCallback(() => showPatientDialog(true), [showPatientDialog]);

  const onPresetSelect = useCallback(
    (preset: string) =>
      setParams({ range: preset === "12m" ? null : preset, from: null, to: null, interval: null }),
    [setParams],
  );
  const onCustomRange = useCallback(
    (next: DateRange) => {
      if (!next.from && !next.to) setParams({ range: null, from: null, to: null, interval: null });
      else setParams({ range: "custom", from: next.from, to: next.to, interval: null });
    },
    [setParams],
  );
  const onIntervalChange = useCallback((next: TimeInterval) => setParams({ interval: next }), [setParams]);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Dashboard"
        description="Doctors, patients and growth at a glance."
        actions={
          <>
            <DateRangePicker
              label="Date range"
              value={rangeId === "custom" ? stableRange : {}}
              displayValue={label}
              onChange={onCustomRange}
              presets={RANGE_PRESETS}
              activePreset={rangeId}
              onPresetSelect={onPresetSelect}
              align="end"
              className="[&>label]:sr-only"
            />
            <Button onClick={openAddDoctor} className="h-10 md:h-9">
              <Plus className="size-4" aria-hidden="true" />
              Add doctor
            </Button>
          </>
        }
      />

      <StatsGrid />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
        <PatientGrowthCard
          range={stableRange}
          rangeLabel={label}
          interval={interval}
          allowedIntervals={allowedIntervals}
          onIntervalChange={onIntervalChange}
          className="order-1 md:order-none md:col-span-2 lg:col-span-8"
        />
        <ConditionDistributionCard
          range={stableRange}
          rangeLabel={label}
          className="order-3 md:order-none lg:col-span-4"
        />
        <PatientsPerDoctorCard
          range={stableRange}
          rangeLabel={label}
          className="order-4 md:order-none lg:col-span-6"
        />
        <DoctorsOverTimeCard
          range={stableRange}
          rangeLabel={label}
          interval={doctorInterval}
          className="order-8 md:order-none lg:col-span-6"
        />
        <SpecializationDistributionCard
          range={stableRange}
          rangeLabel={label}
          interval={doctorInterval}
          className="order-9 md:order-none lg:col-span-4"
        />
        <TopDoctorsCard className="order-5 md:order-none lg:col-span-4" />
        <QuickActionsCard
          onAddDoctor={openAddDoctor}
          onAddPatient={openAddPatient}
          className="order-2 md:order-none lg:col-span-4"
        />
        <RecentDoctorsCard onAddDoctor={openAddDoctor} className="order-7 md:order-none lg:col-span-6" />
        <RecentPatientsCard onAddPatient={openAddPatient} className="order-6 md:order-none lg:col-span-6" />
      </div>

      <DoctorFormDialog open={doctorDialog.open} onOpenChange={doctorDialog.setOpen} />
      <PatientFormDialog open={patientDialog.open} onOpenChange={patientDialog.setOpen} />
    </div>
  );
}
