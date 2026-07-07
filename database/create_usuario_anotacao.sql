-- Script para criar a tabela usuario_anotacao caso não exista
-- Execute este script no seu banco MySQL se a tabela não existir

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



