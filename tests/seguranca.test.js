// Testes de segurança do BnotasWeb — cada teste tenta QUEBRAR uma proteção.
// Rode com: npm test
//
// Tudo acontece num banco separado (bnotasweb_test) que é criado e apagado
// automaticamente. Nenhum dado real é tocado.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const amb = require('./ambiente');

let admin, free, pago;

before(async () => {
  await amb.criarBanco();
  await amb.subirServidor();
  admin = await amb.criarUsuario({ email: 'admin@teste.local', admin: true });
  free = await amb.criarUsuario({ email: 'free@teste.local', plano: 'free' });
  pago = await amb.criarUsuario({ email: 'pago@teste.local', plano: 'premium' });
}, { timeout: 120000 });

after(async () => { await amb.derrubar(); });

// ─────────────────────────────────────────────────────────────
describe('Autenticação — tentativas de forjar token', () => {
  test('token intermediário do 2FA não vale como sessão', async () => {
    const temp = amb.tokenBruto({ sub: String(admin.id), type: '2fa' });
    assert.strictEqual((await amb.api('/anotacoes', { token: temp })).status, 401);
  });

  test('token assinado com outro segredo é recusado', async () => {
    const falso = jwt.sign({ sub: String(admin.id), email: admin.email, type: 'access' }, 'segredo-errado');
    assert.strictEqual((await amb.api('/anotacoes', { token: falso })).status, 401);
  });

  test('token sem assinatura (ataque alg:none) é recusado', async () => {
    const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const p = Buffer.from(JSON.stringify({ sub: String(admin.id), type: 'access' })).toString('base64url');
    assert.strictEqual((await amb.api('/anotacoes', { token: `${h}.${p}.` })).status, 401);
  });

  test('algoritmo diferente de HS256 é recusado', async () => {
    const outro = jwt.sign({ sub: String(admin.id), email: admin.email, type: 'access' },
      amb.JWT_SECRET, { algorithm: 'HS512' });
    assert.strictEqual((await amb.api('/anotacoes', { token: outro })).status, 401);
  });

  test('token de redefinição de senha não vale como sessão', async () => {
    const reset = amb.tokenBruto({ sub: String(admin.id), type: 'reset' });
    assert.strictEqual((await amb.api('/anotacoes', { token: reset })).status, 401);
  });

  test('type como lista ["access"] não engana a checagem', async () => {
    const truque = amb.tokenBruto({ sub: String(admin.id), email: admin.email, type: ['access'] });
    assert.strictEqual((await amb.api('/anotacoes', { token: truque })).status, 401);
  });

  test('token expirado é recusado', async () => {
    const velho = jwt.sign({ sub: String(admin.id), email: admin.email, type: 'access' },
      amb.JWT_SECRET, { expiresIn: '-1h' });
    assert.strictEqual((await amb.api('/anotacoes', { token: velho })).status, 401);
  });

  test('sem cabeçalho de autorização é recusado', async () => {
    assert.strictEqual((await amb.api('/anotacoes')).status, 401);
  });

  test('token de sessão legítimo continua funcionando', async () => {
    assert.strictEqual((await amb.api('/anotacoes', { token: admin.token })).status, 200);
  });

  test('login com a senha correta funciona e devolve token utilizável', async () => {
    // Guarda o ciclo completo do bcrypt: hash gravado → conferência no login.
    // Se uma atualização de biblioteca quebrar a compatibilidade dos hashes,
    // este teste falha antes de os usuários ficarem trancados para fora.
    const r = await amb.api('/login', { method: 'POST', body: { email: pago.email, senha: pago.senha } });
    assert.strictEqual(r.status, 200, 'login com senha correta falhou');
    const dados = await r.json();
    assert.ok(dados.token, 'login não devolveu token');
    assert.strictEqual((await amb.api('/anotacoes', { token: dados.token })).status, 200);
  });

  test('login com senha errada é recusado', async () => {
    const r = await amb.api('/login', { method: 'POST', body: { email: pago.email, senha: 'ErradaTotal#9' } });
    assert.strictEqual(r.status, 401);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Escalação de privilégio', () => {
  test('não dá para virar admin pelo formulário de perfil', async () => {
    await amb.api('/usuarios/perfil', {
      token: free.token, method: 'PUT', body: { nome: 'X', is_admin: true, isAdmin: true }
    });
    const [[u]] = await amb.db.query('SELECT is_admin FROM usuario WHERE id = ?', [free.id]);
    assert.ok(!u.is_admin, 'usuário comum virou admin');
  });

  test('não dá para nascer admin no cadastro', async () => {
    const email = `cad${Date.now()}@teste.local`;
    const r = await amb.api('/usuarios', {
      method: 'POST',
      body: { nome: 'A', sobrenome: 'B', email, senha: 'Senha#Forte1', is_admin: true }
    });
    if (r.status === 201) {
      const [[u]] = await amb.db.query('SELECT is_admin FROM usuario WHERE email = ?', [email]);
      assert.ok(!u.is_admin, 'cadastro criou um admin');
    }
  });

  test('não dá para assinar plano pago sem pagar', async () => {
    const r = await amb.api('/subscriptions/upgrade', {
      token: free.token, method: 'POST', body: { planId: 'pro' }
    });
    assert.ok([400, 403].includes(r.status), `upgrade direto devolveu ${r.status}`);
    const [[s]] = await amb.db.query('SELECT planId FROM subscription WHERE userId = ?', [free.id]);
    assert.strictEqual(s.planId, 'free');
  });
});

// ─────────────────────────────────────────────────────────────
describe('Recursos pagos', () => {
  test('plano gratuito não exporta notas', async () => {
    assert.strictEqual((await amb.api('/anotacoes/export', { token: free.token })).status, 403);
  });

  test('plano pago exporta notas', async () => {
    assert.strictEqual((await amb.api('/anotacoes/export', { token: pago.token })).status, 200);
  });

  test('admin exporta notas', async () => {
    assert.strictEqual((await amb.api('/anotacoes/export', { token: admin.token })).status, 200);
  });

  test('plano gratuito não cria nota já protegida', async () => {
    const r = await amb.api('/anotacoes', {
      token: free.token, method: 'POST', body: { titulo: 'x', senha: 'segredo123' }
    });
    assert.strictEqual(r.status, 403, 'nota nasceu protegida no plano gratuito');
  });

  test('plano gratuito não protege nota depois de criada', async () => {
    const nota = await (await amb.api('/anotacoes', { token: free.token, method: 'POST', body: { titulo: 'y' } })).json();
    const r = await amb.api(`/anotacoes/${nota.id}`, { token: free.token, method: 'PUT', body: { senha: 'segredo123' } });
    assert.strictEqual(r.status, 403);
  });

  test('plano gratuito não protege usando a senha da conta', async () => {
    const nota = await (await amb.api('/anotacoes', { token: free.token, method: 'POST', body: { titulo: 'z' } })).json();
    const r = await amb.api(`/anotacoes/${nota.id}`, { token: free.token, method: 'PUT', body: { usarSenhaConta: true } });
    assert.strictEqual(r.status, 403);
  });

  test('limite de notas do plano gratuito é aplicado no servidor', async () => {
    const [[{ n }]] = await amb.db.query(
      'SELECT COUNT(*) n FROM usuario_anotacao WHERE usuario_id = ?', [free.id]);
    for (let i = n; i < 10; i++) {
      await amb.api('/anotacoes', { token: free.token, method: 'POST', body: { titulo: 'nota ' + i } });
    }
    const r = await amb.api('/anotacoes', { token: free.token, method: 'POST', body: { titulo: 'passou do limite' } });
    assert.strictEqual(r.status, 403);
  });
});

// ─────────────────────────────────────────────────────────────
describe('Acesso a dados de outro usuário', () => {
  let notaAlheia;

  before(async () => {
    notaAlheia = await (await amb.api('/anotacoes', {
      token: pago.token, method: 'POST', body: { titulo: 'particular', conteudo: '<p>SEGREDO-DO-OUTRO</p>' }
    })).json();
  });

  test('não lê nota alheia', async () => {
    assert.strictEqual((await amb.api(`/anotacoes/${notaAlheia.id}`, { token: free.token })).status, 404);
  });

  test('não edita nota alheia', async () => {
    await amb.api(`/anotacoes/${notaAlheia.id}`, { token: free.token, method: 'PUT', body: { titulo: 'invadido' } });
    const [[t]] = await amb.db.query('SELECT titulo FROM anotacao WHERE id = ?', [notaAlheia.id]);
    assert.strictEqual(t.titulo, 'particular');
  });

  test('não apaga nota alheia', async () => {
    assert.strictEqual((await amb.api(`/anotacoes/${notaAlheia.id}`, { token: free.token, method: 'DELETE' })).status, 404);
  });

  test('não gera link público de nota alheia', async () => {
    assert.strictEqual((await amb.api(`/anotacoes/${notaAlheia.id}/share`, { token: free.token, method: 'POST' })).status, 404);
  });

  test('listagem só devolve as notas do próprio usuário', async () => {
    const notas = await (await amb.api('/anotacoes', { token: free.token })).json();
    assert.ok(!notas.some(n => n.id === notaAlheia.id));
  });

  test('exportação não vaza notas de outros', async () => {
    const md = await (await amb.api('/anotacoes/export', { token: admin.token })).text();
    assert.ok(!md.includes('SEGREDO-DO-OUTRO'));
  });
});

// ─────────────────────────────────────────────────────────────
describe('Notas protegidas por senha', () => {
  let nota;
  const SIGILO = 'CONTEUDO-SIGILOSO-XYZ';

  before(async () => {
    nota = await (await amb.api('/anotacoes', {
      token: pago.token, method: 'POST', body: { titulo: 'cofre', conteudo: `<p>${SIGILO}</p>` }
    })).json();
    await amb.api(`/anotacoes/${nota.id}`, { token: pago.token, method: 'PUT', body: { senha: 'senhaforte' } });
  });

  test('conteúdo não aparece na listagem', async () => {
    const notas = await (await amb.api('/anotacoes', { token: pago.token })).json();
    const n = notas.find(x => x.id === nota.id);
    assert.ok(n && !String(n.conteudo).includes(SIGILO));
    assert.ok(n.protegida === true);
  });

  test('hash da senha nunca é devolvido', async () => {
    const notas = await (await amb.api('/anotacoes', { token: pago.token })).json();
    assert.ok(!notas.find(x => x.id === nota.id).senha);
  });

  test('conteúdo não vem ao buscar a nota por id', async () => {
    const n = await (await amb.api(`/anotacoes/${nota.id}`, { token: pago.token })).json();
    assert.ok(!String(n.conteudo).includes(SIGILO));
  });

  test('conteúdo não vaza na exportação', async () => {
    const md = await (await amb.api('/anotacoes/export', { token: pago.token })).text();
    assert.ok(!md.includes(SIGILO));
  });

  test('nota protegida não pode virar link público', async () => {
    assert.strictEqual((await amb.api(`/anotacoes/${nota.id}/share`, { token: pago.token, method: 'POST' })).status, 400);
  });

  test('senha errada não devolve o conteúdo', async () => {
    const r = await (await amb.api(`/anotacoes/${nota.id}/verify-password`, {
      token: pago.token, method: 'POST', body: { senha: 'errada' }
    })).json();
    assert.strictEqual(r.valid, false);
    assert.ok(!JSON.stringify(r).includes(SIGILO));
  });

  test('senha certa devolve o conteúdo', async () => {
    const r = await (await amb.api(`/anotacoes/${nota.id}/verify-password`, {
      token: pago.token, method: 'POST', body: { senha: 'senhaforte' }
    })).json();
    assert.strictEqual(r.valid, true);
    assert.ok(JSON.stringify(r).includes(SIGILO));
  });
});

// ─────────────────────────────────────────────────────────────
describe('Injeção e validação de entrada', () => {
  test('SQL injection na busca não expõe dados', async () => {
    const r = await amb.api("/anotacoes?q=' OR 1=1 --", { token: free.token });
    assert.strictEqual(r.status, 200);
    const notas = await r.json();
    assert.ok(Array.isArray(notas));
    assert.ok(!notas.some(n => n.titulo === 'particular'), 'busca vazou nota de outro usuário');
  });

  test('tentativa de DROP TABLE não afeta o banco', async () => {
    await amb.api("/anotacoes?q=x'; DROP TABLE anotacao; --", { token: free.token });
    const [[c]] = await amb.db.query('SELECT COUNT(*) n FROM anotacao');
    assert.ok(c.n > 0, 'tabela foi destruída');
  });

  test('script é removido da nota compartilhada publicamente', async () => {
    const nota = await (await amb.api('/anotacoes', {
      token: pago.token, method: 'POST',
      body: { titulo: 'xss', conteudo: '<p>oi</p><script>alert(1)</script><img src=x onerror=alert(2)>' }
    })).json();
    const { shareToken } = await (await amb.api(`/anotacoes/${nota.id}/share`, { token: pago.token, method: 'POST' })).json();
    const pub = await (await fetch(`${amb.BASE}/public/anotacoes/${shareToken}`)).json();
    assert.ok(!pub.conteudo.includes('<script'));
    assert.ok(!pub.conteudo.includes('onerror'));
  });

  test('link público inexistente devolve 404', async () => {
    assert.strictEqual((await fetch(`${amb.BASE}/public/anotacoes/inventado123`)).status, 404);
  });

  test('cor fora do formato hexadecimal é recusada', async () => {
    const r = await amb.api('/anotacoes', {
      token: pago.token, method: 'POST', body: { titulo: 'c', cor: 'red;background:url(//evil)' }
    });
    assert.strictEqual(r.status, 400);
  });

  test('conteúdo gigante é recusado', async () => {
    const r = await amb.api('/anotacoes', {
      token: pago.token, method: 'POST', body: { titulo: 'g', conteudo: 'A'.repeat(300000) }
    });
    assert.ok([400, 413].includes(r.status));
  });

  test('foto de perfil aceita imagem embutida e endereço https', async () => {
    const jpeg = 'data:image/jpeg;base64,' + Buffer.from('imagem').toString('base64');
    assert.strictEqual((await amb.api('/usuarios/perfil', { token: pago.token, method: 'PUT', body: { avatarUrl: jpeg } })).status, 200);
    assert.strictEqual((await amb.api('/usuarios/perfil', { token: pago.token, method: 'PUT', body: { avatarUrl: 'https://exemplo.com/f.png' } })).status, 200);
  });

  test('foto de perfil recusa SVG, HTML e javascript:', async () => {
    const maliciosos = [
      'data:image/svg+xml;base64,' + Buffer.from('<svg onload=alert(1)>').toString('base64'),
      'data:text/html;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64'),
      'javascript:alert(document.cookie)',
      'data:image/png;base64,<script>'
    ];
    for (const valor of maliciosos) {
      const r = await amb.api('/usuarios/perfil', { token: pago.token, method: 'PUT', body: { avatarUrl: valor } });
      assert.strictEqual(r.status, 400, `aceitou foto maliciosa: ${valor.slice(0, 40)}`);
    }
  });

  test('foto de perfil acima do limite é recusada', async () => {
    const r = await amb.api('/usuarios/perfil', {
      token: pago.token, method: 'PUT', body: { avatarUrl: 'data:image/jpeg;base64,' + 'A'.repeat(200000) }
    });
    assert.strictEqual(r.status, 400);
  });

  test('senha fraca é recusada no cadastro', async () => {
    const r = await amb.api('/usuarios', {
      method: 'POST',
      body: { nome: 'A', sobrenome: 'B', email: `fraca${Date.now()}@teste.local`, senha: '123' }
    });
    assert.ok([400, 429].includes(r.status));
  });
});

// ─────────────────────────────────────────────────────────────
describe('Confirmação de e-mail', () => {
  test('conta nova nasce com e-mail NÃO confirmado', async () => {
    const email = `novo${Date.now()}@teste.local`;
    const r = await amb.api('/usuarios', {
      method: 'POST', body: { nome: 'A', sobrenome: 'B', email, senha: 'Senha#Forte1' }
    });
    assert.strictEqual(r.status, 201);
    const [[u]] = await amb.db.query('SELECT email_verificado, token_verificacao FROM usuario WHERE email = ?', [email]);
    assert.ok(!u.email_verificado, 'conta nasceu já confirmada');
    assert.ok(u.token_verificacao, 'não gerou token de confirmação');
  });

  test('token válido confirma o e-mail', async () => {
    const email = `conf${Date.now()}@teste.local`;
    await amb.api('/usuarios', { method: 'POST', body: { nome: 'A', sobrenome: 'B', email, senha: 'Senha#Forte1' } });
    const [[u]] = await amb.db.query('SELECT id, token_verificacao FROM usuario WHERE email = ?', [email]);

    const r = await amb.api('/verificar-email', { method: 'POST', body: { token: u.token_verificacao } });
    assert.strictEqual(r.status, 200);

    const [[depois]] = await amb.db.query('SELECT email_verificado, token_verificacao FROM usuario WHERE id = ?', [u.id]);
    assert.ok(depois.email_verificado, 'e-mail não foi marcado como confirmado');
    assert.strictEqual(depois.token_verificacao, null, 'token deveria ser descartado após o uso');
  });

  test('mesmo token não pode ser usado duas vezes', async () => {
    const email = `unico${Date.now()}@teste.local`;
    await amb.api('/usuarios', { method: 'POST', body: { nome: 'A', sobrenome: 'B', email, senha: 'Senha#Forte1' } });
    const [[u]] = await amb.db.query('SELECT token_verificacao FROM usuario WHERE email = ?', [email]);

    assert.strictEqual((await amb.api('/verificar-email', { method: 'POST', body: { token: u.token_verificacao } })).status, 200);
    assert.strictEqual((await amb.api('/verificar-email', { method: 'POST', body: { token: u.token_verificacao } })).status, 400);
  });

  test('token inventado ou expirado é recusado', async () => {
    const inventado = 'a'.repeat(64);
    assert.strictEqual((await amb.api('/verificar-email', { method: 'POST', body: { token: inventado } })).status, 400);

    // token real, porém vencido
    const email = `venc${Date.now()}@teste.local`;
    await amb.api('/usuarios', { method: 'POST', body: { nome: 'A', sobrenome: 'B', email, senha: 'Senha#Forte1' } });
    const [[u]] = await amb.db.query('SELECT id, token_verificacao FROM usuario WHERE email = ?', [email]);
    await amb.db.query('UPDATE usuario SET token_verificacao_expira = ? WHERE id = ?', [new Date(Date.now() - 1000), u.id]);
    assert.strictEqual((await amb.api('/verificar-email', { method: 'POST', body: { token: u.token_verificacao } })).status, 400);
  });

  test('token com formato inválido é recusado pela validação', async () => {
    for (const t of ['abc', '<script>', "' OR 1=1 --", 'z'.repeat(64)]) {
      const r = await amb.api('/verificar-email', { method: 'POST', body: { token: t } });
      assert.strictEqual(r.status, 400, `aceitou token inválido: ${t}`);
    }
  });

  test('título com quebra de linha é recusado (injeção de cabeçalho de e-mail)', async () => {
    // O título vira o assunto do lembrete: CRLF ali permitiria inserir um Bcc oculto
    for (const titulo of ['x\r\nBcc: vitima@exemplo.com', 'a\nSubject: falso', 'b\ttab']) {
      const r = await amb.api('/anotacoes', { token: pago.token, method: 'POST', body: { titulo } });
      assert.strictEqual(r.status, 400, `aceitou título com controle: ${JSON.stringify(titulo)}`);
    }
  });

  test('texto do usuário é escapado antes de ir para o e-mail', () => {
    const { escaparHtml, limparAssunto } = require('../dist/utils/mailer');
    assert.ok(!/<[a-z/]/i.test(escaparHtml('<img src=x onerror=alert(1)>')));
    assert.ok(!/<[a-z/]/i.test(escaparHtml('<script>alert(1)</script>')));
    assert.ok(!/[\r\n]/.test(limparAssunto('x\r\nBcc: vitima@exemplo.com')));
  });

  test('reenviar confirmação exige estar logado', async () => {
    assert.strictEqual((await amb.api('/usuarios/reenviar-verificacao', { method: 'POST' })).status, 401);
  });

  test('quem já confirmou não consegue reenviar', async () => {
    const r = await amb.api('/usuarios/reenviar-verificacao', { token: pago.token, method: 'POST' });
    assert.strictEqual(r.status, 400);
  });
});

// ─────────────────────────────────────────────────────────────
// Por último: consome o limite de tentativas e afetaria os testes acima
describe('Proteção contra força bruta', () => {
  test('tentativas repetidas de senha na nota são bloqueadas', async () => {
    const nota = await (await amb.api('/anotacoes', { token: pago.token, method: 'POST', body: { titulo: 'alvo' } })).json();
    await amb.api(`/anotacoes/${nota.id}`, { token: pago.token, method: 'PUT', body: { senha: 'senhaforte' } });

    let bloqueou = false;
    for (let i = 0; i < 40; i++) {
      const r = await amb.api(`/anotacoes/${nota.id}/verify-password`, {
        token: pago.token, method: 'POST', body: { senha: 'chute' + i }
      });
      if (r.status === 429) { bloqueou = true; break; }
    }
    assert.ok(bloqueou, 'força bruta não foi barrada');
  });
});
