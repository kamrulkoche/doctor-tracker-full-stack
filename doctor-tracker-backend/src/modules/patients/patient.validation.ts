import { z } from 'zod';
import { GENDERS } from '../../models/patient.model';
import {
  emailSchema,
  emptyToNull,
  emptyToUndefined,
  listQueryShape,
  objectIdSchema,
  optionalQuery,
  phoneSchema,
  refineDateRange,
  textField,
} from '../../utils/validation';

export const PATIENT_SORT_FIELDS = ['name', 'age', 'condition', 'createdAt'] as const;
export type PatientSortField = (typeof PATIENT_SORT_FIELDS)[number];

/**
 * An optional body field: `""`, `null` and "omitted" all mean "unset" and are normalised
 * to `null`, so the service always receives the full set of fields for a PUT full-replace.
 */
function unsettable<T extends z.ZodType>(schema: T) {
  return z
    .preprocess(emptyToNull, schema.nullable())
    .optional()
    .transform((value) => value ?? null);
}

const patientFields = {
  name: textField('Name', 2, 100),
  condition: textField('Condition', 2, 120),
  age: unsettable(
    z
      .number('Age must be a number')
      .int('Age must be a whole number')
      .min(0, 'Age must be between 0 and 130')
      .max(130, 'Age must be between 0 and 130'),
  ),
  gender: unsettable(z.enum(GENDERS, 'Gender must be male, female or other')),
  phone: unsettable(phoneSchema),
  email: unsettable(emailSchema),
  notes: unsettable(z.string('Notes must be text').trim().max(2000, 'Notes must be at most 2000 characters')),
};

/** `POST /patients` and `PUT /patients/:id`. */
export const patientBodySchema = z.strictObject({
  ...patientFields,
  doctorId: objectIdSchema,
});

/** `POST /doctors/:id/patients` - the doctor comes from the URL, so `doctorId` is not accepted. */
export const doctorPatientBodySchema = z.strictObject(patientFields);

const patientFilterShape = {
  ...listQueryShape,
  sortBy: z.preprocess(emptyToUndefined, z.enum(PATIENT_SORT_FIELDS).default('createdAt')),
  condition: optionalQuery(z.string().trim().max(120)),
  gender: optionalQuery(z.enum(GENDERS)),
};

export const listPatientsQuerySchema = z
  .object({ ...patientFilterShape, doctorId: optionalQuery(objectIdSchema) })
  .superRefine(refineDateRange);

/** `GET /doctors/:id/patients` - same filters, minus `doctorId` (ignored if sent). */
export const doctorPatientsQuerySchema = z.object(patientFilterShape).superRefine(refineDateRange);

export type PatientBody = z.infer<typeof patientBodySchema>;
export type DoctorPatientBody = z.infer<typeof doctorPatientBodySchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
export type DoctorPatientsQuery = z.infer<typeof doctorPatientsQuerySchema>;
