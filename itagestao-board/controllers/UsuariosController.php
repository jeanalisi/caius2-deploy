<?php
/**
 * Controller de Usuários (AJAX)
 */

$db = Database::getInstance();
$auth = new Auth();

switch ($action) {
    case 'listar':
        $page = intval($_GET['pagina'] ?? 1);
        $porPagina = 20;
        $offset = ($page - 1) * $porPagina;
        $busca = $_GET['busca'] ?? '';
        $secretaria = $_GET['secretaria_id'] ?? '';

        $where = '1=1';
        $params = [];

        if ($busca) {
            $where .= " AND (u.nome LIKE ? OR u.email LIKE ?)";
            $params[] = "%{$busca}%";
            $params[] = "%{$busca}%";
        }
        if ($secretaria) {
            $where .= " AND u.secretaria_id = ?";
            $params[] = $secretaria;
        }

        $total = $db->fetch("SELECT COUNT(*) as total FROM usuarios u WHERE {$where}", $params)['total'];
        $usuarios = $db->fetchAll(
            "SELECT u.*, p.nome as perfil_nome, s.nome as secretaria_nome 
             FROM usuarios u 
             LEFT JOIN perfis p ON u.perfil_id = p.id 
             LEFT JOIN secretarias s ON u.secretaria_id = s.id 
             WHERE {$where} ORDER BY u.nome LIMIT {$porPagina} OFFSET {$offset}",
            $params
        );

        jsonResponse(['success' => true, 'usuarios' => $usuarios, 'total' => $total]);
        break;

    case 'criar':
        if (!$auth->temPermissao('usuarios', 'criar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }

        $nome = post('nome');
        $email = post('email');
        $senha = $_POST['senha'] ?? 'mudar123';
        $perfil_id = intval(post('perfil_id'));
        $secretaria_id = post('secretaria_id') ?: null;
        $setor_id = post('setor_id') ?: null;
        $cargo = post('cargo');

        // Verificar e-mail duplicado
        $existe = $db->fetch("SELECT id FROM usuarios WHERE email = ?", [$email]);
        if ($existe) {
            jsonResponse(['success' => false, 'message' => 'Este e-mail já está cadastrado.']);
        }

        $hash = password_hash($senha, PASSWORD_BCRYPT, ['cost' => HASH_COST]);
        $id = $db->insert('usuarios', [
            'nome' => $nome,
            'email' => $email,
            'senha' => $hash,
            'perfil_id' => $perfil_id,
            'secretaria_id' => $secretaria_id,
            'setor_id' => $setor_id,
            'cargo' => $cargo,
            'primeiro_acesso' => 1
        ]);

        jsonResponse(['success' => true, 'message' => 'Usuário criado com sucesso.', 'id' => $id]);
        break;

    case 'editar':
        if (!$auth->temPermissao('usuarios', 'editar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }

        $id = intval(post('id'));
        $dados = [
            'nome' => post('nome'),
            'email' => post('email'),
            'perfil_id' => intval(post('perfil_id')),
            'secretaria_id' => post('secretaria_id') ?: null,
            'setor_id' => post('setor_id') ?: null,
            'cargo' => post('cargo'),
            'ativo' => intval(post('ativo'))
        ];

        // Verificar e-mail duplicado
        $existe = $db->fetch("SELECT id FROM usuarios WHERE email = ? AND id != ?", [$dados['email'], $id]);
        if ($existe) {
            jsonResponse(['success' => false, 'message' => 'Este e-mail já está em uso por outro usuário.']);
        }

        $db->update('usuarios', $dados, 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Usuário atualizado com sucesso.']);
        break;

    case 'excluir':
        if (!$auth->temPermissao('usuarios', 'excluir')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }

        $id = intval($_POST['id'] ?? 0);
        if ($id == $_SESSION['usuario_id']) {
            jsonResponse(['success' => false, 'message' => 'Você não pode excluir seu próprio usuário.']);
        }

        $db->update('usuarios', ['ativo' => 0], 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Usuário desativado com sucesso.']);
        break;

    case 'resetar-senha':
        if (!$auth->temPermissao('usuarios', 'editar')) {
            jsonResponse(['success' => false, 'message' => 'Sem permissão.'], 403);
        }

        $id = intval($_POST['id'] ?? 0);
        $novaSenha = 'mudar123';
        $hash = password_hash($novaSenha, PASSWORD_BCRYPT, ['cost' => HASH_COST]);
        $db->update('usuarios', ['senha' => $hash, 'primeiro_acesso' => 1], 'id = ?', [$id]);
        jsonResponse(['success' => true, 'message' => 'Senha resetada para: mudar123']);
        break;

    case 'obter':
        $id = intval($_GET['id'] ?? 0);
        $usuario = $db->fetch(
            "SELECT u.*, p.nome as perfil_nome, s.nome as secretaria_nome 
             FROM usuarios u 
             LEFT JOIN perfis p ON u.perfil_id = p.id 
             LEFT JOIN secretarias s ON u.secretaria_id = s.id 
             WHERE u.id = ?", [$id]
        );
        if ($usuario) {
            unset($usuario['senha']);
            jsonResponse(['success' => true, 'usuario' => $usuario]);
        } else {
            jsonResponse(['success' => false, 'message' => 'Usuário não encontrado.']);
        }
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
