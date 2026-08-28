// Concede ou remove acesso de administrador — direto no banco, nada fica no código.
//
//   npm run admin:set -- email@exemplo.com      → vira admin
//   npm run admin:unset -- email@exemplo.com    → deixa de ser admin
//   npm run admin:list                          → lista os admins atuais
//
// Admin libera todos os recursos pagos (notas ilimitadas, protegidas, exportar,
// voz, temas...) sem passar por pagamento. Use apenas em contas suas, de teste.
require('dotenv').config();
const mysql = require('mysql2/promise');

const acao = process.argv[2];               // set | unset | list
const email = (process.argv[3] || '').trim();

(async () => {
  if (!['set', 'unset', 'list'].includes(acao)) {
    console.error('Uso: node scripts/set-admin.js <set|unset|list> [email]');
    process.exit(1);
  }
  if (acao !== 'list' && !email) {
    console.error('Informe o e-mail. Ex.: npm run admin:set -- voce@exemplo.com');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bnotasweb'
  });

  if (acao === 'list') {
    const [rows] = await conn.query('SELECT id, nome, email FROM usuario WHERE is_admin = 1');
    console.log(rows.length ? 'Administradores:' : 'Nenhum administrador cadastrado.');
    rows.forEach((u) => console.log(`  #${u.id}  ${u.email}  (${u.nome})`));
    await conn.end();
    return;
  }

  const [users] = await conn.query('SELECT id, nome FROM usuario WHERE email = ?', [email]);
  if (!users.length) {
    console.error(`Usuário "${email}" não encontrado. Cadastre-se no app primeiro.`);
    await conn.end();
    process.exit(1);
  }

  await conn.query('UPDATE usuario SET is_admin = ? WHERE email = ?', [acao === 'set' ? 1 : 0, email]);
  await conn.end();

  console.log(acao === 'set'
    ? `✅ ${email} agora é ADMIN — todos os recursos pagos liberados (saia e entre de novo no app).`
    : `✅ ${email} deixou de ser admin.`);
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });
