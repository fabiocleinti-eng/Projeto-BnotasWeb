"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const toArray = (value) => {
    if (!value)
        return [];
    return value.split(',').map((s) => s.trim()).filter(Boolean);
};
// Campo vazio no .env (ex.: "EMAIL_USER=") conta como não preenchido.
// Sem isto o servidor nem sobe, com um erro de validação difícil de entender.
const opcional = (schema) => zod_1.z.preprocess((v) => (v === '' ? undefined : v), schema.optional());
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.string().default('development'),
    PORT: zod_1.z.coerce.number().default(3000),
    // JWT
    JWT_SECRET: zod_1.z.string().default('dev-secret'),
    JWT_EXPIRES_IN: zod_1.z.string().default('24h'),
    // URL do front-end (links de e-mail: reset de senha, lembretes)
    APP_URL: zod_1.z.string().default('http://localhost:4200'),
    // Banco de Dados
    DB_HOST: zod_1.z.string().default('localhost'),
    DB_PORT: zod_1.z.coerce.number().default(3306),
    DB_USER: zod_1.z.string().default('root'),
    DB_PASSWORD: zod_1.z.string().default(''),
    DB_NAME: zod_1.z.string().default('bnotasweb'),
    // CORS
    CORS_ORIGINS: zod_1.z.string().transform(toArray).default('http://localhost:3000,http://localhost:4200'),
    // --- EMAIL (Lê do .env) ---
    EMAIL_USER: opcional(zod_1.z.string().email()), // Opcional para não quebrar se não tiver configurado ainda
    EMAIL_PASS: opcional(zod_1.z.string()),
    // --- ENCRYPTION ---
    ENCRYPTION_KEY: zod_1.z.string().default('dev-encryption-key-change-in-production-32chars'),
    // --- MERCADO PAGO ---
    // Em desenvolvimento use o Access Token de TESTE (TEST-...); em produção o APP_USR-...
    MP_ACCESS_TOKEN: opcional(zod_1.z.string()),
    // URL pública da API para o webhook (ex.: https://api.seudominio.com — em dev use ngrok, opcional)
    MP_WEBHOOK_URL: opcional(zod_1.z.string())
});
exports.env = envSchema.parse(process.env);
const JWT_SECRET_PADRAO = 'dev-secret';
const ENCRYPTION_KEY_PADRAO = 'dev-encryption-key-change-in-production-32chars';
// Em produção, não permitir segredos padrão de desenvolvimento
if (exports.env.NODE_ENV === 'production') {
    if (exports.env.JWT_SECRET === JWT_SECRET_PADRAO || exports.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET fraco ou ausente. Defina um segredo com pelo menos 32 caracteres no .env');
    }
    if (exports.env.ENCRYPTION_KEY === ENCRYPTION_KEY_PADRAO) {
        throw new Error('ENCRYPTION_KEY padrão detectada. Defina uma chave própria no .env');
    }
}
else {
    // Em desenvolvimento apenas avisa — os valores padrão são públicos (estão neste
    // arquivo, versionado), então quem obtiver o banco decifra os segredos TOTP.
    if (exports.env.ENCRYPTION_KEY === ENCRYPTION_KEY_PADRAO) {
        console.warn('⚠️  ENCRYPTION_KEY padrão em uso. Gere a sua: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" e coloque no .env');
    }
    if (exports.env.JWT_SECRET === JWT_SECRET_PADRAO || exports.env.JWT_SECRET.length < 32) {
        console.warn('⚠️  JWT_SECRET fraco. Gere um segredo longo e coloque no .env');
    }
}
