# 🗄️ Scripts de Banco de Dados - BnotasWeb

## 📋 Instruções

### 1. Executar o Script de Migração

Execute o arquivo `migrations.sql` no seu banco MySQL:

```bash
mysql -u seu_usuario -p nome_do_banco < database/migrations.sql
```

Ou usando o MySQL Workbench:
1. Abra o MySQL Workbench
2. Conecte-se ao seu banco de dados
3. Abra o arquivo `migrations.sql`
4. Execute o script (Ctrl+Shift+Enter)

### 2. Verificar Tabelas Criadas

Execute no MySQL:

```sql
SHOW TABLES;
```

Você deve ver:
- `usuario`
- `anotacao`
- `usuario_anotacao`
- `plan`
- `subscription`

### 3. Verificar Estrutura das Tabelas

```sql
DESCRIBE anotacao;
DESCRIBE subscription;
DESCRIBE plan;
```

### 4. Verificar Planos Inseridos

```sql
SELECT * FROM plan;
```

## ⚠️ Notas Importantes

1. **Backup**: Sempre faça backup do banco antes de executar migrações em produção
2. **Campos JSON**: MySQL 5.7+ suporta JSON nativamente
3. **Chaves Estrangeiras**: As foreign keys garantem integridade referencial
4. **Índices**: Os índices melhoram a performance das consultas

## 🔄 Migração: Remover dataExclusao

Se você já tem uma instalação existente com a coluna `dataExclusao` na tabela `anotacao`, execute o script de migração:

```bash
mysql -u seu_usuario -p bnotasweb < database/migration_remove_dataExclusao.sql
```

Ou execute manualmente no MySQL:
```sql
ALTER TABLE `anotacao` DROP COLUMN `dataExclusao`;
```

**Importante**: A coluna `dataExclusao` foi removida. Use apenas o campo `deletado` (BOOLEAN) para marcar notas como deletadas.

## 🔄 Atualizações Futuras

Se precisar adicionar novos campos ou tabelas, adicione os comandos SQL no arquivo `migrations.sql` e execute novamente.




