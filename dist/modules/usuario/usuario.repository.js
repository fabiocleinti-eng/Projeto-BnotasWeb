"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usuarioRepository = void 0;
const knex_1 = require("../../db/knex");
const table = 'usuario';
exports.usuarioRepository = {
    async findByEmail(email) {
        const row = await (0, knex_1.knex)(table).where({ email }).first();
        return row;
    },
    async findById(id) {
        const row = await (0, knex_1.knex)(table).where({ id }).first();
        return row;
    },
    // Atualizado para aceitar telefone
    async create(data) {
        const [id] = await (0, knex_1.knex)(table).insert({
            email: data.email,
            senha: data.senhaHash,
            nome: data.nome,
            sobrenome: data.sobrenome,
            telefone: data.telefone || null // Salva null se não tiver telefone
        });
        return {
            id: Number(id),
            email: data.email,
            senha: data.senhaHash,
            nome: data.nome,
            sobrenome: data.sobrenome,
            telefone: data.telefone || null
        };
    },
    async updatePassword(id, senhaHash) {
        await (0, knex_1.knex)(table).where({ id }).update({ senha: senhaHash });
    },
    async update2FA(id, data) {
        const upd = {};
        if (data.totp_secret !== undefined)
            upd.totp_secret = data.totp_secret;
        if (data.totp_enabled !== undefined)
            upd.totp_enabled = data.totp_enabled ? 1 : 0;
        if (data.totp_backup_codes !== undefined)
            upd.totp_backup_codes = data.totp_backup_codes;
        await (0, knex_1.knex)(table).where({ id }).update(upd);
    },
    // === VERIFICAÇÃO DE E-MAIL ===
    async findByTokenVerificacao(token) {
        return (0, knex_1.knex)(table)
            .where({ token_verificacao: token })
            .andWhere('token_verificacao_expira', '>', new Date())
            .first();
    },
    async definirTokenVerificacao(id, token, expiraEm) {
        await (0, knex_1.knex)(table).where({ id }).update({
            token_verificacao: token,
            token_verificacao_expira: expiraEm
        });
    },
    async marcarEmailVerificado(id) {
        await (0, knex_1.knex)(table).where({ id }).update({
            email_verificado: 1,
            token_verificacao: null,
            token_verificacao_expira: null
        });
    },
    async updateProfile(id, data) {
        const upd = {};
        if (data.nome !== undefined)
            upd.nome = data.nome;
        if (data.sobrenome !== undefined)
            upd.sobrenome = data.sobrenome;
        if (data.telefone !== undefined)
            upd.telefone = data.telefone;
        if (data.bio !== undefined)
            upd.bio = data.bio;
        if (data.avatarUrl !== undefined)
            upd.avatarUrl = data.avatarUrl;
        if (Object.keys(upd).length)
            await (0, knex_1.knex)(table).where({ id }).update(upd);
    },
    // Exclusão de conta (LGPD): apaga notas e o usuário.
    // As FKs com ON DELETE CASCADE limpam usuario_anotacao e subscription.
    async deleteById(id) {
        await knex_1.knex.transaction(async (trx) => {
            await trx('anotacao').where({ usuario_id: id }).del();
            await trx(table).where({ id }).del();
        });
    }
};
