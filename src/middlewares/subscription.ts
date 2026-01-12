import { NextFunction, Request, Response } from 'express';
import { subscriptionService } from '../modules/subscription/subscription.service';
import { ApiError } from './error';

// Verificar se usuário tem feature premium
export function requireFeature(feature: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new ApiError(401, 'Usuário não autenticado', 'UNAUTHORIZED'));
      }

      const hasFeature = await subscriptionService.hasFeature(req.user.id, feature);

      if (!hasFeature) {
        return next(new ApiError(
          403,
          `Esta funcionalidade requer plano Premium. Faça upgrade para acessar.`,
          'FEATURE_REQUIRES_PREMIUM'
        ));
      }

      next();
    } catch (error) {
      return next(new ApiError(500, 'Erro ao verificar assinatura', 'SUBSCRIPTION_CHECK_ERROR'));
    }
  };
}








