import { z } from "zod";

import { OBJECT_ID_PATTERN, PHONE_PATTERN } from "@/constants/app";
import {
  parseBaseListState,
  parseEnum,
  parseObjectId,
  parseText,
  type BaseListState,
  type SearchParamsLike,
} from "@/lib/url-filters";
import type {
  DoctorPatientListQuery,
  Gender,
  Patient,
  PatientInput,
  PatientListQuery,
  PatientSortField,
} from "@/types/models";

export const GENDERS = ["male", "female", "other"] as const satisfies readonly Gender[];

/**
 * Form values are strings (what inputs hold); `toPatientInput` converts them to the wire
 * shape. Optional fields accept "" as "unset", matching API_CONTRACT.md §5.
 */
export const patientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  condition: z
    .string()
    .trim()
    .min(2, "Condition must be at least 2 characters")
    .max(120, "Condition must be at most 120 characters"),
  doctorId: z.string().regex(OBJECT_ID_PATTERN, "Select the assigned doctor"),
  age: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{1,3}$/.test(value), "Age must be a whole number")
    .refine((value) => value === "" || Number(value) <= 130, "Age must be between 0 and 130"),
  gender: z.enum(["", ...GENDERS]),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || PHONE_PATTERN.test(value),
      "Use 7–20 digits; spaces, dashes, brackets and a leading + are allowed",
    ),
  email: z
    .string()
    .trim()
    .max(254, "Email is too long")
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address"),
  notes: z.string().max(2000, "Notes must be at most 2000 characters"),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

export const PATIENT_FORM_FIELDS = [
  "name",
  "condition",
  "doctorId",
  "age",
  "gender",
  "phone",
  "email",
  "notes",
] as const;

export const EMPTY_PATIENT_FORM: PatientFormValues = {
  name: "",
  condition: "",
  doctorId: "",
  age: "",
  gender: "",
  phone: "",
  email: "",
  notes: "",
};

export function patientToFormValues(patient: Patient): PatientFormValues {
  return {
    name: patient.name,
    condition: patient.condition,
    doctorId: patient.doctor.id,
    age: patient.age === null ? "" : String(patient.age),
    gender: patient.gender ?? "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    notes: patient.notes ?? "",
  };
}

export function toPatientInput(values: PatientFormValues): PatientInput {
  const notes = values.notes.trim();
  return {
    name: values.name,
    condition: values.condition,
    doctorId: values.doctorId,
    age: values.age === "" ? null : Number(values.age),
    gender: values.gender === "" ? null : values.gender,
    phone: values.phone === "" ? null : values.phone,
    email: values.email === "" ? null : values.email.toLowerCase(),
    notes: notes === "" ? null : notes,
  };
}

/** PUT is a full replace, so reassigning sends every field back with the new doctor. */
export function patientToInput(patient: Patient, doctorId = patient.doctor.id): PatientInput {
  return {
    name: patient.name,
    condition: patient.condition,
    doctorId,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email,
    notes: patient.notes,
  };
}

/* ------------------------------------------------------------- list state -- */

export const PATIENT_SORT_FIELDS = [
  "name",
  "age",
  "condition",
  "createdAt",
] as const satisfies readonly PatientSortField[];

export type PatientListState = BaseListState<PatientSortField> & {
  condition: string | undefined;
  doctorId: string | undefined;
  gender: Gender | undefined;
};

export const PATIENT_LIST_PARAM_KEYS = [
  "page",
  "search",
  "sortBy",
  "sortOrder",
  "from",
  "to",
  "condition",
  "doctorId",
  "gender",
] as const;

export function parsePatientListState(params: SearchParamsLike): PatientListState {
  return {
    ...parseBaseListState(params, PATIENT_SORT_FIELDS),
    condition: parseText(params.get("condition"), 120),
    doctorId: parseObjectId(params.get("doctorId")),
    gender: parseEnum(params.get("gender"), GENDERS),
  };
}

export function toPatientListQuery(state: PatientListState): PatientListQuery {
  return {
    page: state.page,
    limit: state.limit,
    search: state.search || undefined,
    sortBy: state.sortBy,
    sortOrder: state.sortBy ? state.sortOrder : undefined,
    from: state.from,
    to: state.to,
    condition: state.condition,
    doctorId: state.doctorId,
    gender: state.gender,
  };
}

export function toDoctorPatientListQuery(state: PatientListState): DoctorPatientListQuery {
  const query = toPatientListQuery(state);
  delete query.doctorId;
  return query;
}
