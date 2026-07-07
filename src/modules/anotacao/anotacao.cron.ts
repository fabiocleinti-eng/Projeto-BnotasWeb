import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { knex } from '../../db/knex';
import { env } from '../../config/env';
import { differenceInHours, differenceInDays, differenceInMinutes } from 'date-fns';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS }
});

export const startCronJobs = () => {
  // Roda a cada minuto
  cron.schedule('* * * * *', async () => {
    console.log('⏰ Verificando lembretes...');
    await checkAndSendEmails();
  });
};

async function checkAndSendEmails() {
  try {
    // Agora buscamos até a etapa 7 (1 minuto final)
    const notas = await knex('anotacao')
      .join('usuario_anotacao', 'anotacao.id', 'usuario_anotacao.anotacao_id')
      .join('usuario', 'usuario_anotacao.usuario_id', 'usuario.id')
      .select(
        'anotacao.id', 
        'anotacao.titulo', 
        'anotacao.data_lembrete', 
        'anotacao.etapa_lembrete',
        'usuario.email', 
        'usuario.nome'
      )
      .whereNotNull('anotacao.data_lembrete')
      .andWhere('anotacao.etapa_lembrete', '<', 7); // <--- AUMENTADO PARA 7

    const agora = new Date();

    for (const nota of notas) {
      const dataLembrete = new Date(nota.data_lembrete);
      
      const diffDias = differenceInDays(dataLembrete, agora);
      const diffHoras = differenceInHours(dataLembrete, agora);
      const diffMinutos = differenceInMinutes(dataLembrete, agora);

      let novaEtapa = nota.etapa_lembrete;
      let assunto = '';
      let mensagem = '';

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
        console.log(`📧 Enviando aviso nível ${novaEtapa} para ${nota.email}`);
        
        await transporter.sendMail({
          from: `BnotasWeb Alerta <${env.EMAIL_USER}>`,
          to: nota.email,
          subject: assunto,
          html: `<div style="font-family: sans-serif; color: #333;">
                  <h2>${assunto}</h2>
                  <p>${mensagem}</p>
                  <br>
                  <a href="${env.APP_URL}" style="background: #ff5252; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">IR PARA O APP</a>
                 </div>`
        });

        await knex('anotacao').where({ id: nota.id }).update({ etapa_lembrete: novaEtapa });
      }
    }
  } catch (error) {
    console.error('Erro no Cron Job:', error);
  }
}