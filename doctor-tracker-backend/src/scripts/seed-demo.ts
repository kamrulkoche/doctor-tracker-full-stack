/**
 * Seeds fictional demo data: 24 doctors and 260 patients spread over the last 12 months.
 *
 * - Idempotent: doctors are upserted by email, patients by a deterministic `_id`, and
 *   everything is written with `$setOnInsert`, so a second run inserts and changes nothing.
 * - Deterministic: a seeded PRNG produces the same people every time.
 * - Refuses to run when NODE_ENV=production.
 * - All names are invented; emails use the reserved example.com domain and phone numbers
 *   the reserved 555-01xx range.
 *
 *   npm run seed:demo             insert whatever is missing
 *   npm run seed:demo -- --reset  remove the demo records first, then insert them with fresh dates
 */
import { Types } from 'mongoose';
import { connectDatabase, databaseName, disconnectDatabase } from '../config/database';
import { env } from '../config/environment';
import { Doctor } from '../models/doctor.model';
import { Patient, type Gender } from '../models/patient.model';

const DAY_MS = 86_400_000;
const PATIENT_COUNT = 260;

/* ---------- deterministic randomness ---------- */

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = createRandom(20_240_611);

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('Cannot pick from an empty list');
  return item;
}

function pickWeightedIndex(weights: readonly number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = random() * total;
  for (const [index, weight] of weights.entries()) {
    threshold -= weight;
    if (threshold < 0) return index;
  }
  return weights.length - 1;
}

/* ---------- fictional source data ---------- */

const HOSPITALS = [
  'Riverside General Hospital',
  'Northbridge Medical Center',
  'Lakeview Community Hospital',
  'St. Aurelia Clinic',
  'Greenfield Health Institute',
  'Harborlight Family Hospital',
] as const;

/** Specialization -> the conditions its doctors typically see. */
const SPECIALIZATION_CONDITIONS: Record<string, readonly string[]> = {
  Cardiology: ['Hypertension', 'Coronary Artery Disease'],
  Neurology: ['Migraine', 'Lower Back Pain'],
  Orthopedics: ['Osteoarthritis', 'Lower Back Pain'],
  Pediatrics: ['Asthma', 'Seasonal Allergies', 'Eczema'],
  Dermatology: ['Eczema', 'Seasonal Allergies'],
  Oncology: ['Hypothyroidism', 'Coronary Artery Disease'],
  'General Medicine': ['Hypertension', 'Type 2 Diabetes', 'Seasonal Allergies', 'Asthma'],
  Endocrinology: ['Type 2 Diabetes', 'Hypothyroidism'],
  Psychiatry: ['Anxiety Disorder', 'Depression', 'Migraine'],
};

const ALL_CONDITIONS = [...new Set(Object.values(SPECIALIZATION_CONDITIONS).flat())];

/** [name, specialization, hospital index] - ordered oldest to newest. */
const DOCTORS: readonly (readonly [string, string, number])[] = [
  ['Dr. Amara Okafor', 'Cardiology', 0],
  ['Dr. Julian Hartwell', 'General Medicine', 1],
  ['Dr. Priya Raman', 'Pediatrics', 5],
  ['Dr. Mateo Alvarez', 'Orthopedics', 0],
  ['Dr. Hannah Lindqvist', 'Neurology', 2],
  ['Dr. Kenji Watanabe', 'Cardiology', 1],
  ['Dr. Sofia Marchetti', 'Dermatology', 3],
  ['Dr. Elias Thornbury', 'General Medicine', 4],
  ['Dr. Nadia Rahman', 'Endocrinology', 0],
  ['Dr. Oliver Castellan', 'Psychiatry', 2],
  ['Dr. Grace Adeyemi', 'Pediatrics', 5],
  ['Dr. Tobias Reinhardt', 'Oncology', 1],
  ['Dr. Leila Haddad', 'General Medicine', 0],
  ['Dr. Marcus Ellington', 'Orthopedics', 4],
  ['Dr. Ingrid Solberg', 'Neurology', 1],
  ['Dr. Rafael Monteiro', 'Cardiology', 2],
  ['Dr. Chloe Beaumont', 'Dermatology', 4],
  ['Dr. Samuel Osei', 'Endocrinology', 3],
  ['Dr. Yuki Tanabe', 'Psychiatry', 1],
  ['Dr. Isabel Navarro', 'Pediatrics', 2],
  ['Dr. Dmitri Volkov', 'Oncology', 0],
  ['Dr. Fatima Zahra', 'General Medicine', 5],
  ['Dr. Theo Vandermeer', 'Orthopedics', 3],
  ['Dr. Maya Kapoor', 'Cardiology', 4],
];

const FIRST_NAMES = [
  'Aiden', 'Bella', 'Caleb', 'Dalia', 'Ethan', 'Freya', 'Gabriel', 'Hazel', 'Idris', 'Jasmine',
  'Kai', 'Luna', 'Miles', 'Nora', 'Omar', 'Penelope', 'Quentin', 'Rosa', 'Silas', 'Tessa',
  'Umar', 'Violet', 'Wesley', 'Ximena', 'Yusuf', 'Zara', 'Anika', 'Bruno', 'Celeste', 'Dev',
] as const;

const LAST_NAMES = [
  'Abbott', 'Brightwater', 'Calloway', 'Delacroix', 'Everhart', 'Fairbanks', 'Gallagher', 'Holloway',
  'Iverson', 'Jaramillo', 'Kensington', 'Lockwood', 'Montague', 'Nakamura', 'Oyelaran', 'Pemberton',
  'Quimby', 'Rosenthal', 'Sutherland', 'Tremaine', 'Underhill', 'Valdez', 'Whitlock', 'Yamada',
] as const;

const NOTES = [
  'Follow-up scheduled in four weeks.',
  'Responding well to the current treatment plan.',
  'Referred for additional lab work.',
  'Advised on diet and regular exercise.',
  'Symptoms stable since the last visit.',
  'Medication dosage adjusted; monitor for side effects.',
] as const;

const GENDERS: readonly Gender[] = ['male', 'female', 'other'];

/* ---------- builders ---------- */

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/^dr\.\s*/, '')
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '');

/** Reserved fictional numbers: 555-0100 to 555-0199. */
const demoPhone = (index: number): string =>
  `+1 (${200 + (index % 700)}) 555-01${String(index % 100).padStart(2, '0')}`;

/** Stable ids so re-runs upsert the same patients instead of adding new ones. */
const demoPatientId = (index: number): Types.ObjectId =>
  new Types.ObjectId(`5eed${'0'.repeat(16)}${index.toString(16).padStart(4, '0')}`);

interface DoctorSeed {
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
}

function buildDoctors(now: number): DoctorSeed[] {
  const lastIndex = DOCTORS.length - 1;
  return DOCTORS.map(([name, specialization, hospitalIndex], index) => {
    // Most of the roster joined early in the year; the last two joined this month.
    const daysAgo = Math.round(355 * ((lastIndex - index) / lastIndex) ** 1.3);
    const createdAt = new Date(now - daysAgo * DAY_MS - Math.floor(random() * 6 * 3_600_000) - 3_600_000);
    return {
      name,
      specialization,
      hospital: HOSPITALS[hospitalIndex] ?? HOSPITALS[0],
      phone: demoPhone(index + 1),
      email: `${slug(name)}@example.com`,
      createdAt,
    };
  });
}

function buildPatient(index: number, doctor: DoctorSeed, doctorId: Types.ObjectId, now: number) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const typical = SPECIALIZATION_CONDITIONS[doctor.specialization] ?? ALL_CONDITIONS;
  const condition = random() < 0.75 ? pick(typical) : pick(ALL_CONDITIONS);

  // Registered some time after the doctor joined, skewed towards recent months.
  const span = now - doctor.createdAt.getTime();
  const createdAt = new Date(doctor.createdAt.getTime() + Math.floor(span * (1 - random() ** 1.5)));

  const ageRoll = random();
  const age = doctor.specialization === 'Pediatrics' ? Math.floor(ageRoll * 17) : 18 + Math.floor(ageRoll * 70);

  return {
    _id: demoPatientId(index),
    name: `${firstName} ${lastName}`,
    // A realistic share of records have optional fields left empty.
    age: random() < 0.9 ? age : null,
    gender: random() < 0.95 ? (GENDERS[pickWeightedIndex([48, 48, 4])] ?? null) : null,
    phone: random() < 0.85 ? demoPhone(100 + index) : null,
    email:
      random() < 0.8 ? `${firstName}.${lastName}.${String(index).padStart(3, '0')}@example.com`.toLowerCase() : null,
    condition,
    notes: random() < 0.4 ? pick(NOTES) : null,
    doctorId,
    createdAt,
    updatedAt: createdAt,
  };
}

/* ---------- main ---------- */

async function resetDemoData(doctorEmails: string[]): Promise<void> {
  const patientIds = Array.from({ length: PATIENT_COUNT }, (_, index) => demoPatientId(index));
  const { deletedCount: patients } = await Patient.deleteMany({ _id: { $in: patientIds } });

  // Only demo doctors that no longer have any patient are removed - real data is never orphaned.
  const demoDoctorIds = (await Doctor.find({ email: { $in: doctorEmails } }).select('_id').lean()).map((d) => d._id);
  const stillAssigned = await Patient.distinct('doctorId', { doctorId: { $in: demoDoctorIds } });
  const assigned = new Set(stillAssigned.map((id) => id.toString()));
  const removable = demoDoctorIds.filter((id) => !assigned.has(id.toString()));
  const { deletedCount: doctors } = await Doctor.deleteMany({ _id: { $in: removable } });

  console.info(`[seed:demo] reset: removed ${patients} demo patients and ${doctors} demo doctors`);
}

async function seedDemo(): Promise<void> {
  if (env.isProduction) {
    throw new Error('Refusing to seed demo data when NODE_ENV=production.');
  }

  await connectDatabase();
  await Promise.all([Doctor.init(), Patient.init()]);

  const now = Date.now();
  const doctorSeeds = buildDoctors(now);
  const doctorEmails = doctorSeeds.map((doctor) => doctor.email);

  if (process.argv.includes('--reset')) await resetDemoData(doctorEmails);

  // `timestamps: false` + explicit createdAt/updatedAt: Mongoose must not stamp "now".
  const doctorResult = await Doctor.bulkWrite(
    doctorSeeds.map((doctor) => ({
      updateOne: {
        filter: { email: doctor.email },
        update: { $setOnInsert: { ...doctor, updatedAt: doctor.createdAt } },
        upsert: true,
        timestamps: false,
      },
    })),
    { ordered: false },
  );

  // Read the ids back: a doctor may already exist under an id created by an earlier run.
  const storedDoctors = await Doctor.find({ email: { $in: doctorEmails } }).select('email').lean();
  const doctorIdByEmail = new Map(storedDoctors.map((doctor) => [doctor.email, doctor._id]));

  // Uneven workload so "top doctors" is meaningful; the newest doctor has no patients yet.
  const weights = doctorSeeds.map((_, index) =>
    index === doctorSeeds.length - 1 ? 0 : 1 / (((index * 7) % doctorSeeds.length) + 1) ** 0.75,
  );

  const patientOps = Array.from({ length: PATIENT_COUNT }, (_, index) => {
    const doctor = doctorSeeds[pickWeightedIndex(weights)];
    const doctorId = doctor ? doctorIdByEmail.get(doctor.email) : undefined;
    if (!doctor || !doctorId) throw new Error('Demo doctor missing after upsert');
    const { _id, ...fields } = buildPatient(index, doctor, doctorId, now);
    return {
      updateOne: { filter: { _id }, update: { $setOnInsert: fields }, upsert: true, timestamps: false },
    };
  });
  const patientResult = await Patient.bulkWrite(patientOps, { ordered: false });

  const [totalDoctors, totalPatients] = await Promise.all([Doctor.countDocuments(), Patient.countDocuments()]);
  console.info(`[seed:demo] database "${databaseName()}"`);
  console.info(
    `[seed:demo] doctors:  ${doctorResult.upsertedCount} inserted, ${doctorSeeds.length - doctorResult.upsertedCount} already present (collection total ${totalDoctors})`,
  );
  console.info(
    `[seed:demo] patients: ${patientResult.upsertedCount} inserted, ${PATIENT_COUNT - patientResult.upsertedCount} already present (collection total ${totalPatients})`,
  );
}

seedDemo()
  .catch((error: unknown) => {
    console.error(`[seed:demo] failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDatabase();
  });
