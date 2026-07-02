<?php
/**
 * Controller de Quadros (AJAX)
 */

$db = Database::getInstance();
$auth = new Auth();

switch ($action) {
    case 'listar':
        $where = 'q.ativo = 1';
        $params = [];

        // Filtrar por secretaria se não for admin/prefeito/controle
        $perfil = $_SESSION['perfil_slug'];
        if (!in_array($perfil, ['admin', 'prefeito', 'controle_interno'])) {
            $where .= " AND (q.visibilidade = 'publico' OR q.secretaria_id = ?)";
            $params[] = $_SESSION['secretaria_id'];
        }

        $quadros = $db->fetchAll(
            "SELECT q.*, s.nome as secretaria_nome, s.cor as secretaria_cor,
                    (SELECT COUNT(*) FROM cartoes c WHERE c.quadro_id = q.id) as total_cartoes,
                    (SELECT COUNT(*) FROM cartoes c WHERE c.quadro_id = q.id AND c.status = 'concluido') as cartoes_concluidos
             FROM quadros q
             LEFT JOIN secretarias s ON q.secretaria_id = s.id
             WHERE {$where} ORDER BY q.titulo", $params
        );
        jsonResponse(['success' => true, 'quadros' => $quadros]);
        break;

    case 'criar':
        if (!$auth->temPermissao('quadros', 'criar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }

        $tipo_fluxo = post('tipo_fluxo') ?: 'padrao';
        $id = $db->insert('quadros', [
            'titulo' => post('titulo'),
            'descricao' => post('descricao'),
            'secretaria_id' => post('secretaria_id') ?: null,
            'cor' => post('cor') ?: '#0d6efd',
            'icone' => post('icone') ?: 'bi-kanban',
            'tipo_fluxo' => $tipo_fluxo,
            'visibilidade' => post('visibilidade') ?: 'secretaria',
            'criado_por' => $_SESSION['usuario_id']
        ]);

        // Criar listas padrão baseadas no tipo de fluxo
        $listas = getListasPorFluxo($tipo_fluxo);
        foreach ($listas as $pos => $titulo) {
            $db->insert('listas', [
                'quadro_id' => $id,
                'titulo' => $titulo,
                'posicao' => $pos
            ]);
        }

        jsonResponse(['success' => true, 'message' => 'Quadro criado com sucesso.', 'id' => $id]);
        break;

    case 'editar':
        if (!$auth->temPermissao('quadros', 'editar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }

        $id = intval(post('id'));
        $db->update('quadros', [
            'titulo' => post('titulo'),
            'descricao' => post('descricao'),
            'secretaria_id' => post('secretaria_id') ?: null,
            'cor' => post('cor') ?: '#0d6efd',
            'visibilidade' => post('visibilidade') ?: 'secretaria'
        ], 'id = ?', [$id]);

        jsonResponse(['success' => true, 'message' => 'Quadro atualizado com sucesso.']);
        break;

    case 'excluir':
        if (!$auth->temPermissao('quadros', 'excluir')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }
        $id = intval($_POST['id'] ?? 0);
        $db->update('quadros', ['ativo' => 0], 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Quadro arquivado com sucesso.']);
        break;

    case 'obter':
        $id = intval($_GET['id'] ?? 0);
        $quadro = $db->fetch(
            "SELECT q.*, s.nome as secretaria_nome FROM quadros q 
             LEFT JOIN secretarias s ON q.secretaria_id = s.id WHERE q.id = ?", [$id]
        );
        if (!$quadro) {
            jsonResponse(['success' => false, 'message' => 'Quadro não encontrado.']);
        }
        $listas = $db->fetchAll(
            "SELECT * FROM listas WHERE quadro_id = ? AND ativo = 1 ORDER BY posicao", [$id]
        );
        jsonResponse(['success' => true, 'quadro' => $quadro, 'listas' => $listas]);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}

function getListasPorFluxo($tipo) {
    $fluxos = [
        'padrao' => ['Nova demanda', 'Em análise', 'Aguardando documentos', 'Em execução', 'Aguardando terceiros', 'Concluído', 'Arquivado'],
        'licitacao' => ['Solicitação', 'DFD', 'ETP', 'Termo de Referência', 'Pesquisa de preços', 'Parecer jurídico', 'Publicação', 'Contratação', 'Execução', 'Concluído'],
        'obras' => ['Demanda recebida', 'Projeto', 'Orçamento', 'Licitação', 'Ordem de serviço', 'Em execução', 'Medição', 'Concluída'],
        'convenios' => ['Ideia', 'Cadastro', 'Plano de trabalho', 'Análise', 'Aprovado', 'Execução', 'Prestação de contas', 'Finalizado']
    ];
    return $fluxos[$tipo] ?? $fluxos['padrao'];
}
