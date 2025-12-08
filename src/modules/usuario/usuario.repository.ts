import { knex } from '../../db/knex';

// AQUI ESTAVA O ERRO: Precisamos adicionar 'telefone' na definição do tipo
export type Usuario = {
  id: number;
  email: string;
  senha: string;
  nome: string;
  sobrenome: string;
  telefone?: string | null; // <--- ADICIONADO
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
  }
};