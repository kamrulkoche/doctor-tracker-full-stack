import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorDto } from '../src/modules/doctors/doctor.service';
import type { PatientDto } from '../src/modules/patients/patient.service';
import { ApiClient, data, errorPaths, fail, ok } from './helpers/api';
import {
  UNKNOWN_ID,
  at,
  clearDatabase,
  clearDomainData,
  createAdmin,
  insertDoctors,
  insertPatients,
  type PatientFixture,
} from './helpers/db';

let client: ApiClient;

beforeAll(async () => {
  await clearDatabase();
  await createAdmin();
  client = await ApiClient.createAuthenticated();
});

const names = (patients: { name: string }[]): string[] => patients.map((patient) => patient.name);

async function seedTwoDoctors(): Promise<[string, string]> {
  const [first = '', second = ''] = await insertDoctors([
    { name: 'Dr. Adams', specialization: 'Cardiology', hospital: 'City Hospital', createdAt: at('2025-01-01') },
    { name: 'Dr. Baker', specialization: 'Neurology', hospital: 'Lake Clinic', createdAt: at('2025-01-02') },
  ]);
  return [first, second];
}

describe('patient CRUD', () => {
  let doctorA: string;
  let doctorB: string;

  beforeEach(async () => {
    await clearDomainData();
    [doctorA, doctorB] = await seedTwoDoctors();
  });

  const fullPatient = () => ({
    name: 'Maria Lopez',
    condition: 'Hypertension',
    doctorId: doctorA,
    age: 54,
    gender: 'female',
    phone: '+1 (555) 010-7788',
    email: 'maria.lopez@example.com',
    notes: 'Monitor blood pressure weekly.',
  });

  it('creates a patient with only the required fields; optional fields are null, not omitted', async () => {
    const response = await client
      .post('/api/patients', { name: '  Tom Reed ', condition: ' Asthma ', doctorId: doctorA })
      .expect(201);

    const patient = data<PatientDto>(response);
    expect(patient).toMatchObject({
      name: 'Tom Reed',
      condition: 'Asthma',
      age: null,
      gender: null,
      phone: null,
      email: null,
      notes: null,
      doctor: { id: doctorA, name: 'Dr. Adams', specialization: 'Cardiology', hospital: 'City Hospital' },
    });
    expect(Object.keys(patient).sort()).toEqual(
      ['age', 'condition', 'createdAt', 'doctor', 'email', 'gender', 'id', 'name', 'notes', 'phone', 'updatedAt'].sort(),
    );
    expect(patient.id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('creates a patient with every field and lowercases the email', async () => {
    const response = await client
      .post('/api/patients', { ...fullPatient(), email: 'Maria.Lopez@Example.com' })
      .expect(201);

    const { doctorId, ...expected } = fullPatient();
    expect(data<PatientDto>(response)).toMatchObject(expected);
    expect(data<PatientDto>(response).doctor.id).toBe(doctorId);
  });

  it('treats "" and null on optional fields as unset', async () => {
    const response = await client
      .post('/api/patients', {
        name: 'Empty Fields',
        condition: 'Asthma',
        doctorId: doctorA,
        age: null,
        gender: '',
        phone: '',
        email: null,
        notes: '   ',
      })
      .expect(201);

    expect(data<PatientDto>(response)).toMatchObject({ age: null, gender: null, phone: null, email: null, notes: null });
  });

  it('accepts the boundary ages 0 and 130', async () => {
    for (const age of [0, 130]) {
      const response = await client.post('/api/patients', { ...fullPatient(), age }).expect(201);
      expect(data<PatientDto>(response).age).toBe(age);
    }
  });

  it('rejects a doctorId that does not exist with 400 on the doctorId field', async () => {
    const response = await client.post('/api/patients', { ...fullPatient(), doctorId: UNKNOWN_ID }).expect(400);

    expect(fail(response).error.code).toBe('VALIDATION_ERROR');
    expect(errorPaths(response)).toEqual(['doctorId']);
    expect(ok<PatientDto[]>(await client.get('/api/patients')).pagination?.total).toBe(0);
  });

  it('rejects a malformed or missing doctorId', async () => {
    const malformed = await client.post('/api/patients', { ...fullPatient(), doctorId: 'abc' }).expect(400);
    expect(errorPaths(malformed)).toEqual(['doctorId']);

    const missing = await client.post('/api/patients', { name: 'No Doctor', condition: 'Asthma' }).expect(400);
    expect(errorPaths(missing)).toEqual(['doctorId']);
  });

  it('validates every field', async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ name: 'A' }, 'name'],
      [{ condition: '' }, 'condition'],
      [{ age: 131 }, 'age'],
      [{ age: -1 }, 'age'],
      [{ age: 30.5 }, 'age'],
      [{ age: '42' }, 'age'],
      [{ gender: 'unknown' }, 'gender'],
      [{ phone: '12ab' }, 'phone'],
      [{ email: 'not-an-email' }, 'email'],
      [{ notes: 'n'.repeat(2001) }, 'notes'],
      [{ createdAt: '2020-01-01' }, 'createdAt'],
    ];

    for (const [override, path] of cases) {
      const response = await client.post('/api/patients', { ...fullPatient(), ...override }).expect(400);
      expect(fail(response).error.code).toBe('VALIDATION_ERROR');
      expect(errorPaths(response)).toEqual([path]);
    }
  });

  it('fetches a patient by id, with INVALID_ID / NOT_FOUND handling', async () => {
    const created = data<PatientDto>(await client.post('/api/patients', fullPatient()).expect(201));

    expect(data<PatientDto>(await client.get(`/api/patients/${created.id}`).expect(200))).toEqual(created);
    expect(fail(await client.get('/api/patients/123').expect(400)).error.code).toBe('INVALID_ID');
    expect(fail(await client.get(`/api/patients/${UNKNOWN_ID}`).expect(404)).error.code).toBe('NOT_FOUND');
  });

  it('PUT is a full replace: omitted optional fields are cleared', async () => {
    const created = data<PatientDto>(await client.post('/api/patients', fullPatient()).expect(201));

    const response = await client
      .put(`/api/patients/${created.id}`, { name: 'Maria L. Gomez', condition: 'Diabetes', doctorId: doctorA, age: 55 })
      .expect(200);

    const updated = data<PatientDto>(response);
    expect(updated).toMatchObject({
      id: created.id,
      name: 'Maria L. Gomez',
      condition: 'Diabetes',
      age: 55,
      gender: null,
      phone: null,
      email: null,
      notes: null,
    });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(data<PatientDto>(await client.get(`/api/patients/${created.id}`))).toEqual(updated);
  });

  it('reassigns a patient when doctorId changes', async () => {
    const created = data<PatientDto>(await client.post('/api/patients', fullPatient()).expect(201));

    const response = await client.put(`/api/patients/${created.id}`, { ...fullPatient(), doctorId: doctorB }).expect(200);
    expect(data<PatientDto>(response).doctor).toEqual({
      id: doctorB,
      name: 'Dr. Baker',
      specialization: 'Neurology',
      hospital: 'Lake Clinic',
    });

    expect(data<DoctorDto>(await client.get(`/api/doctors/${doctorA}`)).patientCount).toBe(0);
    expect(data<DoctorDto>(await client.get(`/api/doctors/${doctorB}`)).patientCount).toBe(1);
    expect(ok<PatientDto[]>(await client.get(`/api/doctors/${doctorB}/patients`)).pagination?.total).toBe(1);
  });

  it('rejects reassignment to a doctor that does not exist and leaves the patient untouched', async () => {
    const created = data<PatientDto>(await client.post('/api/patients', fullPatient()).expect(201));

    const response = await client
      .put(`/api/patients/${created.id}`, { ...fullPatient(), name: 'Changed Name', doctorId: UNKNOWN_ID })
      .expect(400);
    expect(errorPaths(response)).toEqual(['doctorId']);

    expect(data<PatientDto>(await client.get(`/api/patients/${created.id}`))).toEqual(created);
  });

  it('validates PUT and returns 404 for an unknown patient', async () => {
    const created = data<PatientDto>(await client.post('/api/patients', fullPatient()).expect(201));

    const partial = await client.put(`/api/patients/${created.id}`, { name: 'Only Name' }).expect(400);
    expect(errorPaths(partial).sort()).toEqual(['condition', 'doctorId']);

    expect(fail(await client.put(`/api/patients/${UNKNOWN_ID}`, fullPatient()).expect(404)).error.code).toBe('NOT_FOUND');
    expect(fail(await client.put('/api/patients/nope', fullPatient()).expect(400)).error.code).toBe('INVALID_ID');
  });

  it('deletes a patient and returns data: null', async () => {
    const created = data<PatientDto>(await client.post('/api/patients', fullPatient()).expect(201));

    const response = await client.delete(`/api/patients/${created.id}`).expect(200);
    expect(ok<null>(response).data).toBeNull();

    await client.get(`/api/patients/${created.id}`).expect(404);
    await client.delete(`/api/patients/${created.id}`).expect(404);
    expect(fail(await client.delete('/api/patients/nope').expect(400)).error.code).toBe('INVALID_ID');
  });
});

describe('GET /api/patients (list, search, filter, sort, paginate)', () => {
  let doctorA: string;
  let doctorB: string;

  const list = async (query = ''): Promise<{ names: string[]; pagination: unknown; patients: PatientDto[] }> => {
    const response = await client.get(`/api/patients${query}`).expect(200);
    const body = ok<PatientDto[]>(response);
    return { names: names(body.data), pagination: body.pagination, patients: body.data };
  };

  beforeAll(async () => {
    await clearDomainData();
    [doctorA, doctorB] = await seedTwoDoctors();
    const a = doctorA;
    const b = doctorB;

    // 15 patients, oldest first. Doctor A has 9, doctor B has 6.
    const rows: [string, number | null, PatientFixture['gender'], string, string, string][] = [
      ['Aaron Abel', 30, 'male', 'Asthma', a, '2025-01-10'],
      ['Bianca Bell', 45, 'female', 'Asthma', a, '2025-01-20'],
      ['Carlos Cruz', 60, 'male', 'Diabetes', a, '2025-02-05'],
      ['Diana Dale', null, 'female', 'Diabetes', b, '2025-02-15'],
      ['Edgar Eaton', 25, 'other', 'Migraine', b, '2025-03-01'],
      ['Fiona Frost', 35, 'female', 'Migraine', b, '2025-03-10'],
      ['George Gray', 70, 'male', 'Asthma', b, '2025-03-20'],
      ['Holly Hunt', 18, 'female', 'Hypertension', a, '2025-04-01'],
      ['Ian Ingram', 52, 'male', 'Hypertension', a, '2025-04-15'],
      ['Julia James', 41, null, 'Hypertension', a, '2025-05-01'],
      ['Kevin Knox', 33, 'male', 'Diabetes', a, '2025-05-10'],
      ['Laura Lane', 29, 'female', 'Asthma', b, '2025-05-20'],
      ['Mason Moss', 64, 'male', 'Migraine', a, '2025-06-01'],
      ['Nina Nash', 8, 'female', 'Asthma', a, '2025-06-15'],
      ['Oscar Owen', 77, 'male', 'Diabetes', b, '2025-06-30'],
    ];

    await insertPatients(
      rows.map(([name, age, gender, condition, doctorId, day], index) => ({
        name,
        age,
        gender,
        condition,
        doctorId,
        createdAt: at(day),
        email: name === 'Oscar Owen' ? 'o.owen@sample.org' : `${name.split(' ')[0]?.toLowerCase() ?? 'p'}@example.com`,
        phone: name === 'Oscar Owen' ? '+44 20 7946 0123' : `+1 555 02${String(index).padStart(2, '0')}`,
      })),
    );
  });

  it('defaults to page 1, limit 10, newest first, with the doctor embedded', async () => {
    const result = await list();

    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 15, totalPages: 2 });
    expect(result.names.slice(0, 3)).toEqual(['Oscar Owen', 'Nina Nash', 'Mason Moss']);
    expect(result.patients[0]?.doctor).toEqual({
      id: doctorB,
      name: 'Dr. Baker',
      specialization: 'Neurology',
      hospital: 'Lake Clinic',
    });
    expect(result.patients[1]?.doctor.id).toBe(doctorA);
  });

  it('paginates, including the last partial page and pages beyond it', async () => {
    const last = await list('?page=4&limit=4');
    expect(last.names).toEqual(['Carlos Cruz', 'Bianca Bell', 'Aaron Abel']);
    expect(last.pagination).toEqual({ page: 4, limit: 4, total: 15, totalPages: 4 });

    const beyond = await list('?page=5&limit=4');
    expect(beyond.names).toEqual([]);
    expect(beyond.pagination).toEqual({ page: 5, limit: 4, total: 15, totalPages: 4 });
  });

  it('filters by condition, doctorId and gender, alone and combined', async () => {
    expect((await list('?condition=Asthma')).pagination).toMatchObject({ total: 5 });
    expect((await list(`?doctorId=${doctorA}`)).pagination).toMatchObject({ total: 9 });
    expect((await list(`?doctorId=${doctorB}`)).pagination).toMatchObject({ total: 6 });
    expect((await list('?gender=female')).pagination).toMatchObject({ total: 6 });
    expect((await list('?gender=other')).names).toEqual(['Edgar Eaton']);

    expect((await list(`?condition=Asthma&doctorId=${doctorB}`)).names).toEqual(['Laura Lane', 'George Gray']);
    expect((await list(`?condition=Asthma&doctorId=${doctorB}&gender=male`)).names).toEqual(['George Gray']);
    expect((await list('?condition=asthma')).names).toEqual([]); // exact match
  });

  it('filters by an inclusive createdAt range, alone and with a condition', async () => {
    expect((await list('?from=2025-03-01&to=2025-03-20')).names).toEqual(['George Gray', 'Fiona Frost', 'Edgar Eaton']);
    expect((await list('?condition=Diabetes&from=2025-05-01')).names).toEqual(['Oscar Owen', 'Kevin Knox']);
    expect((await list('?to=2025-01-10')).names).toEqual(['Aaron Abel']);
  });

  it('searches by name, email and phone', async () => {
    expect((await list('?search=LAURA')).names).toEqual(['Laura Lane']);
    expect((await list('?search=sample.org')).names).toEqual(['Oscar Owen']);
    expect((await list('?search=7946')).names).toEqual(['Oscar Owen']);
    expect((await list('?search=.*')).names).toEqual([]);
    expect((await list(`?search=an&doctorId=${doctorB}`)).names).toEqual(['Laura Lane', 'Diana Dale']);
  });

  it('sorts by name, age, condition and createdAt', async () => {
    expect((await list('?sortBy=name&sortOrder=asc&limit=2')).names).toEqual(['Aaron Abel', 'Bianca Bell']);
    expect((await list('?sortBy=name&sortOrder=desc&limit=2')).names).toEqual(['Oscar Owen', 'Nina Nash']);
    expect((await list('?sortBy=createdAt&sortOrder=asc&limit=2')).names).toEqual(['Aaron Abel', 'Bianca Bell']);

    const oldest = await list('?sortBy=age&sortOrder=desc&limit=3');
    expect(oldest.patients.map((patient) => patient.age)).toEqual([77, 70, 64]);

    // Ascending: MongoDB orders null before numbers.
    const youngest = await list('?sortBy=age&sortOrder=asc&limit=3');
    expect(youngest.patients.map((patient) => patient.age)).toEqual([null, 8, 18]);

    const byCondition = await list('?sortBy=condition&sortOrder=asc&limit=15');
    expect(byCondition.patients.map((patient) => patient.condition)).toEqual([
      ...Array<string>(5).fill('Asthma'),
      ...Array<string>(4).fill('Diabetes'),
      ...Array<string>(3).fill('Hypertension'),
      ...Array<string>(3).fill('Migraine'),
    ]);
  });

  it('rejects invalid filters', async () => {
    for (const [query, path] of [
      ['?doctorId=abc', 'doctorId'],
      ['?gender=robot', 'gender'],
      ['?sortBy=email', 'sortBy'],
      ['?limit=1000', 'limit'],
      ['?from=2025-02-30', 'from'],
      ['?from=2025-06-02&to=2025-06-01', 'to'],
    ] as const) {
      const response = await client.get(`/api/patients${query}`).expect(400);
      expect(fail(response).error.code).toBe('VALIDATION_ERROR');
      expect(errorPaths(response)).toEqual([path]);
    }
  });

  it('GET /patients/filters returns distinct, sorted conditions', async () => {
    const response = await client.get('/api/patients/filters').expect(200);

    expect(data<{ conditions: string[] }>(response)).toEqual({
      conditions: ['Asthma', 'Diabetes', 'Hypertension', 'Migraine'],
    });
  });

  it('GET /doctors/:id/patients applies the same filters within one doctor', async () => {
    const all = ok<PatientDto[]>(await client.get(`/api/doctors/${doctorA}/patients`).expect(200));
    expect(all.pagination).toEqual({ page: 1, limit: 10, total: 9, totalPages: 1 });

    const asthma = ok<PatientDto[]>(await client.get(`/api/doctors/${doctorA}/patients?condition=Asthma`));
    expect(names(asthma.data)).toEqual(['Nina Nash', 'Bianca Bell', 'Aaron Abel']);
  });
});
