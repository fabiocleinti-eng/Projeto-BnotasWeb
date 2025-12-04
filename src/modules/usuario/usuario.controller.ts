import { Request, Response, NextFunction } from 'express';
import { usuarioService } from './usuario.service';

export const usuarioController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, senha } = req.body;
      const user = await usuarioService.register(email, senha);
      res.status(201).json(user);
    } catch (e) {
      next(e);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, senha } = req.body;
      const result = await usuarioService.login(email, senha);
      res.json(result);
    } catch (e) {
      next(e);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await usuarioService.forgotPassword(email);
      res.json({ message: 'Link de recuperação enviado com sucesso.' });
    } catch (e) {
      next(e);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      await usuarioService.resetPassword(token, newPassword);
      res.json({ message: 'Senha alterada com sucesso.' });
    } catch (e) {
      next(e);
    }
  }
};