import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/environment';
import { csrfProtection } from './middleware/csrf';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { globalRateLimiter } from './middleware/rate-limit';
import { authRouter } from './modules/auth/auth.route';
import { dashboardRouter } from './modules/dashboard/dashboard.route';
import { doctorRouter } from './modules/doctors/doctor.route';
import { healthRouter } from './modules/health/health.route';
import { patientRouter } from './modules/patients/patient.route';

/** Builds the Express app without listening, so tests can drive it in-process. */
export function createApp(): Express {
  const app = express();

  // Render terminates TLS one hop in front of the app. Trusting exactly that hop gives the
  // rate limiter the real client IP and lets Express treat the request as HTTPS.
  if (env.isProduction) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      // Exact-match allowlist. Unknown origins simply get no CORS headers, so the browser
      // blocks the response; requests with no Origin (curl, health checks) pass through.
      origin: (origin, callback) => {
        callback(null, origin === undefined || env.frontendOrigins.includes(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      maxAge: 600,
    }),
  );
  if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  app.use(globalRateLimiter);
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = Router();
  // Responses are per-user and must never be stored by a browser or an intermediary.
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  api.use('/health', healthRouter);
  // Every unsafe method below this line needs an allowed Origin and a valid CSRF token.
  api.use(csrfProtection);
  api.use('/auth', authRouter);
  api.use('/doctors', doctorRouter);
  api.use('/patients', patientRouter);
  api.use('/dashboard', dashboardRouter);

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
