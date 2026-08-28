import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const toArray = (value?: string): string[] => {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
};

// Campo vazio no .env (ex.: "EMAIL_USER=") conta como não preenchido.
// Sem isto o servidor nem sobe, com um erro de validação difícil de entender.
const opcional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),

  // JWT
  JWT_SECRET: z.string().default('dev-secret'),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // URL do front-end (links de e-mail: reset de senha, lembretes)
  APP_URL: z.string().default('http://localhost:4200'),

  // Banco de Dados
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('bnotasweb'),
  
  // CORS
  CORS_ORIGINS: z.string().transform(toArray).default('http://localhost:3000,http://localhost:4200'),

  // --- EMAIL (Lê do .env) ---
  EMAIL_USER: opcional(z.string().email()), // Opcional para não quebrar se não tiver configurado ainda
  EMAIL_PASS: opcional(z.string()),

  // --- ENCRYPTION ---
  ENCRYPTION_KEY: z.string().default('dev-encryption-key-change-in-production-32chars'),

  // --- MERCADO PAGO ---
  // Em desenvolvimento use o Access Token de TESTE (TEST-...); em produção o APP_USR-...
  MP_ACCESS_TOKEN: opcional(z.string()),
  // URL pública da API para o webhook (ex.: https://api.seudominio.com — em dev use ngrok, opcional)
  MP_WEBHOOK_URL: opcional(z.string())
});

export const env = envSchema.parse(process.env);

const JWT_SECRET_PADRAO = 'dev-secret';
const ENCRYPTION_KEY_PADRAO = 'dev-encryption-key-change-in-production-32chars';

// Em produção, não permitir segredos padrão de desenvolvimento
if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET === JWT_SECRET_PADRAO || env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET fraco ou ausente. Defina um segredo com pelo menos 32 caracteres no .env');
  }
  if (env.ENCRYPTION_KEY === ENCRYPTION_KEY_PADRAO) {
    throw new Error('ENCRYPTION_KEY padrão detectada. Defina uma chave própria no .env');
  }
} else {
  // Em desenvolvimento apenas avisa — os valores padrão são públicos (estão neste
  // arquivo, versionado), então quem obtiver o banco decifra os segredos TOTP.
  if (env.ENCRYPTION_KEY === ENCRYPTION_KEY_PADRAO) {
    console.warn('⚠️  ENCRYPTION_KEY padrão em uso. Gere a sua: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" e coloque no .env');
  }
  if (env.JWT_SECRET === JWT_SECRET_PADRAO || env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET fraco. Gere um segredo longo e coloque no .env');
  }
}