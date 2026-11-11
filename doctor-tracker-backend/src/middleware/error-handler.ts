import type { ErrorRequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/environment';
import { sendError } from '../utils/api-response';
import { AppError, type ErrorDetail } from '../utils/app-error';
import { zodIssuesToDetails } from './validate-request';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** MongoDB duplicate-key error (E11000), raised by a unique index. */
function duplicateKeyFields(error: unknown): string[] | null {
  if (!isRecord(error) || error.code !== 11000) return null;
  return isRecord(error.keyPattern) ? Object.keys(error.keyPattern) : [];
}

/** Errors thrown by `express.json()` carry a `type` such as `entity.parse.failed`. */
function bodyParserErrorType(error: unknown): string | null {
  return isRecord(error) && typeof error.type === 'string' && error.type.startsWith('entity.') ? error.type : null;
}

/** Translates every known failure into an `AppError`; returns null for the unexpected ones. */
function normaliseError(error: unknown): AppError | null {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return AppError.validation(zodIssuesToDetails(error.issues));
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details: ErrorDetail[] = Object.entries(error.errors).map(([path, fieldError]) => ({
      path,
      message: fieldError instanceof mongoose.Error.CastError ? 'Invalid value' : fieldError.message,
    }));
    return AppError.validation(details);
  }

  if (error instanceof mongoose.Error.CastError) {
    return error.kind === 'ObjectId'
      ? AppError.invalidId()
      : AppError.validation([{ path: error.path, message: 'Invalid value' }]);
  }

  const duplicateFields = duplicateKeyFields(error);
  if (duplicateFields) {
    const path = duplicateFields[0] ?? 'email';
    return new AppError(409, 'DUPLICATE_EMAIL', 'A record with this email already exists', [
      { path, message: 'This email is already in use' },
    ]);
  }

  // TokenExpiredError and NotBeforeError both extend JsonWebTokenError.
  if (error instanceof jwt.JsonWebTokenError) {
    return AppError.unauthenticated('Your session is invalid or has expired');
  }

  const parserError = bodyParserErrorType(error);
  if (parserError === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large (limit 100kb)');
  }
  if (parserError) {
    return AppError.validation([{ path: '', message: 'Request body must be valid JSON' }], 'Malformed JSON body');
  }

  return null;
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = normaliseError(error);
  if (appError) {
    sendError(res, appError.statusCode, appError.code, appError.message, appError.details);
    return;
  }

  // Unexpected: log server-side only (never the request body, cookies or headers).
  console.error(`[error] ${req.method} ${req.path}`, error);
  const message =
    !env.isProduction && error instanceof Error ? error.message : 'Something went wrong. Please try again later.';
  sendError(res, 500, 'INTERNAL_ERROR', message);
};
