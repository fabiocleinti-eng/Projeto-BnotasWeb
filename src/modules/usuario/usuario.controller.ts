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
  }
};

