import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { captureException } from '../services/monitoring';
import { AppError, sendError } from '../utils/http';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code);
  }
  void captureException(err, { path: req.path, method: req.method });
  return sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
};

export const validateBody =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(parsed.error.errors[0]?.message || 'Validation failed', 400, 'VALIDATION_ERROR'),
      );
    }
    req.body = parsed.data;
    return next();
  };
