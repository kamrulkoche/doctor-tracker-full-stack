/**
 * Creates or updates the admin account from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD.
 * Idempotent: running it again with the same values changes nothing.
 *
 *   npm run seed:admin          (development, via tsx)
 *   npm run seed:admin:prod     (after `npm run build`, e.g. as a one-off job on Render)
 */
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDatabase, databaseName, disconnectDatabase } from '../config/database';
import { env } from '../config/environment';
import { User } from '../models/user.model';
import { hashPassword } from '../modules/auth/auth.service';
import { emailSchema, textField } from '../utils/validation';

const adminSchema = z.object({
  name: textField('ADMIN_NAME', 2, 100),
  email: emailSchema,
  password: z
    .string('ADMIN_PASSWORD is required')
    .min(8, 'ADMIN_PASSWORD must be at least 8 characters')
    .max(128, 'ADMIN_PASSWORD must be at most 128 characters'),
});

async function seedAdmin(): Promise<void> {
  const parsed = adminSchema.safeParse(env.admin);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env:\n${problems.join('\n')}`);
  }
  const admin = parsed.data;

  await connectDatabase();
  await User.init(); // make sure the unique email index exists before writing

  const existing = await User.findOne({ email: admin.email }).select('+password name');
  if (!existing) {
    await User.create({ ...admin, password: await hashPassword(admin.password), role: 'admin' });
    console.info(`[seed:admin] created admin ${admin.email} in "${databaseName()}"`);
    return;
  }

  const passwordUnchanged = await bcrypt.compare(admin.password, existing.password);
  if (passwordUnchanged && existing.name === admin.name) {
    console.info(`[seed:admin] admin ${admin.email} already up to date - nothing changed`);
    return;
  }

  existing.name = admin.name;
  if (!passwordUnchanged) existing.password = await hashPassword(admin.password);
  await existing.save();
  console.info(`[seed:admin] updated admin ${admin.email}`);
}

seedAdmin()
  .catch((error: unknown) => {
    console.error(`[seed:admin] failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDatabase();
  });
