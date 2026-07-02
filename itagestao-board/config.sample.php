<?php
/**
 * ItaGestão Board - Arquivo de Configuração
 * Prefeitura Municipal de Itabaiana-PB
 * 
 * Este arquivo é gerado automaticamente pelo instalador.
 * Não edite manualmente a menos que saiba o que está fazendo.
 */

// Configurações do Banco de Dados
define('DB_HOST', 'localhost');
define('DB_NAME', 'itagestao');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Configurações do Sistema
define('SITE_URL', 'http://localhost/itagestao-board');
define('SITE_NAME', 'ItaGestão Board');
define('SITE_VERSION', '1.0.0');

// Configurações de Segurança
define('SESSION_NAME', 'itagestao_session');
define('SESSION_LIFETIME', 7200); // 2 horas
define('HASH_COST', 12);

// Configurações de Upload
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('UPLOAD_MAX_SIZE', 10485760); // 10MB
define('ALLOWED_EXTENSIONS', 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,zip,rar');

// Configurações de Timezone
define('APP_TIMEZONE', 'America/Recife');

// Modo de desenvolvimento (false em produção)
define('DEBUG_MODE', false);
