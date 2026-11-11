import { Types } from 'mongoose';
import { Doctor } from '../../src/models/doctor.model';
import { Patient, type Gender } from '../../src/models/patient.model';
import { User } from '../../src/models/user.model';
import { hashPassword } from '../../src/modules/auth/auth.service';

export const ADMIN = {
  name: 'Test Admin',
  email: 'admin@test.dev',
  password: 'Correct-Horse-9',
} as const;

export const UNKNOWN_ID = '64b7f0f0f0f0f0f0f0f0f0f0';

export async function ensureIndexes(): Promise<void> {
  await Promise.all([User.init(), Doctor.init(), Patient.init()]);
}

export async function clearDomainData(): Promise<void> {
  await Promise.all([Doctor.deleteMany({}), Patient.deleteMany({})]);
}

export async function clearDatabase(): Promise<void> {
  await Promise.all([User.deleteMany({}), clearDomainData()]);
}

export async function createAdmin(): Promise<string> {
  const user = await User.create({
    name: ADMIN.name,
    email: ADMIN.email,
    password: await hashPassword(ADMIN.password),
    role: 'admin',
  });
  return user._id.toString();
}

/** Noon UTC on the given day - comfortably inside the day for inclusive range tests. */
export const at = (day: string): Date => new Date(`${day}T12:00:00.000Z`);

export interface DoctorFixture {
  name: string;
  specialization: string;
  hospital: string;
  phone?: string;
  email?: string;
  createdAt: Date;
}

/** Inserts doctors with explicit timestamps and returns their ids in input order. */
export async function insertDoctors(fixtures: DoctorFixture[]): Promise<string[]> {
  const documents = fixtures.map((fixture, index) => ({
    _id: new Types.ObjectId(),
    phone: `+1 555 01${String(index).padStart(2, '0')}`,
    email: `${fixture.name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
    ...fixture,
    updatedAt: fixture.createdAt,
  }));
  await Doctor.insertMany(documents, { timestamps: false });
  return documents.map((document) => document._id.toString());
}

export interface PatientFixture {
  name: string;
  condition: string;
  doctorId: string;
  createdAt: Date;
  age?: number | null;
  gender?: Gender | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export async function insertPatients(fixtures: PatientFixture[]): Promise<string[]> {
  const documents = fixtures.map((fixture) => ({
    _id: new Types.ObjectId(),
    age: null,
    gender: null,
    phone: null,
    email: null,
    notes: null,
    ...fixture,
    doctorId: new Types.ObjectId(fixture.doctorId),
    updatedAt: fixture.createdAt,
  }));
  await Patient.insertMany(documents, { timestamps: false });
  return documents.map((document) => document._id.toString());
}
