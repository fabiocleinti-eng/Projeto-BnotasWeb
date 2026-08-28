import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { enviarEmail, layoutEmail, emailConfigurado, escaparHtml } from '../../utils/mailer';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { encrypt, decrypt } from '../../utils/encryption';
import { usuarioRepository } from './usuario.repository';
import { subscriptionRepository } from '../subscription/subscription.repository';
import { ApiError } from '../../middlewares/error';
import { ACCESS_TOKEN_TYPE } from '../../middlewares/auth';
import { env } from '../../config/env';

export const usuarioService = {
  // Agora aceita telefone
  async register(data: { email: string, senha: string, nome: string, sobrenome: string, telefone?: string }) {
    const exists = await usuarioRepository.findByEmail(data.email);
    if (exists) throw new ApiError(409, 'Email já cadastrado', 'EMAIL_IN_USE');
    
    const hash = await bcrypt.hash(data.senha, 10);
    
    const user = await usuarioRepository.create({
      email: data.email,
      senhaHash: hash,
      nome: data.nome,
      sobrenome: data.sobrenome,
      telefone: data.telefone
    });
    
    // Criar assinatura gratuita
    await subscriptionRepository.create({
      userId: user.id,
      planId: 'free',
      status: 'active',
      features: []
    });

    // Envia a confirmação do endereço. Uma falha no envio não invalida o cadastro:
    // a conta é criada e o usuário pode pedir o reenvio depois.
    try {
      await this.enviarVerificacao(user.id, user.email, user.nome);
    } catch (e) {
      console.error('Falha ao enviar verificação de e-mail:', e);
    }

    return { id: user.id, email: user.email, nome: user.nome, emailVerificado: false };
  },

  // === VERIFICAÇÃO DE E-MAIL ===

  /** Gera um token de uso único (24h) e manda o link de confirmação. */
  async enviarVerificacao(userId: number, email: string, nome?: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await usuarioRepository.definirTokenVerificacao(userId, token, expira);

    const link = `${env.APP_URL}/verificar-email?token=${token}`;
    await enviarEmail({
      to: email,
      subject: 'Confirme seu e-mail — BnotasWeb',
      html: layoutEmail(`Olá, ${escaparHtml(nome) || "tudo bem"}!`, `
        <p>Falta pouco para começar a usar o BnotasWeb. Confirme que este endereço é seu:</p>
        <p style="text-align:center; margin: 24px 0;">
          <a href="${link}" style="background:#6200ea; color:#fff; padding:12px 28px; text-decoration:none; border-radius:8px; font-weight:bold;">CONFIRMAR MEU E-MAIL</a>
        </p>
        <p style="font-size:0.85em; color:#777;">O link vale por 24 horas.</p>
        <p style="font-size:0.85em; color:#777;">Se não foi você que criou esta conta, ignore esta mensagem — sem a confirmação, nenhum lembrete será enviado para você.</p>
      `)
    });
    return { enviado: true };
  },

  /** Confirma o endereço a partir do token do e-mail. */
  async verificarEmail(token: string) {
    const user = await usuarioRepository.findByTokenVerificacao(token);
    if (!user) {
      throw new ApiError(400, 'Link inválido ou expirado. Peça um novo e-mail de confirmação.', 'TOKEN_INVALIDO');
    }
    await usuarioRepository.marcarEmailVerificado(user.id);
    return { verificado: true, email: user.email };
  },

  /** Reenvia a confirmação para o usuário logado. */
  async reenviarVerificacao(userId: number) {
    const user = await usuarioRepository.findById(userId);
    if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
    if (user.email_verificado) {
      throw new ApiError(400, 'Este e-mail já está confirmado.', 'EMAIL_JA_VERIFICADO');
    }
    return this.enviarVerificacao(user.id, user.email, user.nome);
  },

  async login(email: string, senha: string) {
    const user = await usuarioRepository.findByEmail(email);
    if (!user) {
      // Compara contra hash fictício para igualar o tempo de resposta
      // (evita descobrir e-mails cadastrados medindo a latência)
      await bcrypt.compare(senha, '$2b$10$C6UzMDM.H6dfI/f/IKcEeO7ccnQY0jFCVvVIXNDXHuKji5Cwl92C6');
      throw new ApiError(401, 'Credenciais inválidas', 'INVALID_CREDENTIALS');
    }

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) throw new ApiError(401, 'Credenciais inválidas', 'INVALID_CREDENTIALS');

    // 2FA ativado: NÃO emite o token de acesso ainda. Devolve um token temporário
    // (5 min, tipo '2fa') que só serve para completar o login com o código do app.
    if (user.totp_enabled) {
      const tempToken = jwt.sign({ sub: String(user.id), type: '2fa' }, env.JWT_SECRET, { expiresIn: '5m' });
      return { requires2FA: true, tempToken };
    }

    return this.buildLoginResponse(user);
  },

  buildLoginResponse(user: { id: number; email: string; nome: string; sobrenome: string; telefone?: string | null; is_admin?: number | boolean; email_verificado?: number | boolean }) {
    const token = jwt.sign(
      { sub: String(user.id), email: user.email, type: ACCESS_TOKEN_TYPE },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        sobrenome: user.sobrenome,
        telefone: user.telefone,
        isAdmin: !!user.is_admin,
        emailVerificado: !!user.email_verificado
      }
    };
  },

  // Completa o login de quem tem 2FA: valida o token temporário + código do app
  async login2FA(tempToken: string, codigo: string) {
    let payload: any;
    try {
      payload = jwt.verify(tempToken, env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw new ApiError(401, 'Sessão de verificação expirada. Faça login novamente.', 'TEMP_TOKEN_EXPIRED');
    }
    if (payload.type !== '2fa') throw new ApiError(401, 'Token inválido', 'UNAUTHORIZED');

    const user = await usuarioRepository.findById(Number(payload.sub));
    if (!user || !user.totp_secret || !user.totp_enabled) {
      throw new ApiError(401, 'Verificação inválida', 'UNAUTHORIZED');
    }

    const secret = decrypt(user.totp_secret);
    const totpOk = authenticator.verify({ token: codigo, secret });

    if (!totpOk) {
      // Tenta como código de BACKUP (uso único: é removido após validar)
      const hashes: string[] = user.totp_backup_codes ? JSON.parse(user.totp_backup_codes as string) : [];
      let usado = -1;
      for (let i = 0; i < hashes.length; i++) {
        if (await bcrypt.compare(codigo, hashes[i])) { usado = i; break; }
      }
      if (usado === -1) {
        throw new ApiError(401, 'Código incorreto. Verifique o app autenticador.', 'INVALID_2FA_CODE');
      }
      hashes.splice(usado, 1);
      await usuarioRepository.update2FA(user.id, { totp_backup_codes: JSON.stringify(hashes) });
    }

    return this.buildLoginResponse(user);
  },

  // Passo 1 da ativação: gera o segredo e o QR code (2FA ainda NÃO fica ativo)
  async setup2FA(userId: number) {
    const user = await usuarioRepository.findById(userId);
    if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
    if (user.totp_enabled) throw new ApiError(400, '2FA já está ativado', '2FA_ALREADY_ENABLED');

    const secret = authenticator.generateSecret();
    // Guarda criptografado: um vazamento do banco não expõe os segredos TOTP
    await usuarioRepository.update2FA(userId, { totp_secret: encrypt(secret), totp_enabled: false });

    const otpauth = authenticator.keyuri(user.email, 'BnotasWeb', secret);
    const qrCode = await QRCode.toDataURL(otpauth);
    return { qrCode, secret }; // secret exibido para digitação manual no app
  },

  // Passo 2: confirma com um código válido do app → 2FA ativado de verdade
  async enable2FA(userId: number, codigo: string) {
    const user = await usuarioRepository.findById(userId);
    if (!user || !user.totp_secret) throw new ApiError(400, 'Gere o QR code primeiro', '2FA_SETUP_REQUIRED');
    if (user.totp_enabled) throw new ApiError(400, '2FA já está ativado', '2FA_ALREADY_ENABLED');

    const secret = decrypt(user.totp_secret);
    if (!authenticator.verify({ token: codigo, secret })) {
      throw new ApiError(401, 'Código incorreto. Tente novamente.', 'INVALID_2FA_CODE');
    }

    // Gera 10 códigos de backup de uso único (mostrados UMA vez; só os hashes ficam no banco)
    const backupCodes = Array.from({ length: 10 }, () => crypto.randomBytes(4).toString('hex'));
    const hashes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 8)));

    await usuarioRepository.update2FA(userId, { totp_enabled: true, totp_backup_codes: JSON.stringify(hashes) });
    return { enabled: true, backupCodes };
  },

  // Desativar exige senha da conta E código atual do app
  async disable2FA(userId: number, senha: string, codigo: string) {
    const user = await usuarioRepository.findById(userId);
    if (!user || !user.totp_enabled || !user.totp_secret) {
      throw new ApiError(400, '2FA não está ativado', '2FA_NOT_ENABLED');
    }

    const okSenha = await bcrypt.compare(senha, user.senha);
    if (!okSenha) throw new ApiError(401, 'Senha incorreta', 'INVALID_CREDENTIALS');

    const secret = decrypt(user.totp_secret);
    if (!authenticator.verify({ token: codigo, secret })) {
      throw new ApiError(401, 'Código incorreto', 'INVALID_2FA_CODE');
    }

    await usuarioRepository.update2FA(userId, { totp_secret: null, totp_enabled: false });
    return { enabled: false };
  },

  async get2FAStatus(userId: number) {
    const user = await usuarioRepository.findById(userId);
    if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
    return { enabled: !!user.totp_enabled };
  },

  // === PERFIL (persistido no servidor) ===
  async getPerfil(userId: number) {
    const user = await usuarioRepository.findById(userId);
    if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
    return {
      nome: user.nome, sobrenome: user.sobrenome, email: user.email,
      telefone: user.telefone || null, bio: user.bio || null, avatarUrl: user.avatarUrl || null,
      isAdmin: !!user.is_admin,
      emailVerificado: !!user.email_verificado
    };
  },

  async updatePerfil(userId: number, data: { nome?: string; sobrenome?: string; telefone?: string | null; bio?: string | null; avatarUrl?: string | null }) {
    const user = await usuarioRepository.findById(userId);
    if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
    await usuarioRepository.updateProfile(userId, data);
    return this.getPerfil(userId);
  },

  async forgotPassword(email: string) {
    const user = await usuarioRepository.findByEmail(email);

    // Resposta idêntica exista o e-mail ou não: impede enumeração de usuários.
    // Se o usuário não existe, simplesmente não envia nada.
    if (!user) return { message: 'Se o e-mail existir, o link será enviado.' };

    if (!emailConfigurado()) {
      console.error('ERRO: Variáveis de e-mail não configuradas no .env');
      throw new ApiError(500, 'Servidor de e-mail não configurado', 'EMAIL_CONFIG_ERROR');
    }

    // O segredo inclui o hash da senha atual: quando a senha muda, o token
    // deixa de ser válido — ou seja, o link só funciona uma vez.
    const token = jwt.sign({ sub: String(user.id), type: 'reset' }, env.JWT_SECRET + user.senha, { expiresIn: '1h' });

    const tokenCodificado = encodeURIComponent(token);
    const link = `${env.APP_URL}/reset-password?token=${tokenCodificado}`;

    try {
      await enviarEmail({
        to: email,
        subject: 'Redefinição de senha — BnotasWeb',
        html: layoutEmail(`Olá, ${escaparHtml(user.nome) || "Usuário"}!`, `
          <p>Recebemos um pedido para criar uma nova senha da sua conta.</p>
          <p style="text-align:center; margin: 24px 0;">
            <a href="${link}" style="background:#6200ea; color:#fff; padding:12px 28px; text-decoration:none; border-radius:8px; font-weight:bold;">REDEFINIR SENHA</a>
          </p>
          <p style="font-size:0.85em; color:#777;">O link vale por 1 hora e só pode ser usado uma vez.</p>
          <p style="font-size:0.85em; color:#777;">Se não foi você que pediu, ignore esta mensagem — sua senha continua a mesma.</p>
        `)
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw new ApiError(500, 'Falha ao enviar e-mail', 'EMAIL_SEND_ERROR');
    }

    return { message: 'Se o e-mail existir, o link será enviado.' };
  },

  async resetPassword(token: string, newPass: string) {
    try {
      // 1. Decodifica (sem verificar) só para descobrir o usuário
      const decoded = jwt.decode(token) as any;
      if (!decoded || decoded.type !== 'reset' || !decoded.sub) {
        throw new ApiError(400, 'Link inválido ou corrompido.', 'TOKEN_MALFORMED');
      }

      // 2. Busca o usuário
      const user = await usuarioRepository.findById(Number(decoded.sub));
      if (!user) {
        throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
      }

      // 3. Verifica a assinatura com o segredo derivado do hash atual.
      // Se a senha já foi trocada (link usado), a verificação falha.
      jwt.verify(token, env.JWT_SECRET + user.senha, { algorithms: ['HS256'] });

      // 4. Atualiza senha
      const hash = await bcrypt.hash(newPass, 10);
      await usuarioRepository.updatePassword(user.id, hash);

    } catch (e: any) {
      // CORREÇÃO 2: Log detalhado para identificar o erro real no console do servidor
      console.error('ERRO DETALHADO NO RESET PASSWORD:', e);

      // Se o erro já for um ApiError (ex: 404 User Not Found), repassa ele
      if (e instanceof ApiError) {
        throw e;
      }

      // Se for erro de token expirado
      if (e.name === 'TokenExpiredError') {
        throw new ApiError(400, 'O link expirou. Solicite um novo.', 'TOKEN_EXPIRED');
      }
      
      // Se for erro de token malformado ou assinatura inválida
      if (e.name === 'JsonWebTokenError') {
        throw new ApiError(400, 'Link inválido ou corrompido.', 'TOKEN_MALFORMED');
      }

      // Erro genérico para outros casos
      throw new ApiError(400, 'Não foi possível redefinir a senha.', 'RESET_ERROR');
    }
  },

  async changePassword(userId: number, senhaAtual: string, novaSenha: string) {
    const user = await usuarioRepository.findById(userId);
    if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');

    const ok = await bcrypt.compare(senhaAtual, user.senha);
    if (!ok) throw new ApiError(401, 'Senha atual incorreta', 'INVALID_CURRENT_PASSWORD');

    const hash = await bcrypt.hash(novaSenha, 10);
    await usuarioRepository.updatePassword(user.id, hash);
    return { message: 'Senha alterada com sucesso.' };
  },

  // Exclusão de conta (LGPD - direito de eliminação). Exige a senha para confirmar.
  async deleteAccount(userId: number, senha: string) {
    const user = await usuarioRepository.findById(userId);
    if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) throw new ApiError(401, 'Senha incorreta', 'INVALID_CREDENTIALS');

    await usuarioRepository.deleteById(userId);
    return { message: 'Conta e todos os dados excluídos.' };
  }
};