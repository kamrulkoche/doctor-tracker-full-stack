import { beforeAll, describe, expect, it } from 'vitest';
import type {
  ConditionDistribution,
  DashboardStats,
  DoctorPatientCount,
  DoctorStatistics,
  RecentActivity,
  TimeSeries,
} from '../src/modules/dashboard/dashboard.service';
import { startOfMonthUtc } from '../src/utils/date-range';
import { ApiClient, data, errorPaths, fail } from './helpers/api';
import { at, clearDatabase, clearDomainData, createAdmin, insertDoctors, insertPatients } from './helpers/db';

let client: ApiClient;

beforeAll(async () => {
  await clearDatabase();
  await createAdmin();
  client = await ApiClient.createAuthenticated();
});

const get = async <T>(path: string): Promise<T> => data<T>(await client.get(`/api/dashboard${path}`).expect(200));
const counts = (series: TimeSeries): number[] => series.points.map((point) => point.count);

describe('dashboard with an empty database', () => {
  beforeAll(clearDomainData);

  it('stats are all zero', async () => {
    expect(await get<DashboardStats>('/stats')).toEqual({
      totalDoctors: 0,
      totalPatients: 0,
      totalSpecializations: 0,
      newPatientsThisMonth: 0,
      newPatientsLastMonth: 0,
      newDoctorsThisMonth: 0,
      averagePatientsPerDoctor: 0,
    });
  });

  it('patient growth is a fully gap-filled series of zeros', async () => {
    const series = await get<TimeSeries>('/patient-growth');

    expect(series.interval).toBe('month');
    expect(series.total).toBe(0);
    expect(series.points).toHaveLength(12);
    expect(series.points.every((point) => point.count === 0 && point.cumulative === 0)).toBe(true);
  });

  it('the remaining endpoints return empty collections, never errors', async () => {
    expect(await get<DoctorPatientCount[]>('/patients-per-doctor')).toEqual([]);
    expect(await get<ConditionDistribution>('/condition-distribution')).toEqual({ total: 0, items: [] });
    expect(await get<RecentActivity>('/recent-activity')).toEqual({
      recentDoctors: [],
      recentPatients: [],
      topDoctors: [],
    });

    const statistics = await get<DoctorStatistics>('/doctor-statistics');
    expect(statistics.specializationDistribution).toEqual([]);
    expect(statistics.doctorsOverTime.total).toBe(0);
    expect(statistics.doctorsOverTime.points).toHaveLength(12);
  });
});

describe('dashboard with known fixture data', () => {
  const now = new Date();
  const thisMonth = startOfMonthUtc(now);
  const lastMonth = startOfMonthUtc(now, -1);
  const dayIntoLastMonth = new Date(lastMonth.getTime() + 86_400_000);

  let alpha: string;
  let bravo: string;
  let charlie: string;
  let delta: string;

  beforeAll(async () => {
    await clearDomainData();
    [alpha = '', bravo = '', charlie = '', delta = ''] = await insertDoctors([
      { name: 'Dr. Alpha', specialization: 'Cardiology', hospital: 'City Hospital', createdAt: at('2025-01-10') },
      { name: 'Dr. Bravo', specialization: 'Cardiology', hospital: 'Lake Clinic', createdAt: at('2025-02-10') },
      { name: 'Dr. Charlie', specialization: 'Neurology', hospital: 'City Hospital', createdAt: at('2025-02-20') },
      // Joined at the very start of the current month; has no patients.
      { name: 'Dr. Delta', specialization: 'Pediatrics', hospital: 'Lake Clinic', createdAt: thisMonth },
    ]);

    /*
     * 13 patients. Alpha 6, Charlie 4, Bravo 3, Delta 0.
     * Asthma 5, Diabetes 3, and one each of Anemia, Eczema, Flu, Gout, Migraine.
     * 3 Feb 2025 and 10 Feb 2025 are Mondays.
     */
    await insertPatients([
      { name: 'P01', condition: 'Asthma', doctorId: alpha, createdAt: at('2025-01-15') },
      { name: 'P02', condition: 'Asthma', doctorId: alpha, createdAt: at('2025-01-20') },
      { name: 'P03', condition: 'Diabetes', doctorId: alpha, createdAt: at('2025-02-03') },
      { name: 'P04', condition: 'Diabetes', doctorId: alpha, createdAt: at('2025-02-09') },
      { name: 'P05', condition: 'Asthma', doctorId: alpha, createdAt: at('2025-04-10') },
      { name: 'P06', condition: 'Migraine', doctorId: bravo, createdAt: at('2025-02-10') },
      { name: 'P07', condition: 'Asthma', doctorId: bravo, createdAt: at('2025-04-11') },
      { name: 'P08', condition: 'Flu', doctorId: bravo, createdAt: at('2025-04-30') },
      { name: 'P09', condition: 'Eczema', doctorId: charlie, createdAt: at('2025-01-31') },
      { name: 'P10', condition: 'Gout', doctorId: charlie, createdAt: at('2025-04-01') },
      { name: 'P11', condition: 'Asthma', doctorId: alpha, createdAt: thisMonth },
      { name: 'P12', condition: 'Diabetes', doctorId: charlie, createdAt: thisMonth },
      { name: 'P13', condition: 'Anemia', doctorId: charlie, createdAt: dayIntoLastMonth },
    ]);
  });

  describe('GET /dashboard/stats', () => {
    it('returns exact totals and month-over-month counters', async () => {
      expect(await get<DashboardStats>('/stats')).toEqual({
        totalDoctors: 4,
        totalPatients: 13,
        totalSpecializations: 3,
        newPatientsThisMonth: 2,
        newPatientsLastMonth: 1,
        newDoctorsThisMonth: 1,
        averagePatientsPerDoctor: 3.3, // 13 / 4 = 3.25, rounded to one decimal
      });
    });

    it('ignores any date range', async () => {
      const stats = await get<DashboardStats>('/stats?from=2025-01-01&to=2025-01-31');
      expect(stats.totalPatients).toBe(13);
    });
  });

  describe('GET /dashboard/patient-growth', () => {
    it('buckets by month and gap-fills the empty month', async () => {
      const series = await get<TimeSeries>('/patient-growth?interval=month&from=2025-01-01&to=2025-04-30');

      expect(series).toEqual({
        interval: 'month',
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-04-30T23:59:59.999Z',
        total: 10,
        points: [
          { date: '2025-01-01T00:00:00.000Z', count: 3, cumulative: 3 },
          { date: '2025-02-01T00:00:00.000Z', count: 3, cumulative: 6 },
          { date: '2025-03-01T00:00:00.000Z', count: 0, cumulative: 6 },
          { date: '2025-04-01T00:00:00.000Z', count: 4, cumulative: 10 },
        ],
      });
    });

    it('buckets by week starting on Monday (UTC)', async () => {
      const series = await get<TimeSeries>('/patient-growth?interval=week&from=2025-02-03&to=2025-02-23');

      expect(series.points).toEqual([
        { date: '2025-02-03T00:00:00.000Z', count: 2, cumulative: 2 }, // Mon 3 Feb + Sun 9 Feb
        { date: '2025-02-10T00:00:00.000Z', count: 1, cumulative: 3 }, // Mon 10 Feb
        { date: '2025-02-17T00:00:00.000Z', count: 0, cumulative: 3 },
      ]);
      expect(series.total).toBe(3);
    });

    it('aligns the first bucket to Monday while still honouring `from`', async () => {
      // Wed 5 Feb .. Wed 12 Feb: the 3 Feb record is before `from` and is not counted.
      const series = await get<TimeSeries>('/patient-growth?interval=week&from=2025-02-05&to=2025-02-12');

      expect(series.from).toBe('2025-02-03T00:00:00.000Z');
      expect(series.to).toBe('2025-02-12T23:59:59.999Z');
      expect(counts(series)).toEqual([1, 1]);
    });

    it('buckets by day and gap-fills days without patients', async () => {
      const series = await get<TimeSeries>('/patient-growth?interval=day&from=2025-04-09&to=2025-04-12');

      expect(series.points.map((point) => point.date.slice(0, 10))).toEqual([
        '2025-04-09',
        '2025-04-10',
        '2025-04-11',
        '2025-04-12',
      ]);
      expect(counts(series)).toEqual([0, 1, 1, 0]);
      expect(series.points.map((point) => point.cumulative)).toEqual([0, 1, 2, 2]);
    });

    it('defaults to the last 12 months, 12 weeks or 30 days', async () => {
      const monthly = await get<TimeSeries>('/patient-growth');
      expect(monthly.interval).toBe('month');
      expect(monthly.points).toHaveLength(12);
      expect(monthly.points.at(-1)).toMatchObject({ date: thisMonth.toISOString(), count: 2 });
      expect(monthly.points.at(-2)).toMatchObject({ date: lastMonth.toISOString(), count: 1 });
      expect(monthly.from).toBe(startOfMonthUtc(now, -11).toISOString());
      expect(monthly.total).toBe(monthly.points.at(-1)?.cumulative);

      expect((await get<TimeSeries>('/patient-growth?interval=week')).points).toHaveLength(12);
      expect((await get<TimeSeries>('/patient-growth?interval=day')).points).toHaveLength(30);
    });

    it('rejects an invalid interval, an inverted range and an absurdly large range', async () => {
      const interval = await client.get('/api/dashboard/patient-growth?interval=year').expect(400);
      expect(errorPaths(interval)).toEqual(['interval']);

      const inverted = await client.get('/api/dashboard/patient-growth?from=2025-05-01&to=2025-04-01').expect(400);
      expect(errorPaths(inverted)).toEqual(['to']);

      const huge = await client.get('/api/dashboard/patient-growth?interval=day&from=2000-01-01').expect(400);
      expect(fail(huge).error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /dashboard/patients-per-doctor', () => {
    it('ranks doctors by all-time patient count', async () => {
      expect(await get<DoctorPatientCount[]>('/patients-per-doctor')).toEqual([
        { doctorId: alpha, name: 'Dr. Alpha', specialization: 'Cardiology', hospital: 'City Hospital', patientCount: 6 },
        { doctorId: charlie, name: 'Dr. Charlie', specialization: 'Neurology', hospital: 'City Hospital', patientCount: 4 },
        { doctorId: bravo, name: 'Dr. Bravo', specialization: 'Cardiology', hospital: 'Lake Clinic', patientCount: 3 },
      ]);
    });

    it('honours limit', async () => {
      const rows = await get<DoctorPatientCount[]>('/patients-per-doctor?limit=2');
      expect(rows.map((row) => row.name)).toEqual(['Dr. Alpha', 'Dr. Charlie']);

      expect(errorPaths(await client.get('/api/dashboard/patients-per-doctor?limit=51').expect(400))).toEqual(['limit']);
    });

    it('counts only patients registered inside the range, ties ordered by name', async () => {
      const yearStart = await get<DoctorPatientCount[]>('/patients-per-doctor?from=2025-01-01&to=2025-04-30');
      expect(yearStart.map((row) => [row.name, row.patientCount])).toEqual([
        ['Dr. Alpha', 5],
        ['Dr. Bravo', 3],
        ['Dr. Charlie', 2],
      ]);

      const april = await get<DoctorPatientCount[]>('/patients-per-doctor?from=2025-04-01&to=2025-04-30');
      expect(april.map((row) => [row.name, row.patientCount])).toEqual([
        ['Dr. Bravo', 2],
        ['Dr. Alpha', 1],
        ['Dr. Charlie', 1],
      ]);
    });
  });

  describe('GET /dashboard/condition-distribution', () => {
    it('returns the top 5 conditions and collapses the rest into "Other"', async () => {
      expect(await get<ConditionDistribution>('/condition-distribution')).toEqual({
        total: 13,
        items: [
          { condition: 'Asthma', count: 5, percentage: 38.5 },
          { condition: 'Diabetes', count: 3, percentage: 23.1 },
          { condition: 'Anemia', count: 1, percentage: 7.7 },
          { condition: 'Eczema', count: 1, percentage: 7.7 },
          { condition: 'Flu', count: 1, percentage: 7.7 },
          { condition: 'Other', count: 2, percentage: 15.4 },
        ],
      });
    });

    it('sizes the "Other" bucket from the limit, and omits it when nothing is left over', async () => {
      const top2 = await get<ConditionDistribution>('/condition-distribution?limit=2');
      expect(top2.items).toEqual([
        { condition: 'Asthma', count: 5, percentage: 38.5 },
        { condition: 'Diabetes', count: 3, percentage: 23.1 },
        { condition: 'Other', count: 5, percentage: 38.5 },
      ]);

      const all = await get<ConditionDistribution>('/condition-distribution?limit=20');
      expect(all.items).toHaveLength(7);
      expect(all.items.some((item) => item.condition === 'Other')).toBe(false);
      expect(all.items.reduce((sum, item) => sum + item.count, 0)).toBe(13);
    });

    it('applies the date range', async () => {
      expect(await get<ConditionDistribution>('/condition-distribution?from=2025-01-01&to=2025-01-31')).toEqual({
        total: 3,
        items: [
          { condition: 'Asthma', count: 2, percentage: 66.7 },
          { condition: 'Eczema', count: 1, percentage: 33.3 },
        ],
      });

      expect(await get<ConditionDistribution>('/condition-distribution?from=2024-01-01&to=2024-12-31')).toEqual({
        total: 0,
        items: [],
      });
      expect(errorPaths(await client.get('/api/dashboard/condition-distribution?limit=21').expect(400))).toEqual(['limit']);
    });
  });

  describe('GET /dashboard/doctor-statistics', () => {
    it('returns doctors over time and the specialization distribution for a range', async () => {
      const statistics = await get<DoctorStatistics>('/doctor-statistics?interval=month&from=2025-01-01&to=2025-03-31');

      expect(statistics.doctorsOverTime).toEqual({
        interval: 'month',
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-03-31T23:59:59.999Z',
        total: 3,
        points: [
          { date: '2025-01-01T00:00:00.000Z', count: 1, cumulative: 1 },
          { date: '2025-02-01T00:00:00.000Z', count: 2, cumulative: 3 },
          { date: '2025-03-01T00:00:00.000Z', count: 0, cumulative: 3 },
        ],
      });
      // Doctors created in the range; patientCount is their all-time patient total.
      expect(statistics.specializationDistribution).toEqual([
        { specialization: 'Cardiology', doctorCount: 2, patientCount: 9 },
        { specialization: 'Neurology', doctorCount: 1, patientCount: 4 },
      ]);
    });

    it('without a range covers every doctor, sorted by doctorCount then name', async () => {
      const statistics = await get<DoctorStatistics>('/doctor-statistics');

      expect(statistics.specializationDistribution).toEqual([
        { specialization: 'Cardiology', doctorCount: 2, patientCount: 9 },
        { specialization: 'Neurology', doctorCount: 1, patientCount: 4 },
        { specialization: 'Pediatrics', doctorCount: 1, patientCount: 0 },
      ]);
      expect(statistics.doctorsOverTime.points).toHaveLength(12);
      expect(statistics.doctorsOverTime.points.at(-1)).toMatchObject({ date: thisMonth.toISOString(), count: 1 });
    });
  });

  describe('GET /dashboard/recent-activity', () => {
    it('returns the newest doctors and patients and the top doctors', async () => {
      const activity = await get<RecentActivity>('/recent-activity');

      expect(activity.recentDoctors.map((doctor) => doctor.name)).toEqual([
        'Dr. Delta',
        'Dr. Charlie',
        'Dr. Bravo',
        'Dr. Alpha',
      ]);
      expect(activity.recentDoctors[0]).toEqual({
        id: delta,
        name: 'Dr. Delta',
        specialization: 'Pediatrics',
        hospital: 'Lake Clinic',
        createdAt: thisMonth.toISOString(),
      });

      const recentNames = activity.recentPatients.map((patient) => patient.name);
      expect(recentNames).toHaveLength(5);
      expect(recentNames.slice(0, 2).sort()).toEqual(['P11', 'P12']); // same instant
      expect(recentNames.slice(2)).toEqual(['P13', 'P08', 'P07']);
      expect(activity.recentPatients[2]).toEqual({
        id: expect.stringMatching(/^[0-9a-f]{24}$/) as string,
        name: 'P13',
        condition: 'Anemia',
        doctor: { id: charlie, name: 'Dr. Charlie', specialization: 'Neurology', hospital: 'City Hospital' },
        createdAt: dayIntoLastMonth.toISOString(),
      });

      expect(activity.topDoctors.map((doctor) => [doctor.name, doctor.patientCount])).toEqual([
        ['Dr. Alpha', 6],
        ['Dr. Charlie', 4],
        ['Dr. Bravo', 3],
      ]);
    });

    it('honours limit', async () => {
      const activity = await get<RecentActivity>('/recent-activity?limit=2');

      expect(activity.recentDoctors).toHaveLength(2);
      expect(activity.recentPatients).toHaveLength(2);
      expect(activity.topDoctors).toHaveLength(2);
      expect(errorPaths(await client.get('/api/dashboard/recent-activity?limit=21').expect(400))).toEqual(['limit']);
    });
  });
});
