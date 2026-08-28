"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anotacaoController = void 0;
const anotacao_service_1 = require("./anotacao.service");
exports.anotacaoController = {
    async list(req, res, next) {
        try {
            const userId = req.user.id;
            const q = typeof req.query.q === 'string' ? req.query.q : undefined;
            const notes = await anotacao_service_1.anotacaoService.list(userId, q);
            res.json(notes);
        }
        catch (e) {
            next(e);
        }
    },
    async exportNotes(req, res, next) {
        try {
            const md = await anotacao_service_1.anotacaoService.exportMarkdown(req.user.id);
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="minhas-notas-bnotasweb.md"');
            res.send(md);
        }
        catch (e) {
            next(e);
        }
    },
    async share(req, res, next) {
        try {
            res.json(await anotacao_service_1.anotacaoService.share(req.user.id, Number(req.params.id)));
        }
        catch (e) {
            next(e);
        }
    },
    async unshare(req, res, next) {
        try {
            res.json(await anotacao_service_1.anotacaoService.unshare(req.user.id, Number(req.params.id)));
        }
        catch (e) {
            next(e);
        }
    },
    async getPublic(req, res, next) {
        try {
            res.json(await anotacao_service_1.anotacaoService.getPublic(String(req.params.token)));
        }
        catch (e) {
            next(e);
        }
    },
    async create(req, res, next) {
        try {
            const userId = req.user.id;
            const body = req.body;
            const titulo = (body.titulo ?? body.title ?? '');
            const conteudo = (body.conteudo ?? body.content ?? '');
            const { favorita, cor, dataLembrete, tags, senha } = body;
            const note = await anotacao_service_1.anotacaoService.create(userId, {
                titulo,
                conteudo,
                favorita: favorita,
                cor: cor,
                dataLembrete: dataLembrete,
                tags: tags,
                senha: senha
            });
            res.status(201).json(note);
        }
        catch (e) {
            next(e);
        }
    },
    async get(req, res, next) {
        try {
            const userId = req.user.id;
            const id = Number(req.params.id);
            const note = await anotacao_service_1.anotacaoService.get(userId, id);
            res.json(note);
        }
        catch (e) {
            next(e);
        }
    },
    async update(req, res, next) {
        try {
            const userId = req.user.id;
            const id = Number(req.params.id);
            const body = req.body;
            const titulo = body.titulo !== undefined ? body.titulo : body.title;
            const conteudo = body.conteudo !== undefined ? body.conteudo : body.content;
            const { favorita, cor, dataLembrete, tags, senha, usarSenhaConta, senhaAtualNota } = body;
            const note = await anotacao_service_1.anotacaoService.update(userId, id, {
                titulo: titulo,
                conteudo: conteudo,
                favorita: favorita,
                cor: cor,
                dataLembrete: dataLembrete,
                tags: tags,
                senha: senha,
                usarSenhaConta: usarSenhaConta,
                senhaAtualNota: senhaAtualNota
            });
            res.json(note);
        }
        catch (e) {
            next(e);
        }
    },
    async remove(req, res, next) {
        try {
            const userId = req.user.id;
            const id = Number(req.params.id);
            await anotacao_service_1.anotacaoService.remove(userId, id, false); // Soft delete
            res.status(204).send();
        }
        catch (e) {
            next(e);
        }
    },
    async deletePermanently(req, res, next) {
        try {
            const userId = req.user.id;
            const id = Number(req.params.id);
            await anotacao_service_1.anotacaoService.remove(userId, id, true); // Permanent delete
            res.status(204).send();
        }
        catch (e) {
            next(e);
        }
    },
    async restore(req, res, next) {
        try {
            const userId = req.user.id;
            const id = Number(req.params.id);
            const note = await anotacao_service_1.anotacaoService.restore(userId, id);
            res.json(note);
        }
        catch (e) {
            next(e);
        }
    },
    async getTrash(req, res, next) {
        try {
            const userId = req.user.id;
            const notes = await anotacao_service_1.anotacaoService.getTrash(userId);
            res.json(notes);
        }
        catch (e) {
            next(e);
        }
    },
    async verifyPassword(req, res, next) {
        try {
            const userId = req.user.id;
            const id = Number(req.params.id);
            const { senha } = req.body;
            const result = await anotacao_service_1.anotacaoService.verifyPassword(userId, id, senha);
            res.json(result);
        }
        catch (e) {
            next(e);
        }
    }
};
