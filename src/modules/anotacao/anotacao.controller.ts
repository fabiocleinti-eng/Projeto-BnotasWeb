import { Request, Response, NextFunction } from 'express';
import { anotacaoService } from './anotacao.service';

export const anotacaoController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const notes = await anotacaoService.list(userId);
      res.json(notes);
    } catch (e) { next(e); }
  },
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { titulo, conteudo, favorita } = req.body;
      const note = await anotacaoService.create(userId, { titulo, conteudo, favorita });
      res.status(201).json(note);
    } catch (e) { next(e); }
  },
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = Number(req.params.id);
      const note = await anotacaoService.get(userId, id);
      res.json(note);
    } catch (e) { next(e); }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = Number(req.params.id);
      const { titulo, conteudo, favorita } = req.body;
      const note = await anotacaoService.update(userId, id, { titulo, conteudo, favorita });
      res.json(note);
    } catch (e) { next(e); }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = Number(req.params.id);
      await anotacaoService.remove(userId, id);
      res.status(204).send();
    } catch (e) { next(e); }
  }
};

