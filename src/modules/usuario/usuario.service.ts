import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { usuarioRepository } from './usuario.repository';
import { ApiError } from '../../middlewares/error';
import { env } from '../../config/env';

export const usuarioService = {
  async register(email: string, senha: string) {
    const exists = await usuarioRepository.findByEmail(email);
    if (exists) throw new ApiError(409, 'Email já cadastrado', 'EMAIL_IN_USE');
    const hash = await bcrypt.hash(senha, 10);
    const user = await usuarioRepository.create(email, hash);
    return { id: user.id, email: user.email };
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

    return { token, user: { id: user.id, email: user.email } };
  },

  async forgotPassword(email: string) {
    const user = await usuarioRepository.findByEmail(email);
    if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');

    const token = jwt.sign(
      { sub: String(user.id), type: 'reset' }, 
      env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    const link = `http://localhost:4200/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'fabioclein.ti@gmail.com', 
        pass: 'SUA_SENHA_DE_APP_AQUI' // <--- COLOQUE SUA SENHA DE APP NOVAMENTE AQUI
      }
    });

    console.log('Link de recuperação:', link);

    try {
      await transporter.sendMail({
        from: 'BnotasWeb <noreply@bnotasweb.com>',
        to: email,
        subject: 'Redefinição de Senha',
        html: `<p>Olá! Você solicitou a redefinição de senha.</p>
               <p>Clique no link abaixo para criar uma nova senha:</p>
               <a href="${link}">REDEFINIR MINHA SENHA</a>
               <p>Este link expira em 1 hora.</p>`
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
    }

    return { message: 'Se o e-mail existir, um link foi enviado.' };
  },

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as any;
      
      if (payload.type !== 'reset') throw new Error('Token inválido');

      const user = await usuarioRepository.findById(Number(payload.sub));
      if (!user) throw new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND');

      const hash = await bcrypt.hash(newPassword, 10);
      
      await usuarioRepository.updatePassword(user.id, hash);

    } catch (e) {
      throw new ApiError(400, 'Token inválido ou expirado', 'INVALID_TOKEN');
    }
  }
};