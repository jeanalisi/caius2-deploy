<?php
/**
 * Controller do Dashboard (AJAX)
 */

$db = Database::getInstance();

switch ($action) {
    case 'stats':
        $perfil = $_SESSION['perfil_slug'];
        $where_sec = '';
        $params = [];
        if (!in_array($perfil, ['admin', 'prefeito', 'controle_interno'])) {
            $where_sec = " AND c.secretaria_id = ?";
            $params[] = $_SESSION['secretaria_id'];
        }

        $abertas = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.status NOT IN ('concluido','arquivado') {$where_sec}", $params)['total'];
        $concluidas = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.status = 'concluido' {$where_sec}", $params)['total'];
        $atrasadas = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.prazo < CURDATE() AND c.status NOT IN ('concluido','arquivado') {$where_sec}", $params)['total'];
        $hoje = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.prazo = CURDATE() AND c.status NOT IN ('concluido','arquivado') {$where_sec}", $params)['total'];
        $semana = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.prazo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND c.status NOT IN ('concluido','arquivado') {$where_sec}", $params)['total'];

        jsonResponse([
            'success' => true,
            'stats' => [
                'abertas' => $abertas,
                'concluidas' => $concluidas,
                'atrasadas' => $atrasadas,
                'hoje' => $hoje,
                'semana' => $semana
            ]
        ]);
        break;

    case 'por-secretaria':
        $dados = $db->fetchAll(
            "SELECT s.nome, s.sigla, COUNT(c.id) as total 
             FROM secretarias s 
             LEFT JOIN cartoes c ON c.secretaria_id = s.id AND c.status NOT IN ('concluido','arquivado')
             WHERE s.ativo = 1 
             GROUP BY s.id ORDER BY total DESC LIMIT 10"
        );
        jsonResponse(['success' => true, 'dados' => $dados]);
        break;

    case 'por-status':
        $dados = $db->fetchAll(
            "SELECT l.titulo as status, COUNT(c.id) as total 
             FROM listas l 
             LEFT JOIN cartoes c ON c.lista_id = l.id 
             WHERE l.ativo = 1 
             GROUP BY l.id ORDER BY total DESC LIMIT 10"
        );
        jsonResponse(['success' => true, 'dados' => $dados]);
        break;

    case 'ultimas-movimentacoes':
        $perfil = $_SESSION['perfil_slug'];
        $where = '1=1';
        $params = [];
        if (!in_array($perfil, ['admin', 'prefeito', 'controle_interno'])) {
            $where = "c.secretaria_id = ?";
            $params[] = $_SESSION['secretaria_id'];
        }
        $movimentacoes = $db->fetchAll(
            "SELECT h.*, u.nome as usuario_nome, c.titulo as cartao_titulo 
             FROM cartao_historico h 
             LEFT JOIN usuarios u ON h.usuario_id = u.id 
             LEFT JOIN cartoes c ON h.cartao_id = c.id 
             WHERE {$where}
             ORDER BY h.created_at DESC LIMIT 15", $params
        );
        foreach ($movimentacoes as &$m) {
            $m['tempo_relativo'] = timeAgo($m['created_at']);
        }
        jsonResponse(['success' => true, 'movimentacoes' => $movimentacoes]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
