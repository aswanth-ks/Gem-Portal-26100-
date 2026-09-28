import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Catches thrown/rejected errors from async route handlers so nothing fails silently. */
export function asyncRoute<T extends (req: any, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Parameters<T>[0], res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request.' });
  }
  if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
    return res.status(409).json({ error: 'That record already exists.' });
  }
  if (err instanceof Error && err.name === 'ValidationError') {
    // Mongoose schema validation (e.g. a required field left empty) — this was
    // previously falling through to the generic 500 below, which hid the
    // actual cause from both the client and the response body.
    return res.status(400).json({ error: err.message });
  }
  // eslint-disable-next-line no-console
  console.error('[gateway] unhandled error:', err);
  return res.status(500).json({ error: 'Something went wrong on our side.' });
}
