"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPasswordSchema = exports.idParamSchema = exports.updateAnotacaoSchema = exports.createAnotacaoSchema = void 0;
const zod_1 = require("zod");
// Cor deve ser um hex válido (#fff, #fff9c4, etc.) — evita injeção de CSS arbitrário
const corHex = zod_1.z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Cor inválida');
// O título vira o assunto do e-mail de lembrete: quebra de linha ali permitiria
// injetar cabeçalhos (um Bcc oculto, por exemplo). Também não faz sentido no título.
const tituloNota = zod_1.z.string().max(255).refine((v) => !/[\r\n\t\0]/.test(v), 'O título não pode conter quebras de linha');
// Aceita tanto ISO completo quanto o formato do input datetime-local (2026-07-06T15:30)
const dataValida = zod_1.z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Data inválida');
exports.createAnotacaoSchema = zod_1.z.object({
    body: zod_1.z.object({
        titulo: tituloNota.optional().default(''),
        conteudo: zod_1.z.string().max(200000).optional().default(''),
        favorita: zod_1.z.boolean().optional(),
        cor: corHex.optional(),
        dataLembrete: dataValida.optional().nullable(),
        tags: zod_1.z.array(zod_1.z.string().max(50)).max(20).optional(),
        senha: zod_1.z.string().min(4).max(100).optional()
    })
});
exports.updateAnotacaoSchema = zod_1.z.object({
    body: zod_1.z.object({
        titulo: tituloNota.optional(),
        conteudo: zod_1.z.string().max(200000).optional(),
        favorita: zod_1.z.boolean().optional(),
        cor: corHex.optional(),
        dataLembrete: dataValida.optional().nullable(),
        tags: zod_1.z.array(zod_1.z.string().max(50)).max(20).optional(),
        senha: zod_1.z.string().min(4).max(100).nullable().optional(),
        usarSenhaConta: zod_1.z.boolean().optional(), // proteger com a senha da CONTA (não guarda cópia)
        senhaAtualNota: zod_1.z.string().max(100).optional() // exigida para alterar/remover proteção existente
    }),
    params: zod_1.z.object({ id: zod_1.z.string().regex(/^\d+$/) })
});
exports.idParamSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().regex(/^\d+$/) })
});
exports.verifyPasswordSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().regex(/^\d+$/) }),
    body: zod_1.z.object({ senha: zod_1.z.string().min(1, 'Senha é obrigatória') })
});
