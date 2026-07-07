import { z } from 'zod';

// REGRA DE SENHA FORTE
const senhaForte = z.string()
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "A senha deve conter pelo menos um caractere especial");

export const createUsuarioSchema = z.object({
  body: z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    sobrenome: z.string().min(1, "Sobrenome é obrigatório"),
    telefone: z.string().optional(), // <--- NOVO CAMPO
    email: z.string().email("Email inválido"),
    senha: senhaForte
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    senha: z.string().min(1)
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token é obrigatório"),
    newPassword: senhaForte
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Email inválido")
  })
});

export const deleteAccountSchema = z.object({
  body: z.object({
    senha: z.string().min(1, "Senha é obrigatória para excluir a conta")
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    senhaAtual: z.string().min(1, "Senha atual é obrigatória"),
    novaSenha: senhaForte
  })
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];