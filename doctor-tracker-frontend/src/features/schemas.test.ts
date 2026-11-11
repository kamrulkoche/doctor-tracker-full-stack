import { describe, expect, it } from "vitest";

import { loginSchema } from "@/features/auth/schemas";
import {
  allowedIntervalsFor,
  daysInRange,
  defaultIntervalFor,
  parseDashboardRange,
  resolvePresetRange,
  todayUTC,
} from "@/features/dashboard/range";
import { doctorSchema, doctorToFormValues, toDoctorInput } from "@/features/doctors/schemas";
import {
  EMPTY_PATIENT_FORM,
  patientSchema,
  patientToFormValues,
  patientToInput,
  toPatientInput,
} from "@/features/patients/schemas";
import type { Doctor, Patient } from "@/types/models";

const DOCTOR_ID = "64b7f0c2a1b2c3d4e5f60718";

const validDoctor = {
  name: "Dr. Sara Khan",
  specialization: "Cardiology",
  hospital: "City General Hospital",
  phone: "+880 1700-000000",
  email: "Sara.Khan@Hospital.org",
};

function issuePaths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  return result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.path.join("."));
}

describe("loginSchema", () => {
  it("accepts valid credentials and trims the email", () => {
    const result = loginSchema.safeParse({ email: "  admin@doctortracker.dev ", password: "Admin@12345" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("admin@doctortracker.dev");
  });

  it("requires both fields and a well-formed email", () => {
    expect(issuePaths(loginSchema.safeParse({ email: "", password: "" }))).toEqual(
      expect.arrayContaining(["email", "password"]),
    );
    expect(issuePaths(loginSchema.safeParse({ email: "not-an-email", password: "x" }))).toEqual(["email"]);
  });

  it("does not trim the password", () => {
    const result = loginSchema.safeParse({ email: "a@b.co", password: "  spaced  " });
    expect(result.success && result.data.password).toBe("  spaced  ");
  });
});

describe("doctorSchema", () => {
  it("accepts a valid doctor and trims strings", () => {
    const result = doctorSchema.safeParse({ ...validDoctor, name: "  Dr. Sara Khan  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Dr. Sara Khan");
  });

  it("enforces the contract's length limits", () => {
    expect(issuePaths(doctorSchema.safeParse({ ...validDoctor, name: "A" }))).toEqual(["name"]);
    expect(issuePaths(doctorSchema.safeParse({ ...validDoctor, name: "A".repeat(101) }))).toEqual(["name"]);
    expect(issuePaths(doctorSchema.safeParse({ ...validDoctor, specialization: "A".repeat(81) }))).toEqual([
      "specialization",
    ]);
    expect(issuePaths(doctorSchema.safeParse({ ...validDoctor, hospital: "A".repeat(121) }))).toEqual([
      "hospital",
    ]);
    expect(doctorSchema.safeParse({ ...validDoctor, hospital: "A".repeat(120) }).success).toBe(true);
  });

  it("validates the phone pattern", () => {
    for (const phone of ["+8801700000000", "(02) 555-0199", "0170 000 0000"]) {
      expect(doctorSchema.safeParse({ ...validDoctor, phone }).success).toBe(true);
    }
    for (const phone of ["12345", "phone", "+880 1700 000000 ext 4", "1".repeat(21), ""]) {
      expect(issuePaths(doctorSchema.safeParse({ ...validDoctor, phone }))).toContain("phone");
    }
  });

  it("rejects invalid emails", () => {
    expect(issuePaths(doctorSchema.safeParse({ ...validDoctor, email: "sara@" }))).toEqual(["email"]);
    expect(issuePaths(doctorSchema.safeParse({ ...validDoctor, email: "" }))).toContain("email");
  });

  it("lowercases the email on the way out and maps a doctor back to form values", () => {
    expect(toDoctorInput(validDoctor).email).toBe("sara.khan@hospital.org");
    const doctor: Doctor = {
      id: DOCTOR_ID,
      ...validDoctor,
      patientCount: 4,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    expect(doctorToFormValues(doctor)).toEqual(validDoctor);
  });
});

describe("patientSchema", () => {
  const minimal = { ...EMPTY_PATIENT_FORM, name: "Amir Ali", condition: "Asthma", doctorId: DOCTOR_ID };

  it("accepts the required fields alone", () => {
    expect(patientSchema.safeParse(minimal).success).toBe(true);
  });

  it("requires name, condition and a doctor", () => {
    expect(issuePaths(patientSchema.safeParse(EMPTY_PATIENT_FORM))).toEqual(
      expect.arrayContaining(["name", "condition", "doctorId"]),
    );
    expect(issuePaths(patientSchema.safeParse({ ...minimal, doctorId: "abc" }))).toEqual(["doctorId"]);
  });

  it("validates age as a whole number between 0 and 130", () => {
    for (const age of ["0", "34", "130", ""]) {
      expect(patientSchema.safeParse({ ...minimal, age }).success).toBe(true);
    }
    for (const age of ["131", "-1", "3.5", "abc", "1e2"]) {
      expect(issuePaths(patientSchema.safeParse({ ...minimal, age }))).toContain("age");
    }
  });

  it("validates optional phone, email, gender and notes only when filled in", () => {
    expect(patientSchema.safeParse({ ...minimal, phone: "+880 1700 000000", email: "a@b.co" }).success).toBe(
      true,
    );
    expect(issuePaths(patientSchema.safeParse({ ...minimal, phone: "123" }))).toEqual(["phone"]);
    expect(issuePaths(patientSchema.safeParse({ ...minimal, email: "nope" }))).toEqual(["email"]);
    expect(issuePaths(patientSchema.safeParse({ ...minimal, gender: "unknown" }))).toEqual(["gender"]);
    expect(issuePaths(patientSchema.safeParse({ ...minimal, notes: "x".repeat(2001) }))).toEqual(["notes"]);
    expect(patientSchema.safeParse({ ...minimal, notes: "x".repeat(2000) }).success).toBe(true);
  });

  it("converts form values to the wire shape, turning blanks into null", () => {
    expect(toPatientInput(minimal)).toEqual({
      name: "Amir Ali",
      condition: "Asthma",
      doctorId: DOCTOR_ID,
      age: null,
      gender: null,
      phone: null,
      email: null,
      notes: null,
    });
    expect(
      toPatientInput({
        ...minimal,
        age: "0",
        gender: "male",
        phone: "+880 1700 000000",
        email: "Amir@Example.com",
        notes: "  Allergic to penicillin  ",
      }),
    ).toEqual({
      name: "Amir Ali",
      condition: "Asthma",
      doctorId: DOCTOR_ID,
      age: 0,
      gender: "male",
      phone: "+880 1700 000000",
      email: "amir@example.com",
      notes: "Allergic to penicillin",
    });
  });

  it("round-trips a patient through the form and builds a reassignment body", () => {
    const patient: Patient = {
      id: "74b7f0c2a1b2c3d4e5f60718",
      name: "Amir Ali",
      age: 34,
      gender: "male",
      phone: null,
      email: null,
      condition: "Asthma",
      notes: null,
      doctor: {
        id: DOCTOR_ID,
        name: "Dr. Sara Khan",
        specialization: "Cardiology",
        hospital: "City General",
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const values = patientToFormValues(patient);
    expect(values).toEqual({ ...minimal, age: "34", gender: "male" });
    expect(patientSchema.safeParse(values).success).toBe(true);

    const other = "84b7f0c2a1b2c3d4e5f60718";
    expect(patientToInput(patient, other)).toEqual({
      name: "Amir Ali",
      condition: "Asthma",
      doctorId: other,
      age: 34,
      gender: "male",
      phone: null,
      email: null,
      notes: null,
    });
    expect(patientToInput(patient).doctorId).toBe(DOCTOR_ID);
  });
});

describe("dashboard range", () => {
  const TODAY = "2026-11-11";
  const params = (query: string) => new URLSearchParams(query);

  it("derives today's UTC date", () => {
    expect(todayUTC(new Date("2026-11-11T23:30:00.000Z"))).toBe("2026-11-11");
  });

  it("resolves presets to inclusive ranges ending today", () => {
    expect(resolvePresetRange("30d", TODAY)).toEqual({ from: "2026-10-13", to: TODAY });
    expect(daysInRange(resolvePresetRange("30d", TODAY))).toBe(30);
    expect(daysInRange(resolvePresetRange("90d", TODAY))).toBe(90);
    expect(resolvePresetRange("6m", TODAY)).toEqual({ from: "2026-05-12", to: TODAY });
    expect(resolvePresetRange("12m", TODAY)).toEqual({ from: "2025-11-12", to: TODAY });
    expect(resolvePresetRange("all", TODAY)).toEqual({});
  });

  it("clamps month arithmetic at month ends", () => {
    expect(resolvePresetRange("6m", "2026-08-31")).toEqual({ from: "2026-03-01", to: "2026-08-31" });
    expect(resolvePresetRange("12m", "2024-02-29").from).toBe("2023-03-01");
  });

  it("picks a readable interval for the span", () => {
    expect(defaultIntervalFor(resolvePresetRange("30d", TODAY))).toBe("day");
    expect(defaultIntervalFor(resolvePresetRange("90d", TODAY))).toBe("week");
    expect(defaultIntervalFor(resolvePresetRange("6m", TODAY))).toBe("week");
    expect(defaultIntervalFor(resolvePresetRange("12m", TODAY))).toBe("month");
    expect(defaultIntervalFor({})).toBe("month");
  });

  it("keeps time series under the API bucket cap", () => {
    expect(allowedIntervalsFor(resolvePresetRange("12m", TODAY))).toEqual(["day", "week", "month"]);
    expect(allowedIntervalsFor({ from: "2020-01-01", to: "2026-11-11" })).toEqual(["week", "month"]);
    expect(allowedIntervalsFor({ from: "2000-01-01", to: "2026-11-11" })).toEqual(["month"]);
    expect(allowedIntervalsFor({ from: "2000-01-01" })).toEqual(["month"]);
    expect(allowedIntervalsFor({})).toEqual(["day", "week", "month"]);
  });

  it("defaults to the last 12 months", () => {
    const state = parseDashboardRange(params(""), TODAY);
    expect(state.rangeId).toBe("12m");
    expect(state.label).toBe("Last 12 months");
    expect(state.interval).toBe("month");
    expect(state.range).toEqual({ from: "2025-11-12", to: TODAY });
  });

  it("honours a preset and an explicit interval", () => {
    const state = parseDashboardRange(params("range=30d&interval=week"), TODAY);
    expect(state.rangeId).toBe("30d");
    expect(state.interval).toBe("week");
  });

  it("parses a custom range and labels it with the dates", () => {
    const state = parseDashboardRange(params("range=custom&from=2026-10-01&to=2026-10-31"), TODAY);
    expect(state.rangeId).toBe("custom");
    expect(state.range).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(state.label).toBe("1 Oct – 31 Oct 2026");
    expect(state.interval).toBe("day");
  });

  it("falls back to the default for invalid or inverted custom ranges and unknown presets", () => {
    expect(parseDashboardRange(params("range=custom"), TODAY).rangeId).toBe("12m");
    expect(parseDashboardRange(params("range=custom&from=2026-10-31&to=2026-10-01"), TODAY).rangeId).toBe(
      "12m",
    );
    expect(parseDashboardRange(params("range=forever"), TODAY).rangeId).toBe("12m");
  });

  it("ignores an interval that would exceed the bucket cap", () => {
    const state = parseDashboardRange(
      params("range=custom&from=2015-01-01&to=2026-11-11&interval=day"),
      TODAY,
    );
    expect(state.allowedIntervals).toEqual(["week", "month"]);
    expect(state.interval).toBe("month");
  });

  it("sends no dates for all time", () => {
    const state = parseDashboardRange(params("range=all"), TODAY);
    expect(state.range).toEqual({});
    expect(state.label).toBe("All time");
  });
});
