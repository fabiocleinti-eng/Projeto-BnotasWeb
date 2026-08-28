"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const mercadopago_1 = require("mercadopago");
const env_1 = require("../../config/env");
const error_1 = require("../../middlewares/error");
const subscription_service_1 = require("../subscription/subscription.service");
const subscription_repository_1 = require("../subscription/subscription.repository");
// Períodos vendidos como pagamento avulso (Pix ou cartão).
// Anual sai com ~2 meses grátis (10x o mensal).
const PERIODS = {
    mensal: { dias: 30, fator: 1, label: '30 dias' },
    anual: { dias: 365, fator: 10, label: '1 ano' }
};
function mpClient() {
    if (!env_1.env.MP_ACCESS_TOKEN) {
        throw new error_1.ApiError(503, 'Pagamento ainda não configurado no servidor.', 'PAYMENT_NOT_CONFIGURED');
    }
    return new mercadopago_1.MercadoPagoConfig({ accessToken: env_1.env.MP_ACCESS_TOKEN });
}
function precoDe(planId, periodo) {
    const plan = subscription_service_1.PLANS[planId];
    if (!plan || plan.price <= 0)
        throw new error_1.ApiError(400, 'Plano inválido para pagamento', 'INVALID_PLAN');
    return Number((plan.price * PERIODS[periodo].fator).toFixed(2));
}
exports.paymentService = {
    // Cria a cobrança no Mercado Pago e devolve a URL do checkout deles.
    // O plano NÃO é ativado aqui — só quando o MP confirmar o pagamento.
    async createCheckout(userId, planId, periodo = 'mensal') {
        if (!PERIODS[periodo])
            throw new error_1.ApiError(400, 'Período inválido', 'INVALID_PERIOD');
        const preco = precoDe(planId, periodo);
        const pref = new mercadopago_1.Preference(mpClient());
        const res = await pref.create({
            body: {
                items: [{
                        id: `${planId}-${periodo}`,
                        title: `BnotasWeb ${subscription_service_1.PLANS[planId].name} (${PERIODS[periodo].label})`,
                        quantity: 1,
                        unit_price: preco,
                        currency_id: 'BRL'
                    }],
                external_reference: JSON.stringify({ userId, planId, periodo }),
                back_urls: {
                    success: `${env_1.env.APP_URL}/dashboard?pagamento=sucesso`,
                    failure: `${env_1.env.APP_URL}/dashboard?pagamento=falha`,
                    pending: `${env_1.env.APP_URL}/dashboard?pagamento=pendente`
                },
                // MP só aceita auto_return com URL pública (https); em localhost o
                // usuário volta pelo botão "Voltar ao site" do checkout
                ...(env_1.env.APP_URL.startsWith('https') ? { auto_return: 'approved' } : {}),
                notification_url: env_1.env.MP_WEBHOOK_URL ? `${env_1.env.MP_WEBHOOK_URL}/api/payments/webhook` : undefined,
                statement_descriptor: 'BNOTASWEB'
            }
        });
        if (!res.init_point)
            throw new error_1.ApiError(502, 'Falha ao criar o checkout', 'CHECKOUT_ERROR');
        return { checkoutUrl: res.init_point, valor: preco };
    },
    // Confirma um pagamento DIRETO NA API do Mercado Pago (nunca confiamos no navegador)
    // e ativa a assinatura. Usado pelo webhook e pelo retorno do checkout.
    async processPayment(paymentId, expectedUserId) {
        const payment = await new mercadopago_1.Payment(mpClient()).get({ id: paymentId });
        let ref = {};
        try {
            ref = JSON.parse(payment.external_reference || '{}');
        }
        catch { /* ref inválida */ }
        const planId = ref.planId;
        const periodo = (ref.periodo || 'mensal');
        if (!ref.userId || !subscription_service_1.PLANS[planId] || subscription_service_1.PLANS[planId].price <= 0 || !PERIODS[periodo]) {
            throw new error_1.ApiError(400, 'Pagamento não relacionado a um plano válido', 'INVALID_PAYMENT_REF');
        }
        // O usuário logado só pode confirmar o próprio pagamento
        if (expectedUserId !== undefined && ref.userId !== expectedUserId) {
            throw new error_1.ApiError(403, 'Pagamento pertence a outro usuário', 'PAYMENT_OWNER_MISMATCH');
        }
        if (payment.status !== 'approved') {
            return { activated: false, status: payment.status };
        }
        // Valor pago precisa bater com o preço do plano (evita ativar Pro pagando R$ 0,01)
        if (Number(payment.transaction_amount || 0) < precoDe(planId, periodo)) {
            throw new error_1.ApiError(400, 'Valor pago não corresponde ao plano', 'PAYMENT_AMOUNT_MISMATCH');
        }
        const endDate = new Date(Date.now() + PERIODS[periodo].dias * 24 * 60 * 60 * 1000);
        const plan = subscription_service_1.PLANS[planId];
        const existing = await subscription_repository_1.subscriptionRepository.findByUserId(ref.userId);
        if (existing) {
            await subscription_repository_1.subscriptionRepository.update(ref.userId, {
                planId: plan.id, status: 'active', features: plan.features,
                startDate: new Date(), endDate
            });
        }
        else {
            await subscription_repository_1.subscriptionRepository.create({ userId: ref.userId, planId: plan.id, status: 'active', features: plan.features });
            await subscription_repository_1.subscriptionRepository.update(ref.userId, { endDate });
        }
        console.log(`💰 Pagamento ${paymentId} aprovado: usuário ${ref.userId} → ${plan.id} (${periodo}) até ${endDate.toISOString()}`);
        return { activated: true, planId: plan.id, validoAte: endDate };
    }
};
