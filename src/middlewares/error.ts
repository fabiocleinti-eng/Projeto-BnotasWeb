import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Algo inesperado aconteceu.' } });
};

