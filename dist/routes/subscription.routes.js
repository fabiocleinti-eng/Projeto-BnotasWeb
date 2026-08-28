"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const subscription_controller_1 = require("../modules/subscription/subscription.controller");
// SEGURANÇA: o upgrade "direto" agora só aceita voltar ao plano gratuito.
// Planos pagos passam obrigatoriamente pelo pagamento (/payments/checkout).
const upgradeSchema = zod_1.z.object({
    body: zod_1.z.object({
        planId: zod_1.z.enum(['free'])
    })
});
const router = (0, express_1.Router)();
router.get('/subscriptions/current', auth_1.auth, subscription_controller_1.subscriptionController.getCurrent);
router.post('/subscriptions/upgrade', auth_1.auth, (0, validate_1.validate)(upgradeSchema), subscription_controller_1.subscriptionController.upgrade);
router.post('/subscriptions/cancel', auth_1.auth, subscription_controller_1.subscriptionController.cancel);
router.get('/subscriptions/plans', auth_1.auth, subscription_controller_1.subscriptionController.getPlans);
exports.default = router;
