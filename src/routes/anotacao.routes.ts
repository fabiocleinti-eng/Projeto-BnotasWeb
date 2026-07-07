import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rate-limit';
import { validate } from '../middlewares/validate';
import { anotacaoController } from '../modules/anotacao/anotacao.controller';
import { createAnotacaoSchema, updateAnotacaoSchema, idParamSchema, verifyPasswordSchema } from '../modules/anotacao/anotacao.schemas';

const router = Router();

router.get('/anotacoes', auth, anotacaoController.list);
router.post('/anotacoes', auth, validate(createAnotacaoSchema), anotacaoController.create);
router.get('/anotacoes/trash', auth, anotacaoController.getTrash);
router.get('/anotacoes/:id', auth, validate(idParamSchema), anotacaoController.get);
router.put('/anotacoes/:id', auth, validate(updateAnotacaoSchema), anotacaoController.update);
router.delete('/anotacoes/:id', auth, validate(idParamSchema), anotacaoController.remove);
router.post('/anotacoes/:id/restore', auth, validate(idParamSchema), anotacaoController.restore);
router.delete('/anotacoes/:id/permanent', auth, validate(idParamSchema), anotacaoController.deletePermanently);
// Rate limit apertado: impede força bruta na senha das notas protegidas
router.post('/anotacoes/:id/verify-password', auth, authLimiter, validate(verifyPasswordSchema), anotacaoController.verifyPassword);

// Compartilhamento por link
router.post('/anotacoes/:id/share', auth, validate(idParamSchema), anotacaoController.share);
router.delete('/anotacoes/:id/share', auth, validate(idParamSchema), anotacaoController.unshare);
// Visualização pública (sem login) — conteúdo sanitizado no servidor
router.get('/public/anotacoes/:token', anotacaoController.getPublic);

export default router;
