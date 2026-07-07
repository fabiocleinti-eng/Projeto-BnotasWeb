import { knex } from '../../db/knex';

export type Anotacao = {
  id: number;
  usuario_id?: number;
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
const linkTable = 'usuario_anotacao';

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
      const [noteId] = await trx<Anotacao>(table).insert({
        usuario_id: userId,
        titulo: data.titulo ?? '',
        conteudo: data.conteudo ?? '',
        dataCriacao: now,
        dataModificacao: now,
        favorita: data.favorita ? 1 : 0,
        cor: data.cor || '#fff9c4',
        data_lembrete: data.dataLembrete ? new Date(data.dataLembrete) : null,
        lembrete_enviado: 0,
        tags: data.tags && data.tags.length > 0 ? JSON.stringify(data.tags) : JSON.stringify([]),
        deletado: 0,
        senha: data.senha || null
      });
      
      await trx(linkTable).insert({ usuario_id: userId, anotacao_id: Number(noteId) });
      const note = await trx<Anotacao>(table).where({ id: Number(noteId) }).first();
      return note!;
    });
  },

  // Conta TODAS as notas do usuário (ativas + lixeira) — usado no limite do plano gratuito.
  // Incluir a lixeira impede burlar o limite acumulando notas "excluídas".
  async countByUser(userId: number): Promise<number> {
    const row = await knex(table)
      .innerJoin(linkTable, `${linkTable}.anotacao_id`, `${table}.id`)
      .where(`${linkTable}.usuario_id`, userId)
      .count({ n: `${table}.id` })
      .first();
    return Number(row?.n || 0);
  },

  async listByUser(userId: number, includeDeleted: boolean = false): Promise<Anotacao[]> {
    const query = knex<Anotacao>(table)
      .select('anotacao.*')
      .innerJoin(linkTable, `${linkTable}.anotacao_id`, `${table}.id`)
      .where(`${linkTable}.usuario_id`, userId);
    
    if (!includeDeleted) {
      query.where('anotacao.deletado', 0);
    }
    
    const rows = await query.orderBy('anotacao.dataCriacao', 'desc');
    return rows;
  },

  async listTrash(userId: number): Promise<Anotacao[]> {
    const rows = await knex<Anotacao>(table)
      .select('anotacao.*')
      .innerJoin(linkTable, `${linkTable}.anotacao_id`, `${table}.id`)
      .where(`${linkTable}.usuario_id`, userId)
      .where('anotacao.deletado', 1)
      .orderBy('anotacao.dataModificacao', 'desc');
    return rows;
  },

  async getByIdForUser(userId: number, id: number): Promise<Anotacao | undefined> {
    const row = await knex<Anotacao>(table)
      .select('anotacao.*')
      .innerJoin(linkTable, `${linkTable}.anotacao_id`, `${table}.id`)
      .where(`${linkTable}.usuario_id`, userId)
      .andWhere('anotacao.id', id)
      .first();
    return row;
  },

async updateForUser(userId: number, id: number, data: any) {
    const belongs = await knex(linkTable).where({ usuario_id: userId, anotacao_id: id }).first();
    if (!belongs) return 0;
    
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
      const belongs = await trx(linkTable).where({ usuario_id: userId, anotacao_id: id }).first();
      if (!belongs) return 0;
      
      if (permanent) {
        // Exclusão permanente
        await trx(linkTable).where({ usuario_id: userId, anotacao_id: id }).del();
        const deleted = await trx(table).where({ id }).del();
        return deleted;
      } else {
        // Soft delete - mover para lixeira
        const deleted = await trx(table)
          .where({ id })
          .update({
            deletado: 1,
            dataModificacao: knex.fn.now()
          });
        return deleted;
      }
    });
  },

  async restoreForUser(userId: number, id: number) {
    const belongs = await knex(linkTable).where({ usuario_id: userId, anotacao_id: id }).first();
    if (!belongs) return 0;
    
    const restored = await knex(table)
      .where({ id, deletado: 1 })
      .update({
        deletado: 0,
        dataModificacao: knex.fn.now()
      });
    
    return restored;
  }
};