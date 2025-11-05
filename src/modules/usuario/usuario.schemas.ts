import { z } from 'zod';

export const createUsuarioSchema = z.object({
  body: z.object({
    email: z.string().email(),
    senha: z.string().min(1)
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    senha: z.string().min(1)
  })
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];

