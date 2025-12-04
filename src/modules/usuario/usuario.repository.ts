import { knex } from '../../db/knex';

export type Usuario = {
  id: number;
  email: string;
  senha: string;
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

  async create(email: string, senhaHash: string): Promise<Usuario> {
    const [id] = await knex<Usuario>(table).insert({ email, senha: senhaHash });
    return { id: Number(id), email, senha: senhaHash };
  },

  async updatePassword(id: number, senhaHash: string): Promise<void> {
    await knex(table).where({ id }).update({ senha: senhaHash });
  }
};