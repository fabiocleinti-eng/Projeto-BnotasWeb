"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailConfigurado = void 0;
exports.escaparHtml = escaparHtml;
exports.limparAssunto = limparAssunto;
exports.layoutEmail = layoutEmail;
exports.enviarEmail = enviarEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
// Envio de e-mail centralizado (antes o transporte estava duplicado em
// usuario.service e anotacao.cron, com o mesmo bloco de configuração).
const emailConfigurado = () => !!(env_1.env.EMAIL_USER && env_1.env.EMAIL_PASS);
exports.emailConfigurado = emailConfigurado;
let transporter = null;
function obterTransporter() {
    if (!transporter) {
        transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: { user: env_1.env.EMAIL_USER, pass: env_1.env.EMAIL_PASS }
        });
    }
    return transporter;
}
/**
 * Escapa texto do usuário antes de colocá-lo no HTML do e-mail.
 * Nome de usuário e título de nota são digitados por quem usa o app — sem isto,
 * um "<img onerror=...>" no nome viaja dentro da mensagem.
 */
function escaparHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/** Remove quebras de linha e caracteres de controle do assunto (injeção de cabeçalho). */
function limparAssunto(texto) {
    return String(texto).replace(/[\r\n\t\0]+/g, ' ').trim().slice(0, 200);
}
/** Envolve o conteúdo num layout simples com a identidade do app. */
function layoutEmail(titulo, corpoHtml) {
    return `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 520px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #6200ea, #7c4dff); color: #fff; padding: 20px; border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; font-size: 1.3rem;">BnotasWeb</h1>
    </div>
    <div style="border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
      <h2 style="margin-top: 0; font-size: 1.1rem; color: #333;">${titulo}</h2>
      ${corpoHtml}
    </div>
  </div>`;
}
async function enviarEmail(opcoes) {
    if (!(0, exports.emailConfigurado)()) {
        console.warn('E-mail não configurado (EMAIL_USER/EMAIL_PASS) — envio ignorado:', opcoes.subject);
        return false;
    }
    await obterTransporter().sendMail({
        from: `BnotasWeb <${env_1.env.EMAIL_USER}>`,
        to: opcoes.to,
        subject: limparAssunto(opcoes.subject), // barra CRLF vindo de título de nota
        html: opcoes.html
    });
    return true;
}
