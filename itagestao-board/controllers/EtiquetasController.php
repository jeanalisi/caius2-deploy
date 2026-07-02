<?php
/**
 * Controller de Etiquetas (AJAX)
 */

$db = Database::getInstance();

switch ($action) {
    case 'listar':
        $quadro_id = $_GET['quadro_id'] ?? null;
        if ($quadro_id) {
            $etiquetas = $db->fetchAll(
                "SELECT * FROM etiquetas WHERE quadro_id IS NULL OR quadro_id = ? ORDER BY nome", [$quadro_id]
            );
        } else {
            $etiquetas = $db->fetchAll("SELECT * FROM etiquetas ORDER BY nome");
        }
        jsonResponse(['success' => true, 'etiquetas' => $etiquetas]);
        break;

    case 'criar':
        $id = $db->insert('etiquetas', [
            'nome' => post('nome'),
            'cor' => post('cor') ?: '#0d6efd',
            'quadro_id' => post('quadro_id') ?: null
        ]);
        jsonResponse(['success' => true, 'id' => $id]);
        break;

    case 'vincular':
        $cartao_id = intval(post('cartao_id'));
        $etiqueta_id = intval(post('etiqueta_id'));
        
        // Verificar se já existe
        $existe = $db->fetch("SELECT id FROM cartao_etiquetas WHERE cartao_id = ? AND etiqueta_id = ?", [$cartao_id, $etiqueta_id]);
        if (!$existe) {
            $db->insert('cartao_etiquetas', [
                'cartao_id' => $cartao_id,
                'etiqueta_id' => $etiqueta_id
            ]);
        }
        jsonResponse(['success' => true]);
        break;

    case 'desvincular':
        $cartao_id = intval(post('cartao_id'));
        $etiqueta_id = intval(post('etiqueta_id'));
        $db->delete('cartao_etiquetas', 'cartao_id = ? AND etiqueta_id = ?', [$cartao_id, $etiqueta_id]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
