import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Chave de 32 bytes: se ENCRYPTION_KEY for 64 caracteres hex, usa como está; senão deriva com SHA-256
function getSecretKey(): Buffer {
  const key = env.ENCRYPTION_KEY;
  const isHex64 = /^[0-9a-fA-F]{64}$/.test(key);
  if (isHex64) {
    return Buffer.from(key, 'hex');
  }
  return crypto.createHash('sha256').update(key, 'utf8').digest();
}

const SECRET_KEY = getSecretKey();

// Criptografar senha de nota
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Descriptografar senha de nota
export function decrypt(text: string): string {
  const parts = text.split(':');
  if (parts.length < 2) {
    throw new Error('Texto criptografado inválido');
  }
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}










