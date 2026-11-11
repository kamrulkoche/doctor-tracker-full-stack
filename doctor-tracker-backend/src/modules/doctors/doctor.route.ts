import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validate-request';
import { asyncHandler } from '../../utils/async-handler';
import { idParamsSchema } from '../../utils/validation';
import { doctorPatientBodySchema, doctorPatientsQuerySchema } from '../patients/patient.validation';
import * as doctorController from './doctor.controller';
import { doctorBodySchema, doctorOptionsQuerySchema, listDoctorsQuerySchema } from './doctor.validation';

export const doctorRouter = Router();

doctorRouter.use(authenticate, authorize('admin'));

doctorRouter.get('/', validateRequest({ query: listDoctorsQuerySchema }), asyncHandler(doctorController.listDoctors));
doctorRouter.post('/', validateRequest({ body: doctorBodySchema }), asyncHandler(doctorController.createDoctor));

// Static segments are registered before `/:id` so they are never read as an id.
doctorRouter.get('/filters', asyncHandler(doctorController.getDoctorFilters));
doctorRouter.get(
  '/options',
  validateRequest({ query: doctorOptionsQuerySchema }),
  asyncHandler(doctorController.listDoctorOptions),
);

doctorRouter.get('/:id', validateRequest({ params: idParamsSchema }), asyncHandler(doctorController.getDoctor));
doctorRouter.put(
  '/:id',
  validateRequest({ params: idParamsSchema, body: doctorBodySchema }),
  asyncHandler(doctorController.updateDoctor),
);
doctorRouter.delete('/:id', validateRequest({ params: idParamsSchema }), asyncHandler(doctorController.deleteDoctor));

doctorRouter.get(
  '/:id/patients',
  validateRequest({ params: idParamsSchema, query: doctorPatientsQuerySchema }),
  asyncHandler(doctorController.listDoctorPatients),
);
doctorRouter.post(
  '/:id/patients',
  validateRequest({ params: idParamsSchema, body: doctorPatientBodySchema }),
  asyncHandler(doctorController.createDoctorPatient),
);
