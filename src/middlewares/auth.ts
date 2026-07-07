import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './error';

export type AuthPayload = {
  sub: number | string; // user id (JWT pode devolver string)
  email: string;
  iat?: number;
  exp?: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string };
    }
  }
}

export const auth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers['authorization'];
  if (!header) return next(new ApiError(401, 'Credenciais ausentes', 'UNAUTHORIZED'));
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return next(new ApiError(401, 'Token inválido', 'UNAUTHORIZED'));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    const userId = typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub;
    if (!userId || Number.isNaN(userId)) return next(new ApiError(401, 'Token inválido', 'UNAUTHORIZED'));
    req.user = { id: userId, email: payload.email };
    return next();
  } catch {
    return next(new ApiError(401, 'Token inválido ou expirado', 'UNAUTHORIZED'));
  }
};

