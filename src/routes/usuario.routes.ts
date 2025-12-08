import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { 
  createUsuarioSchema, 
  loginSchema, 
  resetPasswordSchema // <--- Importe o novo schema
} from '../modules/usuario/usuario.schemas';
import { usuarioController } from '../modules/usuario/usuario.controller';

const router = Router();

router.post('/usuarios', validate(createUsuarioSchema), usuarioController.create);
router.post('/login', validate(loginSchema), usuarioController.login);

// Forgot Password (pede apenas email, validação simples interna ou schema separado se quiser)
router.post('/forgot-password', usuarioController.forgotPassword);

// Reset Password AGORA COM VALIDAÇÃO
router.post('/reset-password', validate(resetPasswordSchema), usuarioController.resetPassword);

export default router;