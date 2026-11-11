import { z } from 'zod';
import { dateRangeQueryShape, emptyToUndefined, intQuery, refineDateRange } from '../../utils/validation';

const intervalSchema = z.preprocess(emptyToUndefined, z.enum(['day', 'week', 'month']).default('month'));

/** `patient-growth` and `doctor-statistics`. */
export const timeSeriesQuerySchema = z
  .object({ interval: intervalSchema, ...dateRangeQueryShape })
  .superRefine(refineDateRange);

export const patientsPerDoctorQuerySchema = z
  .object({ limit: intQuery({ min: 1, max: 50, fallback: 10 }), ...dateRangeQueryShape })
  .superRefine(refineDateRange);

export const conditionDistributionQuerySchema = z
  .object({ limit: intQuery({ min: 1, max: 20, fallback: 5 }), ...dateRangeQueryShape })
  .superRefine(refineDateRange);

export const recentActivityQuerySchema = z.object({
  limit: intQuery({ min: 1, max: 20, fallback: 5 }),
});

export type TimeSeriesQuery = z.infer<typeof timeSeriesQuerySchema>;
export type PatientsPerDoctorQuery = z.infer<typeof patientsPerDoctorQuerySchema>;
export type ConditionDistributionQuery = z.infer<typeof conditionDistributionQuerySchema>;
export type RecentActivityQuery = z.infer<typeof recentActivityQuerySchema>;
