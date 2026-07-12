import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { auth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { paymentService } from '../modules/payment/payment.service';

const checkoutSchema = z.object({
  body: z.object({
    planId: z.enum(['premium', 'pro']),
    periodo: z.enum(['mensal', 'anual']).optional()
  })
});

const confirmSchema = z.object({
  body: z.object({ paymentId: z.string().min(1).max(64) })
});

const router = Router();

// Cria o checkout do Mercado Pago (usuário logado)
router.post('/payments/checkout', auth, validate(checkoutSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { planId, periodo } = req.body;
    res.json(await paymentService.createCheckout(req.user!.id, planId, periodo || 'mensal'));
  } catch (e) { next(e); }
});

// Confirmação no retorno do checkout: o front manda o payment_id da URL e
// o servidor VERIFICA direto na API do MP antes de ativar (nada vem do navegador)
router.post('/payments/confirm', auth, validate(confirmSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await paymentService.processPayment(req.body.paymentId, req.user!.id));
  } catch (e) { next(e); }
});

// Webhook do Mercado Pago (sem auth — o MP que chama). Responde 200 rápido
// e processa em seguida; a segurança vem de consultar o pagamento na API do MP.
router.post('/payments/webhook', async (req: Request, res: Response) => {
  res.sendStatus(200);
  try {
    const type = req.body?.type || req.query.type;
    const paymentId = req.body?.data?.id || req.query['data.id'];
    if (type === 'payment' && paymentId) {
      await paymentService.processPayment(String(paymentId));
    }
  } catch (e: any) {
    console.error('Webhook MP:', e?.message || e);
  }
});

export default router;
