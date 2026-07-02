<?php
/**
 * Controller de Anexos (AJAX)
 */

$db = Database::getInstance();

switch ($action) {
    case 'listar':
        $cartao_id = intval($_GET['cartao_id'] ?? 0);
        $anexos = $db->fetchAll(
            "SELECT a.*, u.nome as usuario_nome FROM cartao_anexos a 
             LEFT JOIN usuarios u ON a.usuario_id = u.id 
             WHERE a.cartao_id = ? ORDER BY a.created_at DESC", [$cartao_id]
        );
        foreach ($anexos as &$a) {
            $a['tamanho_formatado'] = formatFileSize($a['tamanho']);
        }
        jsonResponse(['success' => true, 'anexos' => $anexos]);
        break;

    case 'upload':
        $cartao_id = intval(post('cartao_id'));
        if (!isset($_FILES['arquivo']) || $_FILES['arquivo']['error'] !== UPLOAD_ERR_OK) {
            jsonResponse(['success' => false, 'message' => 'Nenhum arquivo enviado ou erro no upload.']);
        }

        $tipo_anexo = post('tipo_anexo') ?: 'anexo';
        $dir = $tipo_anexo === 'evidencia' ? 'evidencias' : 'anexos';
        $result = uploadFile($_FILES['arquivo'], $dir);

        if (!$result['success']) {
            jsonResponse($result);
        }

        $id = $db->insert('cartao_anexos', [
            'cartao_id' => $cartao_id,
            'usuario_id' => $_SESSION['usuario_id'],
            'nome_original' => $result['nome_original'],
            'nome_arquivo' => $result['nome_arquivo'],
            'tipo' => $result['tipo'],
            'tamanho' => $result['tamanho'],
            'caminho' => $result['caminho'],
            'tipo_anexo' => $tipo_anexo
        ]);

        // Registrar no histórico
        $db->insert('cartao_historico', [
            'cartao_id' => $cartao_id,
            'usuario_id' => $_SESSION['usuario_id'],
            'acao' => 'anexo',
            'descricao' => "Anexou arquivo: {$result['nome_original']}"
        ]);

        jsonResponse(['success' => true, 'id' => $id, 'message' => 'Arquivo enviado com sucesso.']);
        break;

    case 'excluir':
        $id = intval($_POST['id'] ?? 0);
        $anexo = $db->fetch("SELECT * FROM cartao_anexos WHERE id = ?", [$id]);
        if ($anexo) {
            // Remover arquivo físico
            $filepath = __DIR__ . '/../' . $anexo['caminho'];
            if (file_exists($filepath)) {
                unlink($filepath);
            }
            $db->delete('cartao_anexos', 'id = ?', [$id]);
            jsonResponse(['success' => true]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Anexo não encontrado.']);
        }
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
