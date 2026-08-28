import { subscriptionRepository } from './subscription.repository';
import { usuarioRepository } from '../usuario/usuario.repository';
import { ApiError } from '../../middlewares/error';

// Planos pré-definidos (exportado: o módulo de pagamento usa preços e features daqui)
export const PLANS = {
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
async function expireIfDue(sub: any) {
  if (sub && sub.status === 'active' && sub.planId !== 'free' && sub.endDate && new Date(sub.endDate) < new Date()) {
    await subscriptionRepository.update(sub.userId, { status: 'expired' });
    sub.status = 'expired';
  }
  return sub;
}

export const subscriptionService = {
  async getCurrent(userId: number) {
    let subscription = await subscriptionRepository.findByUserId(userId);

    // Se não tiver assinatura, criar gratuita
    if (!subscription) {
      subscription = await subscriptionRepository.create({
        userId,
        planId: 'free',
        status: 'active',
        features: []
      });
    }

    return expireIfDue(subscription);
  },

  async upgrade(userId: number, planId: string) {
    if (!PLANS[planId as keyof typeof PLANS]) {
      throw new ApiError(400, 'Plano inválido', 'INVALID_PLAN');
    }

    const plan = PLANS[planId as keyof typeof PLANS];

    let subscription = await subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      subscription = await subscriptionRepository.create({
        userId,
        planId: plan.id,
        status: 'active',
        features: plan.features
      });
    } else {
      await subscriptionRepository.update(userId, {
        planId: plan.id,
        status: 'active',
        features: plan.features,
        startDate: new Date()
      });
      const updated = await subscriptionRepository.findByUserId(userId);
      if (!updated) {
        throw new ApiError(500, 'Erro ao atualizar assinatura', 'SUBSCRIPTION_UPDATE_ERROR');
      }
      subscription = updated;
    }

    // TODO: Integrar com gateway de pagamento (Stripe, PayPal, etc.)
    // Por enquanto, apenas atualiza a assinatura

    return subscription!;
  },

  async cancel(userId: number) {
    const subscription = await subscriptionRepository.findByUserId(userId);

    if (!subscription) {
      throw new ApiError(404, 'Assinatura não encontrada', 'SUBSCRIPTION_NOT_FOUND');
    }

    await subscriptionRepository.update(userId, {
      status: 'cancelled'
    });

    const cancelled = await subscriptionRepository.findByUserId(userId);
    if (!cancelled) {
      throw new ApiError(500, 'Erro ao cancelar assinatura', 'SUBSCRIPTION_CANCEL_ERROR');
    }
    return cancelled;
  },

  async getPlans() {
    return Object.values(PLANS);
  },

  // Admin (flag no banco, definida só pelo script set-admin) tem todos os recursos
  async isAdmin(userId: number): Promise<boolean> {
    const user = await usuarioRepository.findById(userId);
    return !!user?.is_admin;
  },

  async hasFeature(userId: number, feature: string): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;

    let subscription = await subscriptionRepository.findByUserId(userId);
    subscription = await expireIfDue(subscription);

    if (!subscription || subscription.planId === 'free' || subscription.status !== 'active') {
      return false;
    }

    const features = Array.isArray(subscription.features) 
      ? subscription.features 
      : JSON.parse(subscription.features as string);
    
    return features.includes(feature);
  }
};

