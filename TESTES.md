# Testes automatizados de segurança

Bateria que tenta **quebrar** o sistema: forjar tokens, virar admin, burlar planos
pagos, ler notas de outros usuários, vazar nota protegida, injetar SQL e script.
Se algum ataque passar, o teste falha.

## Como rodar

```bash
npm test
```

Leva cerca de 40 segundos. Precisa apenas do **MySQL ligado** — o resto é automático:

1. cria um banco separado `bnotasweb_test`
2. aplica todas as migrations nele
3. sobe uma segunda API na porta 3999 (sem cron, sem e-mails, sem Mercado Pago)
4. cria usuários de teste (admin, gratuito e pago)
5. executa os ataques
6. derruba a API e **apaga o banco de teste**

O banco de desenvolvimento e os seus dados **nunca são tocados**.

## Quando rodar

- Depois de qualquer mudança em autenticação, planos, notas protegidas ou pagamento
- Antes de enviar código para o GitHub
- Antes de publicar uma nova versão

No GitHub isso acontece sozinho: o arquivo `.github/workflows/testes.yml` roda a
bateria a cada envio de código e em cada pull request. Se algum teste falhar,
o GitHub marca a alteração com ✗ e avisa por e-mail.

## O que é verificado (40 testes)

| Área | Exemplos |
|---|---|
| **Autenticação** | token do 2FA usado como sessão, assinatura falsa, `alg:none`, troca de algoritmo, token de reset reaproveitado, token expirado |
| **Escalação de privilégio** | virar admin pelo formulário de perfil, nascer admin no cadastro, assinar plano pago sem pagar |
| **Recursos pagos** | exportar, criar nota protegida, proteger pela senha da conta, limite de notas do plano gratuito |
| **Dados de terceiros** | ler, editar, apagar, compartilhar e listar nota de outro usuário; vazamento na exportação |
| **Notas protegidas** | conteúdo na listagem, por id, na exportação, em link público, com senha errada |
| **Injeção** | `' OR 1=1`, `DROP TABLE`, `<script>` e `onerror` em link público |
| **Validação** | cor maliciosa, conteúdo gigante, senha fraca |
| **Força bruta** | tentativas repetidas de senha em nota protegida |

## Adicionando testes

Novos casos vão em `tests/seguranca.test.js`. O arquivo `tests/ambiente.js` traz os
helpers: `api()` para chamar a API, `criarUsuario()`, `token()` e `tokenBruto()`
para montar tokens (inclusive inválidos, de propósito).

Ao criar um recurso pago novo, adicione **sempre** dois testes: um confirmando que o
plano gratuito é barrado e outro confirmando que o plano pago consegue usar.
