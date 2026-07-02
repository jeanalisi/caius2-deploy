<?php
/**
 * Controller de Secretarias (AJAX)
 */

$db = Database::getInstance();
$auth = new Auth();

switch ($action) {
    case 'listar':
        $secretarias = $db->fetchAll("SELECT * FROM secretarias WHERE ativo = 1 ORDER BY nome");
        jsonResponse(['success' => true, 'secretarias' => $secretarias]);
        break;

    case 'criar':
        if (!$auth->temPermissao('secretarias', 'criar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = $db->insert('secretarias', [
            'nome' => post('nome'),
            'sigla' => post('sigla'),
            'descricao' => post('descricao'),
            'cor' => post('cor') ?: '#0d6efd'
        ]);
        jsonResponse(['success' => true, 'message' => 'Secretaria criada com sucesso.', 'id' => $id]);
        break;

    case 'editar':
        if (!$auth->temPermissao('secretarias', 'editar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = intval(post('id'));
        $db->update('secretarias', [
            'nome' => post('nome'),
            'sigla' => post('sigla'),
            'descricao' => post('descricao'),
            'cor' => post('cor') ?: '#0d6efd'
        ], 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Secretaria atualizada com sucesso.']);
        break;

    case 'excluir':
        if (!$auth->temPermissao('secretarias', 'excluir')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = intval($_POST['id'] ?? 0);
        $db->update('secretarias', ['ativo' => 0], 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Secretaria desativada com sucesso.']);
        break;

    case 'obter':
        $id = intval($_GET['id'] ?? 0);
        $secretaria = $db->fetch("SELECT * FROM secretarias WHERE id = ?", [$id]);
        jsonResponse(['success' => true, 'secretaria' => $secretaria]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
