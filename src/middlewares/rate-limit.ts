import rateLimit from 'express-rate-limit';

// Limite para endpoints sensíveis de autenticação (login, cadastro, reset)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas. Tente novamente em alguns minutos.' } }
});

// Limite mais brando para a API em geral
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas requisições. Aguarde um instante.' } }
});
