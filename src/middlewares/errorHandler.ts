
import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/response';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps async controllers so rejections reach the global error handler. */
export const asyncHandler =
  (fn: AsyncRequestHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };

/** 404 for any unmatched route (must be registered before errorHandler). */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}

/** Global error handler (must be the last middleware). */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Zod validation errors -> 400
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    sendError(res, 'Validation failed', 400, details);
    return;
  }

  // Operational errors thrown by services/controllers -> custom status
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  // Prisma known errors -> mapped HTTP statuses
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        sendError(res, 'A record with this unique value already exists', 409);
        return;
      case 'P2025':
        sendError(res, 'Resource not found', 404);
        return;
      case 'P2003':
        sendError(res, 'Related record not found (foreign key constraint)', 400);
        return;
      default:
        sendError(res, `Database error (${err.code})`, 500);
        return;
    }
  }

  // Unexpected errors - never leak internals in production

  console.error('[ERROR]', err);

  const isProd = process.env.NODE_ENV === 'production';
  const message =
    !isProd && err instanceof Error ? err.message : 'Internal server error';
  sendError(res, message, 500);
}
