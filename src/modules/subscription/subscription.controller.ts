import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from './subscription.service';

export const subscriptionController = {
  async getCurrent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const subscription = await subscriptionService.getCurrent(userId);
      res.json(subscription);
    } catch (e) { next(e); }
  },

  async upgrade(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { planId } = req.body;
      const subscription = await subscriptionService.upgrade(userId, planId);
      res.json(subscription);
    } catch (e) { next(e); }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const subscription = await subscriptionService.cancel(userId);
      res.json(subscription);
    } catch (e) { next(e); }
  },

  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await subscriptionService.getPlans();
      res.json(plans);
    } catch (e) { next(e); }
  }
};






