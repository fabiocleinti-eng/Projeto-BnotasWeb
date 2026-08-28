"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const knex_1 = require("../../db/knex");
const env_1 = require("../../config/env");
const subscription_service_1 = require("../subscription/subscription.service");
const mailer_1 = require("../../utils/mailer");
const date_fns_1 = require("date-fns");
// Etapa 3 = "é hoje". É a partir dela que o plano gratuito recebe seu aviso único.
const ETAPA_DIA_DO_VENCIMENTO = 3;
const startCronJobs = () => {
    // Roda a cada minuto
    node_cron_1.default.schedule('* * * * *', async () => {
        console.log('⏰ Verificando lembretes...');
        await checkAndSendEmails();
    });
};
exports.startCronJobs = startCronJobs;
async function checkAndSendEmails() {
    try {
        // Agora buscamos até a etapa 7 (1 minuto final)
        const notas = await (0, knex_1.knex)('anotacao')
            .join('usuario_anotacao', 'anotacao.id', 'usuario_anotacao.anotacao_id')
            .join('usuario', 'usuario_anotacao.usuario_id', 'usuario.id')
            .select('anotacao.id', 'anotacao.titulo', 'anotacao.data_lembrete', 'anotacao.etapa_lembrete', 'usuario.id as usuario_id', 'usuario.email', 'usuario.nome', 'usuario.email_verificado')
            .whereNotNull('anotacao.data_lembrete')
            .andWhere('anotacao.etapa_lembrete', '<', 7); // <--- AUMENTADO PARA 7
        const agora = new Date();
        for (const nota of notas) {
            const dataLembrete = new Date(nota.data_lembrete);
            const diffDias = (0, date_fns_1.differenceInDays)(dataLembrete, agora);
            const diffHoras = (0, date_fns_1.differenceInHours)(dataLembrete, agora);
            const diffMinutos = (0, date_fns_1.differenceInMinutes)(dataLembrete, agora);
            let novaEtapa = nota.etapa_lembrete;
            let assunto = '';
            let mensagem = '';
            // Título e nome são digitados pelo usuário: escapa antes de montar o e-mail
            nota.titulo = (0, mailer_1.escaparHtml)(nota.titulo);
            nota.nome = (0, mailer_1.escaparHtml)(nota.nome);
            // 1. Falta 1 semana (Etapa 1)
            if (diffDias <= 7 && diffDias > 2 && nota.etapa_lembrete < 1) {
                novaEtapa = 1;
                assunto = `📅 Falta 1 semana: ${nota.titulo}`;
                mensagem = `Olá ${nota.nome}, faltam 7 dias para "${nota.titulo}".`;
            }
            // 2. Faltam 2 dias (Etapa 2)
            else if (diffDias <= 2 && diffDias > 0 && nota.etapa_lembrete < 2) {
                novaEtapa = 2;
                assunto = `👀 Faltam 2 dias: ${nota.titulo}`;
                mensagem = `Ei ${nota.nome}, o prazo de "${nota.titulo}" está chegando!`;
            }
            // 3. É hoje - Faltam mais de 2 horas (Etapa 3)
            else if (diffDias === 0 && diffHoras > 2 && nota.etapa_lembrete < 3) {
                novaEtapa = 3;
                assunto = `🔥 É HOJE: ${nota.titulo}`;
                mensagem = `Bom dia ${nota.nome}! Hoje é o dia de entregar "${nota.titulo}".`;
            }
            // 4. Faltam entre 2 horas e 11 minutos (Etapa 4)
            else if (diffHoras <= 2 && diffMinutos > 10 && nota.etapa_lembrete < 4) {
                novaEtapa = 4;
                assunto = `🚨 URGENTE: 2 horas para ${nota.titulo}!`;
                mensagem = `${nota.nome}, faltam menos de 2 horas! Corre!`;
            }
            // --- ZONA DE PERIGO (Minutos Finais) ---
            // 5. Faltam 10 minutos (Etapa 5)
            else if (diffMinutos <= 10 && diffMinutos > 5 && nota.etapa_lembrete < 5) {
                novaEtapa = 5;
                assunto = `😱 CORRE: 10 MINUTOS para ${nota.titulo}`;
                mensagem = `Faltam apenas 10 minutos. É agora ou nunca!`;
            }
            // 6. Faltam 5 minutos (Etapa 6)
            else if (diffMinutos <= 5 && diffMinutos > 1 && nota.etapa_lembrete < 6) {
                novaEtapa = 6;
                assunto = `⏱️ 5 MINUTOS FINAIS: ${nota.titulo}`;
                mensagem = `Cinco minutos restantes. Finalize ou remarque imediatamente!`;
            }
            // 7. Falta 1 minuto ou menos (Etapa 7)
            else if (diffMinutos <= 1 && diffMinutos >= 0 && nota.etapa_lembrete < 7) {
                novaEtapa = 7;
                assunto = `💣 ACABOU O TEMPO (1 min): ${nota.titulo}`;
                mensagem = `Último aviso! O prazo de "${nota.titulo}" está estourando agora.`;
            }
            // Se mudou de etapa, envia email
            if (novaEtapa > nota.etapa_lembrete) {
                // Endereço não confirmado nunca recebe lembrete: impede que alguém cadastre
                // o e-mail de outra pessoa e faça o app enviar mensagens para a vítima.
                if (!nota.email_verificado) {
                    await (0, knex_1.knex)('anotacao').where({ id: nota.id }).update({ etapa_lembrete: novaEtapa });
                    continue;
                }
                // Plano gratuito recebe UM único aviso — o do dia do vencimento.
                // Planos pagos recebem a escalada completa (1 semana → 1 minuto).
                // A etapa é marcada de qualquer forma, para não acumular avisos atrasados.
                const escaladaCompleta = await subscription_service_1.subscriptionService.hasFeature(nota.usuario_id, 'email_notifications');
                const primeiroAvisoDoDia = nota.etapa_lembrete < ETAPA_DIA_DO_VENCIMENTO && novaEtapa >= ETAPA_DIA_DO_VENCIMENTO;
                if (!escaladaCompleta && !primeiroAvisoDoDia) {
                    await (0, knex_1.knex)('anotacao').where({ id: nota.id }).update({ etapa_lembrete: novaEtapa });
                    continue;
                }
                // No aviso do plano gratuito, convida a assinar para ter os avisos antecipados
                const chamadaUpgrade = escaladaCompleta ? '' : `
          <p style="font-size: 0.9em; color: #666; border-top: 1px solid #eee; padding-top: 12px; margin-top: 20px;">
            Quer ser avisado com antecedência — 1 semana, 2 dias, 2 horas e nos minutos finais?
            Isso está nos planos pagos do BnotasWeb.
          </p>`;
                console.log(`📧 Enviando aviso nível ${novaEtapa} para ${nota.email}${escaladaCompleta ? '' : ' (plano gratuito: aviso único)'}`);
                await (0, mailer_1.enviarEmail)({
                    to: nota.email,
                    subject: assunto,
                    html: (0, mailer_1.layoutEmail)(assunto, `
            <p>${mensagem}</p>
            <p style="text-align:center; margin: 24px 0;">
              <a href="${env_1.env.APP_URL}" style="background:#ff5252; color:#fff; padding:12px 28px; text-decoration:none; border-radius:8px; font-weight:bold;">IR PARA O APP</a>
            </p>
            ${chamadaUpgrade}`)
                });
                await (0, knex_1.knex)('anotacao').where({ id: nota.id }).update({ etapa_lembrete: novaEtapa });
            }
        }
    }
    catch (error) {
        console.error('Erro no Cron Job:', error);
    }
}
