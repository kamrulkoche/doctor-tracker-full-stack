import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DoctorDto, DoctorFiltersDto, DoctorOptionDto } from '../src/modules/doctors/doctor.service';
import type { PatientDto } from '../src/modules/patients/patient.service';
import { ApiClient, data, errorPaths, fail, ok } from './helpers/api';
import { UNKNOWN_ID, at, clearDatabase, clearDomainData, createAdmin, insertDoctors, insertPatients } from './helpers/db';

let client: ApiClient;

beforeAll(async () => {
  await clearDatabase();
  await createAdmin();
  client = await ApiClient.createAuthenticated();
});

const validDoctor = {
  name: 'Dr. Jane Carter',
  specialization: 'Cardiology',
  hospital: 'City Hospital',
  phone: '+1 (555) 010-1234',
  email: 'jane.carter@example.com',
};

const names = (doctors: { name: string }[]): string[] => doctors.map((doctor) => doctor.name);

describe('doctor CRUD', () => {
  beforeEach(clearDomainData);

  it('creates a doctor (201) with normalised fields', async () => {
    const response = await client
      .post('/api/doctors', { ...validDoctor, name: '  Dr. Jane Carter  ', email: '  Jane.Carter@Example.COM ' })
      .expect(201);

    const body = ok<DoctorDto>(response);
    expect(body.success).toBe(true);
    expect(body.message).toBeTypeOf('string');
    expect(body.data).toMatchObject({ ...validDoctor, patientCount: 0 });
    expect(body.data.id).toMatch(/^[0-9a-f]{24}$/);
    expect(new Date(body.data.createdAt).toISOString()).toBe(body.data.createdAt);
    expect(Object.keys(body.data).sort()).toEqual(
      ['createdAt', 'email', 'hospital', 'id', 'name', 'patientCount', 'phone', 'specialization', 'updatedAt'].sort(),
    );
  });

  it('rejects a duplicate email with 409, regardless of letter case', async () => {
    await client.post('/api/doctors', validDoctor).expect(201);
    const response = await client
      .post('/api/doctors', { ...validDoctor, name: 'Dr. Someone Else', email: 'JANE.CARTER@example.com' })
      .expect(409);

    expect(fail(response).error.code).toBe('DUPLICATE_EMAIL');
    expect(errorPaths(response)).toEqual(['email']);
  });

  it('returns field-level details for an invalid body', async () => {
    const empty = await client.post('/api/doctors', {}).expect(400);
    expect(fail(empty).error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Request validation failed' });
    expect(errorPaths(empty).sort()).toEqual(['email', 'hospital', 'name', 'phone', 'specialization']);

    const invalid = await client
      .post('/api/doctors', { ...validDoctor, name: 'J', phone: 'call me', email: 'nope' })
      .expect(400);
    expect(errorPaths(invalid).sort()).toEqual(['email', 'name', 'phone']);
    for (const detail of fail(invalid).error.details ?? []) {
      expect(detail.message.length).toBeGreaterThan(0);
    }
  });

  it('rejects unknown body fields', async () => {
    const response = await client.post('/api/doctors', { ...validDoctor, patientCount: 99 }).expect(400);

    expect(fail(response).error.code).toBe('VALIDATION_ERROR');
    expect(errorPaths(response)).toEqual(['patientCount']);
  });

  it('enforces the documented length limits', async () => {
    const response = await client
      .post('/api/doctors', {
        ...validDoctor,
        name: 'x'.repeat(101),
        specialization: 'y'.repeat(81),
        hospital: 'z'.repeat(121),
      })
      .expect(400);

    expect(errorPaths(response).sort()).toEqual(['hospital', 'name', 'specialization']);
  });

  it('fetches a doctor by id', async () => {
    const created = data<DoctorDto>(await client.post('/api/doctors', validDoctor).expect(201));
    const response = await client.get(`/api/doctors/${created.id}`).expect(200);

    expect(data<DoctorDto>(response)).toEqual(created);
  });

  it('returns INVALID_ID for a malformed id and NOT_FOUND for an unknown one', async () => {
    const malformed = await client.get('/api/doctors/not-an-id').expect(400);
    expect(fail(malformed).error.code).toBe('INVALID_ID');

    const unknown = await client.get(`/api/doctors/${UNKNOWN_ID}`).expect(404);
    expect(fail(unknown).error.code).toBe('NOT_FOUND');

    expect(fail(await client.put('/api/doctors/123', validDoctor).expect(400)).error.code).toBe('INVALID_ID');
    expect(fail(await client.delete('/api/doctors/123').expect(400)).error.code).toBe('INVALID_ID');
  });

  it('replaces the editable fields on PUT', async () => {
    const created = data<DoctorDto>(await client.post('/api/doctors', validDoctor).expect(201));
    const changes = {
      name: 'Dr. Jane Carter-Lee',
      specialization: 'Neurology',
      hospital: 'Lake Clinic',
      phone: '+44 20 7946 0000',
      email: 'jane.lee@example.com',
    };

    const response = await client.put(`/api/doctors/${created.id}`, changes).expect(200);
    const updated = data<DoctorDto>(response);

    expect(updated).toMatchObject({ id: created.id, ...changes, patientCount: 0 });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(data<DoctorDto>(await client.get(`/api/doctors/${created.id}`))).toEqual(updated);
  });

  it('validates PUT like POST: full body, unique email, existing doctor', async () => {
    const first = data<DoctorDto>(await client.post('/api/doctors', validDoctor).expect(201));
    const second = data<DoctorDto>(
      await client.post('/api/doctors', { ...validDoctor, email: 'other@example.com' }).expect(201),
    );

    const partial = await client.put(`/api/doctors/${first.id}`, { name: 'Dr. Only Name' }).expect(400);
    expect(errorPaths(partial).sort()).toEqual(['email', 'hospital', 'phone', 'specialization']);

    const duplicate = await client.put(`/api/doctors/${second.id}`, validDoctor).expect(409);
    expect(fail(duplicate).error.code).toBe('DUPLICATE_EMAIL');

    // Keeping your own email is not a conflict.
    await client.put(`/api/doctors/${first.id}`, { ...validDoctor, hospital: 'North Medical' }).expect(200);

    const missing = await client.put(`/api/doctors/${UNKNOWN_ID}`, { ...validDoctor, email: 'x@example.com' });
    expect(missing.status).toBe(404);
  });

  it('deletes a doctor and returns data: null', async () => {
    const created = data<DoctorDto>(await client.post('/api/doctors', validDoctor).expect(201));

    const response = await client.delete(`/api/doctors/${created.id}`).expect(200);
    expect(ok<null>(response).data).toBeNull();
    expect(ok<null>(response).message).toBeTypeOf('string');

    await client.get(`/api/doctors/${created.id}`).expect(404);
    await client.delete(`/api/doctors/${created.id}`).expect(404);
  });

  it('blocks deleting a doctor who still has patients, then allows it once they are removed', async () => {
    const doctor = data<DoctorDto>(await client.post('/api/doctors', validDoctor).expect(201));
    const patientIds: string[] = [];
    for (const name of ['Pat One', 'Pat Two']) {
      const response = await client.post(`/api/doctors/${doctor.id}/patients`, { name, condition: 'Asthma' }).expect(201);
      patientIds.push(data<PatientDto>(response).id);
    }

    const blocked = await client.delete(`/api/doctors/${doctor.id}`).expect(409);
    expect(fail(blocked).error.code).toBe('DOCTOR_HAS_PATIENTS');
    expect(fail(blocked).error.message).toContain('2');
    expect(fail(blocked).error.details).toEqual([{ path: 'patientCount', message: '2' }]);
    await client.get(`/api/doctors/${doctor.id}`).expect(200); // still there

    for (const patientId of patientIds) await client.delete(`/api/patients/${patientId}`).expect(200);

    await client.delete(`/api/doctors/${doctor.id}`).expect(200);
    await client.get(`/api/doctors/${doctor.id}`).expect(404);
  });
});

describe('a doctor’s patients', () => {
  let doctorId: string;
  let otherDoctorId: string;

  beforeAll(async () => {
    await clearDomainData();
    [doctorId = '', otherDoctorId = ''] = await insertDoctors([
      { name: 'Dr. Main', specialization: 'Cardiology', hospital: 'City Hospital', createdAt: at('2025-01-01') },
      { name: 'Dr. Other', specialization: 'Neurology', hospital: 'Lake Clinic', createdAt: at('2025-01-02') },
    ]);
    await insertPatients([
      { name: 'Anna First', condition: 'Asthma', doctorId, createdAt: at('2025-02-01') },
      { name: 'Ben Second', condition: 'Diabetes', doctorId, createdAt: at('2025-02-02') },
      { name: 'Cara Third', condition: 'Asthma', doctorId, createdAt: at('2025-02-03') },
      { name: 'Dan Elsewhere', condition: 'Asthma', doctorId: otherDoctorId, createdAt: at('2025-02-04') },
    ]);
  });

  it('lists only that doctor’s patients, newest first, with pagination', async () => {
    const response = await client.get(`/api/doctors/${doctorId}/patients?limit=2`).expect(200);
    const body = ok<PatientDto[]>(response);

    expect(names(body.data)).toEqual(['Cara Third', 'Ben Second']);
    expect(body.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(body.data.every((patient) => patient.doctor.id === doctorId)).toBe(true);
    expect(body.data[0]?.doctor).toEqual({
      id: doctorId,
      name: 'Dr. Main',
      specialization: 'Cardiology',
      hospital: 'City Hospital',
    });
  });

  it('supports the patient filters and ignores a doctorId query param', async () => {
    const filtered = await client.get(`/api/doctors/${doctorId}/patients?condition=Asthma&sortBy=name&sortOrder=asc`);
    expect(names(data<PatientDto[]>(filtered))).toEqual(['Anna First', 'Cara Third']);

    const searched = await client.get(`/api/doctors/${doctorId}/patients?search=ben`);
    expect(names(data<PatientDto[]>(searched))).toEqual(['Ben Second']);

    const ignored = await client.get(`/api/doctors/${doctorId}/patients?doctorId=${otherDoctorId}`).expect(200);
    expect(ok<PatientDto[]>(ignored).pagination?.total).toBe(3);
  });

  it('returns 404 for an unknown doctor and INVALID_ID for a malformed id', async () => {
    expect(fail(await client.get(`/api/doctors/${UNKNOWN_ID}/patients`).expect(404)).error.code).toBe('NOT_FOUND');
    expect(fail(await client.get('/api/doctors/xyz/patients').expect(400)).error.code).toBe('INVALID_ID');
  });

  it('adds a patient under the doctor (201)', async () => {
    const response = await client
      .post(`/api/doctors/${otherDoctorId}/patients`, { name: 'Eve New', condition: 'Migraine', age: 31 })
      .expect(201);

    const patient = data<PatientDto>(response);
    expect(patient).toMatchObject({ name: 'Eve New', condition: 'Migraine', age: 31, gender: null });
    expect(patient.doctor.id).toBe(otherDoctorId);

    const doctor = data<DoctorDto>(await client.get(`/api/doctors/${otherDoctorId}`));
    expect(doctor.patientCount).toBe(2);
  });

  it('rejects doctorId in the body, invalid input and unknown doctors', async () => {
    const withDoctorId = await client
      .post(`/api/doctors/${doctorId}/patients`, { name: 'Sneaky', condition: 'Asthma', doctorId: otherDoctorId })
      .expect(400);
    expect(errorPaths(withDoctorId)).toEqual(['doctorId']);

    const invalid = await client.post(`/api/doctors/${doctorId}/patients`, { name: 'X' }).expect(400);
    expect(errorPaths(invalid).sort()).toEqual(['condition', 'name']);

    const unknown = await client.post(`/api/doctors/${UNKNOWN_ID}/patients`, { name: 'Nobody', condition: 'Asthma' });
    expect(unknown.status).toBe(404);
    expect(fail(unknown).error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/doctors (list, search, filter, sort, paginate)', () => {
  let ids: string[];

  // 12 doctors, one every few weeks from January to June 2025 (oldest first).
  const fixtures = [
    { name: 'Alice Anderson', specialization: 'Cardiology', hospital: 'City Hospital', createdAt: at('2025-01-05') },
    { name: 'Bob Brown', specialization: 'Cardiology', hospital: 'City Hospital', createdAt: at('2025-01-15') },
    { name: 'Carol Clark', specialization: 'Neurology', hospital: 'City Hospital', createdAt: at('2025-02-01') },
    { name: 'David Davis', specialization: 'Neurology', hospital: 'Lake Clinic', createdAt: at('2025-02-10') },
    { name: 'Eve Evans', specialization: 'Pediatrics', hospital: 'Lake Clinic', createdAt: at('2025-03-01') },
    { name: 'Frank Foster', specialization: 'Pediatrics', hospital: 'Lake Clinic', createdAt: at('2025-03-15') },
    { name: 'Grace Green', specialization: 'Cardiology', hospital: 'Lake Clinic', createdAt: at('2025-04-01') },
    { name: 'Henry Hill', specialization: 'Dermatology', hospital: 'North Medical', createdAt: at('2025-04-20') },
    { name: 'Ivy Irwin', specialization: 'Dermatology', hospital: 'North Medical', createdAt: at('2025-05-05') },
    { name: 'Jack Jones', specialization: 'Cardiology', hospital: 'North Medical', createdAt: at('2025-05-25') },
    { name: 'Kara King', specialization: 'Oncology', hospital: 'City Hospital', createdAt: at('2025-06-10') },
    {
      name: 'Liam Lewis',
      specialization: 'Oncology',
      hospital: 'City Hospital',
      phone: '+44 20 7946 0999',
      email: 'l.lewis@sample.org',
      createdAt: at('2025-06-30'),
    },
  ];

  const list = async (query = ''): Promise<{ names: string[]; pagination: unknown; doctors: DoctorDto[] }> => {
    const response = await client.get(`/api/doctors${query}`).expect(200);
    const body = ok<DoctorDto[]>(response);
    return { names: names(body.data), pagination: body.pagination, doctors: body.data };
  };

  beforeAll(async () => {
    await clearDomainData();
    ids = await insertDoctors(fixtures);
    const [alice = '', bob = ''] = ids;
    await insertPatients([
      { name: 'P One', condition: 'Asthma', doctorId: alice, createdAt: at('2025-07-01') },
      { name: 'P Two', condition: 'Asthma', doctorId: alice, createdAt: at('2025-07-02') },
      { name: 'P Three', condition: 'Asthma', doctorId: alice, createdAt: at('2025-07-03') },
      { name: 'P Four', condition: 'Asthma', doctorId: bob, createdAt: at('2025-07-04') },
    ]);
  });

  it('defaults to page 1, limit 10, newest first', async () => {
    const result = await list();

    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 12, totalPages: 2 });
    expect(result.names).toHaveLength(10);
    expect(result.names.slice(0, 3)).toEqual(['Liam Lewis', 'Kara King', 'Jack Jones']);
  });

  it('paginates with page and limit', async () => {
    const second = await list('?page=2&limit=5');
    expect(second.pagination).toEqual({ page: 2, limit: 5, total: 12, totalPages: 3 });
    expect(second.names).toEqual(['Grace Green', 'Frank Foster', 'Eve Evans', 'David Davis', 'Carol Clark']);

    const last = await list('?page=3&limit=5');
    expect(last.names).toEqual(['Bob Brown', 'Alice Anderson']);
  });

  it('returns an empty page with the correct total beyond the last page', async () => {
    const result = await list('?page=9&limit=5');

    expect(result.names).toEqual([]);
    expect(result.pagination).toEqual({ page: 9, limit: 5, total: 12, totalPages: 3 });
  });

  it('pages never overlap or skip records', async () => {
    const seen: string[] = [];
    for (const page of [1, 2, 3, 4]) seen.push(...(await list(`?page=${page}&limit=3&sortBy=specialization`)).names);

    expect(seen).toHaveLength(12);
    expect(new Set(seen).size).toBe(12);
  });

  it('rejects invalid query parameters', async () => {
    for (const [query, path] of [
      ['?limit=101', 'limit'],
      ['?limit=0', 'limit'],
      ['?page=0', 'page'],
      ['?page=abc', 'page'],
      ['?page=1.5', 'page'],
      ['?sortBy=email', 'sortBy'],
      ['?sortOrder=up', 'sortOrder'],
      ['?from=2025-13-01', 'from'],
      ['?to=01-02-2025', 'to'],
      ['?from=2025-06-01&to=2025-05-01', 'to'],
      [`?search=${'x'.repeat(101)}`, 'search'],
    ] as const) {
      const response = await client.get(`/api/doctors${query}`).expect(400);
      expect(fail(response).error.code).toBe('VALIDATION_ERROR');
      expect(errorPaths(response)).toEqual([path]);
    }
  });

  it('ignores unknown and empty query parameters', async () => {
    const result = await list('?search=&specialization=&hospital=&from=&to=&page=&limit=&sortBy=&unknown=1');

    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 12, totalPages: 2 });
  });

  it('searches by name, email and phone (case-insensitive contains)', async () => {
    expect((await list('?search=ALI')).names).toEqual(['Alice Anderson']);
    expect((await list('?search=sample.org')).names).toEqual(['Liam Lewis']);
    expect((await list('?search=7946')).names).toEqual(['Liam Lewis']);
    expect((await list('?search=%20%20grace%20')).names).toEqual(['Grace Green']);
    expect((await list('?search=zzz')).pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  it('treats regex metacharacters in the search term literally', async () => {
    expect((await list('?search=.*')).names).toEqual([]);
    expect((await list('?search=a.ice')).names).toEqual([]);
    expect((await list(`?search=${encodeURIComponent('(')}`)).names).toEqual([]);
    expect((await list(`?search=${encodeURIComponent('l.lewis@')}`)).names).toEqual(['Liam Lewis']);
  });

  it('filters by specialization and hospital (exact match)', async () => {
    expect((await list('?specialization=Cardiology&sortBy=name&sortOrder=asc')).names).toEqual([
      'Alice Anderson',
      'Bob Brown',
      'Grace Green',
      'Jack Jones',
    ]);
    expect((await list('?hospital=Lake%20Clinic&sortBy=name&sortOrder=asc')).names).toEqual([
      'David Davis',
      'Eve Evans',
      'Frank Foster',
      'Grace Green',
    ]);
    expect((await list('?specialization=Cardiology&hospital=Lake%20Clinic')).names).toEqual(['Grace Green']);
    expect((await list('?specialization=Cardio')).names).toEqual([]);
  });

  it('filters by an inclusive createdAt range', async () => {
    expect((await list('?from=2025-03-01&to=2025-04-20')).names).toEqual([
      'Henry Hill',
      'Grace Green',
      'Frank Foster',
      'Eve Evans',
    ]);
    expect((await list('?from=2025-06-01')).names).toEqual(['Liam Lewis', 'Kara King']);
    expect((await list('?to=2025-01-15')).names).toEqual(['Bob Brown', 'Alice Anderson']);
    expect((await list('?from=2025-01-15&to=2025-01-15')).names).toEqual(['Bob Brown']);
  });

  it('combines search, filters and dates', async () => {
    // Cardiology since 10 Jan = Bob, Grace, Jack; only Bob and Grace contain "r".
    const result = await list('?specialization=Cardiology&from=2025-01-10&search=r');

    expect(result.names).toEqual(['Grace Green', 'Bob Brown']);
    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });
  });

  it('sorts by each allowed field in both directions', async () => {
    expect((await list('?sortBy=name&sortOrder=asc&limit=3')).names).toEqual(['Alice Anderson', 'Bob Brown', 'Carol Clark']);
    expect((await list('?sortBy=name&sortOrder=desc&limit=2')).names).toEqual(['Liam Lewis', 'Kara King']);
    expect((await list('?sortBy=createdAt&sortOrder=asc&limit=2')).names).toEqual(['Alice Anderson', 'Bob Brown']);

    const bySpecialization = await list('?sortBy=specialization&sortOrder=asc&limit=12');
    expect(bySpecialization.doctors.map((doctor) => doctor.specialization)).toEqual([
      ...Array<string>(4).fill('Cardiology'),
      ...Array<string>(2).fill('Dermatology'),
      ...Array<string>(2).fill('Neurology'),
      ...Array<string>(2).fill('Oncology'),
      ...Array<string>(2).fill('Pediatrics'),
    ]);

    const byHospital = await list('?sortBy=hospital&sortOrder=desc&limit=12');
    expect(byHospital.doctors.map((doctor) => doctor.hospital)).toEqual([
      ...Array<string>(3).fill('North Medical'),
      ...Array<string>(4).fill('Lake Clinic'),
      ...Array<string>(5).fill('City Hospital'),
    ]);
  });

  it('includes patientCount for every doctor on the page', async () => {
    const result = await list('?sortBy=name&sortOrder=asc&limit=3');

    expect(result.doctors.map((doctor) => doctor.patientCount)).toEqual([3, 1, 0]);

    const detail = data<DoctorDto>(await client.get(`/api/doctors/${ids[0] ?? ''}`).expect(200));
    expect(detail.patientCount).toBe(3);
  });

  it('GET /doctors/filters returns distinct, sorted values', async () => {
    const response = await client.get('/api/doctors/filters').expect(200);

    expect(data<DoctorFiltersDto>(response)).toEqual({
      specializations: ['Cardiology', 'Dermatology', 'Neurology', 'Oncology', 'Pediatrics'],
      hospitals: ['City Hospital', 'Lake Clinic', 'North Medical'],
    });
  });

  it('GET /doctors/options returns a lightweight, name-sorted picker list', async () => {
    const all = data<DoctorOptionDto[]>(await client.get('/api/doctors/options').expect(200));
    expect(all).toHaveLength(12);
    expect(names(all).slice(0, 2)).toEqual(['Alice Anderson', 'Bob Brown']);
    expect(all[0]).toEqual({
      id: ids[0],
      name: 'Alice Anderson',
      specialization: 'Cardiology',
      hospital: 'City Hospital',
    });

    const searched = data<DoctorOptionDto[]>(await client.get('/api/doctors/options?search=AR'));
    expect(names(searched)).toEqual(['Carol Clark', 'Kara King']);

    expect(data<DoctorOptionDto[]>(await client.get('/api/doctors/options?limit=1'))).toHaveLength(1);
    expect(errorPaths(await client.get('/api/doctors/options?limit=51').expect(400))).toEqual(['limit']);
  });
});
