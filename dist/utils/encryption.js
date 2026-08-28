"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
// Chave de 32 bytes: se ENCRYPTION_KEY for 64 caracteres hex, usa como está; senão deriva com SHA-256
function getSecretKey() {
    const key = env_1.env.ENCRYPTION_KEY;
    const isHex64 = /^[0-9a-fA-F]{64}$/.test(key);
    if (isHex64) {
        return Buffer.from(key, 'hex');
    }
    return crypto_1.default.createHash('sha256').update(key, 'utf8').digest();
}
const SECRET_KEY = getSecretKey();
// Criptografar senha de nota
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}
// Descriptografar senha de nota
function decrypt(text) {
    const parts = text.split(':');
    if (parts.length < 2) {
        throw new Error('Texto criptografado inválido');
    }
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
