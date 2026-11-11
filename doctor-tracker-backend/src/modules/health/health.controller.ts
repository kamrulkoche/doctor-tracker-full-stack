import type { Request, Response } from 'express';
import { isDatabaseConnected } from '../../config/database';

/** Liveness + database readiness. 503 lets the platform's health check fail when MongoDB is down. */
export function getHealth(_req: Request, res: Response): void {
  const connected = isDatabaseConnected();
  res.status(connected ? 200 : 503).json({
    success: connected,
    ...(connected ? {} : { message: 'Database is not connected' }),
    data: {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: connected ? 'connected' : 'disconnected',
    },
  });
}
