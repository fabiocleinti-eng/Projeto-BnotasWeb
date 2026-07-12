import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { subscriptionController } from '../modules/subscription/subscription.controller';

// SEGURANÇA: o upgrade "direto" agora só aceita voltar ao plano gratuito.
// Planos pagos passam obrigatoriamente pelo pagamento (/payments/checkout).
const upgradeSchema = z.object({
  body: z.object({
    planId: z.enum(['free'])
  })
});

const router = Router();

router.get('/subscriptions/current', auth, subscriptionController.getCurrent);
router.post('/subscriptions/upgrade', auth, validate(upgradeSchema), subscriptionController.upgrade);
router.post('/subscriptions/cancel', auth, subscriptionController.cancel);
router.get('/subscriptions/plans', auth, subscriptionController.getPlans);

export default router;
