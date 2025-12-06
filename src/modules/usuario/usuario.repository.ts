import { knex } from '../../db/knex';

export type Usuario = {
  id: number;
  email: string;
  senha: string;
  nome: string;      // <--- NOVO
  sobrenome: string; // <--- NOVO
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

  // Recebe nome e sobrenome agora
  async create(data: { email: string, senhaHash: string, nome: string, sobrenome: string }): Promise<Usuario> {
    const [id] = await knex<Usuario>(table).insert({ 
      email: data.email, 
      senha: data.senhaHash,
      nome: data.nome,          // <--- SALVA
      sobrenome: data.sobrenome // <--- SALVA
    });
    
    return { id: Number(id), email: data.email, senha: data.senhaHash, nome: data.nome, sobrenome: data.sobrenome };
  }
};