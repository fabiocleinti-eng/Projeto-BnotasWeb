import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { subscriptionController } from '../modules/subscription/subscription.controller';

const upgradeSchema = z.object({
  body: z.object({
    planId: z.enum(['free', 'premium', 'pro'])
  })
});

const router = Router();

router.get('/subscriptions/current', auth, subscriptionController.getCurrent);
router.post('/subscriptions/upgrade', auth, validate(upgradeSchema), subscriptionController.upgrade);
router.post('/subscriptions/cancel', auth, subscriptionController.cancel);
router.get('/subscriptions/plans', auth, subscriptionController.getPlans);

export default router;
