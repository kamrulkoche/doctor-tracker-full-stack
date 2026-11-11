import { Schema, model, type Types } from 'mongoose';

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export interface PatientAttrs {
  name: string;
  age: number | null;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  condition: string;
  notes: string | null;
  /** Every patient belongs to exactly one existing doctor (enforced in the service layer). */
  doctorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const patientSchema = new Schema<PatientAttrs>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    age: { type: Number, default: null, min: 0, max: 130 },
    gender: { type: String, enum: [...GENDERS, null], default: null },
    phone: { type: String, default: null, trim: true, maxlength: 20 },
    email: { type: String, default: null, trim: true, lowercase: true, maxlength: 254 },
    condition: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    notes: { type: String, default: null, maxlength: 2000 },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  },
  { timestamps: true, versionKey: false },
);

/* Indexes end in `_id` for the same reason as on doctors: stable, index-ordered pagination. */

// A doctor's patient list (newest first), per-doctor patient counts (covered), delete guard.
patientSchema.index({ doctorId: 1, createdAt: -1, _id: -1 });
// Filter by condition (+ date range), sort-by-condition, distinct conditions, condition chart.
patientSchema.index({ condition: 1, createdAt: -1, _id: -1 });
// Default list order (newest first), date-range filters and the dashboard time series.
patientSchema.index({ createdAt: -1, _id: -1 });
// Sort by name.
patientSchema.index({ name: 1, _id: 1 });
// Sort by age. Without it every age-sorted page is a full collection scan plus an in-memory
// sort (measured by `npm run db:bench`: 200,000 documents read to return 10).
patientSchema.index({ age: 1, _id: 1 });

export const Patient = model<PatientAttrs>('Patient', patientSchema);
