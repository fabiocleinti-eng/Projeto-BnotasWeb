import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { usuarioRepository } from './usuario.repository';
import { subscriptionRepository } from '../subscription/subscription.repository';
import { ApiError } from '../../middlewares/error';
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
    
    return { id: user.id, email: user.email, nome: user.nome };
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
    
    const token = jwt.sign(
      { sub: String(user.id), email: user.email }, 
      env.JWT_SECRET, 
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    // Retorna telefone no login também, caso precise
    return { 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        nome: user.nome, 
        sobrenome: user.sobrenome,
        telefone: user.telefone 
      } 
    };
  },

  async forgotPassword(email: string) {
    const user = await usuarioRepository.findByEmail(email);

    // Resposta idêntica exista o e-mail ou não: impede enumeração de usuários.
    // Se o usuário não existe, simplesmente não envia nada.
    if (!user) return { message: 'Se o e-mail existir, o link será enviado.' };

    if (!env.EMAIL_USER || !env.EMAIL_PASS) {
      console.error('ERRO: Variáveis de e-mail não configuradas no .env');
      throw new ApiError(500, 'Servidor de e-mail não configurado', 'EMAIL_CONFIG_ERROR');
    }

    // O segredo inclui o hash da senha atual: quando a senha muda, o token
    // deixa de ser válido — ou seja, o link só funciona uma vez.
    const token = jwt.sign({ sub: String(user.id), type: 'reset' }, env.JWT_SECRET + user.senha, { expiresIn: '1h' });

    const tokenCodificado = encodeURIComponent(token);
    const link = `${env.APP_URL}/reset-password?token=${tokenCodificado}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS }
    });

    try {
      await transporter.sendMail({
        from: `BnotasWeb <${env.EMAIL_USER}>`,
        to: email,
        subject: 'Redefinição de Senha',
        html: `<p>Olá, ${user.nome || 'Usuário'}!</p>
               <p>Clique no link abaixo para criar uma nova senha (válido por 1 hora e apenas 1 uso):</p>
               <a href="${link}">REDEFINIR SENHA</a>`
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
      jwt.verify(token, env.JWT_SECRET + user.senha);

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