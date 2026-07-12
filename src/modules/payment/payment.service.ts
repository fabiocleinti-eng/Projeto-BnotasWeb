import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { env } from '../../config/env';
import { ApiError } from '../../middlewares/error';
import { PLANS } from '../subscription/subscription.service';
import { subscriptionRepository } from '../subscription/subscription.repository';

// Períodos vendidos como pagamento avulso (Pix ou cartão).
// Anual sai com ~2 meses grátis (10x o mensal).
const PERIODS = {
  mensal: { dias: 30, fator: 1, label: '30 dias' },
  anual: { dias: 365, fator: 10, label: '1 ano' }
} as const;

type PlanoPago = 'premium' | 'pro';
type Periodo = keyof typeof PERIODS;

function mpClient(): MercadoPagoConfig {
  if (!env.MP_ACCESS_TOKEN) {
    throw new ApiError(503, 'Pagamento ainda não configurado no servidor.', 'PAYMENT_NOT_CONFIGURED');
  }
  return new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });
}

function precoDe(planId: PlanoPago, periodo: Periodo): number {
  const plan = PLANS[planId];
  if (!plan || plan.price <= 0) throw new ApiError(400, 'Plano inválido para pagamento', 'INVALID_PLAN');
  return Number((plan.price * PERIODS[periodo].fator).toFixed(2));
}

export const paymentService = {
  // Cria a cobrança no Mercado Pago e devolve a URL do checkout deles.
  // O plano NÃO é ativado aqui — só quando o MP confirmar o pagamento.
  async createCheckout(userId: number, planId: PlanoPago, periodo: Periodo = 'mensal') {
    if (!PERIODS[periodo]) throw new ApiError(400, 'Período inválido', 'INVALID_PERIOD');
    const preco = precoDe(planId, periodo);

    const pref = new Preference(mpClient());
    const res = await pref.create({
      body: {
        items: [{
          id: `${planId}-${periodo}`,
          title: `BnotasWeb ${PLANS[planId].name} (${PERIODS[periodo].label})`,
          quantity: 1,
          unit_price: preco,
          currency_id: 'BRL'
        }],
        external_reference: JSON.stringify({ userId, planId, periodo }),
        back_urls: {
          success: `${env.APP_URL}/dashboard?pagamento=sucesso`,
          failure: `${env.APP_URL}/dashboard?pagamento=falha`,
          pending: `${env.APP_URL}/dashboard?pagamento=pendente`
        },
        // MP só aceita auto_return com URL pública (https); em localhost o
        // usuário volta pelo botão "Voltar ao site" do checkout
        ...(env.APP_URL.startsWith('https') ? { auto_return: 'approved' } : {}),
        notification_url: env.MP_WEBHOOK_URL ? `${env.MP_WEBHOOK_URL}/api/payments/webhook` : undefined,
        statement_descriptor: 'BNOTASWEB'
      }
    });

    if (!res.init_point) throw new ApiError(502, 'Falha ao criar o checkout', 'CHECKOUT_ERROR');
    return { checkoutUrl: res.init_point, valor: preco };
  },

  // Confirma um pagamento DIRETO NA API do Mercado Pago (nunca confiamos no navegador)
  // e ativa a assinatura. Usado pelo webhook e pelo retorno do checkout.
  async processPayment(paymentId: string, expectedUserId?: number) {
    const payment = await new Payment(mpClient()).get({ id: paymentId });

    let ref: { userId?: number; planId?: PlanoPago; periodo?: Periodo } = {};
    try { ref = JSON.parse(payment.external_reference || '{}'); } catch { /* ref inválida */ }

    const planId = ref.planId as PlanoPago;
    const periodo = (ref.periodo || 'mensal') as Periodo;

    if (!ref.userId || !PLANS[planId] || PLANS[planId].price <= 0 || !PERIODS[periodo]) {
      throw new ApiError(400, 'Pagamento não relacionado a um plano válido', 'INVALID_PAYMENT_REF');
    }
    // O usuário logado só pode confirmar o próprio pagamento
    if (expectedUserId !== undefined && ref.userId !== expectedUserId) {
      throw new ApiError(403, 'Pagamento pertence a outro usuário', 'PAYMENT_OWNER_MISMATCH');
    }
    if (payment.status !== 'approved') {
      return { activated: false, status: payment.status };
    }
    // Valor pago precisa bater com o preço do plano (evita ativar Pro pagando R$ 0,01)
    if (Number(payment.transaction_amount || 0) < precoDe(planId, periodo)) {
      throw new ApiError(400, 'Valor pago não corresponde ao plano', 'PAYMENT_AMOUNT_MISMATCH');
    }

    const endDate = new Date(Date.now() + PERIODS[periodo].dias * 24 * 60 * 60 * 1000);
    const plan = PLANS[planId];

    const existing = await subscriptionRepository.findByUserId(ref.userId);
    if (existing) {
      await subscriptionRepository.update(ref.userId, {
        planId: plan.id, status: 'active', features: plan.features as unknown as string[],
        startDate: new Date(), endDate
      });
    } else {
      await subscriptionRepository.create({ userId: ref.userId, planId: plan.id, status: 'active', features: plan.features as unknown as string[] });
      await subscriptionRepository.update(ref.userId, { endDate });
    }

    console.log(`💰 Pagamento ${paymentId} aprovado: usuário ${ref.userId} → ${plan.id} (${periodo}) até ${endDate.toISOString()}`);
    return { activated: true, planId: plan.id, validoAte: endDate };
  }
};
