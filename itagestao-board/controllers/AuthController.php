<?php
/**
 * Controller de Autenticação (AJAX)
 */

$auth = new Auth();

switch ($action) {
    case 'login':
        $email = post('email');
        $senha = $_POST['senha'] ?? '';
        $result = $auth->login($email, $senha);
        jsonResponse($result);
        break;

    case 'alterar-senha':
        $senha_atual = $_POST['senha_atual'] ?? '';
        $nova_senha = $_POST['nova_senha'] ?? '';
        $confirmar = $_POST['confirmar_senha'] ?? '';

        if (strlen($nova_senha) < 6) {
            jsonResponse(['success' => false, 'message' => 'A nova senha deve ter pelo menos 6 caracteres.']);
        }
        if ($nova_senha !== $confirmar) {
            jsonResponse(['success' => false, 'message' => 'As senhas não conferem.']);
        }

        $result = $auth->alterarSenha($_SESSION['usuario_id'], $senha_atual, $nova_senha);
        jsonResponse($result);
        break;

    case 'perfil':
        $db = Database::getInstance();
        $dados = [
            'nome' => post('nome'),
            'telefone' => post('telefone'),
            'cargo' => post('cargo')
        ];
        $db->update('usuarios', $dados, 'id = ?', [$_SESSION['usuario_id']]);
        $_SESSION['usuario_nome'] = $dados['nome'];
        jsonResponse(['success' => true, 'message' => 'Perfil atualizado com sucesso.']);
        break;

    default:
        jsonResponse(['success' => false, 'message' => 'Ação não encontrada.'], 404);
}
