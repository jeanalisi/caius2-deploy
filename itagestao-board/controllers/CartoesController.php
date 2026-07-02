<?php
/**
 * Controller de Cartões (AJAX)
 */

$db = Database::getInstance();
$auth = new Auth();

switch ($action) {
    case 'listar':
        $lista_id = intval($_GET['lista_id'] ?? 0);
        $quadro_id = intval($_GET['quadro_id'] ?? 0);

        $where = '1=1';
        $params = [];

        if ($lista_id) { $where .= ' AND c.lista_id = ?'; $params[] = $lista_id; }
        if ($quadro_id) { $where .= ' AND c.quadro_id = ?'; $params[] = $quadro_id; }

        $cartoes = $db->fetchAll(
            "SELECT c.*, p.nome as prioridade_nome, p.cor as prioridade_cor,
                    u.nome as responsavel_nome, s.nome as secretaria_nome
             FROM cartoes c
             LEFT JOIN prioridades p ON c.prioridade_id = p.id
             LEFT JOIN usuarios u ON c.responsavel_id = u.id
             LEFT JOIN secretarias s ON c.secretaria_id = s.id
             WHERE {$where} ORDER BY c.posicao", $params
        );
        jsonResponse(['success' => true, 'cartoes' => $cartoes]);
        break;

    case 'criar':
        if (!$auth->temPermissao('cartoes', 'criar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }

        $lista_id = intval(post('lista_id'));
        $quadro_id = intval(post('quadro_id'));
        $maxPos = $db->fetch("SELECT MAX(posicao) as max_pos FROM cartoes WHERE lista_id = ?", [$lista_id]);

        $id = $db->insert('cartoes', [
            'lista_id' => $lista_id,
            'quadro_id' => $quadro_id,
            'titulo' => post('titulo'),
            'descricao' => post('descricao'),
            'secretaria_id' => post('secretaria_id') ?: null,
            'setor_id' => post('setor_id') ?: null,
            'solicitante' => post('solicitante'),
            'responsavel_id' => post('responsavel_id') ?: null,
            'prioridade_id' => post('prioridade_id') ?: null,
            'prazo' => post('prazo') ?: null,
            'observacoes_internas' => post('observacoes_internas'),
            'posicao' => ($maxPos['max_pos'] ?? 0) + 1,
            'criado_por' => $_SESSION['usuario_id']
        ]);

        // Registrar histórico
        $db->insert('cartao_historico', [
            'cartao_id' => $id,
            'usuario_id' => $_SESSION['usuario_id'],
            'acao' => 'criacao',
            'descricao' => 'Cartão criado'
        ]);

        jsonResponse(['success' => true, 'message' => 'Cartão criado com sucesso.', 'id' => $id]);
        break;

    case 'editar':
        if (!$auth->temPermissao('cartoes', 'editar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }

        $id = intval(post('id'));
        $dados = [
            'titulo' => post('titulo'),
            'descricao' => post('descricao'),
            'secretaria_id' => post('secretaria_id') ?: null,
            'setor_id' => post('setor_id') ?: null,
            'solicitante' => post('solicitante'),
            'responsavel_id' => post('responsavel_id') ?: null,
            'prioridade_id' => post('prioridade_id') ?: null,
            'prazo' => post('prazo') ?: null,
            'observacoes_internas' => post('observacoes_internas')
        ];

        $db->update('cartoes', $dados, 'id = ?', [$id]);

        $db->insert('cartao_historico', [
            'cartao_id' => $id,
            'usuario_id' => $_SESSION['usuario_id'],
            'acao' => 'edicao',
            'descricao' => 'Cartão editado'
        ]);

        jsonResponse(['success' => true, 'message' => 'Cartão atualizado com sucesso.']);
        break;

    case 'mover':
        if (!$auth->temPermissao('cartoes', 'mover')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }

        $cartao_id = intval(post('cartao_id'));
        $nova_lista_id = intval(post('lista_id'));
        $nova_posicao = intval(post('posicao'));

        // Obter lista anterior
        $cartao = $db->fetch("SELECT lista_id FROM cartoes WHERE id = ?", [$cartao_id]);
        $lista_anterior = $cartao['lista_id'] ?? 0;

        $db->update('cartoes', [
            'lista_id' => $nova_lista_id,
            'posicao' => $nova_posicao
        ], 'id = ?', [$cartao_id]);

        // Registrar movimentação se mudou de lista
        if ($lista_anterior != $nova_lista_id) {
            $listaOrigem = $db->fetch("SELECT titulo FROM listas WHERE id = ?", [$lista_anterior]);
            $listaDestino = $db->fetch("SELECT titulo FROM listas WHERE id = ?", [$nova_lista_id]);

            $db->insert('cartao_historico', [
                'cartao_id' => $cartao_id,
                'usuario_id' => $_SESSION['usuario_id'],
                'acao' => 'movimentacao',
                'descricao' => "Movido de \"{$listaOrigem['titulo']}\" para \"{$listaDestino['titulo']}\"",
                'lista_origem_id' => $lista_anterior,
                'lista_destino_id' => $nova_lista_id
            ]);
        }

        jsonResponse(['success' => true]);
        break;

    case 'detalhes':
        $id = intval($_GET['id'] ?? 0);
        $cartao = $db->fetch(
            "SELECT c.*, p.nome as prioridade_nome, p.cor as prioridade_cor,
                    u.nome as responsavel_nome, s.nome as secretaria_nome,
                    st.nome as setor_nome, l.titulo as lista_titulo,
                    cr.nome as criador_nome
             FROM cartoes c
             LEFT JOIN prioridades p ON c.prioridade_id = p.id
             LEFT JOIN usuarios u ON c.responsavel_id = u.id
             LEFT JOIN secretarias s ON c.secretaria_id = s.id
             LEFT JOIN setores st ON c.setor_id = st.id
             LEFT JOIN listas l ON c.lista_id = l.id
             LEFT JOIN usuarios cr ON c.criado_por = cr.id
             WHERE c.id = ?", [$id]
        );

        if (!$cartao) {
            jsonResponse(['success' => false, 'message' => 'Cartão não encontrado.']);
        }

        // Responsáveis auxiliares
        $responsaveis = $db->fetchAll(
            "SELECT cr.*, u.nome as usuario_nome FROM cartao_responsaveis cr 
             LEFT JOIN usuarios u ON cr.usuario_id = u.id WHERE cr.cartao_id = ?", [$id]
        );
        $cartao['responsaveis_auxiliares'] = $responsaveis;

        // Etiquetas
        $etiquetas = $db->fetchAll(
            "SELECT e.* FROM cartao_etiquetas ce 
             LEFT JOIN etiquetas e ON ce.etiqueta_id = e.id WHERE ce.cartao_id = ?", [$id]
        );
        $cartao['etiquetas'] = $etiquetas;

        jsonResponse(['success' => true, 'cartao' => $cartao]);
        break;

    case 'historico':
        $id = intval($_GET['id'] ?? 0);
        $historico = $db->fetchAll(
            "SELECT h.*, u.nome as usuario_nome FROM cartao_historico h 
             LEFT JOIN usuarios u ON h.usuario_id = u.id 
             WHERE h.cartao_id = ? ORDER BY h.created_at DESC LIMIT 50", [$id]
        );
        foreach ($historico as &$h) {
            $h['tempo_relativo'] = timeAgo($h['created_at']);
        }
        jsonResponse(['success' => true, 'historico' => $historico]);
        break;

    case 'concluir':
        $id = intval(post('id'));
        $db->update('cartoes', [
            'status' => 'concluido',
            'concluido_em' => date('Y-m-d H:i:s')
        ], 'id = ?', [$id]);

        $db->insert('cartao_historico', [
            'cartao_id' => $id,
            'usuario_id' => $_SESSION['usuario_id'],
            'acao' => 'conclusao',
            'descricao' => 'Cartão marcado como concluído'
        ]);
        jsonResponse(['success' => true, 'message' => 'Cartão concluído.']);
        break;

    case 'excluir':
        if (!$auth->temPermissao('cartoes', 'excluir')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = intval($_POST['id'] ?? 0);
        $db->delete('cartoes', 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Cartão excluído.']);
        break;

    case 'minhas':
        $usuario_id = $_SESSION['usuario_id'];
        $cartoes = $db->fetchAll(
            "SELECT c.*, p.nome as prioridade_nome, p.cor as prioridade_cor,
                    l.titulo as lista_titulo, q.titulo as quadro_titulo, s.nome as secretaria_nome
             FROM cartoes c
             LEFT JOIN prioridades p ON c.prioridade_id = p.id
             LEFT JOIN listas l ON c.lista_id = l.id
             LEFT JOIN quadros q ON c.quadro_id = q.id
             LEFT JOIN secretarias s ON c.secretaria_id = s.id
             WHERE (c.responsavel_id = ? OR c.id IN (SELECT cartao_id FROM cartao_responsaveis WHERE usuario_id = ?))
             AND c.status != 'concluido'
             ORDER BY c.prazo ASC", [$usuario_id, $usuario_id]
        );
        jsonResponse(['success' => true, 'cartoes' => $cartoes]);
        break;

    case 'atrasadas':
        $where = "c.prazo < CURDATE() AND c.status NOT IN ('concluido', 'arquivado')";
        $params = [];
        $perfil = $_SESSION['perfil_slug'];
        if (!in_array($perfil, ['admin', 'prefeito', 'controle_interno'])) {
            $where .= " AND c.secretaria_id = ?";
            $params[] = $_SESSION['secretaria_id'];
        }
        $cartoes = $db->fetchAll(
            "SELECT c.*, p.nome as prioridade_nome, p.cor as prioridade_cor,
                    u.nome as responsavel_nome, l.titulo as lista_titulo, 
                    q.titulo as quadro_titulo, s.nome as secretaria_nome
             FROM cartoes c
             LEFT JOIN prioridades p ON c.prioridade_id = p.id
             LEFT JOIN usuarios u ON c.responsavel_id = u.id
             LEFT JOIN listas l ON c.lista_id = l.id
             LEFT JOIN quadros q ON c.quadro_id = q.id
             LEFT JOIN secretarias s ON c.secretaria_id = s.id
             WHERE {$where} ORDER BY c.prazo ASC", $params
        );
        jsonResponse(['success' => true, 'cartoes' => $cartoes]);
        break;

    case 'hoje':
        $where = "c.prazo = CURDATE() AND c.status NOT IN ('concluido', 'arquivado')";
        $params = [];
        $perfil = $_SESSION['perfil_slug'];
        if (!in_array($perfil, ['admin', 'prefeito', 'controle_interno'])) {
            $where .= " AND (c.responsavel_id = ? OR c.secretaria_id = ?)";
            $params[] = $_SESSION['usuario_id'];
            $params[] = $_SESSION['secretaria_id'];
        }
        $cartoes = $db->fetchAll(
            "SELECT c.*, p.nome as prioridade_nome, p.cor as prioridade_cor,
                    u.nome as responsavel_nome, l.titulo as lista_titulo, 
                    q.titulo as quadro_titulo, s.nome as secretaria_nome
             FROM cartoes c
             LEFT JOIN prioridades p ON c.prioridade_id = p.id
             LEFT JOIN usuarios u ON c.responsavel_id = u.id
             LEFT JOIN listas l ON c.lista_id = l.id
             LEFT JOIN quadros q ON c.quadro_id = q.id
             LEFT JOIN secretarias s ON c.secretaria_id = s.id
             WHERE {$where} ORDER BY c.prioridade_id DESC", $params
        );
        jsonResponse(['success' => true, 'cartoes' => $cartoes]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
