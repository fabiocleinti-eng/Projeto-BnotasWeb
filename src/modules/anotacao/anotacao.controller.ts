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
      const body = req.body as Record<string, unknown>;
      const titulo = (body.titulo ?? body.title ?? '') as string;
      const conteudo = (body.conteudo ?? body.content ?? '') as string;
      const { favorita, cor, dataLembrete, tags, senha } = body;
      const note = await anotacaoService.create(userId, { 
        titulo, 
        conteudo, 
        favorita: favorita as boolean | undefined, 
        cor: cor as string | undefined, 
        dataLembrete: dataLembrete as string | undefined,
        tags: tags as string[] | undefined,
        senha: senha as string | undefined
      });
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
      const body = req.body as Record<string, unknown>;
      const titulo = body.titulo !== undefined ? body.titulo : body.title;
      const conteudo = body.conteudo !== undefined ? body.conteudo : body.content;
      const { favorita, cor, dataLembrete, tags, senha, usarSenhaConta, senhaAtualNota } = body;
      const note = await anotacaoService.update(userId, id, {
        titulo: titulo as string | undefined,
        conteudo: conteudo as string | undefined,
        favorita: favorita as boolean | undefined,
        cor: cor as string | undefined,
        dataLembrete: dataLembrete as string | undefined,
        tags: tags as string[] | undefined,
        senha: senha as string | null | undefined,
        usarSenhaConta: usarSenhaConta as boolean | undefined,
        senhaAtualNota: senhaAtualNota as string | undefined
      });
      res.json(note);
    } catch (e) { next(e); }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = Number(req.params.id);
      await anotacaoService.remove(userId, id, false); // Soft delete
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async deletePermanently(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = Number(req.params.id);
      await anotacaoService.remove(userId, id, true); // Permanent delete
      res.status(204).send();
    } catch (e) { next(e); }
  },

  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = Number(req.params.id);
      const note = await anotacaoService.restore(userId, id);
      res.json(note);
    } catch (e) { next(e); }
  },

  async getTrash(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const notes = await anotacaoService.getTrash(userId);
      res.json(notes);
    } catch (e) { next(e); }
  },

  async verifyPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = Number(req.params.id);
      const { senha } = req.body;
      const result = await anotacaoService.verifyPassword(userId, id, senha);
      res.json(result);
    } catch (e) { next(e); }
  }
};