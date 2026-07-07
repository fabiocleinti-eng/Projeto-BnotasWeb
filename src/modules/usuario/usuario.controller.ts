import { Request, Response, NextFunction } from 'express';
import { usuarioService } from './usuario.service';

export const usuarioController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // Pega o telefone também
      const { email, senha, nome, sobrenome, telefone } = req.body;
      const user = await usuarioService.register({ email, senha, nome, sobrenome, telefone });
      res.status(201).json(user);
    } catch (e) { next(e); }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, senha } = req.body;
      const result = await usuarioService.login(email, senha);
      res.json(result);
    } catch (e) { next(e); }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await usuarioService.forgotPassword(email);
      res.json({ message: 'Link enviado.' });
    } catch (e) { next(e); }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      await usuarioService.resetPassword(token, newPassword);
      res.json({ message: 'Senha alterada.' });
    } catch (e) { next(e); }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { senhaAtual, novaSenha } = req.body;
      const result = await usuarioService.changePassword(userId, senhaAtual, novaSenha);
      res.json(result);
    } catch (e) { next(e); }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { senha } = req.body;
      const result = await usuarioService.deleteAccount(userId, senha);
      res.json(result);
    } catch (e) { next(e); }
  }
};