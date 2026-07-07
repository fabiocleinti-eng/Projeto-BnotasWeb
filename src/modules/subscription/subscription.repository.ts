import { knex } from '../../db/knex';

export type Subscription = {
  id: number;
  userId: number;
  planId: string;
  status: 'active' | 'cancelled' | 'expired';
  startDate: string | Date;
  endDate: string | Date | null;
  features: string | string[]; // JSON no banco, array no código
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string | string[]; // JSON no banco, array no código
  isActive: boolean;
};

const subscriptionTable = 'subscription';
const planTable = 'plan';

export const subscriptionRepository = {
  async findByUserId(userId: number): Promise<Subscription | undefined> {
    const row = await knex<Subscription>(subscriptionTable)
      .where({ userId })
      .first();
    
    if (!row) return undefined;
    
    return {
      ...row,
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features
    };
  },

  async create(data: {
    userId: number;
    planId: string;
    status?: 'active' | 'cancelled' | 'expired';
    features?: string[];
  }): Promise<Subscription> {
    const [id] = await knex(subscriptionTable).insert({
      userId: data.userId,
      planId: data.planId,
      status: data.status || 'active',
      startDate: knex.fn.now(),
      endDate: null,
      features: JSON.stringify(data.features || [])
    });

    const created = await knex<Subscription>(subscriptionTable)
      .where({ id: Number(id) })
      .first();

    return {
      ...created!,
      features: typeof created!.features === 'string' ? JSON.parse(created!.features) : created!.features
    };
  },

  async update(userId: number, data: {
    planId?: string;
    status?: 'active' | 'cancelled' | 'expired';
    features?: string[];
    startDate?: Date;
  }): Promise<void> {
    const updateData: any = {};
    
    if (data.planId !== undefined) updateData.planId = data.planId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.features !== undefined) updateData.features = JSON.stringify(data.features);
    if (data.startDate !== undefined) updateData.startDate = data.startDate;

    await knex(subscriptionTable)
      .where({ userId })
      .update(updateData);
  },

  async findPlanById(planId: string): Promise<Plan | undefined> {
    const row = await knex<Plan>(planTable)
      .where({ id: planId, isActive: true })
      .first();
    
    if (!row) return undefined;
    
    return {
      ...row,
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features
    };
  },

  async findAllPlans(): Promise<Plan[]> {
    const rows = await knex<Plan>(planTable)
      .where({ isActive: true })
      .orderBy('price', 'asc');
    
    return rows.map(row => ({
      ...row,
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features
    }));
  }
};









