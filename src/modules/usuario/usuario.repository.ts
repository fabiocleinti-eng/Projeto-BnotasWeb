import { knex } from '../../db/knex';

// AQUI ESTAVA O ERRO: Precisamos adicionar 'telefone' na definição do tipo
export type Usuario = {
  id: number;
  email: string;
  senha: string;
  nome: string;
  sobrenome: string;
  telefone?: string | null; // <--- ADICIONADO
  totp_secret?: string | null;   // segredo TOTP criptografado (2FA)
  totp_enabled?: number | boolean; // 2FA ativado
};

const table = 'usuario';

export const usuarioRepository = {
  async findByEmail(email: string): Promise<Usuario | undefined> {
    const row = await knex<Usuario>(table).where({ email }).first();
    return row;
  },

  async findById(id: number): Promise<Usuario | undefined> {
    const row = await knex<Usuario>(table).where({ id }).first();
    return row;
  },

  // Atualizado para aceitar telefone
  async create(data: { email: string, senhaHash: string, nome: string, sobrenome: string, telefone?: string }): Promise<Usuario> {
    const [id] = await knex<Usuario>(table).insert({ 
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

  async updatePassword(id: number, senhaHash: string): Promise<void> {
    await knex(table).where({ id }).update({ senha: senhaHash });
  },

  async update2FA(id: number, data: { totp_secret?: string | null; totp_enabled?: boolean }): Promise<void> {
    const upd: any = {};
    if (data.totp_secret !== undefined) upd.totp_secret = data.totp_secret;
    if (data.totp_enabled !== undefined) upd.totp_enabled = data.totp_enabled ? 1 : 0;
    await knex(table).where({ id }).update(upd);
  },

  // Exclusão de conta (LGPD): apaga notas e o usuário.
  // As FKs com ON DELETE CASCADE limpam usuario_anotacao e subscription.
  async deleteById(id: number): Promise<void> {
    await knex.transaction(async (trx) => {
      await trx('anotacao').where({ usuario_id: id }).del();
      await trx(table).where({ id }).del();
    });
  }
};