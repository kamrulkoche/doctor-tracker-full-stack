import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { loginRateLimiter } from '../../middleware/rate-limit';
import { validateRequest } from '../../middleware/validate-request';
import { asyncHandler } from '../../utils/async-handler';
import * as authController from './auth.controller';
import { loginBodySchema } from './auth.validation';

export const authRouter = Router();

authRouter.get('/csrf-token', authController.getCsrfToken);
authRouter.post(
  '/login',
  loginRateLimiter,
  validateRequest({ body: loginBodySchema }),
  asyncHandler(authController.login),
);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authenticate, authorize('admin'), authController.me);
