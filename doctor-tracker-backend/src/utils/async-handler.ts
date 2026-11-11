import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Adapts an async controller to Express' handler signature and forwards any rejection
 * to the centralised error handler, so controllers never need their own try/catch.
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
