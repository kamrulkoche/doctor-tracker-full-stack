import { Schema, model } from 'mongoose';

export interface DoctorAttrs {
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<DoctorAttrs>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    specialization: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    hospital: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  },
  { timestamps: true, versionKey: false },
);

/*
 * Every list index ends in `_id` with the same direction as the field before it. The API
 * sorts with an `_id` tiebreak so pages are stable; without `_id` in the key MongoDB has to
 * add a blocking SORT stage that reads the whole result set (see `npm run db:explain`).
 */

// Uniqueness + duplicate-email detection.
doctorSchema.index({ email: 1 }, { unique: true });
// Default list order (newest first), date-range filters and the dashboard time series.
doctorSchema.index({ createdAt: -1, _id: -1 });
// Sort by name and the "assigned doctor" picker (/doctors/options).
doctorSchema.index({ name: 1, _id: 1 });
// Filter by specialization, newest first; also serves sort-by-specialization and distinct().
doctorSchema.index({ specialization: 1, createdAt: -1, _id: -1 });
// Filter by hospital, newest first; also serves sort-by-hospital and distinct().
doctorSchema.index({ hospital: 1, createdAt: -1, _id: -1 });

export const Doctor = model<DoctorAttrs>('Doctor', doctorSchema);
