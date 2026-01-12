-- ============================================
-- Script SQL para criar tabelas do BnotasWeb
-- Execute este script no seu banco MySQL
-- ============================================

-- Tabela de Usuários (já deve existir, mas incluindo campos necessários)
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

-- Tabela de Anotações (atualizada com novos campos - SEM dataExclusao)
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
  -- NOVOS CAMPOS
  `tags` JSON DEFAULT (JSON_ARRAY()),
  `deletado` TINYINT(1) DEFAULT 0,
  `senha` VARCHAR(500) NULL COMMENT 'Senha criptografada da nota',
  INDEX `idx_deletado` (`deletado`),
  INDEX `idx_data_lembrete` (`data_lembrete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Relacionamento Usuário-Anotação
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

-- Tabela de Planos
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

-- Tabela de Assinaturas
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

-- Inserir planos padrão
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
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`);

-- ============================================
-- ALTERAÇÕES PARA TABELAS EXISTENTES
-- Execute apenas se as tabelas já existirem
-- ============================================

-- ============================================
-- NOTA: MySQL não suporta "IF NOT EXISTS" em ALTER TABLE
-- Execute manualmente apenas os campos que não existem
-- ============================================

-- Verificar se os campos existem antes de adicionar:
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'nome_do_banco' AND TABLE_NAME = 'anotacao' AND COLUMN_NAME = 'tags';

-- ============================================
-- MIGRAÇÃO: Remover coluna dataExclusao se existir
-- Execute apenas se a tabela já existir e tiver dataExclusao
-- ============================================

-- Verificar se a coluna dataExclusao existe antes de remover:
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'bnotasweb' AND TABLE_NAME = 'anotacao' AND COLUMN_NAME = 'dataExclusao';

-- Remover coluna dataExclusao (execute apenas se existir):
-- ALTER TABLE `anotacao` DROP COLUMN IF EXISTS `dataExclusao`;

-- Adicionar novos campos na tabela anotacao (execute apenas se não existirem)
-- ALTER TABLE `anotacao` 
--   ADD COLUMN IF NOT EXISTS `tags` JSON DEFAULT (JSON_ARRAY()) AFTER `qtd_reagendamentos`,
--   ADD COLUMN IF NOT EXISTS `deletado` TINYINT(1) DEFAULT 0 AFTER `tags`,
--   ADD COLUMN IF NOT EXISTS `senha` VARCHAR(500) NULL COMMENT 'Senha criptografada da nota' AFTER `deletado`;

-- Adicionar índices (execute apenas se não existirem)
-- ALTER TABLE `anotacao` 
--   ADD INDEX IF NOT EXISTS `idx_deletado` (`deletado`),
--   ADD INDEX IF NOT EXISTS `idx_data_lembrete` (`data_lembrete`);

