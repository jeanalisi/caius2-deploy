<?php
/**
 * ItaGestão Board - Inicialização do Sistema
 */

// Verificar se o sistema está instalado
if (!file_exists(__DIR__ . '/../config.php')) {
    header('Location: install/');
    exit;
}

// Carregar configuração
require_once __DIR__ . '/../config.php';

// Configurar timezone
date_default_timezone_set(APP_TIMEZONE);

// Configurar sessão
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
session_name(SESSION_NAME);
session_start();

// Configurar exibição de erros
if (defined('DEBUG_MODE') && DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Carregar classes e helpers
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/helpers.php';

// Verificar timeout de sessão
if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > SESSION_LIFETIME) {
    session_unset();
    session_destroy();
    session_start();
    setFlash('warning', 'Sua sessão expirou. Faça login novamente.');
}
