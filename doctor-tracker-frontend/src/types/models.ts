/** Domain types, mirrored one-to-one from documentation/API_CONTRACT.md §2, §4, §5, §6. */
import type { ListQuery } from "@/types/api";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin";
};

export type Doctor = {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  patientCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DoctorInput = Pick<Doctor, "name" | "specialization" | "hospital" | "phone" | "email">;

export type DoctorOption = Pick<Doctor, "id" | "name" | "specialization" | "hospital">;

export type DoctorSortField = "name" | "specialization" | "hospital" | "createdAt";

export type DoctorListQuery = ListQuery<DoctorSortField> & {
  specialization?: string;
  hospital?: string;
};

export type DoctorFilters = {
  specializations: string[];
  hospitals: string[];
};

export type Gender = "male" | "female" | "other";

export type Patient = {
  id: string;
  name: string;
  age: number | null;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  condition: string;
  notes: string | null;
  doctor: DoctorOption;
  createdAt: string;
  updatedAt: string;
};

export type PatientInput = {
  name: string;
  condition: string;
  doctorId: string;
  age?: number | null;
  gender?: Gender | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

/** Body of POST /doctors/:id/patients — the doctor comes from the path. */
export type DoctorPatientInput = Omit<PatientInput, "doctorId">;

export type PatientSortField = "name" | "age" | "condition" | "createdAt";

export type PatientListQuery = ListQuery<PatientSortField> & {
  condition?: string;
  doctorId?: string;
  gender?: Gender;
};

/** GET /doctors/:id/patients takes the same params minus doctorId. */
export type DoctorPatientListQuery = Omit<PatientListQuery, "doctorId">;

export type PatientFilters = {
  conditions: string[];
};

export type DashboardStats = {
  totalDoctors: number;
  totalPatients: number;
  totalSpecializations: number;
  newPatientsThisMonth: number;
  newPatientsLastMonth: number;
  newDoctorsThisMonth: number;
  averagePatientsPerDoctor: number;
};

export type TimeInterval = "day" | "week" | "month";

export type TimeSeriesPoint = {
  date: string;
  count: number;
  cumulative: number;
};

export type TimeSeries = {
  interval: TimeInterval;
  from: string;
  to: string;
  total: number;
  points: TimeSeriesPoint[];
};

export type DoctorPatientCount = {
  doctorId: string;
  name: string;
  specialization: string;
  hospital: string;
  patientCount: number;
};

export type ConditionDistributionItem = {
  condition: string;
  count: number;
  percentage: number;
};

export type ConditionDistribution = {
  total: number;
  items: ConditionDistributionItem[];
};

export type SpecializationDistributionItem = {
  specialization: string;
  doctorCount: number;
  patientCount: number;
};

export type DoctorStatistics = {
  doctorsOverTime: TimeSeries;
  specializationDistribution: SpecializationDistributionItem[];
};

export type RecentDoctor = Pick<Doctor, "id" | "name" | "specialization" | "hospital" | "createdAt">;
export type RecentPatient = Pick<Patient, "id" | "name" | "condition" | "doctor" | "createdAt">;

export type RecentActivity = {
  recentDoctors: RecentDoctor[];
  recentPatients: RecentPatient[];
  topDoctors: DoctorPatientCount[];
};
