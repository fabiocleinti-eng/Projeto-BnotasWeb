import { knex } from '../../db/knex';

export type Anotacao = {
  id: number;
  titulo: string;
  conteudo: string;
  dataCriacao: string | Date;
  dataModificacao: string | Date;
  favorita: number | boolean;
  cor: string;
  data_lembrete?: string | Date | null;
  lembrete_enviado?: number | boolean;
  // Novos campos
  tags?: string | string[]; // JSON no banco, array no código
  deletado?: number | boolean;
  senha?: string | null; // Senha criptografada
};

const table = 'anotacao';

export const anotacaoRepository = {
  async createForUser(userId: number, data: { 
    titulo: string; 
    conteudo?: string; 
    favorita?: boolean; 
    cor?: string; 
    dataLembrete?: string | null;
    tags?: string[];
    senha?: string | null;
  }) {
    return await knex.transaction(async (trx) => {
      const now = knex.fn.now();
      
      // Inserir na tabela anotacao com usuario_id (o banco requer este campo)
      const insertData: any = {
        titulo: data.titulo,
        conteudo: data.conteudo ?? '',
        dataCriacao: now,
        dataModificacao: now,
        favorita: data.favorita ? 1 : 0,
        cor: data.cor || '#fff9c4',
        data_lembrete: data.dataLembrete ? new Date(data.dataLembrete) : null,
        lembrete_enviado: 0,
        tags: data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : JSON.stringify([]),
        deletado: 0,
        senha: data.senha || null,
        usuario_id: userId  // Campo obrigatório no banco de dados
      };

      const [noteId] = await trx<Anotacao>(table).insert(insertData);
      const note = await trx<Anotacao>(table).where({ id: Number(noteId) }).first();
      return note!;
    });
  },

  async listByUser(userId: number, includeDeleted: boolean = false): Promise<Anotacao[]> {
    const query = knex<Anotacao>(table)
      .where('usuario_id', userId);
    
    if (!includeDeleted) {
      query.where('deletado', 0);
    }
    
    const rows = await query.orderBy('dataCriacao', 'desc');
    return rows;
  },

  async listTrash(userId: number): Promise<Anotacao[]> {
    const rows = await knex<Anotacao>(table)
      .where('usuario_id', userId)
      .where('deletado', 1)
      .orderBy('dataModificacao', 'desc');
    return rows;
  },

  async getByIdForUser(userId: number, id: number): Promise<Anotacao | undefined> {
    const row = await knex<Anotacao>(table)
      .where({ id, usuario_id: userId })
      .first();
    return row;
  },

async updateForUser(userId: number, id: number, data: any) {
    // Verificar se a nota pertence ao usuário
    const note = await knex<Anotacao>(table).where({ id, usuario_id: userId }).first();
    if (!note) return 0;
    
    const now = knex.fn.now();
    const updateData: any = { dataModificacao: now };
    
    if (data.titulo !== undefined) updateData.titulo = data.titulo;
    if (data.conteudo !== undefined) updateData.conteudo = data.conteudo;
    if (data.favorita !== undefined) updateData.favorita = data.favorita ? 1 : 0;
    if (data.cor !== undefined) updateData.cor = data.cor;
    
    // ATUALIZA A DATA DO LEMBRETE
    if (data.dataLembrete !== undefined) {
      const novaData = data.dataLembrete ? new Date(data.dataLembrete) : null;
      updateData.data_lembrete = novaData;
      
      // Se definiu uma NOVA data (não é remoção), incrementa o contador
      if (novaData !== null) {
        updateData.lembrete_enviado = 0; 
        updateData.etapa_lembrete = 0;
        // INCREMENTA O CONTADOR NO BANCO (Soma +1 ao valor atual)
        updateData.qtd_reagendamentos = knex.raw('qtd_reagendamentos + 1');
      } else {
        // Se removeu o lembrete (marcou como feito), zera ou mantém. Vamos manter o histórico? 
        // Melhor zerar para não aparecer o ícone em notas concluídas.
        updateData.qtd_reagendamentos = 0; 
      }
    }

    // Novos campos
    if (data.tags !== undefined) {
      updateData.tags = JSON.stringify(data.tags);
    }
    if (data.senha !== undefined) {
      updateData.senha = data.senha || null;
    }

    const updated = await knex<Anotacao>(table).where({ id }).update(updateData);
    return updated;
  },

  async deleteForUser(userId: number, id: number, permanent: boolean = false) {
    return await knex.transaction(async (trx) => {
      // Verificar se a nota pertence ao usuário
      const note = await trx<Anotacao>(table).where({ id, usuario_id: userId }).first();
      if (!note) return 0;
      
      if (permanent) {
        // Exclusão permanente
        const deleted = await trx(table).where({ id, usuario_id: userId }).del();
        return deleted;
      } else {
        // Soft delete - mover para lixeira
        const deleted = await trx(table)
          .where({ id, usuario_id: userId })
          .update({
            deletado: 1,
            dataModificacao: knex.fn.now()
          });
        return deleted;
      }
    });
  },

  async restoreForUser(userId: number, id: number) {
    // Verificar se a nota pertence ao usuário e está deletada
    const note = await knex<Anotacao>(table).where({ id, usuario_id: userId, deletado: 1 }).first();
    if (!note) return 0;
    
    const restored = await knex(table)
      .where({ id, usuario_id: userId, deletado: 1 })
      .update({
        deletado: 0,
        dataModificacao: knex.fn.now()
      });
    
    return restored;
  }
};