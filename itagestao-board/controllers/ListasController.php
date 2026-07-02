<?php
/**
 * Controller de Listas (AJAX)
 */

$db = Database::getInstance();
$auth = new Auth();

switch ($action) {
    case 'criar':
        if (!$auth->temPermissao('quadros', 'editar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $quadro_id = intval(post('quadro_id'));
        $maxPos = $db->fetch("SELECT MAX(posicao) as max_pos FROM listas WHERE quadro_id = ?", [$quadro_id]);
        $posicao = ($maxPos['max_pos'] ?? 0) + 1;

        $id = $db->insert('listas', [
            'quadro_id' => $quadro_id,
            'titulo' => post('titulo'),
            'posicao' => $posicao
        ]);
        jsonResponse(['success' => true, 'message' => 'Lista criada.', 'id' => $id]);
        break;

    case 'editar':
        if (!$auth->temPermissao('quadros', 'editar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = intval(post('id'));
        $db->update('listas', ['titulo' => post('titulo')], 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Lista atualizada.']);
        break;

    case 'reordenar':
        $ordem = json_decode($_POST['ordem'] ?? '[]', true);
        if (is_array($ordem)) {
            foreach ($ordem as $pos => $id) {
                $db->update('listas', ['posicao' => $pos], 'id = ?', [intval($id)]);
            }
        }
        jsonResponse(['success' => true]);
        break;

    case 'excluir':
        if (!$auth->temPermissao('quadros', 'editar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = intval($_POST['id'] ?? 0);
        $db->update('listas', ['ativo' => 0], 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Lista removida.']);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
