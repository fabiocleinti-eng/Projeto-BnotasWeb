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

