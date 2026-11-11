import { Types, type QueryFilter } from 'mongoose';
import { Doctor } from '../../models/doctor.model';
import { Patient, type Gender, type PatientAttrs } from '../../models/patient.model';
import type { Paginated } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import { buildCreatedAtCondition } from '../../utils/date-range';
import { buildPagination, toSkip } from '../../utils/pagination';
import { containsRegex } from '../../utils/regex';
import type { SortOrder } from '../../utils/validation';
import { DOCTOR_SUMMARY_FIELDS, toDoctorOptionDto, type DoctorOptionDto } from '../doctors/doctor.service';
import type {
  DoctorPatientBody,
  DoctorPatientsQuery,
  ListPatientsQuery,
  PatientBody,
  PatientSortField,
} from './patient.validation';

export interface PatientDto {
  id: string;
  name: string;
  age: number | null;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  condition: string;
  notes: string | null;
  doctor: DoctorOptionDto;
  createdAt: string;
  updatedAt: string;
}

type PatientRecord = PatientAttrs & { _id: Types.ObjectId };
type SortSpec = Record<string, 1 | -1>;

const PATIENT_FIELDS = 'name age gender phone email condition notes doctorId createdAt updatedAt';

function toPatientDto(patient: PatientRecord, doctor: DoctorOptionDto): PatientDto {
  return {
    id: patient._id.toString(),
    name: patient.name,
    // `?? null`: optional fields are always present in the response, never omitted.
    age: patient.age ?? null,
    gender: patient.gender ?? null,
    phone: patient.phone ?? null,
    email: patient.email ?? null,
    condition: patient.condition,
    notes: patient.notes ?? null,
    doctor,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

/** Defensive fallback only: services guarantee a patient's doctor exists. */
function missingDoctor(doctorId: Types.ObjectId): DoctorOptionDto {
  return { id: doctorId.toString(), name: 'Unknown doctor', specialization: '', hospital: '' };
}

async function findDoctorSummary(doctorId: string): Promise<DoctorOptionDto | null> {
  const doctor = await Doctor.findById(doctorId).select(DOCTOR_SUMMARY_FIELDS).lean();
  return doctor ? toDoctorOptionDto(doctor) : null;
}

/** A `doctorId` in a request body that points at nothing is a validation failure (400), not a 404. */
async function requireAssignableDoctor(doctorId: string): Promise<DoctorOptionDto> {
  const doctor = await findDoctorSummary(doctorId);
  if (!doctor) {
    throw AppError.validation([{ path: 'doctorId', message: 'The selected doctor does not exist' }]);
  }
  return doctor;
}

type PatientFilterInput = Pick<DoctorPatientsQuery, 'search' | 'condition' | 'gender' | 'from' | 'to'> & {
  doctorId?: string;
};

/** Translates validated query params into a MongoDB filter. Exported for `npm run db:explain`. */
export function buildPatientFilter(query: PatientFilterInput): QueryFilter<PatientAttrs> {
  const filter: QueryFilter<PatientAttrs> = {};

  // Equality filters first: they are the leading keys of the compound indexes.
  if (query.doctorId) filter.doctorId = new Types.ObjectId(query.doctorId);
  if (query.condition) filter.condition = query.condition;
  if (query.gender) filter.gender = query.gender;

  const createdAt = buildCreatedAtCondition(query);
  if (createdAt) filter.createdAt = createdAt;

  if (query.search) {
    const pattern = containsRegex(query.search);
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  return filter;
}

/** Stable sorts whose key order mirrors the indexes - see `buildDoctorSort`. */
export function buildPatientSort(sortBy: PatientSortField, sortOrder: SortOrder): SortSpec {
  const direction = sortOrder === 'asc' ? 1 : -1;
  const inverse = direction === 1 ? -1 : 1;
  switch (sortBy) {
    case 'name':
      return { name: direction, _id: direction };
    case 'condition':
      return { condition: direction, createdAt: inverse, _id: inverse };
    case 'age':
      // Walks { age: 1, _id: 1 }; patients without an age (null) come first in ascending order.
      return { age: direction, _id: direction };
    case 'createdAt':
      return { createdAt: direction, _id: direction };
  }
}

/** Resolves the doctors of one page of patients with a single `$in` query. */
async function loadDoctorSummaries(patients: PatientRecord[]): Promise<Map<string, DoctorOptionDto>> {
  const uniqueIds = [...new Set(patients.map((patient) => patient.doctorId.toString()))];
  if (uniqueIds.length === 0) return new Map();
  const doctors = await Doctor.find({ _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) } })
    .select(DOCTOR_SUMMARY_FIELDS)
    .lean();
  return new Map(doctors.map((doctor) => [doctor._id.toString(), toDoctorOptionDto(doctor)]));
}

async function findPatientPage(
  filter: QueryFilter<PatientAttrs>,
  query: DoctorPatientsQuery,
): Promise<{ patients: PatientRecord[]; total: number }> {
  const hasFilter = Object.keys(filter).length > 0;
  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .select(PATIENT_FIELDS)
      .sort(buildPatientSort(query.sortBy, query.sortOrder))
      .skip(toSkip(query))
      .limit(query.limit)
      .lean(),
    hasFilter ? Patient.countDocuments(filter) : Patient.estimatedDocumentCount(),
  ]);
  return { patients, total };
}

export async function listPatients(query: ListPatientsQuery): Promise<Paginated<PatientDto>> {
  const { patients, total } = await findPatientPage(buildPatientFilter(query), query);
  const doctors = await loadDoctorSummaries(patients);

  return {
    items: patients.map((patient) =>
      toPatientDto(patient, doctors.get(patient.doctorId.toString()) ?? missingDoctor(patient.doctorId)),
    ),
    pagination: buildPagination(query, total),
  };
}

/** `GET /doctors/:id/patients` - the doctor is loaded once and reused for every row. */
export async function listPatientsForDoctor(
  doctorId: string,
  query: DoctorPatientsQuery,
): Promise<Paginated<PatientDto>> {
  const filter = buildPatientFilter({ ...query, doctorId });
  const [doctor, { patients, total }] = await Promise.all([findDoctorSummary(doctorId), findPatientPage(filter, query)]);
  if (!doctor) throw AppError.notFound('Doctor');

  return {
    items: patients.map((patient) => toPatientDto(patient, doctor)),
    pagination: buildPagination(query, total),
  };
}

export async function getPatientById(id: string): Promise<PatientDto> {
  const patient = await Patient.findById(id).select(PATIENT_FIELDS).lean();
  if (!patient) throw AppError.notFound('Patient');
  const doctor = await findDoctorSummary(patient.doctorId.toString());
  return toPatientDto(patient, doctor ?? missingDoctor(patient.doctorId));
}

async function insertPatient(fields: DoctorPatientBody, doctor: DoctorOptionDto): Promise<PatientDto> {
  const patient = await Patient.create({ ...fields, doctorId: new Types.ObjectId(doctor.id) });
  return toPatientDto(patient.toObject(), doctor);
}

export async function createPatient(input: PatientBody): Promise<PatientDto> {
  const { doctorId, ...fields } = input;
  return insertPatient(fields, await requireAssignableDoctor(doctorId));
}

/** `POST /doctors/:id/patients` - here a missing doctor is a missing resource (404). */
export async function createPatientForDoctor(doctorId: string, input: DoctorPatientBody): Promise<PatientDto> {
  const doctor = await findDoctorSummary(doctorId);
  if (!doctor) throw AppError.notFound('Doctor');
  return insertPatient(input, doctor);
}

/** Full replace of the editable fields. A different `doctorId` reassigns the patient. */
export async function updatePatient(id: string, input: PatientBody): Promise<PatientDto> {
  const { doctorId, ...fields } = input;

  const [exists, doctor] = await Promise.all([Patient.exists({ _id: id }), findDoctorSummary(doctorId)]);
  if (!exists) throw AppError.notFound('Patient');
  if (!doctor) {
    throw AppError.validation([{ path: 'doctorId', message: 'The selected doctor does not exist' }]);
  }

  const patient = await Patient.findByIdAndUpdate(
    id,
    { $set: { ...fields, doctorId: new Types.ObjectId(doctor.id) } },
    { returnDocument: 'after', runValidators: true },
  )
    .select(PATIENT_FIELDS)
    .lean();
  if (!patient) throw AppError.notFound('Patient');

  return toPatientDto(patient, doctor);
}

export async function deletePatient(id: string): Promise<void> {
  const deleted = await Patient.findByIdAndDelete(id).select('_id').lean();
  if (!deleted) throw AppError.notFound('Patient');
}

/** Distinct conditions for the filter dropdown (DISTINCT_SCAN over the condition index). */
export async function getPatientFilters(): Promise<{ conditions: string[] }> {
  const conditions = await Patient.distinct('condition');
  return { conditions: conditions.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })) };
}
