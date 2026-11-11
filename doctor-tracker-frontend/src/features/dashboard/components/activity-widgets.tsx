"use client";

import { Eye, Plus, Stethoscope, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { memo, type ReactNode } from "react";

import { WidgetCard, WidgetState } from "@/components/charts/widget-card";
import { EntityAvatar } from "@/components/shared/entity-avatar";
import { ListRowsSkeleton } from "@/components/shared/loading-skeleton";
import { TagBadge } from "@/components/shared/tag-badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/app";
import { useRecentActivity } from "@/features/dashboard/hooks/use-dashboard";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";

const RECENT_LIMIT = 5;

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
    >
      View all
    </Link>
  );
}

/** Compact row: avatar, linked name, secondary line, right-aligned date. */
function ActivityRow({
  name,
  href,
  secondary,
  date,
}: {
  name: string;
  href: string;
  secondary: ReactNode;
  date: string;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <EntityAvatar name={name} size="sm" />
      <div className="grid min-w-0 flex-1">
        <Link
          href={href}
          className="truncate text-sm font-medium underline-offset-4 hover:text-primary hover:underline"
        >
          {name}
        </Link>
        <span className="truncate text-xs text-muted-foreground">{secondary}</span>
      </div>
      <time
        dateTime={date}
        title={formatDateTime(date)}
        className="shrink-0 text-xs text-muted-foreground tabular-nums"
      >
        {formatDate(date)}
      </time>
    </li>
  );
}

type ActivityCardProps = {
  className?: string;
};

export const RecentDoctorsCard = memo(function RecentDoctorsCard({
  className,
  onAddDoctor,
}: ActivityCardProps & { onAddDoctor: () => void }) {
  const activity = useRecentActivity(RECENT_LIMIT);
  const doctors = activity.data?.recentDoctors ?? [];

  return (
    <WidgetCard
      title="Recent doctors"
      subtitle="Latest profiles added"
      className={className}
      action={<ViewAllLink href={ROUTES.doctors} label="View all doctors" />}
    >
      <WidgetState
        isPending={activity.isPending}
        isError={activity.isError}
        error={activity.error}
        onRetry={() => void activity.refetch()}
        isRetrying={activity.isRefetching}
        isEmpty={doctors.length === 0}
        skeleton={<ListRowsSkeleton rows={RECENT_LIMIT} />}
        errorTitle="Couldn't load recent doctors"
        emptyIcon={Stethoscope}
        emptyTitle="No doctors yet"
        emptyDescription="Add your first doctor to start tracking patients."
        emptyAction={
          <Button onClick={onAddDoctor}>
            <Plus className="size-4" aria-hidden="true" />
            Add doctor
          </Button>
        }
      >
        <ul className="-my-2.5 divide-y divide-border">
          {doctors.map((doctor) => (
            <ActivityRow
              key={doctor.id}
              name={doctor.name}
              href={ROUTES.doctor(doctor.id)}
              secondary={`${doctor.specialization} · ${doctor.hospital}`}
              date={doctor.createdAt}
            />
          ))}
        </ul>
      </WidgetState>
    </WidgetCard>
  );
});

export const RecentPatientsCard = memo(function RecentPatientsCard({
  className,
  onAddPatient,
}: ActivityCardProps & { onAddPatient: () => void }) {
  const activity = useRecentActivity(RECENT_LIMIT);
  const patients = activity.data?.recentPatients ?? [];

  return (
    <WidgetCard
      title="Recent patients"
      subtitle="Latest records added"
      className={className}
      action={<ViewAllLink href={ROUTES.patients} label="View all patients" />}
    >
      <WidgetState
        isPending={activity.isPending}
        isError={activity.isError}
        error={activity.error}
        onRetry={() => void activity.refetch()}
        isRetrying={activity.isRefetching}
        isEmpty={patients.length === 0}
        skeleton={<ListRowsSkeleton rows={RECENT_LIMIT} />}
        errorTitle="Couldn't load recent patients"
        emptyIcon={Users}
        emptyTitle="No patients yet"
        emptyDescription="Add a patient and assign them to a doctor."
        emptyAction={
          <Button onClick={onAddPatient}>
            <Plus className="size-4" aria-hidden="true" />
            Add patient
          </Button>
        }
      >
        <ul className="-my-2.5 divide-y divide-border">
          {patients.map((patient) => (
            <ActivityRow
              key={patient.id}
              name={patient.name}
              href={ROUTES.patient(patient.id)}
              secondary={`${patient.condition} · ${patient.doctor.name}`}
              date={patient.createdAt}
            />
          ))}
        </ul>
      </WidgetState>
    </WidgetCard>
  );
});

/** Ranked list by all-time patient count, with a proportional bar under each doctor. */
export const TopDoctorsCard = memo(function TopDoctorsCard({ className }: ActivityCardProps) {
  const activity = useRecentActivity(RECENT_LIMIT);
  const doctors = activity.data?.topDoctors ?? [];
  const max = Math.max(...doctors.map((doctor) => doctor.patientCount), 1);

  return (
    <WidgetCard
      title="Top doctors by patients"
      subtitle="All-time assigned patients"
      className={className}
      action={<ViewAllLink href={ROUTES.doctors} label="View all doctors" />}
    >
      <WidgetState
        isPending={activity.isPending}
        isError={activity.isError}
        error={activity.error}
        onRetry={() => void activity.refetch()}
        isRetrying={activity.isRefetching}
        isEmpty={doctors.length === 0}
        skeleton={<ListRowsSkeleton rows={RECENT_LIMIT} />}
        errorTitle="Couldn't load top doctors"
        emptyIcon={Stethoscope}
        emptyTitle="No doctors yet"
        emptyDescription="Doctors appear here once patients are assigned."
      >
        <ol className="grid gap-3">
          {doctors.map((doctor, index) => (
            <li key={doctor.doctorId} className="grid gap-1.5">
              <div className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <EntityAvatar name={doctor.name} size="sm" />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <Link
                    href={ROUTES.doctor(doctor.doctorId)}
                    className="truncate text-sm font-medium underline-offset-4 hover:text-primary hover:underline"
                  >
                    {doctor.name}
                  </Link>
                  <span className="min-w-0">
                    <TagBadge label={doctor.specialization} />
                  </span>
                </div>
                <Link
                  href={`${ROUTES.patients}?doctorId=${doctor.doctorId}`}
                  aria-label={`${formatNumber(doctor.patientCount)} patients of ${doctor.name}`}
                  className="shrink-0 py-1 text-sm font-medium tabular-nums underline-offset-4 hover:text-primary hover:underline"
                >
                  {formatNumber(doctor.patientCount)}
                </Link>
              </div>
              <div aria-hidden="true" className="ml-7 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.max((doctor.patientCount / max) * 100, doctor.patientCount > 0 ? 2 : 0)}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      </WidgetState>
    </WidgetCard>
  );
});

type QuickActionsCardProps = ActivityCardProps & {
  onAddDoctor: () => void;
  onAddPatient: () => void;
};

/** Shortcuts. The two "add" actions open the real forms, not placeholder pages. */
export const QuickActionsCard = memo(function QuickActionsCard({
  className,
  onAddDoctor,
  onAddPatient,
}: QuickActionsCardProps) {
  return (
    <WidgetCard title="Quick actions" subtitle="Common tasks" className={className}>
      <div className="grid gap-2">
        <Button variant="outline" className="h-10 justify-start md:h-9" onClick={onAddDoctor}>
          <Plus className="size-4" aria-hidden="true" />
          Add doctor
        </Button>
        <Button variant="outline" className="h-10 justify-start md:h-9" onClick={onAddPatient}>
          <UserPlus className="size-4" aria-hidden="true" />
          Add patient
        </Button>
        <Button asChild variant="outline" className="h-10 justify-start md:h-9">
          <Link href={ROUTES.doctors}>
            <Eye className="size-4" aria-hidden="true" />
            View doctors
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-10 justify-start md:h-9">
          <Link href={ROUTES.patients}>
            <Eye className="size-4" aria-hidden="true" />
            View patients
          </Link>
        </Button>
      </div>
    </WidgetCard>
  );
});
