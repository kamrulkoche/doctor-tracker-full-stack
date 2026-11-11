/**
 * Scale benchmark: loads a production-sized, skewed dataset into a throwaway database, then
 * prints index sizes, the plan of every query the API issues and the wall-clock time of the
 * real service functions. The scratch database is dropped at the end.
 *
 *   npm run db:bench                                   2,000 doctors / 200,000 patients
 *   npm run db:bench -- --doctors=500 --patients=50000
 *   npm run db:bench -- --keep                         leave the scratch database in place
 *   npm run db:bench -- --keep --reuse                 measure again without reloading
 *
 * It never touches the application's own databases: the target is always
 * `doctor_tracker_perf_test` on the server named by MONGODB_URI_TEST.
 */
import mongoose, { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/environment';
import { Doctor } from '../models/doctor.model';
import { Patient, type Gender } from '../models/patient.model';
import {
  getConditionDistribution,
  getDoctorStatistics,
  getPatientGrowth,
  getPatientsPerDoctor,
  getRecentActivity,
  getStats,
} from '../modules/dashboard/dashboard.service';
import { getDoctorFilters, listDoctorOptions, listDoctors } from '../modules/doctors/doctor.service';
import type { ListDoctorsQuery } from '../modules/doctors/doctor.validation';
import { getPatientFilters, listPatients, listPatientsForDoctor } from '../modules/patients/patient.service';
import type { ListPatientsQuery } from '../modules/patients/patient.validation';
import { toDayString } from '../utils/date-range';
import { collectPlans, loadPlanSamples, printPlanTable } from './query-plans';

const SCRATCH_DATABASE = 'doctor_tracker_perf_test';
const DAY_MS = 86_400_000;
const BATCH_SIZE = 10_000;

/* ---------- arguments ---------- */

function intArgument(name: string, fallback: number): number {
  const raw = process.argv.find((argument) => argument.startsWith(`--${name}=`))?.split('=')[1];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 5_000_000) {
    throw new Error(`--${name} must be an integer between 1 and 5000000`);
  }
  return value;
}

/** Same server and credentials as the test database, different database name. */
function scratchUri(): string {
  const base = process.env.MONGODB_URI_TEST;
  if (!base) throw new Error('MONGODB_URI_TEST is required (the scratch database is created on that server).');
  const match = /^(mongodb(?:\+srv)?:\/\/[^/]+\/)[^?]*(.*)$/.exec(base.trim());
  if (!match) throw new Error('MONGODB_URI_TEST must contain a database name.');
  return `${match[1] ?? ''}${SCRATCH_DATABASE}${match[2] ?? ''}`;
}

/* ---------- deterministic data ---------- */

/** mulberry32: a small seeded PRNG, so every run generates the same dataset. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = createRandom(20_261_111);

/** Zipf-like sampler: item `i` is picked with weight 1 / (i + 1) ^ exponent. */
function createSkewedPicker(size: number, exponent: number): () => number {
  const cumulative: number[] = [];
  let total = 0;
  for (let index = 0; index < size; index += 1) {
    total += 1 / (index + 1) ** exponent;
    cumulative.push(total);
  }
  return () => {
    const target = random() * total;
    let low = 0;
    let high = size - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if ((cumulative[middle] ?? 0) < target) low = middle + 1;
      else high = middle;
    }
    return low;
  };
}

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('Cannot pick from an empty list');
  return item;
}

const FIRST_NAMES = [
  'Aiden', 'Bella', 'Caleb', 'Dalia', 'Ethan', 'Freya', 'Gabriel', 'Hazel', 'Idris', 'Jasmine', 'Kai', 'Luna',
  'Miles', 'Nora', 'Omar', 'Penelope', 'Quentin', 'Rosa', 'Silas', 'Tessa', 'Umar', 'Violet', 'Wesley', 'Ximena',
  'Yusuf', 'Zara', 'Anika', 'Bruno', 'Celeste', 'Dev', 'Elena', 'Farid', 'Greta', 'Hugo', 'Imani', 'Jonas',
  'Keira', 'Leon', 'Mira', 'Nikolai', 'Odette', 'Pablo', 'Rhea', 'Stefan', 'Talia', 'Viktor', 'Wanjiru', 'Yara',
] as const;

const LAST_NAMES = [
  'Abbott', 'Brightwater', 'Calloway', 'Delacroix', 'Everhart', 'Fairbanks', 'Gallagher', 'Holloway', 'Iverson',
  'Jaramillo', 'Kensington', 'Lockwood', 'Montague', 'Nakamura', 'Oyelaran', 'Pemberton', 'Quimby', 'Rosenthal',
  'Sutherland', 'Tremaine', 'Underhill', 'Valdez', 'Whitlock', 'Yamada', 'Ashworth', 'Bergstrom', 'Castillo',
  'Dubois', 'Eriksen', 'Fontaine', 'Grimaldi', 'Hashemi', 'Ishikawa', 'Jovanovic', 'Kowalski', 'Lindgren',
  'Mbeki', 'Novak', 'Okonkwo', 'Petrov', 'Quintero', 'Ramirez', 'Schneider', 'Takahashi', 'Ueda', 'Vasquez',
  'Weatherby', 'Xiong', 'Youssef', 'Zielinski', 'Andersson', 'Bianchi', 'Chaudhry', 'Dlamini', 'Esposito',
  'Fitzgerald', 'Goldberg', 'Haugen', 'Ibrahim', 'Jensen', 'Kaplan', 'Larsen', 'Moreau', 'Nguyen',
] as const;

const NOTES = [
  'Follow-up scheduled in four weeks.',
  'Responding well to the current treatment plan; no change in medication required at this stage.',
  'Referred for additional lab work. Results to be reviewed at the next appointment.',
  'Advised on diet and regular exercise.',
  'Symptoms stable since the last visit.',
  'Medication dosage adjusted; monitor for side effects and report any dizziness or nausea immediately.',
] as const;

const GENDER_BY_ROLL: readonly Gender[] = ['male', 'female', 'other'];

const phone = (index: number): string =>
  `+1 (${200 + (index % 700)}) 555-${String(index % 10_000).padStart(4, '0')}`;

interface Dataset {
  doctors: number;
  patients: number;
}

async function loadDataset({ doctors, patients }: Dataset): Promise<void> {
  const now = Date.now();
  const specializations = Array.from({ length: 30 }, (_, index) => `Specialization ${String(index + 1).padStart(2, '0')}`);
  const hospitals = Array.from({ length: 60 }, (_, index) => `Hospital ${String(index + 1).padStart(2, '0')}`);
  const conditions = Array.from({ length: 60 }, (_, index) => `Condition ${String(index + 1).padStart(2, '0')}`);
  const pickSpecialization = createSkewedPicker(specializations.length, 1);
  const pickHospital = createSkewedPicker(hospitals.length, 0.7);
  const pickCondition = createSkewedPicker(conditions.length, 1);
  // A few doctors carry thousands of patients, most carry a few dozen.
  const pickDoctor = createSkewedPicker(doctors, 0.8);

  const doctorIds: Types.ObjectId[] = [];
  const doctorRows = Array.from({ length: doctors }, (_, index) => {
    const _id = new Types.ObjectId();
    doctorIds.push(_id);
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const createdAt = new Date(now - Math.floor(random() * 5 * 365 * DAY_MS));
    return {
      _id,
      name: `Dr. ${first} ${last}`,
      specialization: specializations[pickSpecialization()] ?? 'General Medicine',
      hospital: hospitals[pickHospital()] ?? 'General Hospital',
      phone: phone(index),
      email: `${first}.${last}.${index}@example.com`.toLowerCase(),
      createdAt,
      updatedAt: createdAt,
    };
  });
  // The native driver is used for loading: no per-document Mongoose overhead.
  await Doctor.collection.insertMany(doctorRows, { ordered: false });

  for (let offset = 0; offset < patients; offset += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, patients - offset) }, (_, position) => {
      const index = offset + position;
      const first = pick(FIRST_NAMES);
      const last = pick(LAST_NAMES);
      // Registrations over three years, growing towards today.
      const createdAt = new Date(now - Math.floor((1 - Math.sqrt(random())) * 3 * 365 * DAY_MS));
      const genderRoll = random();
      return {
        name: `${first} ${last}`,
        age: random() < 0.9 ? Math.floor(random() * 95) : null,
        gender: genderRoll < 0.02 ? null : (GENDER_BY_ROLL[genderRoll < 0.49 ? 0 : genderRoll < 0.96 ? 1 : 2] ?? null),
        phone: random() < 0.85 ? phone(index) : null,
        email: random() < 0.8 ? `${first}.${last}.${index}@example.com`.toLowerCase() : null,
        condition: conditions[pickCondition()] ?? 'Condition 01',
        notes: random() < 0.4 ? pick(NOTES) : null,
        doctorId: doctorIds[pickDoctor()] ?? new Types.ObjectId(),
        createdAt,
        updatedAt: createdAt,
      };
    });
    await Patient.collection.insertMany(batch, { ordered: false });
  }
}

/* ---------- reporting ---------- */

interface StorageStats {
  count: number;
  size: number;
  avgObjSize: number;
  storageSize: number;
  totalIndexSize: number;
  indexSizes: Record<string, number>;
}

const megabytes = (bytes: number): string => `${(bytes / 1_048_576).toFixed(2)} MB`;

async function printStorage(model: typeof Doctor | typeof Patient): Promise<void> {
  const [row] = await model.aggregate<{ storageStats: StorageStats }>([{ $collStats: { storageStats: {} } }]);
  if (!row) return;
  const stats = row.storageStats;
  console.log(
    `${model.collection.name}: ${stats.count} documents, avg ${Math.round(stats.avgObjSize)} B, data ${megabytes(stats.size)} ` +
      `(${megabytes(stats.storageSize)} on disk), indexes ${megabytes(stats.totalIndexSize)}`,
  );
  for (const [name, bytes] of Object.entries(stats.indexSizes)) {
    console.log(`  ${name.padEnd(40)} ${megabytes(bytes).padStart(10)}  ${Math.round(bytes / Math.max(stats.count, 1))} B/doc`);
  }
}

/** Median wall-clock time of five runs, in milliseconds (includes network + Mongoose). */
async function median(run: () => Promise<unknown>): Promise<number> {
  const times: number[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const start = performance.now();
    await run();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return Math.round((times[2] ?? 0) * 10) / 10;
}

async function printServiceTimings(samples: NonNullable<Awaited<ReturnType<typeof loadPlanSamples>>>): Promise<void> {
  const now = new Date();
  const last90 = { from: toDayString(new Date(now.getTime() - 90 * DAY_MS)), to: toDayString(now) };
  const patientList: ListPatientsQuery = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
  const doctorList: ListDoctorsQuery = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
  const lastPage = Math.max(1, Math.ceil(samples.patientCount / 10));
  const { busiestDoctorId: doctorId, commonCondition: condition, specialization, patientName } = samples;

  const calls: [label: string, run: () => Promise<unknown>][] = [
    ['GET /patients (page 1)', () => listPatients(patientList)],
    ['GET /patients?page=1000', () => listPatients({ ...patientList, page: Math.min(1000, lastPage) })],
    [`GET /patients?page=${lastPage} (last page)`, () => listPatients({ ...patientList, page: lastPage })],
    ['GET /patients?sortBy=name', () => listPatients({ ...patientList, sortBy: 'name', sortOrder: 'asc' })],
    ['GET /patients?sortBy=condition', () => listPatients({ ...patientList, sortBy: 'condition', sortOrder: 'asc' })],
    ['GET /patients?sortBy=age', () => listPatients({ ...patientList, sortBy: 'age', sortOrder: 'asc' })],
    ['GET /patients?sortBy=age&page=1000', () => listPatients({ ...patientList, sortBy: 'age', sortOrder: 'asc', page: Math.min(1000, lastPage) })],
    ['GET /patients?doctorId=', () => listPatients({ ...patientList, doctorId })],
    ['GET /doctors/:id/patients', () => listPatientsForDoctor(doctorId, patientList)],
    ['GET /patients?condition=', () => listPatients({ ...patientList, condition })],
    ['GET /patients?condition=&sortBy=age', () => listPatients({ ...patientList, condition, sortBy: 'age', sortOrder: 'asc' })],
    ['GET /patients?condition=&from=&to= (90 days)', () => listPatients({ ...patientList, condition, ...last90 })],
    ['GET /patients?gender=female', () => listPatients({ ...patientList, gender: 'female' })],
    ['GET /patients?from=&to= (90 days)', () => listPatients({ ...patientList, ...last90 })],
    ['GET /patients?search=an', () => listPatients({ ...patientList, search: 'an' })],
    ['GET /patients?search=<full name>', () => listPatients({ ...patientList, search: patientName })],
    ['GET /patients?search=<no match>', () => listPatients({ ...patientList, search: 'zzqqzz' })],
    ['GET /patients/filters', () => getPatientFilters()],
    ['GET /doctors (page 1)', () => listDoctors(doctorList)],
    ['GET /doctors?limit=100', () => listDoctors({ ...doctorList, limit: 100 })],
    ['GET /doctors?specialization=', () => listDoctors({ ...doctorList, specialization })],
    ['GET /doctors?search=an', () => listDoctors({ ...doctorList, search: 'an' })],
    ['GET /doctors/filters', () => getDoctorFilters()],
    ['GET /doctors/options', () => listDoctorOptions({ limit: 20 })],
    ['GET /doctors/options?search=an', () => listDoctorOptions({ limit: 20, search: 'an' })],
    ['GET /dashboard/stats', () => getStats()],
    ['GET /dashboard/patient-growth (12 months)', () => getPatientGrowth({ interval: 'month' })],
    ['GET /dashboard/patient-growth?interval=day (30 days)', () => getPatientGrowth({ interval: 'day' })],
    ['GET /dashboard/patients-per-doctor', () => getPatientsPerDoctor({ limit: 10 })],
    ['GET /dashboard/patients-per-doctor (90 days)', () => getPatientsPerDoctor({ limit: 10, ...last90 })],
    ['GET /dashboard/condition-distribution', () => getConditionDistribution({ limit: 5 })],
    ['GET /dashboard/condition-distribution (90 days)', () => getConditionDistribution({ limit: 5, ...last90 })],
    ['GET /dashboard/doctor-statistics', () => getDoctorStatistics({ interval: 'month' })],
    ['GET /dashboard/recent-activity', () => getRecentActivity({ limit: 5 })],
    [
      'Dashboard page: all six endpoints at once',
      () =>
        Promise.all([
          getStats(),
          getPatientGrowth({ interval: 'month' }),
          getPatientsPerDoctor({ limit: 10 }),
          getConditionDistribution({ limit: 5 }),
          getDoctorStatistics({ interval: 'month' }),
          getRecentActivity({ limit: 5 }),
        ]),
    ],
  ];

  const width = Math.max(...calls.map(([label]) => label.length));
  console.log(`${'Service call (database work of the endpoint)'.padEnd(width)} | median ms (5 runs)`);
  console.log(`${'-'.repeat(width)}-|------------------`);
  for (const [label, run] of calls) console.log(`${label.padEnd(width)} | ${await median(run)}`);
}

/* ---------- main ---------- */

async function scratchDatabaseExists(): Promise<boolean> {
  const collections = await mongoose.connection.db?.listCollections().toArray();
  return (collections?.length ?? 0) > 0;
}

async function main(): Promise<void> {
  if (env.isProduction) throw new Error('Refusing to run the benchmark when NODE_ENV=production.');
  const dataset: Dataset = { doctors: intArgument('doctors', 2_000), patients: intArgument('patients', 200_000) };
  const keep = process.argv.includes('--keep');
  const reuse = process.argv.includes('--reuse');

  await connectDatabase(scratchUri());
  // Second guard: the name reported by the driver must be the scratch database.
  if (mongoose.connection.name !== SCRATCH_DATABASE) {
    throw new Error(`Refusing to run: connected to "${mongoose.connection.name}", expected "${SCRATCH_DATABASE}".`);
  }

  try {
    if (reuse && (await scratchDatabaseExists())) {
      console.log(`[db:bench] reusing the existing "${SCRATCH_DATABASE}" database\n`);
      await Promise.all([Doctor.init(), Patient.init()]);
    } else {
      await mongoose.connection.dropDatabase();
      // Indexes exist before the load, so the load time includes maintaining all of them.
      await Promise.all([Doctor.init(), Patient.init()]);
      const start = performance.now();
      await loadDataset(dataset);
      const seconds = (performance.now() - start) / 1000;
      console.log(
        `[db:bench] loaded ${dataset.doctors} doctors and ${dataset.patients} patients into "${SCRATCH_DATABASE}" ` +
          `in ${seconds.toFixed(1)} s (${Math.round(dataset.patients / seconds)} patient inserts/s with all indexes in place)\n`,
      );
    }

    // Force a checkpoint so the reported index sizes are the on-disk sizes, not a partial flush.
    await mongoose.connection.db?.admin().command({ fsync: 1 }).catch(() => undefined);
    await printStorage(Doctor);
    await printStorage(Patient);
    console.log('');

    const samples = await loadPlanSamples();
    if (!samples) throw new Error('The scratch database is empty.');
    // First pass warms the cache and the plan cache; the second pass is the one reported.
    await collectPlans(samples);
    printPlanTable(await collectPlans(samples));
    console.log('');
    await printServiceTimings(samples);
  } finally {
    if (keep) {
      console.log(`\n[db:bench] --keep: "${SCRATCH_DATABASE}" was left in place. Run without --keep to drop it.`);
    } else {
      await mongoose.connection.dropDatabase();
      console.log(`\n[db:bench] dropped "${SCRATCH_DATABASE}" (still present: ${String(await scratchDatabaseExists())})`);
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(`[db:bench] failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDatabase();
  });
