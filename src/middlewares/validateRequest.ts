

import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodSchema } from 'zod';

export interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body ?? {});
      }

      if (schemas.params) {
        const parsed = schemas.params.parse(req.params);
        // Re-assign so route params (chatId, messageId...) survive parsing
        req.params = { ...req.params, ...(parsed as Record<string, string>) };
      }

      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        // Shadow the prototype getter (Express 4) with the parsed object
        Object.defineProperty(req, 'query', {
          value: parsed,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }

      next();
    } catch (err) {
      next(err); 
    }
  };
}
