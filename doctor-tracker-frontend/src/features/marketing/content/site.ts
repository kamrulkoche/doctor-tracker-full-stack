import {
  Activity,
  CalendarClock,
  ClipboardList,
  FileHeart,
  LayoutDashboard,
  Pill,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "@/constants/app";

/**
 * Shared content for the public website. Everything here is presentation copy: no API
 * call reads it and nothing in the admin console depends on it.
 */

export type NavLink = { label: string; href: string };

export const SITE_NAV: readonly NavLink[] = [
  { label: "Features", href: ROUTES.features },
  { label: "How it works", href: ROUTES.howItWorks },
  { label: "About", href: ROUTES.about },
  { label: "FAQ", href: ROUTES.faq },
  { label: "Contact", href: ROUTES.contact },
];

export const FOOTER_COLUMNS: readonly { title: string; links: readonly NavLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: ROUTES.features },
      { label: "How it works", href: ROUTES.howItWorks },
      { label: "Admin sign in", href: ROUTES.login },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: ROUTES.about },
      { label: "Contact", href: ROUTES.contact },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: ROUTES.faq },
      { label: "Privacy policy", href: ROUTES.privacy },
      { label: "Terms & conditions", href: ROUTES.terms },
    ],
  },
];

/** Placeholder contact details — replace before launch. */
export const CONTACT = {
  email: "hello@doctortracker.example",
  supportEmail: "support@doctortracker.example",
  phone: "+1 (555) 010-0199",
  hours: "Monday to Friday, 9:00–17:00",
  address: "Placeholder address, City, Country",
} as const;

export const COPYRIGHT_YEAR = 2026;

/**
 * `available` marks what the admin console does today; `planned` marks roadmap items, so
 * the public site never presents an unbuilt module as a shipped one.
 */
export type FeatureStatus = "available" | "planned";

export type Feature = {
  id: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  status: FeatureStatus;
  points: readonly string[];
};

export const FEATURES: readonly Feature[] = [
  {
    id: "doctors",
    icon: Stethoscope,
    title: "Doctor management",
    summary:
      "A single directory of every doctor in your network, with specialization, hospital, contact details and live patient counts.",
    status: "available",
    points: [
      "Add, edit and remove doctor profiles with validated contact fields",
      "See each doctor's assigned patients on their profile",
      "Filter the directory by specialization or hospital",
    ],
  },
  {
    id: "patients",
    icon: Users,
    title: "Patient management",
    summary:
      "Keep patient records organised by condition and assigned doctor, and move patients between doctors in one step.",
    status: "available",
    points: [
      "Record age, gender, contact details, condition and notes",
      "Reassign a patient to another doctor without re-entering data",
      "Add patients directly from a doctor's profile",
    ],
  },
  {
    id: "analytics",
    icon: LayoutDashboard,
    title: "Dashboard analytics",
    summary:
      "An overview that answers the operational questions first: how the patient base is growing and where the load sits.",
    status: "available",
    points: [
      "Patient growth by day, week or month over any date range",
      "Patients per doctor and condition distribution charts",
      "A recent-activity feed of new doctors and patients",
    ],
  },
  {
    id: "search",
    icon: Search,
    title: "Search and filtering",
    summary:
      "Find any record in seconds with instant search, combinable filters and sorting that survive a page refresh.",
    status: "available",
    points: [
      "Debounced search across names, conditions and hospitals",
      "Combine filters and sort by any column",
      "Filters live in the URL, so a filtered view can be bookmarked or shared",
    ],
  },
  {
    id: "appointments",
    icon: CalendarClock,
    title: "Appointment management",
    summary:
      "Schedule, reschedule and track visits against each doctor's availability, with a day and week view.",
    status: "planned",
    points: [
      "Calendar view per doctor",
      "Booking, rescheduling and cancellation with status history",
      "Upcoming-visit reminders",
    ],
  },
  {
    id: "records",
    icon: FileHeart,
    title: "Medical records",
    summary:
      "Structured visit history for each patient, building on the notes field the platform already keeps today.",
    status: "planned",
    points: [
      "Chronological visit timeline per patient",
      "Structured diagnoses and observations",
      "Attachment support for reports",
    ],
  },
  {
    id: "prescriptions",
    icon: Pill,
    title: "Prescription management",
    summary: "Issue and track prescriptions alongside the patient record, with a clear history of changes.",
    status: "planned",
    points: [
      "Medication, dosage and duration fields",
      "Prescription history per patient",
      "Printable prescription summaries",
    ],
  },
];

export const AVAILABLE_FEATURES = FEATURES.filter((feature) => feature.status === "available");

/** Product facts, not usage metrics: every line here is true of the app as built. */
export const HIGHLIGHTS: readonly { value: string; label: string }[] = [
  { value: "3", label: "Core workspaces: dashboard, doctors and patients" },
  { value: "4", label: "Analytics views across any date range" },
  { value: "2", label: "Themes, light and dark, both WCAG AA contrast" },
  { value: "320px+", label: "Responsive from small phones to wide desktops" },
];

export const TRUST_POINTS: readonly { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ShieldCheck,
    title: "Secure admin access",
    description: "Session-based sign-in with protected routes; every page behind the console requires an account.",
  },
  {
    icon: Activity,
    title: "Built for daily use",
    description: "Dense, keyboard-friendly tables and a predictable layout on every screen.",
  },
  {
    icon: ClipboardList,
    title: "Clean, validated data",
    description: "Every form validates input before it is saved, so the directory stays consistent.",
  },
];
