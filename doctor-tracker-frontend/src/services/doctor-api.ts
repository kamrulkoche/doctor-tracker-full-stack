import { compactQuery } from "@/lib/url-filters";
import { deleteData, getData, getList, postData, putData } from "@/services/api-client";
import type { Paginated } from "@/types/api";
import type {
  Doctor,
  DoctorFilters,
  DoctorInput,
  DoctorListQuery,
  DoctorOption,
  DoctorPatientInput,
  DoctorPatientListQuery,
  Patient,
} from "@/types/models";

export const doctorApi = {
  list(query: DoctorListQuery, signal?: AbortSignal): Promise<Paginated<Doctor>> {
    return getList<Doctor>("/doctors", { params: compactQuery(query), signal });
  },

  filters(signal?: AbortSignal): Promise<DoctorFilters> {
    return getData<DoctorFilters>("/doctors/filters", { signal });
  },

  options(query: { search?: string; limit?: number }, signal?: AbortSignal): Promise<DoctorOption[]> {
    return getData<DoctorOption[]>("/doctors/options", { params: compactQuery(query), signal });
  },

  get(id: string, signal?: AbortSignal): Promise<Doctor> {
    return getData<Doctor>(`/doctors/${encodeURIComponent(id)}`, { signal });
  },

  create(input: DoctorInput): Promise<Doctor> {
    return postData<Doctor, DoctorInput>("/doctors", input);
  },

  update(id: string, input: DoctorInput): Promise<Doctor> {
    return putData<Doctor, DoctorInput>(`/doctors/${encodeURIComponent(id)}`, input);
  },

  remove(id: string): Promise<void> {
    return deleteData(`/doctors/${encodeURIComponent(id)}`);
  },

  patients(id: string, query: DoctorPatientListQuery, signal?: AbortSignal): Promise<Paginated<Patient>> {
    return getList<Patient>(`/doctors/${encodeURIComponent(id)}/patients`, {
      params: compactQuery(query),
      signal,
    });
  },

  addPatient(id: string, input: DoctorPatientInput): Promise<Patient> {
    return postData<Patient, DoctorPatientInput>(`/doctors/${encodeURIComponent(id)}/patients`, input);
  },
};
