/**
 * Prints the execution plan of every query the API issues, against the configured database.
 * The catalogue lives in `query-plans.ts` and reuses the services' own filter / sort /
 * pipeline builders, so what is explained here is exactly what the endpoints run.
 *
 *   npm run seed:demo && npm run db:explain
 *
 * For the same table on a production-sized dataset see `npm run db:bench`.
 */
import { connectDatabase, databaseName, disconnectDatabase } from '../config/database';
import { Doctor } from '../models/doctor.model';
import { Patient } from '../models/patient.model';
import { collectPlans, loadPlanSamples, printPlanTable } from './query-plans';

async function main(): Promise<void> {
  await connectDatabase();
  await Promise.all([Doctor.init(), Patient.init()]);

  const samples = await loadPlanSamples();
  if (!samples) {
    console.log(`Database "${databaseName()}" has no data to explain. Run \`npm run seed:demo\` first.`);
    return;
  }
  console.log(`Database "${databaseName()}": ${samples.doctorCount} doctors, ${samples.patientCount} patients\n`);
  printPlanTable(await collectPlans(samples));
}

main()
  .catch((error: unknown) => {
    console.error(`[db:explain] failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectDatabase();
  });
