import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
    const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
    return { token, user: { id: user.id, email: user.email } };
  }
};

