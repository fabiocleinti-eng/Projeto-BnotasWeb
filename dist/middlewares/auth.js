"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.ACCESS_TOKEN_TYPE = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const error_1 = require("./error");
// Único tipo aceito para acessar a API. O login de contas com 2FA emite um token
// intermediário (type '2fa') que serve só para validar o código do autenticador —
// sem esta checagem ele funcionaria como sessão e burlaria o segundo fator.
exports.ACCESS_TOKEN_TYPE = 'access';
const auth = (req, _res, next) => {
    const header = req.headers['authorization'];
    if (!header)
        return next(new error_1.ApiError(401, 'Credenciais ausentes', 'UNAUTHORIZED'));
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token)
        return next(new error_1.ApiError(401, 'Token inválido', 'UNAUTHORIZED'));
    try {
        // algorithms fixo: impede tokens assinados com outro algoritmo serem aceitos
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET, { algorithms: ['HS256'] });
        // Recusa qualquer token que não seja de sessão (ex.: o intermediário do 2FA)
        if (payload.type !== exports.ACCESS_TOKEN_TYPE) {
            return next(new error_1.ApiError(401, 'Token inválido', 'UNAUTHORIZED'));
        }
        const userId = typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub;
        if (!userId || Number.isNaN(userId))
            return next(new error_1.ApiError(401, 'Token inválido', 'UNAUTHORIZED'));
        req.user = { id: userId, email: payload.email };
        return next();
    }
    catch {
        return next(new error_1.ApiError(401, 'Token inválido ou expirado', 'UNAUTHORIZED'));
    }
};
exports.auth = auth;
