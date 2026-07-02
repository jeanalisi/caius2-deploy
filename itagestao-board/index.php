<?php
/**
 * ItaGestão Board - Roteador Principal
 * Prefeitura Municipal de Itabaiana-PB
 */

require_once __DIR__ . '/includes/init.php';

// Se não está logado, redirecionar para login
if (!Auth::check()) {
    $page = $_GET['page'] ?? '';
    if ($page !== 'login' && $page !== 'recuperar-senha') {
        include __DIR__ . '/views/auth/login.php';
        exit;
    }
}

// Roteamento
$page = $_GET['page'] ?? 'dashboard';
$action = $_GET['action'] ?? 'index';

// Páginas públicas (sem autenticação)
$publicPages = ['login', 'recuperar-senha'];

if (in_array($page, $publicPages) && !Auth::check()) {
    include __DIR__ . '/views/auth/' . $page . '.php';
    exit;
}

// Verificar autenticação para páginas protegidas
if (!Auth::check()) {
    redirect('?page=login');
}

// Verificar primeiro acesso (forçar troca de senha)
if (!empty($_SESSION['primeiro_acesso']) && $page !== 'alterar-senha' && $page !== 'logout') {
    setFlash('info', 'Por segurança, altere sua senha no primeiro acesso.');
    redirect('?page=alterar-senha');
}

// Mapa de rotas
$routes = [
    'dashboard' => 'views/dashboard/index.php',
    'quadros' => 'views/quadros/index.php',
    'quadro' => 'views/quadros/ver.php',
    'cartoes' => 'views/cartoes/index.php',
    'cartao' => 'views/cartoes/ver.php',
    'usuarios' => 'views/usuarios/index.php',
    'secretarias' => 'views/secretarias/index.php',
    'setores' => 'views/setores/index.php',
    'perfis' => 'views/perfis/index.php',
    'relatorios' => 'views/relatorios/index.php',
    'configuracoes' => 'views/configuracoes/index.php',
    'minhas-tarefas' => 'views/cartoes/minhas.php',
    'tarefas-atrasadas' => 'views/cartoes/atrasadas.php',
    'tarefas-hoje' => 'views/cartoes/hoje.php',
    'meu-perfil' => 'views/usuarios/perfil.php',
    'alterar-senha' => 'views/auth/alterar-senha.php',
    'notificacoes' => 'views/dashboard/notificacoes.php',
    'logout' => 'controllers/logout.php'
];

if (isset($routes[$page])) {
    include __DIR__ . '/' . $routes[$page];
} else {
    http_response_code(404);
    include __DIR__ . '/views/errors/404.php';
}
