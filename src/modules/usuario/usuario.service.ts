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
    const link = `http://localhost:4200/reset-password?token=${token}`;

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
               <p>Clique no link abaixo para criar uma nova senha:</p>
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
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      if (payload.type !== 'reset') throw new Error('Token inválido');
      
      const user = await usuarioRepository.findById(Number(payload.sub));
      if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');

      const hash = await bcrypt.hash(newPass, 10);
      await usuarioRepository.updatePassword(user.id, hash);
    } catch (e) {
      throw new ApiError(400, 'Token inválido ou expirado', 'INVALID_TOKEN');
    }
  }
};