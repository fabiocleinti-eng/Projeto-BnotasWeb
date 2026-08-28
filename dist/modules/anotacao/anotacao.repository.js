"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anotacaoRepository = void 0;
const knex_1 = require("../../db/knex");
const table = 'anotacao';
const linkTable = 'usuario_anotacao';
exports.anotacaoRepository = {
    async createForUser(userId, data) {
        return await knex_1.knex.transaction(async (trx) => {
            const now = knex_1.knex.fn.now();
            const [noteId] = await trx(table).insert({
                usuario_id: userId,
                titulo: data.titulo ?? '',
                conteudo: data.conteudo ?? '',
                dataCriacao: now,
                dataModificacao: now,
                favorita: data.favorita ? 1 : 0,
                cor: data.cor || '#fff9c4',
                data_lembrete: data.dataLembrete ? new Date(data.dataLembrete) : null,
                lembrete_enviado: 0,
                tags: data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : JSON.stringify([]),
                deletado: 0,
                senha: data.senha || null
            });
            await trx(linkTable).insert({ usuario_id: userId, anotacao_id: Number(noteId) });
            const note = await trx(table).where({ id: Number(noteId) }).first();
            return note;
        });
    },
    // Conta TODAS as notas do usuário (ativas + lixeira) — usado no limite do plano gratuito.
    // Incluir a lixeira impede burlar o limite acumulando notas "excluídas".
    async countByUser(userId) {
        const row = await (0, knex_1.knex)(table)
            .innerJoin(linkTable, `${linkTable}.anotacao_id`, `${table}.id`)
            .where(`${linkTable}.usuario_id`, userId)
            .count({ n: `${table}.id` })
            .first();
        return Number(row?.n || 0);
    },
    async listByUser(userId, includeDeleted = false, q) {
        const query = (0, knex_1.knex)(table)
            .select('anotacao.*')
            .innerJoin(linkTable, `${linkTable}.anotacao_id`, `${table}.id`)
            .where(`${linkTable}.usuario_id`, userId);
        if (!includeDeleted) {
            query.where('anotacao.deletado', 0);
        }
        // Busca no SERVIDOR (título + conteúdo) — o front não precisa mais baixar tudo
        if (q && q.trim()) {
            const term = `%${q.trim()}%`;
            query.andWhere((b) => b.where('anotacao.titulo', 'like', term).orWhere('anotacao.conteudo', 'like', term));
        }
        const rows = await query.orderBy('anotacao.dataCriacao', 'desc');
        return rows;
    },
    async setShareToken(userId, id, token) {
        const belongs = await (0, knex_1.knex)(linkTable).where({ usuario_id: userId, anotacao_id: id }).first();
        if (!belongs)
            return 0;
        return (0, knex_1.knex)(table).where({ id }).update({ share_token: token });
    },
    async findByShareToken(token) {
        return (0, knex_1.knex)(table).where({ share_token: token }).first();
    },
    async listTrash(userId) {
        const rows = await (0, knex_1.knex)(table)
            .select('anotacao.*')
            .innerJoin(linkTable, `${linkTable}.anotacao_id`, `${table}.id`)
            .where(`${linkTable}.usuario_id`, userId)
            .where('anotacao.deletado', 1)
            .orderBy('anotacao.dataModificacao', 'desc');
        return rows;
    },
    async getByIdForUser(userId, id) {
        const row = await (0, knex_1.knex)(table)
            .select('anotacao.*')
            .innerJoin(linkTable, `${linkTable}.anotacao_id`, `${table}.id`)
            .where(`${linkTable}.usuario_id`, userId)
            .andWhere('anotacao.id', id)
            .first();
        return row;
    },
    async updateForUser(userId, id, data) {
        const belongs = await (0, knex_1.knex)(linkTable).where({ usuario_id: userId, anotacao_id: id }).first();
        if (!belongs)
            return 0;
        const now = knex_1.knex.fn.now();
        const updateData = { dataModificacao: now };
        if (data.titulo !== undefined)
            updateData.titulo = data.titulo;
        if (data.conteudo !== undefined)
            updateData.conteudo = data.conteudo;
        if (data.favorita !== undefined)
            updateData.favorita = data.favorita ? 1 : 0;
        if (data.cor !== undefined)
            updateData.cor = data.cor;
        // ATUALIZA A DATA DO LEMBRETE
        if (data.dataLembrete !== undefined) {
            const novaData = data.dataLembrete ? new Date(data.dataLembrete) : null;
            updateData.data_lembrete = novaData;
            // Se definiu uma NOVA data (não é remoção), incrementa o contador
            if (novaData !== null) {
                updateData.lembrete_enviado = 0;
                updateData.etapa_lembrete = 0;
                // INCREMENTA O CONTADOR NO BANCO (Soma +1 ao valor atual)
                updateData.qtd_reagendamentos = knex_1.knex.raw('qtd_reagendamentos + 1');
            }
            else {
                // Se removeu o lembrete (marcou como feito), zera ou mantém. Vamos manter o histórico? 
                // Melhor zerar para não aparecer o ícone em notas concluídas.
                updateData.qtd_reagendamentos = 0;
            }
        }
        // Novos campos
        if (data.tags !== undefined) {
            updateData.tags = JSON.stringify(data.tags);
        }
        if (data.senha !== undefined) {
            updateData.senha = data.senha || null;
        }
        const updated = await (0, knex_1.knex)(table).where({ id }).update(updateData);
        return updated;
    },
    async deleteForUser(userId, id, permanent = false) {
        return await knex_1.knex.transaction(async (trx) => {
            const belongs = await trx(linkTable).where({ usuario_id: userId, anotacao_id: id }).first();
            if (!belongs)
                return 0;
            if (permanent) {
                // Exclusão permanente
                await trx(linkTable).where({ usuario_id: userId, anotacao_id: id }).del();
                const deleted = await trx(table).where({ id }).del();
                return deleted;
            }
            else {
                // Soft delete - mover para lixeira
                const deleted = await trx(table)
                    .where({ id })
                    .update({
                    deletado: 1,
                    dataModificacao: knex_1.knex.fn.now()
                });
                return deleted;
            }
        });
    },
    async restoreForUser(userId, id) {
        const belongs = await (0, knex_1.knex)(linkTable).where({ usuario_id: userId, anotacao_id: id }).first();
        if (!belongs)
            return 0;
        const restored = await (0, knex_1.knex)(table)
            .where({ id, deletado: 1 })
            .update({
            deletado: 0,
            dataModificacao: knex_1.knex.fn.now()
        });
        return restored;
    }
};
