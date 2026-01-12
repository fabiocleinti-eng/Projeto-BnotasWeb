# 🗄️ Schema Completo do Banco de Dados - BnotasWeb

Este documento contém o script SQL completo para criar todas as tabelas do sistema BnotasWeb.

## 📋 Índice

1. [Criação do Banco de Dados](#criação-do-banco-de-dados)
2. [Tabela: usuario](#tabela-usuario)
3. [Tabela: anotacao](#tabela-anotacao)
4. [Tabela: usuario_anotacao](#tabela-usuario_anotacao)
5. [Tabela: plan](#tabela-plan)
6. [Tabela: subscription](#tabela-subscription)
7. [Dados Iniciais](#dados-iniciais)
8. [Script Completo](#script-completo)

---

## 🚀 Criação do Banco de Dados

```sql
-- Criar o banco de dados (opcional, se ainda não existir)
CREATE DATABASE IF NOT EXISTS `bnotasweb` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Selecionar o banco de dados
USE `bnotasweb`;
```

---

## 👤 Tabela: usuario

Armazena informações dos usuários do sistema.

```sql
CREATE TABLE IF NOT EXISTS `usuario` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email único do usuário',
  `senha` VARCHAR(255) NOT NULL COMMENT 'Senha criptografada (hash)',
  `nome` VARCHAR(255) NOT NULL COMMENT 'Primeiro nome',
  `sobrenome` VARCHAR(255) NOT NULL COMMENT 'Sobrenome',
  `telefone` VARCHAR(20) NULL COMMENT 'Telefone de contato (opcional)',
  `bio` TEXT NULL COMMENT 'Biografia do usuário',
  `avatarUrl` VARCHAR(500) NULL COMMENT 'URL do avatar do usuário',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Campos:**
- `id`: Identificador único (chave primária)
- `email`: Email único do usuário (índice único)
- `senha`: Hash da senha (bcrypt)
- `nome`: Primeiro nome
- `sobrenome`: Sobrenome
- `telefone`: Telefone (opcional)
- `bio`: Biografia (opcional)
- `avatarUrl`: URL do avatar (opcional)
- `created_at`: Timestamp de criação
- `updated_at`: Timestamp de atualização

---

## 📝 Tabela: anotacao

Armazena as anotações/notas dos usuários.

```sql
CREATE TABLE IF NOT EXISTS `anotacao` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `titulo` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Título da anotação',
  `conteudo` TEXT NOT NULL DEFAULT '' COMMENT 'Conteúdo da anotação (HTML)',
  `cor` VARCHAR(7) DEFAULT '#fff9c4' COMMENT 'Cor da anotação (hexadecimal)',
  `favorita` TINYINT(1) DEFAULT 0 COMMENT 'Se a anotação está favoritada (0 ou 1)',
  `dataCriacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `dataModificacao` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data da última modificação',
  `data_lembrete` TIMESTAMP NULL COMMENT 'Data e hora do lembrete',
  `lembrete_enviado` TINYINT(1) DEFAULT 0 COMMENT 'Se o lembrete já foi enviado (0 ou 1)',
  `etapa_lembrete` INT DEFAULT 0 COMMENT 'Etapa do lembrete (0-7)',
  `qtd_reagendamentos` INT DEFAULT 0 COMMENT 'Quantidade de reagendamentos do lembrete',
  `tags` JSON DEFAULT (JSON_ARRAY()) COMMENT 'Tags da anotação (array JSON)',
  `deletado` TINYINT(1) DEFAULT 0 COMMENT 'Se a anotação está deletada (soft delete)',
  `senha` VARCHAR(500) NULL COMMENT 'Senha criptografada da nota (se protegida)',
  INDEX `idx_deletado` (`deletado`),
  INDEX `idx_data_lembrete` (`data_lembrete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Campos:**
- `id`: Identificador único (chave primária)
- `titulo`: Título da anotação
- `conteudo`: Conteúdo em HTML
- `cor`: Cor em hexadecimal (padrão: #fff9c4)
- `favorita`: Boolean (0 ou 1)
- `dataCriacao`: Timestamp de criação
- `dataModificacao`: Timestamp de modificação
- `data_lembrete`: Data/hora do lembrete (NULL se não houver)
- `lembrete_enviado`: Boolean indicando se o lembrete foi enviado
- `etapa_lembrete`: Etapa do lembrete (0-7 para diferentes níveis de urgência)
- `qtd_reagendamentos`: Contador de reagendamentos
- `tags`: Array JSON com tags da anotação
- `deletado`: Boolean para soft delete (0 = ativo, 1 = deletado)
- `senha`: Hash da senha se a nota estiver protegida (NULL se não protegida)

**Índices:**
- `idx_deletado`: Para filtrar anotações deletadas
- `idx_data_lembrete`: Para consultas de lembretes

---

## 🔗 Tabela: usuario_anotacao

Tabela de relacionamento muitos-para-muitos entre usuários e anotações.

```sql
CREATE TABLE IF NOT EXISTS `usuario_anotacao` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL COMMENT 'ID do usuário',
  `anotacao_id` INT NOT NULL COMMENT 'ID da anotação',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação do relacionamento',
  FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`anotacao_id`) REFERENCES `anotacao`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_note` (`usuario_id`, `anotacao_id`),
  INDEX `idx_usuario_id` (`usuario_id`),
  INDEX `idx_anotacao_id` (`anotacao_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Campos:**
- `id`: Identificador único (chave primária)
- `usuario_id`: Referência ao usuário (foreign key)
- `anotacao_id`: Referência à anotação (foreign key)
- `created_at`: Timestamp de criação do relacionamento

**Constraints:**
- Foreign key para `usuario.id` com CASCADE (deleta relacionamento se usuário for deletado)
- Foreign key para `anotacao.id` com CASCADE (deleta relacionamento se anotação for deletada)
- Unique constraint: um usuário não pode ter a mesma anotação duas vezes

**Índices:**
- `idx_usuario_id`: Para buscar anotações de um usuário
- `idx_anotacao_id`: Para buscar usuários de uma anotação

---

## 💳 Tabela: plan

Armazena os planos de assinatura disponíveis.

```sql
CREATE TABLE IF NOT EXISTS `plan` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'ID do plano (free, premium, pro)',
  `name` VARCHAR(255) NOT NULL COMMENT 'Nome do plano',
  `price` DECIMAL(10, 2) NOT NULL COMMENT 'Preço do plano',
  `currency` VARCHAR(10) DEFAULT 'BRL' COMMENT 'Moeda (BRL, USD, etc)',
  `features` JSON COMMENT 'Array JSON com as features do plano',
  `isActive` TINYINT(1) DEFAULT 1 COMMENT 'Se o plano está ativo (0 ou 1)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Campos:**
- `id`: ID do plano (chave primária, não numérico: 'free', 'premium', 'pro')
- `name`: Nome do plano
- `price`: Preço (DECIMAL para precisão)
- `currency`: Moeda (padrão: BRL)
- `features`: Array JSON com features do plano
- `isActive`: Boolean indicando se o plano está ativo
- `created_at`: Timestamp de criação
- `updated_at`: Timestamp de atualização

---

## 📦 Tabela: subscription

Armazena as assinaturas dos usuários.

```sql
CREATE TABLE IF NOT EXISTS `subscription` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL COMMENT 'ID do usuário',
  `planId` VARCHAR(50) NOT NULL DEFAULT 'free' COMMENT 'ID do plano',
  `status` ENUM('active', 'cancelled', 'expired') DEFAULT 'active' COMMENT 'Status da assinatura',
  `startDate` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de início',
  `endDate` TIMESTAMP NULL COMMENT 'Data de término (NULL se ativa)',
  `features` JSON DEFAULT (JSON_ARRAY()) COMMENT 'Features específicas da assinatura',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  FOREIGN KEY (`userId`) REFERENCES `usuario`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`planId`) REFERENCES `plan`(`id`) ON DELETE RESTRICT,
  INDEX `idx_userId` (`userId`),
  INDEX `idx_planId` (`planId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Campos:**
- `id`: Identificador único (chave primária)
- `userId`: Referência ao usuário (foreign key)
- `planId`: Referência ao plano (foreign key)
- `status`: Status da assinatura (active, cancelled, expired)
- `startDate`: Data de início da assinatura
- `endDate`: Data de término (NULL se ativa)
- `features`: Array JSON com features específicas
- `created_at`: Timestamp de criação
- `updated_at`: Timestamp de atualização

**Constraints:**
- Foreign key para `usuario.id` com CASCADE
- Foreign key para `plan.id` com RESTRICT (não permite deletar plano se houver assinaturas)

**Índices:**
- `idx_userId`: Para buscar assinatura de um usuário
- `idx_planId`: Para buscar assinaturas de um plano

---

## 📊 Dados Iniciais

### Inserir Planos Padrão

```sql
-- Inserir planos padrão (ou atualizar se já existirem)
INSERT INTO `plan` (`id`, `name`, `price`, `currency`, `features`, `isActive`) VALUES
('free', 'Gratuito', 0.00, 'BRL', JSON_ARRAY(), 1),
('premium', 'Premium', 9.90, 'BRL', JSON_ARRAY(
  'protected_notes',
  'email_notifications',
  'protected_trash',
  'unlimited_notes',
  'export_notes',
  'custom_themes'
), 1),
('pro', 'Pro', 19.90, 'BRL', JSON_ARRAY(
  'protected_notes',
  'email_notifications',
  'protected_trash',
  'unlimited_notes',
  'export_notes',
  'custom_themes',
  'voice_access'
), 1)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`), 
  `price` = VALUES(`price`),
  `features` = VALUES(`features`);
```

**Planos:**
- **Free (Gratuito)**: R$ 0,00 - Sem features extras
- **Premium**: R$ 9,90 - Notas protegidas, notificações, lixeira protegida, etc.
- **Pro**: R$ 19,90 - Todas as features do Premium + acesso por voz

---

## 📜 Script Completo

Aqui está o script SQL completo para executar de uma vez:

```sql
-- ============================================
-- Script SQL Completo - BnotasWeb
-- Execute este script no seu banco MySQL
-- ============================================

-- Criar banco de dados (opcional)
CREATE DATABASE IF NOT EXISTS `bnotasweb` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `bnotasweb`;

-- ============================================
-- TABELA: usuario
-- ============================================
CREATE TABLE IF NOT EXISTS `usuario` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `senha` VARCHAR(255) NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `sobrenome` VARCHAR(255) NOT NULL,
  `telefone` VARCHAR(20) NULL,
  `bio` TEXT NULL,
  `avatarUrl` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: anotacao
-- ============================================
CREATE TABLE IF NOT EXISTS `anotacao` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `titulo` VARCHAR(255) NOT NULL DEFAULT '',
  `conteudo` TEXT NOT NULL DEFAULT '',
  `cor` VARCHAR(7) DEFAULT '#fff9c4',
  `favorita` TINYINT(1) DEFAULT 0,
  `dataCriacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `dataModificacao` TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  `data_lembrete` TIMESTAMP NULL,
  `lembrete_enviado` TINYINT(1) DEFAULT 0,
  `etapa_lembrete` INT DEFAULT 0,
  `qtd_reagendamentos` INT DEFAULT 0,
  `tags` JSON DEFAULT (JSON_ARRAY()),
  `deletado` TINYINT(1) DEFAULT 0,
  `senha` VARCHAR(500) NULL COMMENT 'Senha criptografada da nota',
  INDEX `idx_deletado` (`deletado`),
  INDEX `idx_data_lembrete` (`data_lembrete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: usuario_anotacao (Relacionamento)
-- ============================================
CREATE TABLE IF NOT EXISTS `usuario_anotacao` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `anotacao_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuario`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`anotacao_id`) REFERENCES `anotacao`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_note` (`usuario_id`, `anotacao_id`),
  INDEX `idx_usuario_id` (`usuario_id`),
  INDEX `idx_anotacao_id` (`anotacao_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: plan
-- ============================================
CREATE TABLE IF NOT EXISTS `plan` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'BRL',
  `features` JSON,
  `isActive` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: subscription
-- ============================================
CREATE TABLE IF NOT EXISTS `subscription` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `planId` VARCHAR(50) NOT NULL DEFAULT 'free',
  `status` ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
  `startDate` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `endDate` TIMESTAMP NULL,
  `features` JSON DEFAULT (JSON_ARRAY()),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `usuario`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`planId`) REFERENCES `plan`(`id`) ON DELETE RESTRICT,
  INDEX `idx_userId` (`userId`),
  INDEX `idx_planId` (`planId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DADOS INICIAIS: Planos
-- ============================================
INSERT INTO `plan` (`id`, `name`, `price`, `currency`, `features`, `isActive`) VALUES
('free', 'Gratuito', 0.00, 'BRL', JSON_ARRAY(), 1),
('premium', 'Premium', 9.90, 'BRL', JSON_ARRAY(
  'protected_notes',
  'email_notifications',
  'protected_trash',
  'unlimited_notes',
  'export_notes',
  'custom_themes'
), 1),
('pro', 'Pro', 19.90, 'BRL', JSON_ARRAY(
  'protected_notes',
  'email_notifications',
  'protected_trash',
  'unlimited_notes',
  'export_notes',
  'custom_themes',
  'voice_access'
), 1)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`), 
  `price` = VALUES(`price`),
  `features` = VALUES(`features`);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
```

---

## 🚀 Como Executar

### Opção 1: Via Linha de Comando

```bash
mysql -u seu_usuario -p bnotasweb < database/SCHEMA_COMPLETO.md
```

### Opção 2: Via MySQL Workbench

1. Abra o MySQL Workbench
2. Conecte-se ao seu banco de dados
3. Copie e cole o script completo acima
4. Execute o script (Ctrl+Shift+Enter)

### Opção 3: Via phpMyAdmin

1. Acesse o phpMyAdmin
2. Selecione o banco `bnotasweb`
3. Vá na aba "SQL"
4. Cole o script completo
5. Clique em "Executar"

---

## ✅ Verificação

Após executar o script, verifique se todas as tabelas foram criadas:

```sql
-- Listar todas as tabelas
SHOW TABLES;

-- Verificar estrutura de uma tabela
DESCRIBE usuario;
DESCRIBE anotacao;
DESCRIBE usuario_anotacao;
DESCRIBE plan;
DESCRIBE subscription;

-- Verificar planos inseridos
SELECT * FROM plan;
```

**Resultado esperado:**
- `usuario`
- `anotacao`
- `usuario_anotacao`
- `plan`
- `subscription`

---

## ⚠️ Notas Importantes

1. **Backup**: Sempre faça backup do banco antes de executar scripts em produção
2. **MySQL 5.7+**: Requer MySQL 5.7 ou superior para suporte nativo a JSON
3. **Charset**: Todas as tabelas usam `utf8mb4` para suporte completo a emojis e caracteres especiais
4. **Foreign Keys**: As foreign keys garantem integridade referencial
5. **Índices**: Os índices melhoram a performance das consultas
6. **Soft Delete**: A tabela `anotacao` usa soft delete (campo `deletado`) ao invés de deletar fisicamente

---

## 🔄 Relacionamentos

```
usuario (1) ────< (N) usuario_anotacao (N) >─── (1) anotacao
usuario (1) ────< (N) subscription
subscription (N) >─── (1) plan
```

- Um usuário pode ter várias anotações (via `usuario_anotacao`)
- Uma anotação pode pertencer a um usuário (via `usuario_anotacao`)
- Um usuário pode ter uma assinatura
- Uma assinatura pertence a um plano

---

## 📝 Changelog

- **v1.0** - Schema inicial com todas as tabelas
- Corrigido campo `id` na tabela `usuario_anotacao`
- Adicionados comentários em todos os campos
- Documentação completa do schema

---

**Última atualização:** 2024

