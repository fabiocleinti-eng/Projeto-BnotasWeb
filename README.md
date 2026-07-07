# BnotasWeb API

API de anotações pessoais (agenda/diário) em Node.js + TypeScript, Express e MySQL, com autenticação JWT e documentação Swagger.

## Requisitos
- Node.js 20+
- MySQL (tabelas já existentes): `usuario`, `anotacao`, `usuario_anotacao`

## Configuração
1. Copie `.env.example` para `.env` e ajuste as variáveis.
2. Instale dependências:
   - npm install
3. Desenvolvimento:
   - npm run dev
4. Produção:
   - npm run build && npm start

## Endpoints Principais
- POST `/api/usuarios` — cria usuário `{ email, senha }`
- POST `/api/login` — autentica `{ email, senha }` → `{ token, user }`
- GET `/api/anotacoes` — lista do usuário logado
- POST `/api/anotacoes` — cria `{ titulo, conteudo, favorita? }`
- GET `/api/anotacoes/:id` — busca por id
- PUT `/api/anotacoes/:id` — atualiza `{ titulo?, conteudo?, favorita? }`
- DELETE `/api/anotacoes/:id` — remove

Swagger UI: `GET /api/docs` — Especificação: `GET /api/docs.json`

## Notas de Banco de Dados (existente)
- `usuario(id, email, senha)` com índice único em `email`.
- `anotacao(id, titulo, conteudo, dataCriacao, dataModificacao, favorita)`.
- `usuario_anotacao(usuario_id, anotacao_id)` — relação 1:1 (dono único).

## Segurança
- JWT expira em 24h (`JWT_EXPIRES_IN`).
- CORS restrito a localhost (configure `CORS_ORIGINS`).

---

## Troubleshooting: "Não foi possível carregar as notas"

Se o frontend exibir essa mensagem, confira:

### 1. Backend rodando na porta 3000
No diretório do backend (este projeto):
```bash
npm run dev
```
Deve aparecer: `BnotasWeb API listening on http://localhost:3000`.

### 2. Banco MySQL
- MySQL em execução (localhost:3306).
- Arquivo `.env` existe (copie de `.env.example`) com `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` corretos.
- Banco `bnotasweb` e tabelas criadas (`usuario`, `anotacao`, `usuario_anotacao`, etc.).

Teste a API e o banco:
```bash
curl http://localhost:3000/health
```
Resposta esperada: `{"status":"ok","db":"up"}`. Se `"db":"down"`, revise MySQL e `.env`.

### 3. Usuário logado no frontend
- A listagem de notas usa **GET /api/anotacoes** com o header **Authorization: Bearer &lt;token&gt;**.
- Sem token ou com token expirado → 401 e as notas não carregam.
- Faça login de novo no frontend e tente outra vez.

### 4. URL da API no frontend
- A base da API deve ser **http://localhost:3000/api** (ou a URL do seu backend).
- Ex.: listar notas = **GET** `http://localhost:3000/api/anotacoes` com o token no header.

