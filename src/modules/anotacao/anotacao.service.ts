import bcrypt from 'bcrypt';
import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
import { ApiError } from '../../middlewares/error';
import { anotacaoRepository } from './anotacao.repository';
import { subscriptionService } from '../subscription/subscription.service';
import { usuarioRepository } from '../usuario/usuario.repository';
import { decrypt } from '../../utils/encryption';

// Limite de notas do plano gratuito (ativas + lixeira)
export const FREE_PLAN_NOTE_LIMIT = 10;

// Marcador de nota protegida pela senha da CONTA (não guardamos cópia da senha:
// a verificação usa sempre o hash atual do usuário — trocar a senha de login acompanha)
const ACCOUNT_PASSWORD_MARKER = 'USER_PASSWORD';

// Converte do formato do Banco (snake_case) para o Frontend (camelCase).
// SEGURANÇA: notas protegidas saem SEM conteúdo — ele só é entregue após
// a senha ser verificada (verify-password), nunca na listagem.
const mapNote = (n: any, incluirConteudoProtegido = false) => {
  let tags: string[] = [];
  try {
    if (n.tags) {
      tags = typeof n.tags === 'string' ? JSON.parse(n.tags) : (Array.isArray(n.tags) ? n.tags : []);
    }
  } catch (e) {
    tags = [];
  }

  const protegida = !!n.senha;
  return {
    ...n,
    conteudo: protegida && !incluirConteudoProtegido ? '' : n.conteudo,
    favorita: !!n.favorita,
    dataLembrete: n.data_lembrete,
    qtdReagendamentos: n.qtd_reagendamentos || 0,
    tags: tags,
    deletado: !!n.deletado,
    protegida,
    shareToken: n.share_token || undefined,
    share_token: undefined,
    senha: undefined // nunca expor o hash
  };
};

// Converte o HTML do editor em Markdown legível (usado na exportação)
function htmlParaMarkdown(html: string): string {
  if (!html) return '';
  return html
    .replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
    .replace(/<(em|i)>(.*?)<\/\1>/gi, '*$2*')
    .replace(/<u>(.*?)<\/u>/gi, '_$1_')
    .replace(/<li[^>]*data-checked="true"[^>]*>/gi, '\n- [x] ')
    .replace(/<li[^>]*data-checked="false"[^>]*>/gi, '\n- [ ] ')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/p>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')          // remove as tags restantes
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const anotacaoService = {
  async list(userId: number, q?: string) {
    const notes = await anotacaoRepository.listByUser(userId, false, q);
    return notes.map((n) => mapNote(n));
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
    // Limite do plano gratuito é aplicado AQUI no servidor — o front apenas exibe o contador.
    const hasUnlimited = await subscriptionService.hasFeature(userId, 'unlimited_notes');
    if (!hasUnlimited) {
      const count = await anotacaoRepository.countByUser(userId);
      if (count >= FREE_PLAN_NOTE_LIMIT) {
        throw new ApiError(
          403,
          `Você atingiu o limite de ${FREE_PLAN_NOTE_LIMIT} notas do plano gratuito (a lixeira também conta). Esvazie a lixeira ou faça upgrade para notas ilimitadas.`,
          'FREE_PLAN_LIMIT_REACHED'
        );
      }
    }

    // Proteger nota é recurso pago — vale tanto ao criar quanto ao editar
    if (data.senha && !(await subscriptionService.hasFeature(userId, 'protected_notes'))) {
      throw new ApiError(
        403,
        'Notas protegidas por senha são um recurso dos planos pagos. Faça upgrade para usar.',
        'FEATURE_REQUIRES_PREMIUM'
      );
    }

    // Se tiver senha, guardar apenas o hash (não é possível recuperar a senha original)
    const hashedPassword = data.senha ? await bcrypt.hash(data.senha, 10) : null;

    const note = await anotacaoRepository.createForUser(userId, {
      ...data,
      senha: hashedPassword
    });
    return mapNote(note);
  },

  async get(userId: number, id: number) {
    const note = await anotacaoRepository.getByIdForUser(userId, id);
    if (!note) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
    return mapNote(note);
  },

  // Verifica uma senha contra a proteção da nota (senha própria, senha da conta ou legado AES)
  async checkNotePassword(userId: number, notaSenha: string, senhaDigitada: string): Promise<boolean> {
    if (notaSenha === ACCOUNT_PASSWORD_MARKER) {
      const user = await usuarioRepository.findById(userId);
      return user ? bcrypt.compare(senhaDigitada, user.senha) : false;
    }
    if (notaSenha.startsWith('$2')) {
      return bcrypt.compare(senhaDigitada, notaSenha);
    }
    // Formato antigo (AES "iv:conteudo")
    try {
      return senhaDigitada === decrypt(notaSenha);
    } catch {
      return false;
    }
  },

  async update(userId: number, id: number, data: {
    titulo?: string;
    conteudo?: string;
    favorita?: boolean;
    cor?: string;
    dataLembrete?: string;
    tags?: string[];
    senha?: string | null;
    usarSenhaConta?: boolean;
    senhaAtualNota?: string;
  }) {
    const atual = await anotacaoRepository.getByIdForUser(userId, id);
    if (!atual) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');

    const updateData: any = { ...data };
    delete updateData.usarSenhaConta;
    delete updateData.senhaAtualNota;

    const querAlterarProtecao = data.senha !== undefined || data.usarSenhaConta === true;
    if (querAlterarProtecao) {
      // Proteger nota é recurso pago — validado AQUI no servidor, não só na tela.
      // Remover a proteção continua livre (quem cancela o plano não fica preso).
      const estaDefinindoSenha = data.usarSenhaConta === true || !!data.senha;
      if (estaDefinindoSenha && !(await subscriptionService.hasFeature(userId, 'protected_notes'))) {
        throw new ApiError(
          403,
          'Notas protegidas por senha são um recurso dos planos pagos. Faça upgrade para usar.',
          'FEATURE_REQUIRES_PREMIUM'
        );
      }

      // Alterar/remover proteção de nota JÁ protegida exige a senha atual da nota
      if (atual.senha) {
        const ok = await this.checkNotePassword(userId, atual.senha, data.senhaAtualNota || '');
        if (!ok) throw new ApiError(401, 'Senha atual da nota incorreta', 'INVALID_NOTE_PASSWORD');
      }
      if (data.usarSenhaConta === true) {
        updateData.senha = ACCOUNT_PASSWORD_MARKER; // protegida pela senha da conta
      } else {
        updateData.senha = data.senha ? await bcrypt.hash(data.senha, 10) : null;
      }
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
    return notes.map((n) => mapNote(n));
  },

  async restore(userId: number, id: number) {
    const restored = await anotacaoRepository.restoreForUser(userId, id);
    if (!restored) throw new ApiError(404, 'Anotação não encontrada na lixeira', 'NOT_FOUND');
    return this.get(userId, id);
  },

  // === EXPORTAÇÃO (recurso pago — o gate fica na rota, via requireFeature) ===
  // Gera o Markdown no servidor: notas protegidas entram só como marcador,
  // porque o conteúdo delas exige a senha.
  async exportMarkdown(userId: number) {
    const notes = await anotacaoRepository.listByUser(userId);
    const corpo = notes.map((n) => {
      const titulo = n.titulo || 'Sem título';
      if (n.senha) return `# ${titulo}\n\n_(nota protegida — conteúdo não exportado)_`;
      return `# ${titulo}\n\n${htmlParaMarkdown(String(n.conteudo || ''))}`;
    }).join('\n\n---\n\n');

    const cabecalho = `# Minhas notas — BnotasWeb\n\nExportado em ${new Date().toLocaleString('pt-BR')} · ${notes.length} nota(s)\n\n---\n\n`;
    return cabecalho + corpo + '\n';
  },

  // === COMPARTILHAMENTO POR LINK ===
  async share(userId: number, id: number) {
    const note = await anotacaoRepository.getByIdForUser(userId, id);
    if (!note) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
    if (note.senha) throw new ApiError(400, 'Notas protegidas por senha não podem ser compartilhadas', 'PROTECTED_NOTE_SHARE');
    if (note.share_token) return { shareToken: note.share_token };

    const token = crypto.randomBytes(24).toString('hex');
    await anotacaoRepository.setShareToken(userId, id, token);
    return { shareToken: token };
  },

  async unshare(userId: number, id: number) {
    const changed = await anotacaoRepository.setShareToken(userId, id, null);
    if (!changed) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');
    return { shareToken: null };
  },

  // Visualização PÚBLICA (sem login): só notas com token válido, nunca protegidas/lixeira.
  // Conteúdo passa por sanitização — remove scripts e atributos perigosos (anti-XSS).
  async getPublic(token: string) {
    const note = await anotacaoRepository.findByShareToken(token);
    if (!note || note.deletado || note.senha) throw new ApiError(404, 'Nota não encontrada', 'NOT_FOUND');
    return {
      titulo: note.titulo,
      cor: note.cor,
      dataModificacao: note.dataModificacao,
      conteudo: sanitizeHtml(note.conteudo || '', {
        allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'span', 'mark', 'h1', 'h2', 'h3', 'label', 'input', 'div'],
        allowedAttributes: { span: ['style'], mark: ['style'], input: ['type', 'checked', 'disabled'], li: ['data-checked'], ul: ['data-type'], div: [] },
        allowedStyles: { '*': { 'color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb/], 'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb/], 'font-size': [/^\d+px$/] } }
      })
    };
  },

  // Verifica a senha e, se correta, DEVOLVE a nota completa (com conteúdo).
  // É o único caminho para obter o conteúdo de uma nota protegida.
  async verifyPassword(userId: number, id: number, senha: string) {
    const note = await anotacaoRepository.getByIdForUser(userId, id);
    if (!note) throw new ApiError(404, 'Anotação não encontrada', 'NOT_FOUND');

    if (!note.senha) {
      throw new ApiError(400, 'Nota não está protegida', 'NOTE_NOT_PROTECTED');
    }

    const valid = await this.checkNotePassword(userId, note.senha, senha);
    if (!valid) return { valid: false };

    // Migra formato antigo (AES) para bcrypt no primeiro acesso válido
    if (note.senha !== ACCOUNT_PASSWORD_MARKER && !note.senha.startsWith('$2')) {
      const newHash = await bcrypt.hash(senha, 10);
      await anotacaoRepository.updateForUser(userId, id, { senha: newHash });
    }

    return { valid: true, note: mapNote(note, true) };
  }
};