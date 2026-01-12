import { Router } from 'express';
import usuarioRoutes from './usuario.routes';
import anotacaoRoutes from './anotacao.routes';
import subscriptionRoutes from './subscription.routes';
import * as swaggerUi from 'swagger-ui-express';
import { openapiSpec } from '../docs/openapi';

const router = Router();

router.use(usuarioRoutes);
router.use(anotacaoRoutes);
router.use(subscriptionRoutes);

router.get('/docs.json', (_req, res) => res.json(openapiSpec));
router.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

export default router;

