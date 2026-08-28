"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFeature = requireFeature;
const subscription_repository_1 = require("../modules/subscription/subscription.repository");
const subscription_service_1 = require("../modules/subscription/subscription.service");
const error_1 = require("./error");
// Verificar se usuário tem feature premium (mensagens alinhadas ao guia)
function requireFeature(feature) {
    return async (req, _res, next) => {
        try {
            if (!req.user) {
                return next(new error_1.ApiError(401, 'Usuário não autenticado', 'UNAUTHORIZED'));
            }
            // Admin passa por todos os gates (conta de testes)
            if (await subscription_service_1.subscriptionService.isAdmin(req.user.id))
                return next();
            const subscription = await subscription_repository_1.subscriptionRepository.findByUserId(req.user.id);
            if (!subscription || subscription.planId === 'free') {
                return next(new error_1.ApiError(403, 'Esta funcionalidade requer plano Premium. Faça upgrade para acessar.', 'FEATURE_REQUIRES_PREMIUM'));
            }
            const features = Array.isArray(subscription.features)
                ? subscription.features
                : JSON.parse(subscription.features);
            if (!features.includes(feature)) {
                return next(new error_1.ApiError(403, 'Funcionalidade não disponível no seu plano atual.', 'FEATURE_NOT_IN_PLAN'));
            }
            next();
        }
        catch (error) {
            return next(new error_1.ApiError(500, 'Erro ao verificar assinatura', 'SUBSCRIPTION_CHECK_ERROR'));
        }
    };
}
