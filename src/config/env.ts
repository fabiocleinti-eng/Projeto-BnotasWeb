import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const toArray = (value?: string): string[] => {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
};

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  
  // JWT
  JWT_SECRET: z.string().default('dev-secret'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // Banco de Dados
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('bnotasweb'),
  
  // CORS
  CORS_ORIGINS: z.string().transform(toArray).default('http://localhost:3000,http://localhost:4200'),

  // --- EMAIL (Lê do .env) ---
  EMAIL_USER: z.string().email().optional(), // Opcional para não quebrar se não tiver configurado ainda
  EMAIL_PASS: z.string().optional()
});

export const env = envSchema.parse(process.env);