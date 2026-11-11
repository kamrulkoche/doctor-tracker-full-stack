import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validate-request';
import { asyncHandler } from '../../utils/async-handler';
import * as dashboardController from './dashboard.controller';
import {
  conditionDistributionQuerySchema,
  patientsPerDoctorQuerySchema,
  recentActivityQuerySchema,
  timeSeriesQuerySchema,
} from './dashboard.validation';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, authorize('admin'));

dashboardRouter.get('/stats', asyncHandler(dashboardController.getStats));
dashboardRouter.get(
  '/patient-growth',
  validateRequest({ query: timeSeriesQuerySchema }),
  asyncHandler(dashboardController.getPatientGrowth),
);
dashboardRouter.get(
  '/patients-per-doctor',
  validateRequest({ query: patientsPerDoctorQuerySchema }),
  asyncHandler(dashboardController.getPatientsPerDoctor),
);
dashboardRouter.get(
  '/condition-distribution',
  validateRequest({ query: conditionDistributionQuerySchema }),
  asyncHandler(dashboardController.getConditionDistribution),
);
dashboardRouter.get(
  '/doctor-statistics',
  validateRequest({ query: timeSeriesQuerySchema }),
  asyncHandler(dashboardController.getDoctorStatistics),
);
dashboardRouter.get(
  '/recent-activity',
  validateRequest({ query: recentActivityQuerySchema }),
  asyncHandler(dashboardController.getRecentActivity),
);
