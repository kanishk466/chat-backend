// src/utils/response.ts
// Standardized API response helpers -> { success, data, error, message }

import { Response } from 'express';
import { ApiResponse } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): Response {
  const body: ApiResponse<T> = { success: true, data, message };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  error: string,
  statusCode = 500,
  details?: unknown
): Response {
  const body: ApiResponse = { success: false, error };
  if (details !== undefined) body.details = details;
  return res.status(statusCode).json(body);
}
