<?php
/**
 * Funções auxiliares do sistema
 */

/**
 * Redirecionar para URL
 */
function redirect($url) {
    header("Location: " . SITE_URL . '/' . $url);
    exit;
}

/**
 * Retornar JSON
 */
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Sanitizar entrada
 */
function sanitize($input) {
    if (is_array($input)) {
        return array_map('sanitize', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

/**
 * Obter valor POST sanitizado
 */
function post($key, $default = '') {
    return isset($_POST[$key]) ? sanitize($_POST[$key]) : $default;
}

/**
 * Obter valor GET sanitizado
 */
function get($key, $default = '') {
    return isset($_GET[$key]) ? sanitize($_GET[$key]) : $default;
}

/**
 * Gerar token CSRF
 */
function csrfToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verificar token CSRF
 */
function csrfVerify($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Campo hidden CSRF
 */
function csrfField() {
    return '<input type="hidden" name="csrf_token" value="' . csrfToken() . '">';
}

/**
 * Formatar data
 */
function formatDate($date, $format = 'd/m/Y') {
    if (empty($date)) return '-';
    return date($format, strtotime($date));
}

/**
 * Formatar data e hora
 */
function formatDateTime($date) {
    if (empty($date)) return '-';
    return date('d/m/Y H:i', strtotime($date));
}

/**
 * Tempo relativo (há X minutos)
 */
function timeAgo($datetime) {
    $time = strtotime($datetime);
    $diff = time() - $time;

    if ($diff < 60) return 'agora';
    if ($diff < 3600) return floor($diff / 60) . ' min atrás';
    if ($diff < 86400) return floor($diff / 3600) . 'h atrás';
    if ($diff < 604800) return floor($diff / 86400) . ' dias atrás';
    return formatDate($datetime);
}

/**
 * Mensagem flash
 */
function setFlash($tipo, $mensagem) {
    $_SESSION['flash'] = ['tipo' => $tipo, 'mensagem' => $mensagem];
}

function getFlash() {
    if (isset($_SESSION['flash'])) {
        $flash = $_SESSION['flash'];
        unset($_SESSION['flash']);
        return $flash;
    }
    return null;
}

/**
 * Renderizar alerta flash
 */
function renderFlash() {
    $flash = getFlash();
    if ($flash) {
        $tipo = $flash['tipo'];
        $msg = $flash['mensagem'];
        echo "<div class='alert alert-{$tipo} alert-dismissible fade show' role='alert'>
                {$msg}
                <button type='button' class='btn-close' data-bs-dismiss='alert'></button>
              </div>";
    }
}

/**
 * Upload de arquivo seguro
 */
function uploadFile($file, $dir = 'anexos') {
    $uploadDir = UPLOAD_DIR . $dir . '/';
    
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $nomeOriginal = $file['name'];
    $extensao = strtolower(pathinfo($nomeOriginal, PATHINFO_EXTENSION));
    $extensoesPermitidas = explode(',', ALLOWED_EXTENSIONS);

    if (!in_array($extensao, $extensoesPermitidas)) {
        return ['success' => false, 'message' => 'Extensão de arquivo não permitida.'];
    }

    if ($file['size'] > UPLOAD_MAX_SIZE) {
        return ['success' => false, 'message' => 'Arquivo excede o tamanho máximo permitido.'];
    }

    $nomeArquivo = uniqid() . '_' . time() . '.' . $extensao;
    $caminhoCompleto = $uploadDir . $nomeArquivo;

    if (move_uploaded_file($file['tmp_name'], $caminhoCompleto)) {
        return [
            'success' => true,
            'nome_original' => $nomeOriginal,
            'nome_arquivo' => $nomeArquivo,
            'caminho' => 'uploads/' . $dir . '/' . $nomeArquivo,
            'tipo' => $file['type'],
            'tamanho' => $file['size']
        ];
    }

    return ['success' => false, 'message' => 'Erro ao fazer upload do arquivo.'];
}

/**
 * Formatar tamanho de arquivo
 */
function formatFileSize($bytes) {
    if ($bytes >= 1073741824) return number_format($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576) return number_format($bytes / 1048576, 2) . ' MB';
    if ($bytes >= 1024) return number_format($bytes / 1024, 2) . ' KB';
    return $bytes . ' bytes';
}

/**
 * Gerar paginação
 */
function paginate($total, $pagina, $porPagina = 20) {
    $totalPaginas = ceil($total / $porPagina);
    $offset = ($pagina - 1) * $porPagina;
    return [
        'total' => $total,
        'pagina' => $pagina,
        'por_pagina' => $porPagina,
        'total_paginas' => $totalPaginas,
        'offset' => $offset,
        'tem_anterior' => $pagina > 1,
        'tem_proximo' => $pagina < $totalPaginas
    ];
}

/**
 * Verificar se é requisição AJAX
 */
function isAjax() {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

/**
 * Obter iniciais do nome
 */
function getInitials($nome) {
    $parts = explode(' ', $nome);
    $initials = '';
    $initials .= strtoupper(substr($parts[0], 0, 1));
    if (count($parts) > 1) {
        $initials .= strtoupper(substr(end($parts), 0, 1));
    }
    return $initials;
}

/**
 * Cor do badge de prioridade
 */
function prioridadeBadge($prioridade) {
    $cores = [
        'Baixa' => 'success',
        'Média' => 'warning',
        'Alta' => 'orange',
        'Urgente' => 'danger'
    ];
    return $cores[$prioridade] ?? 'secondary';
}

/**
 * Verificar se prazo está vencido
 */
function prazoVencido($prazo) {
    if (empty($prazo)) return false;
    return strtotime($prazo) < strtotime('today');
}

/**
 * Verificar se prazo vence hoje
 */
function prazoHoje($prazo) {
    if (empty($prazo)) return false;
    return date('Y-m-d', strtotime($prazo)) === date('Y-m-d');
}

/**
 * Gerar slug
 */
function slugify($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    return $text;
}

/**
 * URL ativa para menu
 */
function menuActive($page) {
    $current = $_GET['page'] ?? 'dashboard';
    return $current === $page ? 'active' : '';
}

/**
 * Truncar texto
 */
function truncate($text, $length = 100) {
    if (strlen($text) <= $length) return $text;
    return substr($text, 0, $length) . '...';
}
