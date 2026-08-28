"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionRepository = void 0;
const knex_1 = require("../../db/knex");
const subscriptionTable = 'subscription';
const planTable = 'plan';
exports.subscriptionRepository = {
    async findByUserId(userId) {
        const row = await (0, knex_1.knex)(subscriptionTable)
            .where({ userId })
            .first();
        if (!row)
            return undefined;
        return {
            ...row,
            features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features
        };
    },
    async create(data) {
        const [id] = await (0, knex_1.knex)(subscriptionTable).insert({
            userId: data.userId,
            planId: data.planId,
            status: data.status || 'active',
            startDate: knex_1.knex.fn.now(),
            endDate: null,
            features: JSON.stringify(data.features || [])
        });
        const created = await (0, knex_1.knex)(subscriptionTable)
            .where({ id: Number(id) })
            .first();
        return {
            ...created,
            features: typeof created.features === 'string' ? JSON.parse(created.features) : created.features
        };
    },
    async update(userId, data) {
        const updateData = {};
        if (data.planId !== undefined)
            updateData.planId = data.planId;
        if (data.status !== undefined)
            updateData.status = data.status;
        if (data.features !== undefined)
            updateData.features = JSON.stringify(data.features);
        if (data.startDate !== undefined)
            updateData.startDate = data.startDate;
        if (data.endDate !== undefined)
            updateData.endDate = data.endDate;
        await (0, knex_1.knex)(subscriptionTable)
            .where({ userId })
            .update(updateData);
    },
    async findPlanById(planId) {
        const row = await (0, knex_1.knex)(planTable)
            .where({ id: planId, isActive: true })
            .first();
        if (!row)
            return undefined;
        return {
            ...row,
            features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features
        };
    },
    async findAllPlans() {
        const rows = await (0, knex_1.knex)(planTable)
            .where({ isActive: true })
            .orderBy('price', 'asc');
        return rows.map(row => ({
            ...row,
            features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features
        }));
    }
};
