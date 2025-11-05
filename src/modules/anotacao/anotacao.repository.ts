import { knex } from '../../db/knex';

export type Anotacao = {
  id: number;
  titulo: string;
  conteudo: string;
  dataCriacao: string | Date;
  dataModificacao: string | Date;
  favorita: number | boolean;
};

const table = 'anotacao';
const linkTable = 'usuario_anotacao';

export const anotacaoRepository = {
  async createForUser(userId: number, data: { titulo: string; conteudo: string; favorita?: boolean }) {
    return await knex.transaction(async (trx) => {
      const now = knex.fn.now();
      const [noteId] = await trx<Anotacao>(table).insert({
        titulo: data.titulo,
        conteudo: data.conteudo ?? '',
        dataCriacao: now,
        dataModificacao: now,
        favorita: data.favorita ? 1 : 0
      });
      await trx(linkTable).insert({ usuario_id: userId, anotacao_id: Number(noteId) });
      const note = await trx<Anotacao>(table).where({ id: Number(noteId) }).first();
      return note!;
    });
  },

  async listByUser(userId: number): Promise<Anotacao[]> {
    const rows = await knex<Anotacao>(table)
      .select('anotacao.*')
      .innerJoin(linkTable, `${linkTable}.anotacao_id`, `${table}.id`)
      .where(`${linkTable}.usuario_id`, userId)
      .orderBy('anotacao.dataCriacao', 'desc');
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

  async updateForUser(userId: number, id: number, data: Partial<Pick<Anotacao, 'titulo' | 'conteudo' | 'favorita'>>) {
    const belongs = await knex(linkTable)
      .where({ usuario_id: userId, anotacao_id: id })
      .first();
    if (!belongs) return 0;
    const now = knex.fn.now();
    const updateData: any = { dataModificacao: now };
    if (data.titulo !== undefined) updateData.titulo = data.titulo;
    if (data.conteudo !== undefined) updateData.conteudo = data.conteudo;
    if (data.favorita !== undefined) updateData.favorita = data.favorita ? 1 : 0;
    const updated = await knex<Anotacao>(table).where({ id }).update(updateData);
    return updated;
  },

  async deleteForUser(userId: number, id: number) {
    return await knex.transaction(async (trx) => {
      const belongs = await trx(linkTable).where({ usuario_id: userId, anotacao_id: id }).first();
      if (!belongs) return 0;
      await trx(linkTable).where({ usuario_id: userId, anotacao_id: id }).del();
      const deleted = await trx(table).where({ id }).del();
      return deleted;
    });
  }
};

