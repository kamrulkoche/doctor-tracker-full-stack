import type { Request, Response } from 'express';
import { validatedBody, validatedParams, validatedQuery } from '../../middleware/validate-request';
import { sendPaginated, sendSuccess } from '../../utils/api-response';
import { idParamsSchema } from '../../utils/validation';
import * as patientService from '../patients/patient.service';
import { doctorPatientBodySchema, doctorPatientsQuerySchema } from '../patients/patient.validation';
import * as doctorService from './doctor.service';
import { doctorBodySchema, doctorOptionsQuerySchema, listDoctorsQuerySchema } from './doctor.validation';

export async function listDoctors(_req: Request, res: Response): Promise<void> {
  sendPaginated(res, await doctorService.listDoctors(validatedQuery(res, listDoctorsQuerySchema)));
}

export async function getDoctorFilters(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await doctorService.getDoctorFilters());
}

export async function listDoctorOptions(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await doctorService.listDoctorOptions(validatedQuery(res, doctorOptionsQuerySchema)));
}

export async function createDoctor(_req: Request, res: Response): Promise<void> {
  const doctor = await doctorService.createDoctor(validatedBody(res, doctorBodySchema));
  sendSuccess(res, doctor, { status: 201, message: 'Doctor created successfully' });
}

export async function getDoctor(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await doctorService.getDoctorById(validatedParams(res, idParamsSchema).id));
}

export async function updateDoctor(_req: Request, res: Response): Promise<void> {
  const doctor = await doctorService.updateDoctor(
    validatedParams(res, idParamsSchema).id,
    validatedBody(res, doctorBodySchema),
  );
  sendSuccess(res, doctor, { message: 'Doctor updated successfully' });
}

export async function deleteDoctor(_req: Request, res: Response): Promise<void> {
  await doctorService.deleteDoctor(validatedParams(res, idParamsSchema).id);
  sendSuccess(res, null, { message: 'Doctor deleted successfully' });
}

export async function listDoctorPatients(_req: Request, res: Response): Promise<void> {
  const page = await patientService.listPatientsForDoctor(
    validatedParams(res, idParamsSchema).id,
    validatedQuery(res, doctorPatientsQuerySchema),
  );
  sendPaginated(res, page);
}

export async function createDoctorPatient(_req: Request, res: Response): Promise<void> {
  const patient = await patientService.createPatientForDoctor(
    validatedParams(res, idParamsSchema).id,
    validatedBody(res, doctorPatientBodySchema),
  );
  sendSuccess(res, patient, { status: 201, message: 'Patient added successfully' });
}
