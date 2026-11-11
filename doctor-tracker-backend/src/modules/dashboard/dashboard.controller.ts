import type { Request, Response } from 'express';
import { validatedQuery } from '../../middleware/validate-request';
import { sendSuccess } from '../../utils/api-response';
import * as dashboardService from './dashboard.service';
import {
  conditionDistributionQuerySchema,
  patientsPerDoctorQuerySchema,
  recentActivityQuerySchema,
  timeSeriesQuerySchema,
} from './dashboard.validation';

export async function getStats(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await dashboardService.getStats());
}

export async function getPatientGrowth(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await dashboardService.getPatientGrowth(validatedQuery(res, timeSeriesQuerySchema)));
}

export async function getPatientsPerDoctor(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await dashboardService.getPatientsPerDoctor(validatedQuery(res, patientsPerDoctorQuerySchema)));
}

export async function getConditionDistribution(_req: Request, res: Response): Promise<void> {
  sendSuccess(
    res,
    await dashboardService.getConditionDistribution(validatedQuery(res, conditionDistributionQuerySchema)),
  );
}

export async function getDoctorStatistics(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await dashboardService.getDoctorStatistics(validatedQuery(res, timeSeriesQuerySchema)));
}

export async function getRecentActivity(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await dashboardService.getRecentActivity(validatedQuery(res, recentActivityQuerySchema)));
}
