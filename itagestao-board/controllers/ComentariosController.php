<?php
/**
 * Controller de Comentários (AJAX)
 */

$db = Database::getInstance();

switch ($action) {
    case 'listar':
        $cartao_id = intval($_GET['cartao_id'] ?? 0);
        $comentarios = $db->fetchAll(
            "SELECT cc.*, u.nome as usuario_nome FROM cartao_comentarios cc 
             LEFT JOIN usuarios u ON cc.usuario_id = u.id 
             WHERE cc.cartao_id = ? ORDER BY cc.created_at DESC", [$cartao_id]
        );
        foreach ($comentarios as &$c) {
            $c['iniciais'] = getInitials($c['usuario_nome']);
            $c['tempo_relativo'] = timeAgo($c['created_at']);
        }
        jsonResponse(['success' => true, 'comentarios' => $comentarios]);
        break;

    case 'criar':
        $cartao_id = intval(post('cartao_id'));
        $comentario = post('comentario');
        if (empty($comentario)) {
            jsonResponse(['success' => false, 'message' => 'Comentário não pode ser vazio.']);
        }
        $id = $db->insert('cartao_comentarios', [
            'cartao_id' => $cartao_id,
            'usuario_id' => $_SESSION['usuario_id'],
            'comentario' => $comentario
        ]);

        // Registrar no histórico
        $db->insert('cartao_historico', [
            'cartao_id' => $cartao_id,
            'usuario_id' => $_SESSION['usuario_id'],
            'acao' => 'comentario',
            'descricao' => 'Adicionou um comentário'
        ]);

        jsonResponse(['success' => true, 'id' => $id]);
        break;

    case 'excluir':
        $id = intval($_POST['id'] ?? 0);
        $comentario = $db->fetch("SELECT * FROM cartao_comentarios WHERE id = ?", [$id]);
        if ($comentario && ($comentario['usuario_id'] == $_SESSION['usuario_id'] || Auth::isAdmin())) {
            $db->delete('cartao_comentarios', 'id = ?', [$id]);
            jsonResponse(['success' => true]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.']);
        }
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
