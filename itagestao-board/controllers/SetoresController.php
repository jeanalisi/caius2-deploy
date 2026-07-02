<?php
/**
 * Controller de Setores (AJAX)
 */

$db = Database::getInstance();
$auth = new Auth();

switch ($action) {
    case 'listar':
        $secretaria_id = $_GET['secretaria_id'] ?? '';
        $where = 'st.ativo = 1';
        $params = [];
        if ($secretaria_id) {
            $where .= ' AND st.secretaria_id = ?';
            $params[] = $secretaria_id;
        }
        $setores = $db->fetchAll(
            "SELECT st.*, s.nome as secretaria_nome FROM setores st 
             LEFT JOIN secretarias s ON st.secretaria_id = s.id 
             WHERE {$where} ORDER BY s.nome, st.nome", $params
        );
        jsonResponse(['success' => true, 'setores' => $setores]);
        break;

    case 'criar':
        if (!$auth->temPermissao('setores', 'criar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = $db->insert('setores', [
            'secretaria_id' => intval(post('secretaria_id')),
            'nome' => post('nome'),
            'descricao' => post('descricao')
        ]);
        jsonResponse(['success' => true, 'message' => 'Setor criado com sucesso.', 'id' => $id]);
        break;

    case 'editar':
        if (!$auth->temPermissao('setores', 'editar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = intval(post('id'));
        $db->update('setores', [
            'secretaria_id' => intval(post('secretaria_id')),
            'nome' => post('nome'),
            'descricao' => post('descricao')
        ], 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Setor atualizado com sucesso.']);
        break;

    case 'excluir':
        if (!$auth->temPermissao('setores', 'excluir')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = intval($_POST['id'] ?? 0);
        $db->update('setores', ['ativo' => 0], 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Setor desativado com sucesso.']);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
