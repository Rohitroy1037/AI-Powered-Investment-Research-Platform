import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { respond } from '../utils/api.js';
export const notFound: RequestHandler = (_req, res) => respond(res, 404, 'Resource not found');
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) return respond(res, 422, 'Validation failed', error.flatten());
  if ((error as { code?: number }).code === 11000)
    return respond(res, 409, 'A record with that value already exists');
  const status = (error as { status?: number }).status ?? 500;
  return respond(res, status, error.message);
};
