import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { auth } from '../middlewares/auth';
import { authLimiter } from '../middlewares/rate-limit';
import {
  createUsuarioSchema,
  loginSchema,
  resetPasswordSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  deleteAccountSchema
} from '../modules/usuario/usuario.schemas';
import { usuarioController } from '../modules/usuario/usuario.controller';

const router = Router();

router.post('/usuarios', authLimiter, validate(createUsuarioSchema), usuarioController.create);
router.post('/login', authLimiter, validate(loginSchema), usuarioController.login);

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), usuarioController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), usuarioController.resetPassword);

// Alterar senha (usuário logado)
router.put('/usuarios/senha', auth, authLimiter, validate(changePasswordSchema), usuarioController.changePassword);

// Excluir conta e todos os dados (LGPD) — exige a senha para confirmar
router.delete('/usuarios/me', auth, authLimiter, validate(deleteAccountSchema), usuarioController.deleteAccount);

export default router;
