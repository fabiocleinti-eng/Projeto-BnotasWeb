import { NextFunction, Request, Response } from 'express';
import { subscriptionRepository } from '../modules/subscription/subscription.repository';
import { ApiError } from './error';

// Verificar se usuário tem feature premium (mensagens alinhadas ao guia)
export function requireFeature(feature: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(new ApiError(401, 'Usuário não autenticado', 'UNAUTHORIZED'));
      }

      const subscription = await subscriptionRepository.findByUserId(req.user.id);

      if (!subscription || subscription.planId === 'free') {
        return next(new ApiError(
          403,
          'Esta funcionalidade requer plano Premium. Faça upgrade para acessar.',
          'FEATURE_REQUIRES_PREMIUM'
        ));
      }

      const features = Array.isArray(subscription.features)
        ? subscription.features
        : JSON.parse(subscription.features as string);

      if (!features.includes(feature)) {
        return next(new ApiError(
          403,
          'Funcionalidade não disponível no seu plano atual.',
          'FEATURE_NOT_IN_PLAN'
        ));
      }

      next();
    } catch (error) {
      return next(new ApiError(500, 'Erro ao verificar assinatura', 'SUBSCRIPTION_CHECK_ERROR'));
    }
  };
}










