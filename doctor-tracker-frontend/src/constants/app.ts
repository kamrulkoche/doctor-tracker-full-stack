import type { Gender, TimeInterval } from "@/types/models";

export const APP_NAME = "Doctor Tracker";

export const ROUTES = {
  home: "/",
  about: "/about",
  features: "/features",
  howItWorks: "/how-it-works",
  contact: "/contact",
  faq: "/faq",
  privacy: "/privacy",
  terms: "/terms",
  login: "/login",
  dashboard: "/dashboard",
  doctors: "/doctors",
  doctor: (id: string) => `/doctors/${id}`,
  patients: "/patients",
  patient: (id: string) => `/patients/${id}`,
  settings: "/settings",
} as const;

export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MAX_LENGTH = 100;

export const GENDER_OPTIONS: readonly { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

export const GENDER_LABELS: Record<Gender, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
};

export const INTERVAL_OPTIONS: readonly { value: TimeInterval; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/** Short lists merged with whatever the filters endpoints return, as form suggestions. */
export const COMMON_SPECIALIZATIONS = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "General Medicine",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
] as const;

export const COMMON_CONDITIONS = [
  "Arthritis",
  "Asthma",
  "Back Pain",
  "Diabetes",
  "Fracture",
  "Hypertension",
  "Migraine",
  "Seasonal Allergy",
] as const;

/** Contract §4: phone pattern shared by doctors and patients. */
export const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;
export const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
