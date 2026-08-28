// Ambiente isolado para os testes automatizados.
//
// Cria um banco separado (bnotasweb_test), aplica as migrations, sobe uma segunda
// instância da API na porta 3999 e devolve helpers prontos. O banco de produção/
// desenvolvimento NUNCA é tocado — no fim tudo é apagado.
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const RAIZ = path.join(__dirname, '..');
const BANCO_TESTE = 'bnotasweb_test';
const PORTA = 3999;
const BASE = `http://localhost:${PORTA}/api`;
// Segredos próprios do ambiente de teste (não reaproveita os reais)
const JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres-1234567890';
const ENCRYPTION_KEY = 'aa'.repeat(32);

const conexaoBase = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

let servidor = null;
let db = null;

async function criarBanco() {
  const raiz = await mysql.createConnection(conexaoBase);
  await raiz.query(`DROP DATABASE IF EXISTS \`${BANCO_TESTE}\``);
  await raiz.query(`CREATE DATABASE \`${BANCO_TESTE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await raiz.end();

  // Aplica as migrations no banco de teste
  const knex = require('knex')({
    client: 'mysql2',
    connection: { ...conexaoBase, database: BANCO_TESTE },
    migrations: { directory: path.join(RAIZ, 'migrations'), extension: 'ts' }
  });
  require('ts-node/register');
  await knex.migrate.latest();
  await knex.destroy();

  db = await mysql.createConnection({ ...conexaoBase, database: BANCO_TESTE });
}

function subirServidor() {
  return new Promise((resolve, reject) => {
    servidor = spawn(process.execPath, [path.join(RAIZ, 'dist', 'server.js')], {
      cwd: RAIZ,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(PORTA),
        DB_NAME: BANCO_TESTE,
        JWT_SECRET,
        ENCRYPTION_KEY,
        DISABLE_CRON: 'true',   // não dispara e-mails durante os testes
        MP_ACCESS_TOKEN: '',    // não fala com o Mercado Pago
        EMAIL_USER: '',
        EMAIL_PASS: ''
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const erros = [];
    servidor.stderr.on('data', (d) => erros.push(d.toString()));
    servidor.on('exit', (code) => {
      if (code !== 0 && code !== null) reject(new Error(`API de teste encerrou (${code}): ${erros.join('')}`));
    });

    // Espera o /health responder
    const limite = Date.now() + 30000;
    const tentar = async () => {
      try {
        const r = await fetch(`http://localhost:${PORTA}/health`);
        if (r.ok) return resolve();
      } catch { /* ainda subindo */ }
      if (Date.now() > limite) return reject(new Error('API de teste não subiu em 30s: ' + erros.join('')));
      setTimeout(tentar, 400);
    };
    tentar();
  });
}

// Cria usuários direto no banco: não gasta o limite de tentativas das rotas de login
// verificado=true por padrão: representa uma conta normal, já em uso.
// Os testes de confirmação de e-mail criam suas próprias contas pela API.
async function criarUsuario({ email, admin = false, plano = null, verificado = true }) {
  const senha = 'Senha#Teste1';
  const hash = await bcrypt.hash(senha, 8);
  const [r] = await db.query(
    'INSERT INTO usuario (email, senha, nome, sobrenome, is_admin, email_verificado) VALUES (?, ?, ?, ?, ?, ?)',
    [email, hash, 'Teste', 'Automatizado', admin ? 1 : 0, verificado ? 1 : 0]
  );
  const id = r.insertId;

  if (plano) {
    const features = plano === 'free' ? [] :
      ['protected_notes', 'email_notifications', 'protected_trash', 'unlimited_notes', 'export_notes', 'custom_themes'];
    await db.query(
      'INSERT INTO subscription (userId, planId, status, features) VALUES (?, ?, ?, ?)',
      [id, plano, 'active', JSON.stringify(features)]
    );
  }
  return { id, email, senha, token: token({ id, email }) };
}

function token({ id, email }, extras = {}) {
  return jwt.sign({ sub: String(id), email, type: 'access', ...extras }, JWT_SECRET, { expiresIn: '15m' });
}

function tokenBruto(payload, opcoes = {}) {
  return jwt.sign(payload, opcoes.segredo || JWT_SECRET, { expiresIn: '15m', ...opcoes.jwt });
}

// Chamada à API de teste
function api(caminho, { token, method = 'GET', body, semJson = false } = {}) {
  return fetch(BASE + caminho, {
    method,
    headers: {
      ...(semJson ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
}

async function derrubar() {
  if (servidor) { servidor.kill(); servidor = null; }
  if (db) { await db.end(); db = null; }
  const raiz = await mysql.createConnection(conexaoBase);
  await raiz.query(`DROP DATABASE IF EXISTS \`${BANCO_TESTE}\``);
  await raiz.end();
}

module.exports = {
  BASE, JWT_SECRET,
  criarBanco, subirServidor, criarUsuario, token, tokenBruto, api, derrubar,
  get db() { return db; }
};
