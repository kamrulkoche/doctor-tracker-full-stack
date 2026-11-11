/**
 * The catalogue of queries the API issues, explained with `executionStats`.
 * Shared by `npm run db:explain` (current database) and `npm run db:bench` (large scratch
 * database). Filters, sorts and pipelines come from the services' own builders, so the plans
 * shown are the plans the endpoints get.
 */
import mongoose, { type PipelineStage, type QueryFilter, type Types } from 'mongoose';
import { Doctor } from '../models/doctor.model';
import { Patient, type PatientAttrs } from '../models/patient.model';
import {
  PATIENTS_BY_CONDITION_INDEX,
  PATIENTS_BY_DOCTOR_INDEX,
  buildConditionDistributionPipeline,
  buildMonthlyCountersPipeline,
  buildPatientsPerDoctorPipeline,
  buildTimeSeriesPipeline,
} from '../modules/dashboard/dashboard.service';
import { buildDoctorFilter, buildDoctorOptionsFilter, buildDoctorSort } from '../modules/doctors/doctor.service';
import { buildPatientFilter, buildPatientSort } from '../modules/patients/patient.service';
import { startOfMonthUtc, toDayString } from '../utils/date-range';

export interface PlanRow {
  query: string;
  stages: string;
  index: string;
  keysExamined: number;
  docsExamined: number;
  nReturned: number;
  millis: number;
}

const DAY_MS = 86_400_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

/** Depth-first walk of a winning plan, collecting stage names (outermost first) and indexes. */
function walkPlan(node: unknown, stages: string[], indexes: Set<string>): void {
  if (!isRecord(node)) return;
  if (typeof node.stage === 'string') stages.push(node.stage);
  if (typeof node.indexName === 'string') indexes.add(node.indexName);
  // The slot-based engine nests the readable plan under `queryPlan`.
  walkPlan(node.queryPlan, stages, indexes);
  walkPlan(node.inputStage, stages, indexes);
  if (Array.isArray(node.inputStages)) {
    for (const child of node.inputStages) walkPlan(child, stages, indexes);
  }
}

/**
 * `find` explains expose queryPlanner/executionStats at the top level. Aggregations do too
 * when the whole pipeline is pushed down; otherwise the query part sits under
 * `stages[0].$cursor` and the remaining pipeline stages follow it.
 */
function summarise(query: string, explain: unknown): PlanRow {
  const pipelineStages = isRecord(explain) && Array.isArray(explain.stages) ? (explain.stages as unknown[]) : [];
  const first = pipelineStages[0];
  const plan =
    isRecord(explain) && isRecord(explain.queryPlanner)
      ? explain
      : isRecord(first) && isRecord(first.$cursor)
        ? first.$cursor
        : null;

  const stages: string[] = [];
  const indexes = new Set<string>();
  const stats = plan && isRecord(plan.executionStats) ? plan.executionStats : {};
  if (plan && isRecord(plan.queryPlanner)) walkPlan(plan.queryPlanner.winningPlan, stages, indexes);

  // Pipeline stages that run after the cursor (in mongod memory), e.g. `$group`, `$sort`.
  const later: string[] = [];
  let millis = asNumber(stats.executionTimeMillis);
  for (const stage of pipelineStages.slice(1)) {
    if (!isRecord(stage)) continue;
    later.push(...Object.keys(stage).filter((key) => key.startsWith('$')));
    millis = Math.max(millis, asNumber(stage.executionTimeMillisEstimate));
  }

  return {
    query,
    stages: (stages.join(' > ') || 'n/a') + (later.length > 0 ? ` | ${later.join(' ')}` : ''),
    index: [...indexes].join(', ') || '(none)',
    keysExamined: asNumber(stats.totalKeysExamined),
    docsExamined: asNumber(stats.totalDocsExamined),
    nReturned: asNumber(stats.nReturned),
    millis,
  };
}

export function printPlanTable(rows: PlanRow[]): void {
  const columns: { key: keyof PlanRow; title: string }[] = [
    { key: 'query', title: 'Query' },
    { key: 'stages', title: 'Winning plan (outer > inner | later pipeline stages)' },
    { key: 'index', title: 'Index used' },
    { key: 'keysExamined', title: 'Keys' },
    { key: 'docsExamined', title: 'Docs' },
    { key: 'nReturned', title: 'Returned' },
    { key: 'millis', title: 'ms' },
  ];
  const widths = columns.map(({ key, title }) => Math.max(title.length, ...rows.map((row) => String(row[key]).length)));
  const line = (cells: string[]): string => cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join(' | ');

  console.log(line(columns.map((column) => column.title)));
  console.log(widths.map((width) => '-'.repeat(width)).join('-|-'));
  for (const row of rows) console.log(line(columns.map(({ key }) => String(row[key]))));
  console.log(
    '\nKeys = index keys examined, Docs = documents fetched, Returned = rows leaving the query stage,' +
      '\nms = server-side execution time reported by explain. For aggregations Keys/Docs/Returned' +
      '\ndescribe the cursor stage that feeds the pipeline.',
  );
}

/** What `countDocuments(filter)` sends to the server: `$match` + `$group`. */
function countPipeline(filter: QueryFilter<PatientAttrs>): PipelineStage[] {
  return [{ $match: filter }, { $group: { _id: 1, n: { $sum: 1 } } }];
}

function explainDistinct(collection: string, key: string): Promise<unknown> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Not connected');
  return db.command({ explain: { distinct: collection, key }, verbosity: 'executionStats' });
}

/** Real values taken from the data, so every filter below matches something. */
export interface PlanSamples {
  doctorCount: number;
  patientCount: number;
  /** Doctor with the most patients, and the most common condition. */
  busiestDoctorId: string;
  commonCondition: string;
  specialization: string;
  hospital: string;
  /** Full name of one existing patient: a selective search term. */
  patientName: string;
  firstPageDoctorIds: Types.ObjectId[];
}

export async function loadPlanSamples(): Promise<PlanSamples | null> {
  const [doctorCount, patientCount] = await Promise.all([Doctor.countDocuments(), Patient.countDocuments()]);
  if (doctorCount === 0 || patientCount === 0) return null;

  const top = (field: string): PipelineStage[] => [
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 1 },
  ];
  const [[doctor], [condition], [specialization], [hospital], patient, firstPage] = await Promise.all([
    Patient.aggregate<{ _id: Types.ObjectId }>(top('doctorId')),
    Patient.aggregate<{ _id: string }>(top('condition')),
    Doctor.aggregate<{ _id: string }>(top('specialization')),
    Doctor.aggregate<{ _id: string }>(top('hospital')),
    Patient.findOne().sort({ _id: 1 }).select('name').lean(),
    Doctor.find().sort(buildDoctorSort('createdAt', 'desc')).limit(10).select('_id').lean(),
  ]);
  if (!doctor || !condition || !specialization || !hospital || !patient) return null;

  return {
    doctorCount,
    patientCount,
    busiestDoctorId: doctor._id.toString(),
    commonCondition: condition._id,
    specialization: specialization._id,
    hospital: hospital._id,
    patientName: patient.name,
    firstPageDoctorIds: firstPage.map((row) => row._id),
  };
}

type Explained = [label: string, run: () => Promise<unknown>];

export async function collectPlans(samples: PlanSamples): Promise<PlanRow[]> {
  const now = new Date();
  const to = toDayString(now);
  const daysAgo = (days: number): string => toDayString(new Date(now.getTime() - days * DAY_MS));
  const last30 = { from: daysAgo(30), to };
  const last90 = { from: daysAgo(90), to };
  const last365 = { from: daysAgo(365), to };

  const limit = 10;
  // "Deep" pages: page 1000 where the collection is large enough, and the very last page.
  const deepSkip = (total: number): number => Math.min(999 * limit, Math.max(0, total - limit));
  const lastSkip = (total: number): number => Math.max(0, total - limit);

  const doctors = (filter: Parameters<typeof buildDoctorFilter>[0], sort = buildDoctorSort('createdAt', 'desc'), skip = 0) =>
    Doctor.find(buildDoctorFilter(filter)).sort(sort).skip(skip).limit(limit).explain('executionStats');
  const patients = (filter: Parameters<typeof buildPatientFilter>[0], sort = buildPatientSort('createdAt', 'desc'), skip = 0) =>
    Patient.find(buildPatientFilter(filter)).sort(sort).skip(skip).limit(limit).explain('executionStats');
  const patientTotal = (filter: Parameters<typeof buildPatientFilter>[0]) =>
    Patient.aggregate(countPipeline(buildPatientFilter(filter))).explain('executionStats');

  const { busiestDoctorId: doctorId, commonCondition: condition, specialization, hospital, patientName } = samples;
  const patientDeep = deepSkip(samples.patientCount);
  const patientLast = lastSkip(samples.patientCount);

  const catalogue: Explained[] = [
    /* ---- doctors ---- */
    ['Doctors: default list (createdAt desc, page 1)', () => doctors({})],
    [`Doctors: default list, last page (skip ${lastSkip(samples.doctorCount)})`, () => doctors({}, undefined, lastSkip(samples.doctorCount))],
    ['Doctors: sort name asc', () => doctors({}, buildDoctorSort('name', 'asc'))],
    ['Doctors: sort specialization asc', () => doctors({}, buildDoctorSort('specialization', 'asc'))],
    ['Doctors: sort hospital desc', () => doctors({}, buildDoctorSort('hospital', 'desc'))],
    ['Doctors: specialization filter', () => doctors({ specialization })],
    ['Doctors: hospital filter', () => doctors({ hospital })],
    ['Doctors: specialization + hospital', () => doctors({ specialization, hospital })],
    ['Doctors: specialization filter, sort name', () => doctors({ specialization }, buildDoctorSort('name', 'asc'))],
    ['Doctors: last 90 days', () => doctors(last90)],
    ['Doctors: search "an" (name/email/phone)', () => doctors({ search: 'an' })],
    ['Doctors: search, no match', () => doctors({ search: 'zzqqzz' })],
    [
      'Doctors: picker, no search (sort name, limit 20)',
      () => Doctor.find(buildDoctorOptionsFilter()).sort({ name: 1, _id: 1 }).limit(20).explain('executionStats'),
    ],
    [
      'Doctors: picker, name search "an"',
      () => Doctor.find(buildDoctorOptionsFilter('an')).sort({ name: 1, _id: 1 }).limit(20).explain('executionStats'),
    ],
    [
      'Doctors: patientCount for one page ($in 10 ids + $group)',
      () =>
        Patient.aggregate([
          { $match: { doctorId: { $in: samples.firstPageDoctorIds } } },
          { $group: { _id: '$doctorId', count: { $sum: 1 } } },
        ]).explain('executionStats'),
    ],
    ['Doctors: distinct specializations', () => explainDistinct(Doctor.collection.name, 'specialization')],
    ['Doctors: distinct hospitals', () => explainDistinct(Doctor.collection.name, 'hospital')],

    /* ---- patients: sorts and pagination ---- */
    ['Patients: default list (createdAt desc, page 1)', () => patients({})],
    [`Patients: default list, skip ${patientDeep}`, () => patients({}, undefined, patientDeep)],
    [`Patients: default list, last page (skip ${patientLast})`, () => patients({}, undefined, patientLast)],
    ['Patients: sort createdAt asc', () => patients({}, buildPatientSort('createdAt', 'asc'))],
    ['Patients: sort name asc', () => patients({}, buildPatientSort('name', 'asc'))],
    ['Patients: sort name desc', () => patients({}, buildPatientSort('name', 'desc'))],
    ['Patients: sort condition asc', () => patients({}, buildPatientSort('condition', 'asc'))],
    ['Patients: sort age asc', () => patients({}, buildPatientSort('age', 'asc'))],
    ['Patients: sort age desc', () => patients({}, buildPatientSort('age', 'desc'))],
    [`Patients: sort age asc, skip ${patientDeep}`, () => patients({}, buildPatientSort('age', 'asc'), patientDeep)],

    /* ---- patients: filters ---- */
    ['Patients: doctorId (busiest doctor)', () => patients({ doctorId })],
    ['Patients: doctorId, sort name', () => patients({ doctorId }, buildPatientSort('name', 'asc'))],
    ['Patients: condition (most common)', () => patients({ condition })],
    ['Patients: condition + last 90 days', () => patients({ condition, ...last90 })],
    ['Patients: condition, sort name', () => patients({ condition }, buildPatientSort('name', 'asc'))],
    ['Patients: condition, sort age', () => patients({ condition }, buildPatientSort('age', 'asc'))],
    ['Patients: gender = female', () => patients({ gender: 'female' })],
    ['Patients: gender = other (rare value)', () => patients({ gender: 'other' })],
    ['Patients: doctorId + condition', () => patients({ doctorId, condition })],
    ['Patients: doctorId + gender + last 90 days', () => patients({ doctorId, gender: 'female', ...last90 })],
    ['Patients: last 90 days', () => patients(last90)],
    ['Patients: last 90 days, sort name', () => patients(last90, buildPatientSort('name', 'asc'))],

    /* ---- patients: search ---- */
    ['Patients: search "an" (common)', () => patients({ search: 'an' })],
    [`Patients: search "${patientName}" (selective)`, () => patients({ search: patientName })],
    ['Patients: search, no match', () => patients({ search: 'zzqqzz' })],
    ['Patients: search "an" + condition', () => patients({ search: 'an', condition })],
    ['Patients: search "an" + doctorId', () => patients({ search: 'an', doctorId })],

    /* ---- patients: totals (countDocuments) ---- */
    ['Total: doctorId', () => patientTotal({ doctorId })],
    ['Total: condition', () => patientTotal({ condition })],
    ['Total: condition + last 90 days', () => patientTotal({ condition, ...last90 })],
    ['Total: last 90 days', () => patientTotal(last90)],
    ['Total: gender = female', () => patientTotal({ gender: 'female' })],
    ['Total: doctorId + condition', () => patientTotal({ doctorId, condition })],
    ['Total: search "an"', () => patientTotal({ search: 'an' })],
    ['Total: search, no match', () => patientTotal({ search: 'zzqqzz' })],
    ['Total: no filter, as countDocuments({}) (the API uses estimatedDocumentCount)', () => patientTotal({})],
    ['Patients: distinct conditions', () => explainDistinct(Patient.collection.name, 'condition')],

    /* ---- dashboard ---- */
    [
      'Stats: distinct specializations ($group + $count)',
      () => Doctor.aggregate([{ $group: { _id: '$specialization' } }, { $count: 'total' }]).explain('executionStats'),
    ],
    [
      'Stats: patients this month + last month',
      () => Patient.aggregate(buildMonthlyCountersPipeline(startOfMonthUtc(now, -1), startOfMonthUtc(now))).explain('executionStats'),
    ],
    [
      'Growth: last 30 days by day',
      () => Patient.aggregate(buildTimeSeriesPipeline(new Date(now.getTime() - 30 * DAY_MS), now, 'day')).explain('executionStats'),
    ],
    [
      'Growth: last 12 months by month',
      () => Patient.aggregate(buildTimeSeriesPipeline(new Date(now.getTime() - 365 * DAY_MS), now, 'month')).explain('executionStats'),
    ],
    [
      'Doctors over time: last 12 months by month',
      () => Doctor.aggregate(buildTimeSeriesPipeline(new Date(now.getTime() - 365 * DAY_MS), now, 'month')).explain('executionStats'),
    ],
    [
      'Patients per doctor: all time (index hint, as the API runs it)',
      () => Patient.aggregate(buildPatientsPerDoctorPipeline({}, 10)).hint(PATIENTS_BY_DOCTOR_INDEX).explain('executionStats'),
    ],
    [
      'Patients per doctor: all time (no hint, for comparison)',
      () => Patient.aggregate(buildPatientsPerDoctorPipeline({}, 10)).explain('executionStats'),
    ],
    ['Patients per doctor: last 30 days', () => Patient.aggregate(buildPatientsPerDoctorPipeline(last30, 10)).explain('executionStats')],
    ['Patients per doctor: last 365 days', () => Patient.aggregate(buildPatientsPerDoctorPipeline(last365, 10)).explain('executionStats')],
    [
      'Patients per doctor: last 365 days (doctorId index hinted, for comparison)',
      () => Patient.aggregate(buildPatientsPerDoctorPipeline(last365, 10)).hint(PATIENTS_BY_DOCTOR_INDEX).explain('executionStats'),
    ],
    [
      'Condition distribution: all time (index hint, as the API runs it)',
      () => Patient.aggregate(buildConditionDistributionPipeline({}, 5)).hint(PATIENTS_BY_CONDITION_INDEX).explain('executionStats'),
    ],
    [
      'Condition distribution: all time (no hint, for comparison)',
      () => Patient.aggregate(buildConditionDistributionPipeline({}, 5)).explain('executionStats'),
    ],
    ['Condition distribution: last 30 days', () => Patient.aggregate(buildConditionDistributionPipeline(last30, 5)).explain('executionStats')],
    ['Condition distribution: last 365 days', () => Patient.aggregate(buildConditionDistributionPipeline(last365, 5)).explain('executionStats')],
    [
      'Condition distribution: last 365 days (condition index hinted, for comparison)',
      () => Patient.aggregate(buildConditionDistributionPipeline(last365, 5)).hint(PATIENTS_BY_CONDITION_INDEX).explain('executionStats'),
    ],
    [
      'Specialization distribution: doctors per specialization',
      () =>
        Doctor.aggregate([
          { $group: { _id: '$specialization', doctorCount: { $sum: 1 }, doctorIds: { $push: '$_id' } } },
        ]).explain('executionStats'),
    ],
    [
      'Stats: doctors created this month (countDocuments)',
      () =>
        Doctor.aggregate([
          { $match: { createdAt: { $gte: startOfMonthUtc(now) } } },
          { $group: { _id: 1, n: { $sum: 1 } } },
        ]).explain('executionStats'),
    ],
    [
      'Recent activity: 5 newest patients ($sort + $limit before $lookup)',
      () => Patient.aggregate([{ $sort: { createdAt: -1, _id: -1 } }, { $limit: 5 }]).explain('executionStats'),
    ],
    [
      'Recent activity: 5 newest doctors',
      () => Doctor.find().sort({ createdAt: -1, _id: -1 }).limit(5).explain('executionStats'),
    ],
  ];

  const rows: PlanRow[] = [];
  // One at a time, so the reported times are not distorted by concurrent explains.
  for (const [label, run] of catalogue) rows.push(summarise(label, await run()));
  return rows;
}
