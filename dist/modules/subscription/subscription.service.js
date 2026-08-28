"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionService = exports.PLANS = void 0;
const subscription_repository_1 = require("./subscription.repository");
const usuario_repository_1 = require("../usuario/usuario.repository");
const error_1 = require("../../middlewares/error");
// Planos pré-definidos (exportado: o módulo de pagamento usa preços e features daqui)
exports.PLANS = {
    free: {
        id: 'free',
        name: 'Gratuito',
        price: 0,
        currency: 'BRL',
        features: []
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: 9.90,
        currency: 'BRL',
        features: [
            'protected_notes',
            'email_notifications',
            'protected_trash',
            'unlimited_notes',
            'export_notes',
            'custom_themes'
        ]
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 19.90,
        currency: 'BRL',
        features: [
            'protected_notes',
            'email_notifications',
            'protected_trash',
            'unlimited_notes',
            'export_notes',
            'custom_themes',
            'voice_access'
        ]
    }
};
// Assinatura paga vencida (endDate no passado) volta a expirada automaticamente
async function expireIfDue(sub) {
    if (sub && sub.status === 'active' && sub.planId !== 'free' && sub.endDate && new Date(sub.endDate) < new Date()) {
        await subscription_repository_1.subscriptionRepository.update(sub.userId, { status: 'expired' });
        sub.status = 'expired';
    }
    return sub;
}
exports.subscriptionService = {
    async getCurrent(userId) {
        let subscription = await subscription_repository_1.subscriptionRepository.findByUserId(userId);
        // Se não tiver assinatura, criar gratuita
        if (!subscription) {
            subscription = await subscription_repository_1.subscriptionRepository.create({
                userId,
                planId: 'free',
                status: 'active',
                features: []
            });
        }
        return expireIfDue(subscription);
    },
    async upgrade(userId, planId) {
        if (!exports.PLANS[planId]) {
            throw new error_1.ApiError(400, 'Plano inválido', 'INVALID_PLAN');
        }
        const plan = exports.PLANS[planId];
        let subscription = await subscription_repository_1.subscriptionRepository.findByUserId(userId);
        if (!subscription) {
            subscription = await subscription_repository_1.subscriptionRepository.create({
                userId,
                planId: plan.id,
                status: 'active',
                features: plan.features
            });
        }
        else {
            await subscription_repository_1.subscriptionRepository.update(userId, {
                planId: plan.id,
                status: 'active',
                features: plan.features,
                startDate: new Date()
            });
            const updated = await subscription_repository_1.subscriptionRepository.findByUserId(userId);
            if (!updated) {
                throw new error_1.ApiError(500, 'Erro ao atualizar assinatura', 'SUBSCRIPTION_UPDATE_ERROR');
            }
            subscription = updated;
        }
        // TODO: Integrar com gateway de pagamento (Stripe, PayPal, etc.)
        // Por enquanto, apenas atualiza a assinatura
        return subscription;
    },
    async cancel(userId) {
        const subscription = await subscription_repository_1.subscriptionRepository.findByUserId(userId);
        if (!subscription) {
            throw new error_1.ApiError(404, 'Assinatura não encontrada', 'SUBSCRIPTION_NOT_FOUND');
        }
        await subscription_repository_1.subscriptionRepository.update(userId, {
            status: 'cancelled'
        });
        const cancelled = await subscription_repository_1.subscriptionRepository.findByUserId(userId);
        if (!cancelled) {
            throw new error_1.ApiError(500, 'Erro ao cancelar assinatura', 'SUBSCRIPTION_CANCEL_ERROR');
        }
        return cancelled;
    },
    async getPlans() {
        return Object.values(exports.PLANS);
    },
    // Admin (flag no banco, definida só pelo script set-admin) tem todos os recursos
    async isAdmin(userId) {
        const user = await usuario_repository_1.usuarioRepository.findById(userId);
        return !!user?.is_admin;
    },
    async hasFeature(userId, feature) {
        if (await this.isAdmin(userId))
            return true;
        let subscription = await subscription_repository_1.subscriptionRepository.findByUserId(userId);
        subscription = await expireIfDue(subscription);
        if (!subscription || subscription.planId === 'free' || subscription.status !== 'active') {
            return false;
        }
        const features = Array.isArray(subscription.features)
            ? subscription.features
            : JSON.parse(subscription.features);
        return features.includes(feature);
    }
};
