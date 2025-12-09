import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { usuarioRepository } from './usuario.repository';
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
    
    return { id: user.id, email: user.email, nome: user.nome };
  },

  async login(email: string, senha: string) {
    const user = await usuarioRepository.findByEmail(email);
    if (!user) throw new ApiError(401, 'Credenciais inválidas', 'INVALID_CREDENTIALS');
    
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
    if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');

    if (!env.EMAIL_USER || !env.EMAIL_PASS) {
      console.error('ERRO: Variáveis de e-mail não configuradas no .env');
      throw new ApiError(500, 'Servidor de e-mail não configurado', 'EMAIL_CONFIG_ERROR');
    }

    const token = jwt.sign({ sub: String(user.id), type: 'reset' }, env.JWT_SECRET, { expiresIn: '1h' });
    
    // CORREÇÃO 1: Codificar o token para garantir que caracteres especiais não quebrem na URL
    const tokenCodificado = encodeURIComponent(token);
    const link = `http://localhost:4200/reset-password?token=${tokenCodificado}`;

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
               <p>Clique no link abaixo para criar uma nova senha (válido por 1 hora):</p>
               <a href="${link}">REDEFINIR SENHA</a>`
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      throw new ApiError(500, 'Falha ao enviar e-mail', 'EMAIL_SEND_ERROR');
    }

    return { message: 'E-mail enviado' };
  },

  async resetPassword(token: string, newPass: string) {
    try {
      // 1. Verifica o token
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      
      if (payload.type !== 'reset') {
        throw new ApiError(400, 'Tipo de token inválido', 'INVALID_TOKEN_TYPE');
      }
      
      // 2. Busca o usuário
      const user = await usuarioRepository.findById(Number(payload.sub));
      if (!user) {
        throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');
      }

      // 3. Atualiza senha
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
  }
};