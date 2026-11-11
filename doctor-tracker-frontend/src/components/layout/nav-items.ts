import { LayoutDashboard, Settings, Stethoscope, Users, type LucideIcon } from "lucide-react";

import { ROUTES } from "@/constants/app";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const MAIN_NAV: readonly NavItem[] = [
  { label: "Dashboard", href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Doctors", href: ROUTES.doctors, icon: Stethoscope },
  { label: "Patients", href: ROUTES.patients, icon: Users },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { label: "Settings", href: ROUTES.settings, icon: Settings },
];

/** Prefix match, so `/doctors/123` lights up "Doctors". */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
