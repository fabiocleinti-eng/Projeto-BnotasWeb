-- ============================================
-- MIGRAÇÃO: Remover coluna dataExclusao da tabela anotacao
-- Execute este script APENAS se a tabela já existir e tiver a coluna dataExclusao
-- ============================================

USE bnotasweb;

-- Verificar se a coluna dataExclusao existe
-- SELECT COLUMN_NAME 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = 'bnotasweb' 
--   AND TABLE_NAME = 'anotacao' 
--   AND COLUMN_NAME = 'dataExclusao';

-- Remover coluna dataExclusao (MySQL não suporta IF EXISTS em DROP COLUMN)
-- Execute manualmente apenas se a coluna existir:
-- ALTER TABLE `anotacao` DROP COLUMN `dataExclusao`;

-- Verificar estrutura após remoção
-- DESCRIBE anotacao;







