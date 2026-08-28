import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './error';

export type AuthPayload = {
  sub: number | string; // user id (JWT pode devolver string)
  email: string;
  type?: string; // 'access' = token de sessão. Outros tipos ('2fa') NÃO valem aqui.
  iat?: number;
  exp?: number;
};

// Único tipo aceito para acessar a API. O login de contas com 2FA emite um token
// intermediário (type '2fa') que serve só para validar o código do autenticador —
// sem esta checagem ele funcionaria como sessão e burlaria o segundo fator.
export const ACCESS_TOKEN_TYPE = 'access';

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
    // algorithms fixo: impede tokens assinados com outro algoritmo serem aceitos
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AuthPayload;

    // Recusa qualquer token que não seja de sessão (ex.: o intermediário do 2FA)
    if (payload.type !== ACCESS_TOKEN_TYPE) {
      return next(new ApiError(401, 'Token inválido', 'UNAUTHORIZED'));
    }

    const userId = typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub;
    if (!userId || Number.isNaN(userId)) return next(new ApiError(401, 'Token inválido', 'UNAUTHORIZED'));
    req.user = { id: userId, email: payload.email };
    return next();
  } catch {
    return next(new ApiError(401, 'Token inválido ou expirado', 'UNAUTHORIZED'));
  }
};

