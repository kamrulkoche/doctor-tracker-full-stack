import type { Request, Response } from 'express';
import { validatedBody, validatedParams, validatedQuery } from '../../middleware/validate-request';
import { sendPaginated, sendSuccess } from '../../utils/api-response';
import { idParamsSchema } from '../../utils/validation';
import * as patientService from './patient.service';
import { listPatientsQuerySchema, patientBodySchema } from './patient.validation';

export async function listPatients(_req: Request, res: Response): Promise<void> {
  sendPaginated(res, await patientService.listPatients(validatedQuery(res, listPatientsQuerySchema)));
}

export async function getPatientFilters(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await patientService.getPatientFilters());
}

export async function createPatient(_req: Request, res: Response): Promise<void> {
  const patient = await patientService.createPatient(validatedBody(res, patientBodySchema));
  sendSuccess(res, patient, { status: 201, message: 'Patient created successfully' });
}

export async function getPatient(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await patientService.getPatientById(validatedParams(res, idParamsSchema).id));
}

export async function updatePatient(_req: Request, res: Response): Promise<void> {
  const patient = await patientService.updatePatient(
    validatedParams(res, idParamsSchema).id,
    validatedBody(res, patientBodySchema),
  );
  sendSuccess(res, patient, { message: 'Patient updated successfully' });
}

export async function deletePatient(_req: Request, res: Response): Promise<void> {
  await patientService.deletePatient(validatedParams(res, idParamsSchema).id);
  sendSuccess(res, null, { message: 'Patient deleted successfully' });
}
