import { LayoutDashboard, Search, Settings, Stethoscope, Users } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A static, illustrative rendering of the admin dashboard built from the same tokens as
 * the real console. Values are sample data; the figure is labelled as such for assistive
 * technology and in its caption.
 */

const STATS = [
  { label: "Doctors", value: "24" },
  { label: "Patients", value: "260" },
  { label: "This month", value: "38" },
  { label: "Per doctor", value: "10.8" },
];

const BARS = [
  { label: "Cardiology", value: 92 },
  { label: "Pediatrics", value: 74 },
  { label: "Neurology", value: 61 },
  { label: "Orthopedics", value: 48 },
];

const ROWS = [
  { name: "Sample patient A", condition: "Hypertension", doctor: "Dr. Sample One" },
  { name: "Sample patient B", condition: "Asthma", doctor: "Dr. Sample Two" },
  { name: "Sample patient C", condition: "Migraine", doctor: "Dr. Sample Three" },
];

// Sample growth series, 12 points, drawn into a 300x100 viewBox.
const SERIES = [18, 22, 21, 30, 34, 33, 41, 46, 52, 55, 63, 70];
const LINE = SERIES.map((value, index) => `${(index / (SERIES.length - 1)) * 300},${100 - value}`).join(" L");
const AREA = `M0,100 L${LINE} L300,100 Z`;

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Stethoscope, label: "Doctors", active: false },
  { icon: Users, label: "Patients", active: false },
];

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <figure className={cn("relative", className)}>
      <div
        role="img"
        aria-label="Illustration of the Doctor Tracker dashboard with sample statistics, a patient growth chart, patients by specialization and a recent patients table."
        className="overflow-hidden rounded-xl border bg-card shadow-[0_24px_48px_-24px_color-mix(in_oklch,var(--foreground)_25%,transparent)]"
      >
        {/* Window chrome */}
        <div className="flex h-9 items-center gap-1.5 border-b bg-muted/60 px-3" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="mx-auto hidden h-5 w-56 items-center justify-center rounded-md border bg-background text-[10px] text-muted-foreground sm:flex">
            app.doctortracker / dashboard
          </span>
        </div>

        <div className="flex" aria-hidden="true">
          {/* Sidebar */}
          <div className="hidden w-40 shrink-0 border-r bg-sidebar p-3 md:block">
            <div className="flex items-center gap-2 px-1 pb-4">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Stethoscope className="size-3.5" />
              </span>
              <span className="text-xs font-semibold">Doctor Tracker</span>
            </div>
            <div className="grid gap-1">
              {NAV.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex h-7 items-center gap-2 rounded-md px-2 text-[11px]",
                    item.active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </div>
              ))}
            </div>
            <div className="mt-24 flex h-7 items-center gap-2 rounded-md px-2 text-[11px] text-muted-foreground">
              <Settings className="size-3.5" />
              Settings
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 bg-background p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold sm:text-sm">Dashboard</span>
              <span className="flex h-6 w-28 items-center gap-1.5 rounded-md border bg-card px-2 text-[10px] text-muted-foreground sm:w-40">
                <Search className="size-3" />
                Search
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-md border bg-card p-2.5">
                  <div className="truncate text-[10px] text-muted-foreground">{stat.label}</div>
                  <div className="mt-1 text-base font-semibold tabular-nums">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-2 grid gap-2 lg:grid-cols-5">
              <div className="rounded-md border bg-card p-2.5 lg:col-span-3">
                <div className="text-[10px] font-medium">Patient growth</div>
                <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="mt-2 h-20 w-full sm:h-24">
                  {[25, 50, 75].map((y) => (
                    <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
                  ))}
                  <path d={AREA} fill="var(--chart-1)" fillOpacity="0.15" />
                  <path
                    d={`M${LINE}`}
                    fill="none"
                    stroke="var(--chart-1)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <div className="rounded-md border bg-card p-2.5 lg:col-span-2">
                <div className="text-[10px] font-medium">By specialization</div>
                <div className="mt-2 grid gap-1.5">
                  {BARS.map((bar) => (
                    <div key={bar.label} className="grid gap-1">
                      <span className="truncate text-[10px] text-muted-foreground">{bar.label}</span>
                      <span className="h-1.5 w-full rounded-sm bg-muted">
                        <span className="block h-full rounded-sm bg-chart-1" style={{ width: `${bar.value}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-2 hidden rounded-md border bg-card sm:block">
              <div className="grid grid-cols-3 border-b px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground">
                <span>Patient</span>
                <span>Condition</span>
                <span>Doctor</span>
              </div>
              {ROWS.map((row) => (
                <div
                  key={row.name}
                  className="grid grid-cols-3 border-b px-2.5 py-1.5 text-[10px] last:border-b-0"
                >
                  <span className="truncate font-medium">{row.name}</span>
                  <span className="truncate text-muted-foreground">{row.condition}</span>
                  <span className="truncate text-muted-foreground">{row.doctor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted-foreground">
        Illustrative preview with sample data.
      </figcaption>
    </figure>
  );
}
