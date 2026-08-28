"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const payment_service_1 = require("../modules/payment/payment.service");
const checkoutSchema = zod_1.z.object({
    body: zod_1.z.object({
        planId: zod_1.z.enum(['premium', 'pro']),
        periodo: zod_1.z.enum(['mensal', 'anual']).optional()
    })
});
const confirmSchema = zod_1.z.object({
    body: zod_1.z.object({ paymentId: zod_1.z.string().min(1).max(64) })
});
const router = (0, express_1.Router)();
// Cria o checkout do Mercado Pago (usuário logado)
router.post('/payments/checkout', auth_1.auth, (0, validate_1.validate)(checkoutSchema), async (req, res, next) => {
    try {
        const { planId, periodo } = req.body;
        res.json(await payment_service_1.paymentService.createCheckout(req.user.id, planId, periodo || 'mensal'));
    }
    catch (e) {
        next(e);
    }
});
// Confirmação no retorno do checkout: o front manda o payment_id da URL e
// o servidor VERIFICA direto na API do MP antes de ativar (nada vem do navegador)
router.post('/payments/confirm', auth_1.auth, (0, validate_1.validate)(confirmSchema), async (req, res, next) => {
    try {
        res.json(await payment_service_1.paymentService.processPayment(req.body.paymentId, req.user.id));
    }
    catch (e) {
        next(e);
    }
});
// Webhook do Mercado Pago (sem auth — o MP que chama). Responde 200 rápido
// e processa em seguida; a segurança vem de consultar o pagamento na API do MP.
router.post('/payments/webhook', async (req, res) => {
    res.sendStatus(200);
    try {
        const type = req.body?.type || req.query.type;
        const paymentId = req.body?.data?.id || req.query['data.id'];
        if (type === 'payment' && paymentId) {
            await payment_service_1.paymentService.processPayment(String(paymentId));
        }
    }
    catch (e) {
        console.error('Webhook MP:', e?.message || e);
    }
});
exports.default = router;
