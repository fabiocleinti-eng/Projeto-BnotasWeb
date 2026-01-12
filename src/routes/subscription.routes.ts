import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { subscriptionController } from '../modules/subscription/subscription.controller';

const router = Router();

router.get('/subscriptions/current', auth, subscriptionController.getCurrent);
router.post('/subscriptions/upgrade', auth, subscriptionController.upgrade);
router.post('/subscriptions/cancel', auth, subscriptionController.cancel);
router.get('/subscriptions/plans', auth, subscriptionController.getPlans);

export default router;








