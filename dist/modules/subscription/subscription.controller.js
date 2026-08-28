"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionController = void 0;
const subscription_service_1 = require("./subscription.service");
exports.subscriptionController = {
    async getCurrent(req, res, next) {
        try {
            const userId = req.user.id;
            const subscription = await subscription_service_1.subscriptionService.getCurrent(userId);
            res.json(subscription);
        }
        catch (e) {
            next(e);
        }
    },
    async upgrade(req, res, next) {
        try {
            const userId = req.user.id;
            const { planId } = req.body;
            const subscription = await subscription_service_1.subscriptionService.upgrade(userId, planId);
            res.json(subscription);
        }
        catch (e) {
            next(e);
        }
    },
    async cancel(req, res, next) {
        try {
            const userId = req.user.id;
            const subscription = await subscription_service_1.subscriptionService.cancel(userId);
            res.json(subscription);
        }
        catch (e) {
            next(e);
        }
    },
    async getPlans(req, res, next) {
        try {
            const plans = await subscription_service_1.subscriptionService.getPlans();
            res.json(plans);
        }
        catch (e) {
            next(e);
        }
    }
};
