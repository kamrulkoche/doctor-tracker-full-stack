import { Schema, model } from 'mongoose';

export const USER_ROLES = ['admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserAttrs {
  name: string;
  email: string;
  /** bcrypt hash. Excluded from every query unless explicitly selected. */
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserAttrs>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'admin', required: true },
  },
  { timestamps: true, versionKey: false },
);

// Login lookup + one account per email.
userSchema.index({ email: 1 }, { unique: true });

export const User = model<UserAttrs>('User', userSchema);
