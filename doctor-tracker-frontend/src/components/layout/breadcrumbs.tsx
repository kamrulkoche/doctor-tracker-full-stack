"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/app";
import { useDoctor } from "@/features/doctors/hooks/use-doctor-queries";
import { usePatient } from "@/features/patients/hooks/use-patient-queries";

type Crumb = { label: React.ReactNode; href?: string };

const SECTIONS: Record<string, { label: string; href: string }> = {
  dashboard: { label: "Dashboard", href: ROUTES.dashboard },
  doctors: { label: "Doctors", href: ROUTES.doctors },
  patients: { label: "Patients", href: ROUTES.patients },
  settings: { label: "Settings", href: ROUTES.settings },
};

/** Entity crumbs show the record's name, never its raw id. They reuse the page's cached query. */
function DoctorName({ id }: { id: string }) {
  const { data, isPending } = useDoctor(id);
  if (isPending) return <Skeleton className="h-4 w-24" />;
  return <>{data?.name ?? "Not found"}</>;
}

function PatientName({ id }: { id: string }) {
  const { data, isPending } = usePatient(id);
  if (isPending) return <Skeleton className="h-4 w-24" />;
  return <>{data?.name ?? "Not found"}</>;
}

function buildCrumbs(pathname: string): Crumb[] {
  const [section, id] = pathname.split("/").filter(Boolean);
  const root = section ? SECTIONS[section] : undefined;
  if (!root) return [{ label: "Page not found" }];
  if (!id) return [{ label: root.label }];
  const leaf =
    section === "doctors" ? (
      <DoctorName id={id} />
    ) : section === "patients" ? (
      <PatientName id={id} />
    ) : (
      "Details"
    );
  return [{ label: root.label, href: root.href }, { label: leaf }];
}

export const Breadcrumbs = memo(function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : undefined;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {/* Mobile: only the current page, with a back chevron to its parent. */}
        {parent?.href ? (
          <li className="md:hidden">
            <Link
              href={parent.href}
              aria-label={`Back to ${typeof parent.label === "string" ? parent.label : "list"}`}
              className="-ml-1 inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Link>
          </li>
        ) : null}
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li
              key={index}
              className={isLast ? "flex min-w-0 items-center gap-1.5" : "hidden items-center gap-1.5 md:flex"}
            >
              {index > 0 ? (
                <ChevronRight
                  className="hidden size-3.5 shrink-0 text-muted-foreground md:block"
                  aria-hidden="true"
                />
              ) : null}
              {isLast || !crumb.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="truncate font-medium text-foreground"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
