<?php
/**
 * Controller de Checklists (AJAX)
 */

$db = Database::getInstance();

switch ($action) {
    case 'listar':
        $cartao_id = intval($_GET['cartao_id'] ?? 0);
        $itens = $db->fetchAll(
            "SELECT * FROM cartao_checklists WHERE cartao_id = ? ORDER BY posicao", [$cartao_id]
        );
        jsonResponse(['success' => true, 'itens' => $itens]);
        break;

    case 'criar':
        $cartao_id = intval(post('cartao_id'));
        $titulo = post('titulo');
        if (empty($titulo)) {
            jsonResponse(['success' => false, 'message' => 'Título não pode ser vazio.']);
        }
        $maxPos = $db->fetch("SELECT MAX(posicao) as max_pos FROM cartao_checklists WHERE cartao_id = ?", [$cartao_id]);
        $id = $db->insert('cartao_checklists', [
            'cartao_id' => $cartao_id,
            'titulo' => $titulo,
            'posicao' => ($maxPos['max_pos'] ?? 0) + 1
        ]);
        jsonResponse(['success' => true, 'id' => $id]);
        break;

    case 'toggle':
        $id = intval(post('id'));
        $concluido = intval(post('concluido'));
        $db->update('cartao_checklists', ['concluido' => $concluido], 'id = ?', [$id]);
        jsonResponse(['success' => true]);
        break;

    case 'excluir':
        $id = intval($_POST['id'] ?? 0);
        $db->delete('cartao_checklists', 'id = ?', [$id]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
