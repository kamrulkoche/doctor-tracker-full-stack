import type { PipelineStage, Types } from 'mongoose';
import { Doctor } from '../../models/doctor.model';
import { Patient } from '../../models/patient.model';
import { AppError } from '../../utils/app-error';
import {
  buildCreatedAtCondition,
  estimateBucketCount,
  listBucketStarts,
  resolveSeriesRange,
  startOfMonthUtc,
  type DateRangeInput,
  type Interval,
} from '../../utils/date-range';
import type { DoctorOptionDto } from '../doctors/doctor.service';
import type {
  ConditionDistributionQuery,
  PatientsPerDoctorQuery,
  RecentActivityQuery,
  TimeSeriesQuery,
} from './dashboard.validation';

/* ---------- DTOs (see API contract section 6) ---------- */

export interface DashboardStats {
  totalDoctors: number;
  totalPatients: number;
  totalSpecializations: number;
  newPatientsThisMonth: number;
  newPatientsLastMonth: number;
  newDoctorsThisMonth: number;
  averagePatientsPerDoctor: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
  cumulative: number;
}

export interface TimeSeries {
  interval: Interval;
  from: string;
  to: string;
  total: number;
  points: TimeSeriesPoint[];
}

export interface DoctorPatientCount {
  doctorId: string;
  name: string;
  specialization: string;
  hospital: string;
  patientCount: number;
}

export interface ConditionDistribution {
  total: number;
  items: { condition: string; count: number; percentage: number }[];
}

export interface SpecializationStat {
  specialization: string;
  doctorCount: number;
  patientCount: number;
}

export interface DoctorStatistics {
  doctorsOverTime: TimeSeries;
  specializationDistribution: SpecializationStat[];
}

export interface RecentActivity {
  recentDoctors: (DoctorOptionDto & { createdAt: string })[];
  recentPatients: { id: string; name: string; condition: string; doctor: DoctorOptionDto; createdAt: string }[];
  topDoctors: DoctorPatientCount[];
}

/* ---------- helpers ---------- */

/** Hard cap on gap-filled buckets, so `interval=day` over decades cannot build a huge response. */
const MAX_SERIES_BUCKETS = 750;

/*
 * Index hints for whole-collection `$group`s. With no `$match` the planner defaults to a
 * COLLSCAN; hinting the index whose leading key is the group key turns it into a covered
 * index scan that never touches a document (verified by `npm run db:explain`).
 */
export const PATIENTS_BY_DOCTOR_INDEX = { doctorId: 1, createdAt: -1, _id: -1 } as const;
export const PATIENTS_BY_CONDITION_INDEX = { condition: 1, createdAt: -1, _id: -1 } as const;

const roundTo1 = (value: number): number => Math.round(value * 10) / 10;

interface BucketRow {
  _id: Date;
  count: number;
}

/** Counts documents per UTC day / week (Monday start) / month of `createdAt`. */
export function buildTimeSeriesPipeline(from: Date, to: Date, interval: Interval): PipelineStage[] {
  return [
    { $match: { createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $dateTrunc: { date: '$createdAt', unit: interval, timezone: 'UTC', startOfWeek: 'monday' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
}

/**
 * Runs the bucket aggregation, then gap-fills in memory: MongoDB only returns buckets that
 * contain documents, while a chart needs every bucket in the range (zero when empty).
 */
async function buildTimeSeries(
  runAggregation: (pipeline: PipelineStage[]) => Promise<BucketRow[]>,
  query: TimeSeriesQuery,
): Promise<TimeSeries> {
  const range = resolveSeriesRange(query, query.interval);
  if (estimateBucketCount(range, query.interval) > MAX_SERIES_BUCKETS) {
    throw AppError.validation([
      { path: 'from', message: `Date range is too large for interval "${query.interval}". Narrow it or use a larger interval.` },
    ]);
  }

  const rows = await runAggregation(buildTimeSeriesPipeline(range.from, range.to, query.interval));
  const countByBucket = new Map(rows.map((row) => [row._id.getTime(), row.count]));

  let cumulative = 0;
  const points = listBucketStarts(range, query.interval).map((bucketStart): TimeSeriesPoint => {
    const count = countByBucket.get(bucketStart.getTime()) ?? 0;
    cumulative += count;
    return { date: bucketStart.toISOString(), count, cumulative };
  });

  return {
    interval: query.interval,
    from: (points[0]?.date ?? range.from.toISOString()),
    to: range.to.toISOString(),
    total: cumulative,
    points,
  };
}

/** `{ doctorId -> patient count }` for all doctors, optionally limited to a `createdAt` range. */
export function buildPatientsPerDoctorPipeline(range: DateRangeInput, limit: number): PipelineStage[] {
  const createdAt = buildCreatedAtCondition(range);
  return [
    ...(createdAt ? [{ $match: { createdAt } }] : []),
    { $group: { _id: '$doctorId', patientCount: { $sum: 1 } } },
    { $sort: { patientCount: -1, _id: 1 } },
    { $limit: limit },
    // The join runs only after $limit: at most `limit` doctor lookups by _id, never one per patient.
    {
      $lookup: {
        from: Doctor.collection.name,
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, specialization: 1, hospital: 1 } }],
        as: 'doctor',
      },
    },
    { $unwind: '$doctor' },
    {
      $project: {
        _id: 0,
        doctorId: '$_id',
        name: '$doctor.name',
        specialization: '$doctor.specialization',
        hospital: '$doctor.hospital',
        patientCount: 1,
      },
    },
  ];
}

/**
 * Patients per condition. The $facet runs after the $group, so it works on one small row per
 * condition and returns the top N and the grand total in a single round trip.
 */
export function buildConditionDistributionPipeline(range: DateRangeInput, limit: number): PipelineStage[] {
  const createdAt = buildCreatedAtCondition(range);
  return [
    ...(createdAt ? [{ $match: { createdAt } }] : []),
    { $group: { _id: '$condition', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    {
      $facet: {
        top: [{ $limit: limit }],
        summary: [{ $group: { _id: null, total: { $sum: '$count' } } }],
      },
    },
  ];
}

/** Both monthly counters from one covered index range scan over the last two months. */
export function buildMonthlyCountersPipeline(lastMonthStart: Date, thisMonthStart: Date): PipelineStage[] {
  return [
    { $match: { createdAt: { $gte: lastMonthStart } } },
    {
      $group: {
        _id: null,
        thisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', thisMonthStart] }, 1, 0] } },
        lastMonth: { $sum: { $cond: [{ $lt: ['$createdAt', thisMonthStart] }, 1, 0] } },
      },
    },
  ];
}

/* ---------- endpoints ---------- */

export async function getStats(now: Date = new Date()): Promise<DashboardStats> {
  const thisMonthStart = startOfMonthUtc(now);
  const lastMonthStart = startOfMonthUtc(now, -1);

  const [totalDoctors, totalPatients, specializationRows, patientMonthRows, newDoctorsThisMonth] = await Promise.all([
    // Collection metadata: O(1), no scan.
    Doctor.estimatedDocumentCount(),
    Patient.estimatedDocumentCount(),
    // $group on an indexed leading key is planned as a DISTINCT_SCAN.
    Doctor.aggregate<{ total: number }>([{ $group: { _id: '$specialization' } }, { $count: 'total' }]),
    Patient.aggregate<{ thisMonth: number; lastMonth: number }>(
      buildMonthlyCountersPipeline(lastMonthStart, thisMonthStart),
    ),
    Doctor.countDocuments({ createdAt: { $gte: thisMonthStart } }),
  ]);

  return {
    totalDoctors,
    totalPatients,
    totalSpecializations: specializationRows[0]?.total ?? 0,
    newPatientsThisMonth: patientMonthRows[0]?.thisMonth ?? 0,
    newPatientsLastMonth: patientMonthRows[0]?.lastMonth ?? 0,
    newDoctorsThisMonth,
    averagePatientsPerDoctor: totalDoctors === 0 ? 0 : roundTo1(totalPatients / totalDoctors),
  };
}

export function getPatientGrowth(query: TimeSeriesQuery): Promise<TimeSeries> {
  return buildTimeSeries((pipeline) => Patient.aggregate<BucketRow>(pipeline).exec(), query);
}

export async function getPatientsPerDoctor(query: PatientsPerDoctorQuery): Promise<DoctorPatientCount[]> {
  const aggregation = Patient.aggregate<Omit<DoctorPatientCount, 'doctorId'> & { doctorId: Types.ObjectId }>(
    buildPatientsPerDoctorPipeline(query, query.limit),
  );
  if (!query.from && !query.to) aggregation.hint(PATIENTS_BY_DOCTOR_INDEX);

  const rows = await aggregation.exec();
  return rows
    .map((row) => ({ ...row, doctorId: row.doctorId.toString() }))
    .sort((a, b) => b.patientCount - a.patientCount || a.name.localeCompare(b.name));
}

export async function getConditionDistribution(query: ConditionDistributionQuery): Promise<ConditionDistribution> {
  const aggregation = Patient.aggregate<{
    top: { _id: string; count: number }[];
    summary: { total: number }[];
  }>(buildConditionDistributionPipeline(query, query.limit));
  if (!query.from && !query.to) aggregation.hint(PATIENTS_BY_CONDITION_INDEX);

  const [result] = await aggregation.exec();
  const total = result?.summary[0]?.total ?? 0;
  const top = result?.top ?? [];
  if (total === 0) return { total: 0, items: [] };

  const toItem = (condition: string, count: number) => ({
    condition,
    count,
    percentage: roundTo1((count / total) * 100),
  });

  const items = top.map((row) => toItem(row._id, row.count));
  const otherCount = total - top.reduce((sum, row) => sum + row.count, 0);
  if (otherCount > 0) items.push(toItem('Other', otherCount));

  return { total, items };
}

/**
 * Doctors and patients per specialization. Two grouped aggregations run in parallel and are
 * joined in memory (one row per doctor), instead of a `$lookup` that would probe the patients
 * collection once per doctor.
 */
async function getSpecializationDistribution(range: DateRangeInput): Promise<SpecializationStat[]> {
  const createdAt = buildCreatedAtCondition(range);

  const [specializations, patientCounts] = await Promise.all([
    Doctor.aggregate<{ _id: string; doctorCount: number; doctorIds: Types.ObjectId[] }>([
      ...(createdAt ? [{ $match: { createdAt } }] : []),
      { $group: { _id: '$specialization', doctorCount: { $sum: 1 }, doctorIds: { $push: '$_id' } } },
    ]),
    Patient.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $group: { _id: '$doctorId', count: { $sum: 1 } } },
    ])
      .hint(PATIENTS_BY_DOCTOR_INDEX)
      .exec(),
  ]);

  const patientsByDoctor = new Map(patientCounts.map((row) => [row._id.toString(), row.count]));

  return specializations
    .map((row) => ({
      specialization: row._id,
      doctorCount: row.doctorCount,
      patientCount: row.doctorIds.reduce((sum, id) => sum + (patientsByDoctor.get(id.toString()) ?? 0), 0),
    }))
    .sort((a, b) => b.doctorCount - a.doctorCount || a.specialization.localeCompare(b.specialization));
}

export async function getDoctorStatistics(query: TimeSeriesQuery): Promise<DoctorStatistics> {
  const [doctorsOverTime, specializationDistribution] = await Promise.all([
    buildTimeSeries((pipeline) => Doctor.aggregate<BucketRow>(pipeline).exec(), query),
    // Only an explicit from/to narrows the distribution; the default series window does not.
    getSpecializationDistribution({ from: query.from, to: query.to }),
  ]);
  return { doctorsOverTime, specializationDistribution };
}

export async function getRecentActivity(query: RecentActivityQuery): Promise<RecentActivity> {
  const [recentDoctors, recentPatients, topDoctors] = await Promise.all([
    Doctor.find()
      .select('name specialization hospital createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .limit(query.limit)
      .lean(),
    // $sort + $limit walk the createdAt index and stop after `limit` keys; the $lookup then
    // runs for those few rows only.
    Patient.aggregate<{
      _id: Types.ObjectId;
      name: string;
      condition: string;
      createdAt: Date;
      doctor: { _id: Types.ObjectId; name: string; specialization: string; hospital: string };
    }>([
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: query.limit },
      {
        $lookup: {
          from: Doctor.collection.name,
          localField: 'doctorId',
          foreignField: '_id',
          pipeline: [{ $project: { name: 1, specialization: 1, hospital: 1 } }],
          as: 'doctor',
        },
      },
      { $unwind: '$doctor' },
      { $project: { name: 1, condition: 1, createdAt: 1, doctor: 1 } },
    ]),
    getPatientsPerDoctor({ limit: query.limit }),
  ]);

  return {
    recentDoctors: recentDoctors.map((doctor) => ({
      id: doctor._id.toString(),
      name: doctor.name,
      specialization: doctor.specialization,
      hospital: doctor.hospital,
      createdAt: doctor.createdAt.toISOString(),
    })),
    recentPatients: recentPatients.map((patient) => ({
      id: patient._id.toString(),
      name: patient.name,
      condition: patient.condition,
      doctor: {
        id: patient.doctor._id.toString(),
        name: patient.doctor.name,
        specialization: patient.doctor.specialization,
        hospital: patient.doctor.hospital,
      },
      createdAt: patient.createdAt.toISOString(),
    })),
    topDoctors,
  };
}
