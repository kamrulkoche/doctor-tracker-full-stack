import { z } from "zod";

import { PHONE_PATTERN } from "@/constants/app";
import { parseBaseListState, parseText, type BaseListState, type SearchParamsLike } from "@/lib/url-filters";
import type { Doctor, DoctorInput, DoctorListQuery, DoctorSortField } from "@/types/models";

/** Mirrors the server rules in API_CONTRACT.md §4 so most errors are caught before the request. */
export const doctorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  specialization: z
    .string()
    .trim()
    .min(2, "Specialization must be at least 2 characters")
    .max(80, "Specialization must be at most 80 characters"),
  hospital: z
    .string()
    .trim()
    .min(2, "Hospital must be at least 2 characters")
    .max(120, "Hospital must be at most 120 characters"),
  phone: z
    .string()
    .trim()
    .min(1, "Enter a phone number")
    .regex(PHONE_PATTERN, "Use 7–20 digits; spaces, dashes, brackets and a leading + are allowed"),
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address")
    .max(254, "Email is too long")
    .pipe(z.email("Enter a valid email address")),
});

export type DoctorFormValues = z.infer<typeof doctorSchema>;

export const DOCTOR_FORM_FIELDS = ["name", "specialization", "hospital", "phone", "email"] as const;

export const EMPTY_DOCTOR_FORM: DoctorFormValues = {
  name: "",
  specialization: "",
  hospital: "",
  phone: "",
  email: "",
};

export function doctorToFormValues(doctor: Doctor): DoctorFormValues {
  return {
    name: doctor.name,
    specialization: doctor.specialization,
    hospital: doctor.hospital,
    phone: doctor.phone,
    email: doctor.email,
  };
}

export function toDoctorInput(values: DoctorFormValues): DoctorInput {
  return { ...values, email: values.email.toLowerCase() };
}

/* ------------------------------------------------------------- list state -- */

export const DOCTOR_SORT_FIELDS = [
  "name",
  "specialization",
  "hospital",
  "createdAt",
] as const satisfies readonly DoctorSortField[];

export type DoctorListState = BaseListState<DoctorSortField> & {
  specialization: string | undefined;
  hospital: string | undefined;
};

/** Every URL key the doctors list owns (used by "Reset"). */
export const DOCTOR_LIST_PARAM_KEYS = [
  "page",
  "search",
  "sortBy",
  "sortOrder",
  "from",
  "to",
  "specialization",
  "hospital",
] as const;

export function parseDoctorListState(params: SearchParamsLike): DoctorListState {
  return {
    ...parseBaseListState(params, DOCTOR_SORT_FIELDS),
    specialization: parseText(params.get("specialization"), 80),
    hospital: parseText(params.get("hospital"), 120),
  };
}

export function toDoctorListQuery(state: DoctorListState): DoctorListQuery {
  return {
    page: state.page,
    limit: state.limit,
    search: state.search || undefined,
    sortBy: state.sortBy,
    sortOrder: state.sortBy ? state.sortOrder : undefined,
    from: state.from,
    to: state.to,
    specialization: state.specialization,
    hospital: state.hospital,
  };
}
