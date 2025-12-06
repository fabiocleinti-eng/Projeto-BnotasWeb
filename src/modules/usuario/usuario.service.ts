import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { usuarioRepository } from './usuario.repository';
import { ApiError } from '../../middlewares/error';
import { env } from '../../config/env';

export const usuarioService = {
  // Agora recebe nome e sobrenome
  async register(data: { email: string, senha: string, nome: string, sobrenome: string }) {
    const exists = await usuarioRepository.findByEmail(data.email);
    if (exists) throw new ApiError(409, 'Email já cadastrado', 'EMAIL_IN_USE');
    
    const hash = await bcrypt.hash(data.senha, 10);
    
    const user = await usuarioRepository.create({
      email: data.email,
      senhaHash: hash,
      nome: data.nome,
      sobrenome: data.sobrenome
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

    // Retorna o nome no login para o frontend usar
    return { 
      token, 
      user: { id: user.id, email: user.email, nome: user.nome, sobrenome: user.sobrenome } 
    };
  },

  // ... (Mantenha o forgotPassword e resetPassword iguais ao que já fizemos) ...
  async forgotPassword(email: string) { /* ... código anterior ... */ return { message: 'ok'}; },
  async resetPassword(token: string, newPass: string) { /* ... código anterior ... */ }
};