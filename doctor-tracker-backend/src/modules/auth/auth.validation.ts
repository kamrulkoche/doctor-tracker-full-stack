import { z } from 'zod';
import { emailSchema } from '../../utils/validation';

export const loginBodySchema = z.strictObject({
  email: emailSchema,
  // No complexity rules on login: they would only leak the password policy to an attacker.
  password: z
    .string('Password is required')
    .min(1, 'Password is required')
    .max(128, 'Password must be at most 128 characters'),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
