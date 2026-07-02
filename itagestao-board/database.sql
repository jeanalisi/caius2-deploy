-- =====================================================
-- ItaGestão Board - Banco de Dados Completo
-- Prefeitura Municipal de Itabaiana-PB
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "-03:00";
SET NAMES utf8mb4;

-- =====================================================
-- TABELAS ESTRUTURAIS
-- =====================================================

CREATE TABLE IF NOT EXISTS `configuracoes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `chave` VARCHAR(100) NOT NULL,
  `valor` TEXT DEFAULT NULL,
  `descricao` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chave` (`chave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `perfis` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `descricao` TEXT DEFAULT NULL,
  `nivel` INT(11) NOT NULL DEFAULT 0,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissoes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `perfil_id` INT(11) NOT NULL,
  `modulo` VARCHAR(100) NOT NULL,
  `acao` VARCHAR(50) NOT NULL,
  `permitido` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `perfil_id` (`perfil_id`),
  CONSTRAINT `fk_permissoes_perfil` FOREIGN KEY (`perfil_id`) REFERENCES `perfis` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `secretarias` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(200) NOT NULL,
  `sigla` VARCHAR(20) DEFAULT NULL,
  `descricao` TEXT DEFAULT NULL,
  `cor` VARCHAR(7) DEFAULT '#0d6efd',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `setores` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `secretaria_id` INT(11) NOT NULL,
  `nome` VARCHAR(200) NOT NULL,
  `descricao` TEXT DEFAULT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `secretaria_id` (`secretaria_id`),
  CONSTRAINT `fk_setores_secretaria` FOREIGN KEY (`secretaria_id`) REFERENCES `secretarias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(200) NOT NULL,
  `email` VARCHAR(200) NOT NULL,
  `senha` VARCHAR(255) NOT NULL,
  `perfil_id` INT(11) NOT NULL,
  `secretaria_id` INT(11) DEFAULT NULL,
  `setor_id` INT(11) DEFAULT NULL,
  `cargo` VARCHAR(150) DEFAULT NULL,
  `telefone` VARCHAR(20) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `primeiro_acesso` TINYINT(1) NOT NULL DEFAULT 1,
  `ultimo_acesso` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `perfil_id` (`perfil_id`),
  KEY `secretaria_id` (`secretaria_id`),
  KEY `setor_id` (`setor_id`),
  CONSTRAINT `fk_usuarios_perfil` FOREIGN KEY (`perfil_id`) REFERENCES `perfis` (`id`),
  CONSTRAINT `fk_usuarios_secretaria` FOREIGN KEY (`secretaria_id`) REFERENCES `secretarias` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_usuarios_setor` FOREIGN KEY (`setor_id`) REFERENCES `setores` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABELAS DE QUADROS E KANBAN
-- =====================================================

CREATE TABLE IF NOT EXISTS `quadros` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `titulo` VARCHAR(200) NOT NULL,
  `descricao` TEXT DEFAULT NULL,
  `secretaria_id` INT(11) DEFAULT NULL,
  `cor` VARCHAR(7) DEFAULT '#0d6efd',
  `icone` VARCHAR(50) DEFAULT 'bi-kanban',
  `tipo_fluxo` VARCHAR(50) DEFAULT 'padrao',
  `visibilidade` ENUM('publico','secretaria','privado') DEFAULT 'secretaria',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `criado_por` INT(11) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `secretaria_id` (`secretaria_id`),
  KEY `criado_por` (`criado_por`),
  CONSTRAINT `fk_quadros_secretaria` FOREIGN KEY (`secretaria_id`) REFERENCES `secretarias` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_quadros_criador` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `listas` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `quadro_id` INT(11) NOT NULL,
  `titulo` VARCHAR(200) NOT NULL,
  `posicao` INT(11) NOT NULL DEFAULT 0,
  `cor` VARCHAR(7) DEFAULT NULL,
  `limite_cartoes` INT(11) DEFAULT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quadro_id` (`quadro_id`),
  CONSTRAINT `fk_listas_quadro` FOREIGN KEY (`quadro_id`) REFERENCES `quadros` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `etiquetas` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `cor` VARCHAR(7) NOT NULL DEFAULT '#0d6efd',
  `quadro_id` INT(11) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `quadro_id` (`quadro_id`),
  CONSTRAINT `fk_etiquetas_quadro` FOREIGN KEY (`quadro_id`) REFERENCES `quadros` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `prioridades` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(50) NOT NULL,
  `cor` VARCHAR(7) NOT NULL,
  `icone` VARCHAR(50) DEFAULT NULL,
  `nivel` INT(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cartoes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `lista_id` INT(11) NOT NULL,
  `quadro_id` INT(11) NOT NULL,
  `titulo` VARCHAR(300) NOT NULL,
  `descricao` TEXT DEFAULT NULL,
  `secretaria_id` INT(11) DEFAULT NULL,
  `setor_id` INT(11) DEFAULT NULL,
  `solicitante` VARCHAR(200) DEFAULT NULL,
  `responsavel_id` INT(11) DEFAULT NULL,
  `prioridade_id` INT(11) DEFAULT NULL,
  `prazo` DATE DEFAULT NULL,
  `posicao` INT(11) NOT NULL DEFAULT 0,
  `status` ENUM('aberto','em_andamento','concluido','arquivado') DEFAULT 'aberto',
  `observacoes_internas` TEXT DEFAULT NULL,
  `concluido_em` DATETIME DEFAULT NULL,
  `criado_por` INT(11) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `lista_id` (`lista_id`),
  KEY `quadro_id` (`quadro_id`),
  KEY `secretaria_id` (`secretaria_id`),
  KEY `setor_id` (`setor_id`),
  KEY `responsavel_id` (`responsavel_id`),
  KEY `prioridade_id` (`prioridade_id`),
  KEY `criado_por` (`criado_por`),
  KEY `prazo` (`prazo`),
  CONSTRAINT `fk_cartoes_lista` FOREIGN KEY (`lista_id`) REFERENCES `listas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cartoes_quadro` FOREIGN KEY (`quadro_id`) REFERENCES `quadros` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cartoes_secretaria` FOREIGN KEY (`secretaria_id`) REFERENCES `secretarias` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cartoes_setor` FOREIGN KEY (`setor_id`) REFERENCES `setores` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cartoes_responsavel` FOREIGN KEY (`responsavel_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cartoes_prioridade` FOREIGN KEY (`prioridade_id`) REFERENCES `prioridades` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cartoes_criador` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cartao_responsaveis` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cartao_id` INT(11) NOT NULL,
  `usuario_id` INT(11) NOT NULL,
  `tipo` ENUM('principal','auxiliar') DEFAULT 'auxiliar',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cartao_usuario` (`cartao_id`, `usuario_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_cartao_resp_cartao` FOREIGN KEY (`cartao_id`) REFERENCES `cartoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cartao_resp_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cartao_comentarios` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cartao_id` INT(11) NOT NULL,
  `usuario_id` INT(11) NOT NULL,
  `comentario` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cartao_id` (`cartao_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_comentarios_cartao` FOREIGN KEY (`cartao_id`) REFERENCES `cartoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comentarios_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cartao_checklists` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cartao_id` INT(11) NOT NULL,
  `titulo` VARCHAR(200) NOT NULL,
  `concluido` TINYINT(1) NOT NULL DEFAULT 0,
  `posicao` INT(11) NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cartao_id` (`cartao_id`),
  CONSTRAINT `fk_checklists_cartao` FOREIGN KEY (`cartao_id`) REFERENCES `cartoes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cartao_anexos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cartao_id` INT(11) NOT NULL,
  `usuario_id` INT(11) DEFAULT NULL,
  `nome_original` VARCHAR(255) NOT NULL,
  `nome_arquivo` VARCHAR(255) NOT NULL,
  `tipo` VARCHAR(100) DEFAULT NULL,
  `tamanho` INT(11) DEFAULT NULL,
  `caminho` VARCHAR(500) NOT NULL,
  `tipo_anexo` ENUM('anexo','evidencia') DEFAULT 'anexo',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cartao_id` (`cartao_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_anexos_cartao` FOREIGN KEY (`cartao_id`) REFERENCES `cartoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_anexos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cartao_etiquetas` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cartao_id` INT(11) NOT NULL,
  `etiqueta_id` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cartao_etiqueta` (`cartao_id`, `etiqueta_id`),
  KEY `etiqueta_id` (`etiqueta_id`),
  CONSTRAINT `fk_ce_cartao` FOREIGN KEY (`cartao_id`) REFERENCES `cartoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ce_etiqueta` FOREIGN KEY (`etiqueta_id`) REFERENCES `etiquetas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cartao_historico` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cartao_id` INT(11) NOT NULL,
  `usuario_id` INT(11) DEFAULT NULL,
  `acao` VARCHAR(100) NOT NULL,
  `descricao` TEXT DEFAULT NULL,
  `lista_origem_id` INT(11) DEFAULT NULL,
  `lista_destino_id` INT(11) DEFAULT NULL,
  `dados_anteriores` TEXT DEFAULT NULL,
  `dados_novos` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cartao_id` (`cartao_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_historico_cartao` FOREIGN KEY (`cartao_id`) REFERENCES `cartoes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_historico_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABELAS DE NOTIFICAÇÕES E LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS `notificacoes` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` INT(11) NOT NULL,
  `titulo` VARCHAR(200) NOT NULL,
  `mensagem` TEXT DEFAULT NULL,
  `tipo` VARCHAR(50) DEFAULT 'info',
  `link` VARCHAR(500) DEFAULT NULL,
  `lida` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `lida` (`lida`),
  CONSTRAINT `fk_notificacoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `logs_acesso` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` INT(11) DEFAULT NULL,
  `acao` VARCHAR(100) NOT NULL,
  `modulo` VARCHAR(100) DEFAULT NULL,
  `descricao` TEXT DEFAULT NULL,
  `ip` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `created_at` (`created_at`),
  CONSTRAINT `fk_logs_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Prioridades
INSERT INTO `prioridades` (`id`, `nome`, `cor`, `icone`, `nivel`) VALUES
(1, 'Baixa', '#198754', 'bi-arrow-down', 1),
(2, 'Média', '#ffc107', 'bi-dash', 2),
(3, 'Alta', '#fd7e14', 'bi-arrow-up', 3),
(4, 'Urgente', '#dc3545', 'bi-exclamation-triangle-fill', 4);

-- Perfis de acesso
INSERT INTO `perfis` (`id`, `nome`, `slug`, `descricao`, `nivel`) VALUES
(1, 'Administrador Geral', 'admin', 'Acesso total ao sistema', 100),
(2, 'Prefeito/Gabinete', 'prefeito', 'Visualiza todos os quadros, demandas e relatórios', 90),
(3, 'Secretário', 'secretario', 'Gerencia os quadros da própria secretaria', 70),
(4, 'Coordenador', 'coordenador', 'Cria, edita e movimenta tarefas do setor', 50),
(5, 'Servidor', 'servidor', 'Visualiza e executa tarefas atribuídas', 30),
(6, 'Controle Interno', 'controle_interno', 'Visualiza histórico, prazos, relatórios e gargalos', 80),
(7, 'Visualizador', 'visualizador', 'Apenas consulta', 10);

-- Permissões para Administrador Geral
INSERT INTO `permissoes` (`perfil_id`, `modulo`, `acao`, `permitido`) VALUES
(1, 'usuarios', 'visualizar', 1), (1, 'usuarios', 'criar', 1), (1, 'usuarios', 'editar', 1), (1, 'usuarios', 'excluir', 1),
(1, 'secretarias', 'visualizar', 1), (1, 'secretarias', 'criar', 1), (1, 'secretarias', 'editar', 1), (1, 'secretarias', 'excluir', 1),
(1, 'setores', 'visualizar', 1), (1, 'setores', 'criar', 1), (1, 'setores', 'editar', 1), (1, 'setores', 'excluir', 1),
(1, 'quadros', 'visualizar', 1), (1, 'quadros', 'criar', 1), (1, 'quadros', 'editar', 1), (1, 'quadros', 'excluir', 1),
(1, 'cartoes', 'visualizar', 1), (1, 'cartoes', 'criar', 1), (1, 'cartoes', 'editar', 1), (1, 'cartoes', 'excluir', 1), (1, 'cartoes', 'mover', 1),
(1, 'relatorios', 'visualizar', 1), (1, 'relatorios', 'exportar', 1),
(1, 'configuracoes', 'visualizar', 1), (1, 'configuracoes', 'editar', 1),
(1, 'perfis', 'visualizar', 1), (1, 'perfis', 'criar', 1), (1, 'perfis', 'editar', 1), (1, 'perfis', 'excluir', 1);

-- Permissões para Prefeito/Gabinete
INSERT INTO `permissoes` (`perfil_id`, `modulo`, `acao`, `permitido`) VALUES
(2, 'usuarios', 'visualizar', 1),
(2, 'secretarias', 'visualizar', 1),
(2, 'setores', 'visualizar', 1),
(2, 'quadros', 'visualizar', 1),
(2, 'cartoes', 'visualizar', 1), (2, 'cartoes', 'criar', 1), (2, 'cartoes', 'editar', 1), (2, 'cartoes', 'mover', 1),
(2, 'relatorios', 'visualizar', 1), (2, 'relatorios', 'exportar', 1);

-- Permissões para Secretário
INSERT INTO `permissoes` (`perfil_id`, `modulo`, `acao`, `permitido`) VALUES
(3, 'usuarios', 'visualizar', 1),
(3, 'secretarias', 'visualizar', 1),
(3, 'setores', 'visualizar', 1), (3, 'setores', 'criar', 1), (3, 'setores', 'editar', 1),
(3, 'quadros', 'visualizar', 1), (3, 'quadros', 'criar', 1), (3, 'quadros', 'editar', 1),
(3, 'cartoes', 'visualizar', 1), (3, 'cartoes', 'criar', 1), (3, 'cartoes', 'editar', 1), (3, 'cartoes', 'mover', 1),
(3, 'relatorios', 'visualizar', 1), (3, 'relatorios', 'exportar', 1);

-- Permissões para Coordenador
INSERT INTO `permissoes` (`perfil_id`, `modulo`, `acao`, `permitido`) VALUES
(4, 'quadros', 'visualizar', 1),
(4, 'cartoes', 'visualizar', 1), (4, 'cartoes', 'criar', 1), (4, 'cartoes', 'editar', 1), (4, 'cartoes', 'mover', 1),
(4, 'relatorios', 'visualizar', 1);

-- Permissões para Servidor
INSERT INTO `permissoes` (`perfil_id`, `modulo`, `acao`, `permitido`) VALUES
(5, 'quadros', 'visualizar', 1),
(5, 'cartoes', 'visualizar', 1), (5, 'cartoes', 'editar', 1);

-- Permissões para Controle Interno
INSERT INTO `permissoes` (`perfil_id`, `modulo`, `acao`, `permitido`) VALUES
(6, 'usuarios', 'visualizar', 1),
(6, 'secretarias', 'visualizar', 1),
(6, 'setores', 'visualizar', 1),
(6, 'quadros', 'visualizar', 1),
(6, 'cartoes', 'visualizar', 1),
(6, 'relatorios', 'visualizar', 1), (6, 'relatorios', 'exportar', 1);

-- Permissões para Visualizador
INSERT INTO `permissoes` (`perfil_id`, `modulo`, `acao`, `permitido`) VALUES
(7, 'quadros', 'visualizar', 1),
(7, 'cartoes', 'visualizar', 1);

-- Secretarias iniciais
INSERT INTO `secretarias` (`id`, `nome`, `sigla`, `cor`) VALUES
(1, 'Gabinete do Prefeito', 'GAB', '#0d47a1'),
(2, 'Controladoria-Geral do Município', 'CGM', '#1565c0'),
(3, 'Administração', 'ADM', '#1976d2'),
(4, 'Finanças', 'FIN', '#1e88e5'),
(5, 'Saúde', 'SAU', '#e53935'),
(6, 'Educação', 'EDU', '#43a047'),
(7, 'Assistência Social', 'ASS', '#8e24aa'),
(8, 'Infraestrutura', 'INF', '#f57c00'),
(9, 'Procuradoria', 'PGM', '#5d4037'),
(10, 'Licitação', 'LIC', '#00897b'),
(11, 'Convênios', 'CON', '#3949ab'),
(12, 'Comunicação', 'COM', '#d81b60'),
(13, 'Defesa Civil', 'DFC', '#ff6f00'),
(14, 'Tecnologia da Informação', 'TI', '#00acc1'),
(15, 'Planejamento', 'PLA', '#7cb342'),
(16, 'Agricultura', 'AGR', '#558b2f'),
(17, 'Cultura', 'CUL', '#6a1b9a'),
(18, 'Esportes', 'ESP', '#ef6c00'),
(19, 'Transporte', 'TRA', '#546e7a');

-- Configurações iniciais
INSERT INTO `configuracoes` (`chave`, `valor`, `descricao`) VALUES
('nome_sistema', 'ItaGestão Board', 'Nome do sistema'),
('versao', '1.0.0', 'Versão do sistema'),
('municipio', 'Itabaiana', 'Nome do município'),
('estado', 'PB', 'Sigla do estado'),
('email_admin', 'admin@itabaiana.pb.gov.br', 'E-mail do administrador'),
('cor_primaria', '#0d47a1', 'Cor primária do sistema'),
('cor_secundaria', '#1976d2', 'Cor secundária do sistema'),
('logo', 'assets/img/logo.png', 'Caminho do logotipo'),
('itens_por_pagina', '20', 'Itens por página nas listagens'),
('upload_max_size', '10485760', 'Tamanho máximo de upload em bytes (10MB)'),
('extensoes_permitidas', 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,zip,rar', 'Extensões de arquivo permitidas'),
('instalado', '1', 'Sistema instalado');

-- Etiquetas padrão
INSERT INTO `etiquetas` (`nome`, `cor`, `quadro_id`) VALUES
('Urgente', '#dc3545', NULL),
('Importante', '#fd7e14', NULL),
('Em revisão', '#ffc107', NULL),
('Aguardando', '#6c757d', NULL),
('Concluído', '#198754', NULL),
('Cancelado', '#6f42c1', NULL),
('Gabinete', '#0d6efd', NULL),
('Prazo legal', '#e91e63', NULL);

COMMIT;
