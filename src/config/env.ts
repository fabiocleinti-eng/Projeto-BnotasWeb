const toArray = (value?: string): string[] => {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3000),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT || 3306),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'bnotasweb',
  CORS_ORIGINS: toArray(process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
};

