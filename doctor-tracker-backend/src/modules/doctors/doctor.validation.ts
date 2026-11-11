import { z } from 'zod';
import {
  emailSchema,
  emptyToUndefined,
  intQuery,
  listQueryShape,
  optionalQuery,
  phoneSchema,
  refineDateRange,
  textField,
} from '../../utils/validation';

export const DOCTOR_SORT_FIELDS = ['name', 'specialization', 'hospital', 'createdAt'] as const;
export type DoctorSortField = (typeof DOCTOR_SORT_FIELDS)[number];

/** Create and update share one schema: PUT is a full replace of the editable fields. */
export const doctorBodySchema = z.strictObject({
  name: textField('Name', 2, 100),
  specialization: textField('Specialization', 2, 80),
  hospital: textField('Hospital', 2, 120),
  phone: phoneSchema,
  email: emailSchema,
});

export const listDoctorsQuerySchema = z
  .object({
    ...listQueryShape,
    sortBy: z.preprocess(emptyToUndefined, z.enum(DOCTOR_SORT_FIELDS).default('createdAt')),
    specialization: optionalQuery(z.string().trim().max(80)),
    hospital: optionalQuery(z.string().trim().max(120)),
  })
  .superRefine(refineDateRange);

export const doctorOptionsQuerySchema = z.object({
  search: listQueryShape.search,
  limit: intQuery({ min: 1, max: 50, fallback: 20 }),
});

export type DoctorBody = z.infer<typeof doctorBodySchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
export type DoctorOptionsQuery = z.infer<typeof doctorOptionsQuerySchema>;
