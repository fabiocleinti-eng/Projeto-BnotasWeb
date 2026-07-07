// Backup do banco em JSON: node scripts/backup.js  (ou npm run backup)
// Gera backups/backup-AAAA-MM-DD-HHMM.json e mantém os 14 mais recentes.
// Agende no Windows: Agendador de Tarefas -> "node scripts/backup.js" diário.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bnotasweb'
  });

  const [tables] = await conn.query('SHOW TABLES');
  const dump = { geradoEm: new Date().toISOString(), banco: process.env.DB_NAME, tabelas: {} };
  for (const row of tables) {
    const t = Object.values(row)[0];
    const [rows] = await conn.query(`SELECT * FROM \`${t}\``);
    dump.tabelas[t] = rows;
  }
  await conn.end();

  const dir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const file = path.join(dir, `backup-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(dump));
  console.log('Backup salvo em:', file);

  // Mantém só os 14 mais recentes
  const antigos = fs.readdirSync(dir).filter((f) => f.startsWith('backup-')).sort().reverse().slice(14);
  antigos.forEach((f) => fs.unlinkSync(path.join(dir, f)));
})().catch((e) => { console.error('ERRO no backup:', e.message); process.exit(1); });
