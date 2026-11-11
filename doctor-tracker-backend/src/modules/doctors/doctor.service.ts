import { Types, type QueryFilter } from 'mongoose';
import { Doctor, type DoctorAttrs } from '../../models/doctor.model';
import { Patient } from '../../models/patient.model';
import type { Paginated } from '../../utils/api-response';
import { AppError } from '../../utils/app-error';
import { buildCreatedAtCondition } from '../../utils/date-range';
import { buildPagination, toSkip } from '../../utils/pagination';
import { containsRegex } from '../../utils/regex';
import type { SortOrder } from '../../utils/validation';
import type { DoctorBody, DoctorOptionsQuery, DoctorSortField, ListDoctorsQuery } from './doctor.validation';

export interface DoctorDto {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  patientCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorOptionDto {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
}

export interface DoctorFiltersDto {
  specializations: string[];
  hospitals: string[];
}

type DoctorRecord = DoctorAttrs & { _id: Types.ObjectId };
type SortSpec = Record<string, 1 | -1>;

const DOCTOR_FIELDS = 'name specialization hospital phone email createdAt updatedAt';
export const DOCTOR_SUMMARY_FIELDS = 'name specialization hospital';

function toDoctorDto(doctor: DoctorRecord, patientCount: number): DoctorDto {
  return {
    id: doctor._id.toString(),
    name: doctor.name,
    specialization: doctor.specialization,
    hospital: doctor.hospital,
    phone: doctor.phone,
    email: doctor.email,
    patientCount,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
  };
}

export function toDoctorOptionDto(doctor: Pick<DoctorRecord, '_id' | 'name' | 'specialization' | 'hospital'>): DoctorOptionDto {
  return {
    id: doctor._id.toString(),
    name: doctor.name,
    specialization: doctor.specialization,
    hospital: doctor.hospital,
  };
}

type DoctorFilterInput = Pick<ListDoctorsQuery, 'search' | 'specialization' | 'hospital' | 'from' | 'to'>;

/** Translates validated query params into a MongoDB filter. Exported for `npm run db:explain`. */
export function buildDoctorFilter(query: DoctorFilterInput): QueryFilter<DoctorAttrs> {
  const filter: QueryFilter<DoctorAttrs> = {};

  // Equality filters first: they are the leading keys of the compound indexes.
  if (query.specialization) filter.specialization = query.specialization;
  if (query.hospital) filter.hospital = query.hospital;

  const createdAt = buildCreatedAtCondition(query);
  if (createdAt) filter.createdAt = createdAt;

  if (query.search) {
    const pattern = containsRegex(query.search);
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  return filter;
}

/**
 * Every sort ends in `_id`, so equal values never reorder between pages. The key order and
 * directions mirror the compound indexes exactly, letting MongoDB walk an index (forwards or
 * backwards) instead of sorting in memory.
 */
export function buildDoctorSort(sortBy: DoctorSortField, sortOrder: SortOrder): SortSpec {
  const direction = sortOrder === 'asc' ? 1 : -1;
  const inverse = direction === 1 ? -1 : 1;
  switch (sortBy) {
    case 'name':
      return { name: direction, _id: direction };
    case 'specialization':
      return { specialization: direction, createdAt: inverse, _id: inverse };
    case 'hospital':
      return { hospital: direction, createdAt: inverse, _id: inverse };
    case 'createdAt':
      return { createdAt: direction, _id: direction };
  }
}

/**
 * Patient counts for a set of doctors in ONE grouped aggregation (never one query per row).
 * The `$match` + `$group` only read `doctorId`, so the `{ doctorId, createdAt, _id }` index
 * covers the whole pipeline and no patient document is fetched.
 */
export async function countPatientsByDoctor(doctorIds: Types.ObjectId[]): Promise<Map<string, number>> {
  if (doctorIds.length === 0) return new Map();
  const rows = await Patient.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { doctorId: { $in: doctorIds } } },
    { $group: { _id: '$doctorId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

export async function listDoctors(query: ListDoctorsQuery): Promise<Paginated<DoctorDto>> {
  const filter = buildDoctorFilter(query);
  const hasFilter = Object.keys(filter).length > 0;

  // Page and total run in parallel. Without a filter the total comes from collection
  // metadata (O(1)) instead of counting documents.
  const [doctors, total] = await Promise.all([
    Doctor.find(filter)
      .select(DOCTOR_FIELDS)
      .sort(buildDoctorSort(query.sortBy, query.sortOrder))
      .skip(toSkip(query))
      .limit(query.limit)
      .lean(),
    hasFilter ? Doctor.countDocuments(filter) : Doctor.estimatedDocumentCount(),
  ]);

  const patientCounts = await countPatientsByDoctor(doctors.map((doctor) => doctor._id));

  return {
    items: doctors.map((doctor) => toDoctorDto(doctor, patientCounts.get(doctor._id.toString()) ?? 0)),
    pagination: buildPagination(query, total),
  };
}

export async function getDoctorById(id: string): Promise<DoctorDto> {
  const [doctor, patientCount] = await Promise.all([
    Doctor.findById(id).select(DOCTOR_FIELDS).lean(),
    Patient.countDocuments({ doctorId: new Types.ObjectId(id) }),
  ]);
  if (!doctor) throw AppError.notFound('Doctor');
  return toDoctorDto(doctor, patientCount);
}

/** Email uniqueness is enforced by the unique index (race-free); E11000 becomes 409 DUPLICATE_EMAIL. */
export async function createDoctor(input: DoctorBody): Promise<DoctorDto> {
  const doctor = await Doctor.create(input);
  return toDoctorDto(doctor.toObject(), 0);
}

export async function updateDoctor(id: string, input: DoctorBody): Promise<DoctorDto> {
  const [doctor, patientCount] = await Promise.all([
    Doctor.findByIdAndUpdate(id, { $set: input }, { returnDocument: 'after', runValidators: true })
      .select(DOCTOR_FIELDS)
      .lean(),
    Patient.countDocuments({ doctorId: new Types.ObjectId(id) }),
  ]);
  if (!doctor) throw AppError.notFound('Doctor');
  return toDoctorDto(doctor, patientCount);
}

/** A doctor with assigned patients cannot be deleted: patients must never be orphaned. */
export async function deleteDoctor(id: string): Promise<void> {
  const patientCount = await Patient.countDocuments({ doctorId: new Types.ObjectId(id) });
  if (patientCount > 0) {
    const noun = patientCount === 1 ? 'patient' : 'patients';
    throw new AppError(
      409,
      'DOCTOR_HAS_PATIENTS',
      `This doctor still has ${patientCount} assigned ${noun}. Reassign or remove them before deleting the doctor.`,
      [{ path: 'patientCount', message: String(patientCount) }],
    );
  }

  const deleted = await Doctor.findByIdAndDelete(id).select('_id').lean();
  if (!deleted) throw AppError.notFound('Doctor');
}

const alphabetical = (a: string, b: string): number => a.localeCompare(b, 'en', { sensitivity: 'base' });

/** Distinct values for the filter dropdowns - each one is a DISTINCT_SCAN over its index. */
export async function getDoctorFilters(): Promise<DoctorFiltersDto> {
  const [specializations, hospitals] = await Promise.all([
    Doctor.distinct('specialization'),
    Doctor.distinct('hospital'),
  ]);
  return {
    specializations: specializations.sort(alphabetical),
    hospitals: hospitals.sort(alphabetical),
  };
}

export function buildDoctorOptionsFilter(search?: string): QueryFilter<DoctorAttrs> {
  return search ? { name: containsRegex(search) } : {};
}

/** Lightweight list for the "assigned doctor" picker: three fields, name order, hard cap. */
export async function listDoctorOptions(query: DoctorOptionsQuery): Promise<DoctorOptionDto[]> {
  const doctors = await Doctor.find(buildDoctorOptionsFilter(query.search))
    .select(DOCTOR_SUMMARY_FIELDS)
    .sort({ name: 1, _id: 1 })
    .limit(query.limit)
    .lean();
  return doctors.map(toDoctorOptionDto);
}
