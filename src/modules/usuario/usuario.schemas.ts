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

export const verificarEmailSchema = z.object({
  body: z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/, 'Token inválido')
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Email inválido")
  })
});

// Aceita código TOTP (6 dígitos) ou código de backup (8 caracteres hex)
const codigo2FA = z.string().regex(/^[a-fA-F0-9]{6,8}$/, "Código inválido");

// A foto pode ser um endereço (http/https) OU a própria imagem embutida.
// Só formatos de imagem conhecidos são aceitos — nada de SVG, que executa script.
const FOTO_MAX = 150_000; // ~110 KB de imagem: sobra para uma foto 256x256
const fotoPerfil = z.string()
  .max(FOTO_MAX, 'Imagem muito grande')
  .refine(
    (v) => /^https?:\/\//i.test(v) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
    'Formato de imagem inválido'
  );

export const updatePerfilSchema = z.object({
  body: z.object({
    nome: z.string().min(1).max(255).optional(),
    sobrenome: z.string().min(1).max(255).optional(),
    telefone: z.string().max(20).nullable().optional(),
    bio: z.string().max(500).nullable().optional(),
    avatarUrl: fotoPerfil.nullable().optional()
  })
});

export const login2FASchema = z.object({
  body: z.object({
    tempToken: z.string().min(1),
    codigo: codigo2FA
  })
});

export const enable2FASchema = z.object({
  body: z.object({ codigo: codigo2FA })
});

export const disable2FASchema = z.object({
  body: z.object({
    senha: z.string().min(1, "Senha é obrigatória"),
    codigo: codigo2FA
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