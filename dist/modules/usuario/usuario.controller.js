"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuarioController = void 0;
const usuario_service_1 = require("./usuario.service");
exports.usuarioController = {
    async create(req, res, next) {
        try {
            // Pega o telefone também
            const { email, senha, nome, sobrenome, telefone } = req.body;
            const user = await usuario_service_1.usuarioService.register({ email, senha, nome, sobrenome, telefone });
            res.status(201).json(user);
        }
        catch (e) {
            next(e);
        }
    },
    async login(req, res, next) {
        try {
            const { email, senha } = req.body;
            const result = await usuario_service_1.usuarioService.login(email, senha);
            res.json(result);
        }
        catch (e) {
            next(e);
        }
    },
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            await usuario_service_1.usuarioService.forgotPassword(email);
            res.json({ message: 'Link enviado.' });
        }
        catch (e) {
            next(e);
        }
    },
    async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            await usuario_service_1.usuarioService.resetPassword(token, newPassword);
            res.json({ message: 'Senha alterada.' });
        }
        catch (e) {
            next(e);
        }
    },
    async changePassword(req, res, next) {
        try {
            const userId = req.user.id;
            const { senhaAtual, novaSenha } = req.body;
            const result = await usuario_service_1.usuarioService.changePassword(userId, senhaAtual, novaSenha);
            res.json(result);
        }
        catch (e) {
            next(e);
        }
    },
    async deleteAccount(req, res, next) {
        try {
            const userId = req.user.id;
            const { senha } = req.body;
            const result = await usuario_service_1.usuarioService.deleteAccount(userId, senha);
            res.json(result);
        }
        catch (e) {
            next(e);
        }
    },
    // === 2FA ===
    async login2FA(req, res, next) {
        try {
            const { tempToken, codigo } = req.body;
            res.json(await usuario_service_1.usuarioService.login2FA(tempToken, codigo));
        }
        catch (e) {
            next(e);
        }
    },
    async setup2FA(req, res, next) {
        try {
            res.json(await usuario_service_1.usuarioService.setup2FA(req.user.id));
        }
        catch (e) {
            next(e);
        }
    },
    async enable2FA(req, res, next) {
        try {
            res.json(await usuario_service_1.usuarioService.enable2FA(req.user.id, req.body.codigo));
        }
        catch (e) {
            next(e);
        }
    },
    async disable2FA(req, res, next) {
        try {
            res.json(await usuario_service_1.usuarioService.disable2FA(req.user.id, req.body.senha, req.body.codigo));
        }
        catch (e) {
            next(e);
        }
    },
    async get2FAStatus(req, res, next) {
        try {
            res.json(await usuario_service_1.usuarioService.get2FAStatus(req.user.id));
        }
        catch (e) {
            next(e);
        }
    },
    // === VERIFICAÇÃO DE E-MAIL ===
    async verificarEmail(req, res, next) {
        try {
            res.json(await usuario_service_1.usuarioService.verificarEmail(req.body.token));
        }
        catch (e) {
            next(e);
        }
    },
    async reenviarVerificacao(req, res, next) {
        try {
            res.json(await usuario_service_1.usuarioService.reenviarVerificacao(req.user.id));
        }
        catch (e) {
            next(e);
        }
    },
    async getPerfil(req, res, next) {
        try {
            res.json(await usuario_service_1.usuarioService.getPerfil(req.user.id));
        }
        catch (e) {
            next(e);
        }
    },
    async updatePerfil(req, res, next) {
        try {
            res.json(await usuario_service_1.usuarioService.updatePerfil(req.user.id, req.body));
        }
        catch (e) {
            next(e);
        }
    }
};
