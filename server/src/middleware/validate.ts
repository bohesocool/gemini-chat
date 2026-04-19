import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from './errorHandler.js';

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const detail = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      return next(new HttpError(400, `Invalid request body: ${detail}`, 'VALIDATION_ERROR'));
    }
    req.body = result.data;
    next();
  };
}
