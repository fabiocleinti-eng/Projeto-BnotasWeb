"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Limite para endpoints sensíveis de autenticação (login, cadastro, reset)
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas. Tente novamente em alguns minutos.' } }
});
// Limite mais brando para a API em geral
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minuto
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas requisições. Aguarde um instante.' } }
});
