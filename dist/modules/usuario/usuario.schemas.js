"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.deleteAccountSchema = exports.disable2FASchema = exports.enable2FASchema = exports.login2FASchema = exports.updatePerfilSchema = exports.forgotPasswordSchema = exports.verificarEmailSchema = exports.resetPasswordSchema = exports.loginSchema = exports.createUsuarioSchema = void 0;
const zod_1 = require("zod");
// REGRA DE SENHA FORTE
const senhaForte = zod_1.z.string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "A senha deve conter pelo menos um caractere especial");
exports.createUsuarioSchema = zod_1.z.object({
    body: zod_1.z.object({
        nome: zod_1.z.string().min(1, "Nome é obrigatório"),
        sobrenome: zod_1.z.string().min(1, "Sobrenome é obrigatório"),
        telefone: zod_1.z.string().optional(), // <--- NOVO CAMPO
        email: zod_1.z.string().email("Email inválido"),
        senha: senhaForte
    })
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        senha: zod_1.z.string().min(1)
    })
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, "Token é obrigatório"),
        newPassword: senhaForte
    })
});
exports.verificarEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().regex(/^[a-f0-9]{64}$/, 'Token inválido')
    })
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email("Email inválido")
    })
});
// Aceita código TOTP (6 dígitos) ou código de backup (8 caracteres hex)
const codigo2FA = zod_1.z.string().regex(/^[a-fA-F0-9]{6,8}$/, "Código inválido");
// A foto pode ser um endereço (http/https) OU a própria imagem embutida.
// Só formatos de imagem conhecidos são aceitos — nada de SVG, que executa script.
const FOTO_MAX = 150000; // ~110 KB de imagem: sobra para uma foto 256x256
const fotoPerfil = zod_1.z.string()
    .max(FOTO_MAX, 'Imagem muito grande')
    .refine((v) => /^https?:\/\//i.test(v) || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v), 'Formato de imagem inválido');
exports.updatePerfilSchema = zod_1.z.object({
    body: zod_1.z.object({
        nome: zod_1.z.string().min(1).max(255).optional(),
        sobrenome: zod_1.z.string().min(1).max(255).optional(),
        telefone: zod_1.z.string().max(20).nullable().optional(),
        bio: zod_1.z.string().max(500).nullable().optional(),
        avatarUrl: fotoPerfil.nullable().optional()
    })
});
exports.login2FASchema = zod_1.z.object({
    body: zod_1.z.object({
        tempToken: zod_1.z.string().min(1),
        codigo: codigo2FA
    })
});
exports.enable2FASchema = zod_1.z.object({
    body: zod_1.z.object({ codigo: codigo2FA })
});
exports.disable2FASchema = zod_1.z.object({
    body: zod_1.z.object({
        senha: zod_1.z.string().min(1, "Senha é obrigatória"),
        codigo: codigo2FA
    })
});
exports.deleteAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        senha: zod_1.z.string().min(1, "Senha é obrigatória para excluir a conta")
    })
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        senhaAtual: zod_1.z.string().min(1, "Senha atual é obrigatória"),
        novaSenha: senhaForte
    })
});
