import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export class HttpError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  const requestId = crypto.randomUUID();
  const isProd = process.env.NODE_ENV === 'production';

  if (err instanceof HttpError) {
    console.error(`[${requestId}] ${req.method} ${req.originalUrl} -> ${err.status} ${err.message}`);
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      requestId,
    });
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${requestId}] ${req.method} ${req.originalUrl} -> 500`, err);

  res.status(500).json({
    error: 'Internal server error',
    requestId,
    ...(isProd ? {} : { detail: message }),
  });
}

export function asyncHandler<
  T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
