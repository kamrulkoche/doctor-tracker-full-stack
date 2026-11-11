import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validate-request';
import { asyncHandler } from '../../utils/async-handler';
import { idParamsSchema } from '../../utils/validation';
import * as patientController from './patient.controller';
import { listPatientsQuerySchema, patientBodySchema } from './patient.validation';

export const patientRouter = Router();

patientRouter.use(authenticate, authorize('admin'));

patientRouter.get(
  '/',
  validateRequest({ query: listPatientsQuerySchema }),
  asyncHandler(patientController.listPatients),
);
patientRouter.post('/', validateRequest({ body: patientBodySchema }), asyncHandler(patientController.createPatient));

// Registered before `/:id` so "filters" is never read as an id.
patientRouter.get('/filters', asyncHandler(patientController.getPatientFilters));

patientRouter.get('/:id', validateRequest({ params: idParamsSchema }), asyncHandler(patientController.getPatient));
patientRouter.put(
  '/:id',
  validateRequest({ params: idParamsSchema, body: patientBodySchema }),
  asyncHandler(patientController.updatePatient),
);
patientRouter.delete(
  '/:id',
  validateRequest({ params: idParamsSchema }),
  asyncHandler(patientController.deletePatient),
);
