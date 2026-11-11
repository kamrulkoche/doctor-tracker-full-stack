import { compactQuery } from "@/lib/url-filters";
import { deleteData, getData, getList, postData, putData } from "@/services/api-client";
import type { Paginated } from "@/types/api";
import type { Patient, PatientFilters, PatientInput, PatientListQuery } from "@/types/models";

export const patientApi = {
  list(query: PatientListQuery, signal?: AbortSignal): Promise<Paginated<Patient>> {
    return getList<Patient>("/patients", { params: compactQuery(query), signal });
  },

  filters(signal?: AbortSignal): Promise<PatientFilters> {
    return getData<PatientFilters>("/patients/filters", { signal });
  },

  get(id: string, signal?: AbortSignal): Promise<Patient> {
    return getData<Patient>(`/patients/${encodeURIComponent(id)}`, { signal });
  },

  create(input: PatientInput): Promise<Patient> {
    return postData<Patient, PatientInput>("/patients", input);
  },

  update(id: string, input: PatientInput): Promise<Patient> {
    return putData<Patient, PatientInput>(`/patients/${encodeURIComponent(id)}`, input);
  },

  remove(id: string): Promise<void> {
    return deleteData(`/patients/${encodeURIComponent(id)}`);
  },
};
