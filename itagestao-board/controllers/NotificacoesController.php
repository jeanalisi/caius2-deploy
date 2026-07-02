<?php
/**
 * Controller de Notificações (AJAX)
 */

$db = Database::getInstance();
$usuario_id = $_SESSION['usuario_id'];

switch ($action) {
    case 'listar':
        $notificacoes = $db->fetchAll(
            "SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 20", [$usuario_id]
        );
        $naoLidas = $db->count('notificacoes', 'usuario_id = ? AND lida = 0', [$usuario_id]);
        jsonResponse(['success' => true, 'notificacoes' => $notificacoes, 'nao_lidas' => $naoLidas]);
        break;

    case 'marcar-lida':
        $id = intval(post('id'));
        $db->update('notificacoes', ['lida' => 1], 'id = ? AND usuario_id = ?', [$id, $usuario_id]);
        jsonResponse(['success' => true]);
        break;

    case 'marcar-todas':
        $db->update('notificacoes', ['lida' => 1], 'usuario_id = ? AND lida = 0', [$usuario_id]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
