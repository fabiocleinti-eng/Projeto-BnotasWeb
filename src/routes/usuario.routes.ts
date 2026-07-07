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
  deleteAccountSchema,
  login2FASchema,
  enable2FASchema,
  disable2FASchema
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

// === AUTENTICAÇÃO DE DOIS FATORES (TOTP) ===
router.post('/login/2fa', authLimiter, validate(login2FASchema), usuarioController.login2FA);
router.get('/usuarios/2fa/status', auth, usuarioController.get2FAStatus);
router.post('/usuarios/2fa/setup', auth, authLimiter, usuarioController.setup2FA);
router.post('/usuarios/2fa/enable', auth, authLimiter, validate(enable2FASchema), usuarioController.enable2FA);
router.post('/usuarios/2fa/disable', auth, authLimiter, validate(disable2FASchema), usuarioController.disable2FA);

export default router;
