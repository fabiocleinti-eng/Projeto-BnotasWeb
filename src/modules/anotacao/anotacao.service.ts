import { ApiError } from '../../middlewares/error';
import { anotacaoRepository } from './anotacao.repository';

const mapNote = (n: any) => ({
  ...n,
  favorita: !!n.favorita
});

export const anotacaoService = {
  async list(userId: number) {
    const notes = await anotacaoRepository.listByUser(userId);
    return notes.map(mapNote);
  },

  async create(userId: number, data: { titulo: string; conteudo?: string; favorita?: boolean; cor?: string }) {
    const note = await anotacaoRepository.createForUser(userId, data);
    return mapNote(note);
  },

  async get(userId: number, id: number) {
    const note = await anotacaoRepository.getByIdForUser(userId, id);
    if (!note) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
    return mapNote(note);
  },

  async update(userId: number, id: number, data: { titulo?: string; conteudo?: string; favorita?: boolean; cor?: string }) {
    const updated = await anotacaoRepository.updateForUser(userId, id, data);
    if (!updated) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
    return this.get(userId, id);
  },

  async remove(userId: number, id: number) {
    const deleted = await anotacaoRepository.deleteForUser(userId, id);
    if (!deleted) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
  }
};