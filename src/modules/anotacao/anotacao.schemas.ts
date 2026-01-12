import { z } from 'zod';

export const createAnotacaoSchema = z.object({
  body: z.object({
    titulo: z.string().min(1),
    conteudo: z.string().optional(),
    favorita: z.boolean().optional(),
    cor: z.string().optional(),
    dataLembrete: z.string().datetime().optional().nullable(),
    tags: z.array(z.string()).optional(),
    senha: z.string().optional()
  })
});

export const updateAnotacaoSchema = z.object({
  body: z.object({
    titulo: z.string().min(1).optional(),
    conteudo: z.string().optional(),
    favorita: z.boolean().optional(),
    cor: z.string().optional(),
    dataLembrete: z.string().datetime().optional().nullable(),
    tags: z.array(z.string()).optional(),
    senha: z.string().nullable().optional()
  }),
  params: z.object({ id: z.string().regex(/^\d+$/) })
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().regex(/^\d+$/) })
});

export type CreateAnotacaoInput = z.infer<typeof createAnotacaoSchema>['body'];
export type UpdateAnotacaoInput = z.infer<typeof updateAnotacaoSchema>['body'];