import { z } from 'zod';

// Cor deve ser um hex válido (#fff, #fff9c4, etc.) — evita injeção de CSS arbitrário
const corHex = z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'Cor inválida');

// Aceita tanto ISO completo quanto o formato do input datetime-local (2026-07-06T15:30)
const dataValida = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Data inválida');

export const createAnotacaoSchema = z.object({
  body: z.object({
    titulo: z.string().max(255).optional().default(''),
    conteudo: z.string().max(200_000).optional().default(''),
    favorita: z.boolean().optional(),
    cor: corHex.optional(),
    dataLembrete: dataValida.optional().nullable(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    senha: z.string().min(4).max(100).optional()
  })
});

export const updateAnotacaoSchema = z.object({
  body: z.object({
    titulo: z.string().max(255).optional(),
    conteudo: z.string().max(200_000).optional(),
    favorita: z.boolean().optional(),
    cor: corHex.optional(),
    dataLembrete: dataValida.optional().nullable(),
    tags: z.array(z.string().max(50)).max(20).optional(),
    senha: z.string().min(4).max(100).nullable().optional(),
    usarSenhaConta: z.boolean().optional(),   // proteger com a senha da CONTA (não guarda cópia)
    senhaAtualNota: z.string().max(100).optional() // exigida para alterar/remover proteção existente
  }),
  params: z.object({ id: z.string().regex(/^\d+$/) })
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) })
});

export const verifyPasswordSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  body: z.object({ senha: z.string().min(1, 'Senha é obrigatória') })
});

export type CreateAnotacaoInput = z.infer<typeof createAnotacaoSchema>['body'];
export type UpdateAnotacaoInput = z.infer<typeof updateAnotacaoSchema>['body'];
