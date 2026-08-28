"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const subscription_1 = require("../middlewares/subscription");
const rate_limit_1 = require("../middlewares/rate-limit");
const validate_1 = require("../middlewares/validate");
const anotacao_controller_1 = require("../modules/anotacao/anotacao.controller");
const anotacao_schemas_1 = require("../modules/anotacao/anotacao.schemas");
const router = (0, express_1.Router)();
router.get('/anotacoes', auth_1.auth, anotacao_controller_1.anotacaoController.list);
router.post('/anotacoes', auth_1.auth, (0, validate_1.validate)(anotacao_schemas_1.createAnotacaoSchema), anotacao_controller_1.anotacaoController.create);
router.get('/anotacoes/trash', auth_1.auth, anotacao_controller_1.anotacaoController.getTrash);
// Exportar é recurso pago — bloqueado no servidor, não só na interface
router.get('/anotacoes/export', auth_1.auth, (0, subscription_1.requireFeature)('export_notes'), anotacao_controller_1.anotacaoController.exportNotes);
router.get('/anotacoes/:id', auth_1.auth, (0, validate_1.validate)(anotacao_schemas_1.idParamSchema), anotacao_controller_1.anotacaoController.get);
router.put('/anotacoes/:id', auth_1.auth, (0, validate_1.validate)(anotacao_schemas_1.updateAnotacaoSchema), anotacao_controller_1.anotacaoController.update);
router.delete('/anotacoes/:id', auth_1.auth, (0, validate_1.validate)(anotacao_schemas_1.idParamSchema), anotacao_controller_1.anotacaoController.remove);
router.post('/anotacoes/:id/restore', auth_1.auth, (0, validate_1.validate)(anotacao_schemas_1.idParamSchema), anotacao_controller_1.anotacaoController.restore);
router.delete('/anotacoes/:id/permanent', auth_1.auth, (0, validate_1.validate)(anotacao_schemas_1.idParamSchema), anotacao_controller_1.anotacaoController.deletePermanently);
// Rate limit apertado: impede força bruta na senha das notas protegidas
router.post('/anotacoes/:id/verify-password', auth_1.auth, rate_limit_1.authLimiter, (0, validate_1.validate)(anotacao_schemas_1.verifyPasswordSchema), anotacao_controller_1.anotacaoController.verifyPassword);
// Compartilhamento por link
router.post('/anotacoes/:id/share', auth_1.auth, (0, validate_1.validate)(anotacao_schemas_1.idParamSchema), anotacao_controller_1.anotacaoController.share);
router.delete('/anotacoes/:id/share', auth_1.auth, (0, validate_1.validate)(anotacao_schemas_1.idParamSchema), anotacao_controller_1.anotacaoController.unshare);
// Visualização pública (sem login) — conteúdo sanitizado no servidor
router.get('/public/anotacoes/:token', anotacao_controller_1.anotacaoController.getPublic);
exports.default = router;
