"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middlewares/validate");
const auth_1 = require("../middlewares/auth");
const rate_limit_1 = require("../middlewares/rate-limit");
const usuario_schemas_1 = require("../modules/usuario/usuario.schemas");
const usuario_controller_1 = require("../modules/usuario/usuario.controller");
const router = (0, express_1.Router)();
router.post('/usuarios', rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.createUsuarioSchema), usuario_controller_1.usuarioController.create);
router.post('/login', rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.loginSchema), usuario_controller_1.usuarioController.login);
router.post('/forgot-password', rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.forgotPasswordSchema), usuario_controller_1.usuarioController.forgotPassword);
router.post('/reset-password', rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.resetPasswordSchema), usuario_controller_1.usuarioController.resetPassword);
// Alterar senha (usuário logado)
router.put('/usuarios/senha', auth_1.auth, rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.changePasswordSchema), usuario_controller_1.usuarioController.changePassword);
// Excluir conta e todos os dados (LGPD) — exige a senha para confirmar
router.delete('/usuarios/me', auth_1.auth, rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.deleteAccountSchema), usuario_controller_1.usuarioController.deleteAccount);
// === VERIFICAÇÃO DE E-MAIL ===
// Confirmar é público (o link chega por e-mail); reenviar exige estar logado.
router.post('/verificar-email', rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.verificarEmailSchema), usuario_controller_1.usuarioController.verificarEmail);
router.post('/usuarios/reenviar-verificacao', auth_1.auth, rate_limit_1.authLimiter, usuario_controller_1.usuarioController.reenviarVerificacao);
// === PERFIL (persistido no servidor) ===
router.get('/usuarios/perfil', auth_1.auth, usuario_controller_1.usuarioController.getPerfil);
router.put('/usuarios/perfil', auth_1.auth, (0, validate_1.validate)(usuario_schemas_1.updatePerfilSchema), usuario_controller_1.usuarioController.updatePerfil);
// === AUTENTICAÇÃO DE DOIS FATORES (TOTP) ===
router.post('/login/2fa', rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.login2FASchema), usuario_controller_1.usuarioController.login2FA);
router.get('/usuarios/2fa/status', auth_1.auth, usuario_controller_1.usuarioController.get2FAStatus);
router.post('/usuarios/2fa/setup', auth_1.auth, rate_limit_1.authLimiter, usuario_controller_1.usuarioController.setup2FA);
router.post('/usuarios/2fa/enable', auth_1.auth, rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.enable2FASchema), usuario_controller_1.usuarioController.enable2FA);
router.post('/usuarios/2fa/disable', auth_1.auth, rate_limit_1.authLimiter, (0, validate_1.validate)(usuario_schemas_1.disable2FASchema), usuario_controller_1.usuarioController.disable2FA);
exports.default = router;
