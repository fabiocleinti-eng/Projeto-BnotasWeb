import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from './error';

export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, 'Erro de validação', 'VALIDATION_ERROR', details));
  }
  next();
};

