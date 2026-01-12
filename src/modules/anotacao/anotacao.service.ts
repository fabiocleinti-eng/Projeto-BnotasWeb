import { ApiError } from '../../middlewares/error';
import { anotacaoRepository } from './anotacao.repository';
import { encrypt, decrypt } from '../../utils/encryption';

// Converte do formato do Banco (snake_case) para o Frontend (camelCase)
const mapNote = (n: any) => {
  let tags: string[] = [];
  try {
    if (n.tags) {
      tags = typeof n.tags === 'string' ? JSON.parse(n.tags) : (Array.isArray(n.tags) ? n.tags : []);
    }
  } catch (e) {
    tags = [];
  }
  
  return {
    ...n,
    favorita: !!n.favorita,
    dataLembrete: n.data_lembrete,
    qtdReagendamentos: n.qtd_reagendamentos || 0,
    tags: tags,
    deletado: !!n.deletado,
    senha: n.senha ? '***' : undefined // Não retornar senha real, apenas indicar se existe
  };
};

export const anotacaoService = {
  async list(userId: number) {
    const notes = await anotacaoRepository.listByUser(userId);
    return notes.map(mapNote);
  },

  async create(userId: number, data: { 
    titulo: string; 
    conteudo?: string; 
    favorita?: boolean; 
    cor?: string; 
    dataLembrete?: string;
    tags?: string[];
    senha?: string;
  }) {
    // Se tiver senha, criptografar
    const encryptedPassword = data.senha ? encrypt(data.senha) : null;
    
    const note = await anotacaoRepository.createForUser(userId, {
      ...data,
      senha: encryptedPassword
    });
    return mapNote(note);
  },

  async get(userId: number, id: number) {
    const note = await anotacaoRepository.getByIdForUser(userId, id);
    if (!note) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
    return mapNote(note);
  },

  async update(userId: number, id: number, data: { 
    titulo?: string; 
    conteudo?: string; 
    favorita?: boolean; 
    cor?: string; 
    dataLembrete?: string;
    tags?: string[];
    senha?: string | null;
  }) {
    // Se tiver senha nova, criptografar
    const updateData: any = { ...data };
    if (data.senha !== undefined) {
      updateData.senha = data.senha ? encrypt(data.senha) : null;
    }
    
    const updated = await anotacaoRepository.updateForUser(userId, id, updateData);
    if (!updated) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
    return this.get(userId, id);
  },

  async remove(userId: number, id: number, permanent: boolean = false) {
    const deleted = await anotacaoRepository.deleteForUser(userId, id, permanent);
    if (!deleted) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
  },

  async getTrash(userId: number) {
    const notes = await anotacaoRepository.listTrash(userId);
    return notes.map(mapNote);
  },

  async restore(userId: number, id: number) {
    const restored = await anotacaoRepository.restoreForUser(userId, id);
    if (!restored) throw new ApiError(404, 'Anotação não encontrada na lixeira', 'NOT_FOUND');
    return this.get(userId, id);
  },

  async verifyPassword(userId: number, id: number, senha: string) {
    const note = await anotacaoRepository.getByIdForUser(userId, id);
    if (!note) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
    
    if (!note.senha) {
      throw new ApiError(400, 'Nota não está protegida', 'NOTE_NOT_PROTECTED');
    }

    try {
      const decryptedPassword = decrypt(note.senha);
      return { valid: senha === decryptedPassword };
    } catch (error) {
      throw new ApiError(500, 'Erro ao verificar senha', 'PASSWORD_VERIFY_ERROR');
    }
  }
};