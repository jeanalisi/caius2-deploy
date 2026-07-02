<?php
/**
 * Controller de Relatórios (AJAX)
 */

$db = Database::getInstance();
$auth = new Auth();

if (!$auth->temPermissao('relatorios', 'visualizar')) {
    jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
}

switch ($action) {
    case 'geral':
        $filtros = [
            'secretaria_id' => $_GET['secretaria_id'] ?? '',
            'prioridade_id' => $_GET['prioridade_id'] ?? '',
            'data_inicio' => $_GET['data_inicio'] ?? '',
            'data_fim' => $_GET['data_fim'] ?? '',
            'status' => $_GET['status'] ?? ''
        ];

        $where = '1=1';
        $params = [];

        if ($filtros['secretaria_id']) { $where .= ' AND c.secretaria_id = ?'; $params[] = $filtros['secretaria_id']; }
        if ($filtros['prioridade_id']) { $where .= ' AND c.prioridade_id = ?'; $params[] = $filtros['prioridade_id']; }
        if ($filtros['data_inicio']) { $where .= ' AND c.created_at >= ?'; $params[] = $filtros['data_inicio']; }
        if ($filtros['data_fim']) { $where .= ' AND c.created_at <= ?'; $params[] = $filtros['data_fim'] . ' 23:59:59'; }
        if ($filtros['status'] === 'atrasado') { $where .= " AND c.prazo < CURDATE() AND c.status NOT IN ('concluido','arquivado')"; }
        elseif ($filtros['status']) { $where .= ' AND c.status = ?'; $params[] = $filtros['status']; }

        $cartoes = $db->fetchAll(
            "SELECT c.*, p.nome as prioridade_nome, u.nome as responsavel_nome, 
                    s.nome as secretaria_nome, l.titulo as lista_titulo, q.titulo as quadro_titulo
             FROM cartoes c
             LEFT JOIN prioridades p ON c.prioridade_id = p.id
             LEFT JOIN usuarios u ON c.responsavel_id = u.id
             LEFT JOIN secretarias s ON c.secretaria_id = s.id
             LEFT JOIN listas l ON c.lista_id = l.id
             LEFT JOIN quadros q ON c.quadro_id = q.id
             WHERE {$where} ORDER BY c.created_at DESC", $params
        );

        jsonResponse(['success' => true, 'cartoes' => $cartoes, 'total' => count($cartoes)]);
        break;

    case 'exportar-csv':
        $filtros = $_GET;
        $where = '1=1';
        $params = [];
        if (!empty($filtros['secretaria_id'])) { $where .= ' AND c.secretaria_id = ?'; $params[] = $filtros['secretaria_id']; }
        if (!empty($filtros['status']) && $filtros['status'] !== 'atrasado') { $where .= ' AND c.status = ?'; $params[] = $filtros['status']; }
        if (!empty($filtros['status']) && $filtros['status'] === 'atrasado') { $where .= " AND c.prazo < CURDATE() AND c.status NOT IN ('concluido','arquivado')"; }

        $cartoes = $db->fetchAll(
            "SELECT c.titulo, c.descricao, p.nome as prioridade, u.nome as responsavel, 
                    s.nome as secretaria, l.titulo as lista, q.titulo as quadro, c.prazo, c.status, c.created_at
             FROM cartoes c
             LEFT JOIN prioridades p ON c.prioridade_id = p.id
             LEFT JOIN usuarios u ON c.responsavel_id = u.id
             LEFT JOIN secretarias s ON c.secretaria_id = s.id
             LEFT JOIN listas l ON c.lista_id = l.id
             LEFT JOIN quadros q ON c.quadro_id = q.id
             WHERE {$where} ORDER BY c.created_at DESC", $params
        );

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=relatorio_' . date('Y-m-d') . '.csv');
        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM UTF-8
        fputcsv($output, ['Título', 'Descrição', 'Prioridade', 'Responsável', 'Secretaria', 'Lista', 'Quadro', 'Prazo', 'Status', 'Criado em'], ';');
        foreach ($cartoes as $c) {
            fputcsv($output, $c, ';');
        }
        fclose($output);
        exit;
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
