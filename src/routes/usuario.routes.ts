import { Router } from 'express';
import { validate } from '../middlewares/validate';
import { createUsuarioSchema, loginSchema } from '../modules/usuario/usuario.schemas';
import { usuarioController } from '../modules/usuario/usuario.controller';

const router = Router();

router.post('/usuarios', validate(createUsuarioSchema), usuarioController.create);
router.post('/login', validate(loginSchema), usuarioController.login);

export default router;

