<?php
/**
 * ItaGestão Board - API AJAX
 * Endpoint para requisições assíncronas
 */

require_once __DIR__ . '/includes/init.php';

// Verificar autenticação
if (!Auth::check()) {
    jsonResponse(['success' => false, 'message' => 'Não autorizado.'], 401);
}

$module = $_GET['module'] ?? '';
$action = $_GET['action'] ?? '';

// Mapa de controllers AJAX
$controllers = [
    'auth' => 'controllers/AuthController.php',
    'quadros' => 'controllers/QuadrosController.php',
    'listas' => 'controllers/ListasController.php',
    'cartoes' => 'controllers/CartoesController.php',
    'usuarios' => 'controllers/UsuariosController.php',
    'secretarias' => 'controllers/SecretariasController.php',
    'setores' => 'controllers/SetoresController.php',
    'comentarios' => 'controllers/ComentariosController.php',
    'checklists' => 'controllers/ChecklistsController.php',
    'anexos' => 'controllers/AnexosController.php',
    'etiquetas' => 'controllers/EtiquetasController.php',
    'notificacoes' => 'controllers/NotificacoesController.php',
    'relatorios' => 'controllers/RelatoriosController.php',
    'dashboard' => 'controllers/DashboardController.php'
];

if (!isset($controllers[$module])) {
    jsonResponse(['success' => false, 'message' => 'Módulo não encontrado.'], 404);
}

require_once __DIR__ . '/' . $controllers[$module];
