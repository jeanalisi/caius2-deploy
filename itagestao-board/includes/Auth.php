<?php
/**
 * Classe de Autenticação e Gerenciamento de Sessão
 */
class Auth {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance();
    }

    /**
     * Realizar login
     */
    public function login($email, $senha) {
        $usuario = $this->db->fetch(
            "SELECT u.*, p.nome as perfil_nome, p.slug as perfil_slug, p.nivel as perfil_nivel,
                    s.nome as secretaria_nome, st.nome as setor_nome
             FROM usuarios u
             LEFT JOIN perfis p ON u.perfil_id = p.id
             LEFT JOIN secretarias s ON u.secretaria_id = s.id
             LEFT JOIN setores st ON u.setor_id = st.id
             WHERE u.email = ? AND u.ativo = 1",
            [$email]
        );

        if (!$usuario) {
            return ['success' => false, 'message' => 'E-mail não encontrado ou usuário inativo.'];
        }

        if (!password_verify($senha, $usuario['senha'])) {
            $this->registrarLog($usuario['id'], 'login_falha', 'auth', 'Tentativa de login com senha incorreta');
            return ['success' => false, 'message' => 'Senha incorreta.'];
        }

        // Atualizar último acesso
        $this->db->update('usuarios', ['ultimo_acesso' => date('Y-m-d H:i:s')], 'id = ?', [$usuario['id']]);

        // Criar sessão
        $_SESSION['usuario_id'] = $usuario['id'];
        $_SESSION['usuario_nome'] = $usuario['nome'];
        $_SESSION['usuario_email'] = $usuario['email'];
        $_SESSION['perfil_id'] = $usuario['perfil_id'];
        $_SESSION['perfil_slug'] = $usuario['perfil_slug'];
        $_SESSION['perfil_nivel'] = $usuario['perfil_nivel'];
        $_SESSION['secretaria_id'] = $usuario['secretaria_id'];
        $_SESSION['setor_id'] = $usuario['setor_id'];
        $_SESSION['primeiro_acesso'] = $usuario['primeiro_acesso'];
        $_SESSION['avatar'] = $usuario['avatar'];
        $_SESSION['logado'] = true;
        $_SESSION['login_time'] = time();

        // Registrar log de acesso
        $this->registrarLog($usuario['id'], 'login', 'auth', 'Login realizado com sucesso');

        return ['success' => true, 'usuario' => $usuario];
    }

    /**
     * Realizar logout
     */
    public function logout() {
        if (isset($_SESSION['usuario_id'])) {
            $this->registrarLog($_SESSION['usuario_id'], 'logout', 'auth', 'Logout realizado');
        }
        session_unset();
        session_destroy();
    }

    /**
     * Verificar se está logado
     */
    public static function check() {
        return isset($_SESSION['logado']) && $_SESSION['logado'] === true;
    }

    /**
     * Obter dados do usuário logado
     */
    public static function user($campo = null) {
        if (!self::check()) return null;
        if ($campo) {
            return $_SESSION[$campo] ?? null;
        }
        return [
            'id' => $_SESSION['usuario_id'],
            'nome' => $_SESSION['usuario_nome'],
            'email' => $_SESSION['usuario_email'],
            'perfil_id' => $_SESSION['perfil_id'],
            'perfil_slug' => $_SESSION['perfil_slug'],
            'perfil_nivel' => $_SESSION['perfil_nivel'],
            'secretaria_id' => $_SESSION['secretaria_id'],
            'setor_id' => $_SESSION['setor_id'],
            'avatar' => $_SESSION['avatar']
        ];
    }

    /**
     * Verificar se o usuário é administrador
     */
    public static function isAdmin() {
        return isset($_SESSION['perfil_slug']) && $_SESSION['perfil_slug'] === 'admin';
    }

    /**
     * Verificar permissão
     */
    public function temPermissao($modulo, $acao) {
        if (self::isAdmin()) return true;

        $perfil_id = $_SESSION['perfil_id'] ?? 0;
        $result = $this->db->fetch(
            "SELECT permitido FROM permissoes WHERE perfil_id = ? AND modulo = ? AND acao = ?",
            [$perfil_id, $modulo, $acao]
        );

        return $result && $result['permitido'] == 1;
    }

    /**
     * Verificar se pode ver o quadro (baseado na secretaria)
     */
    public function podeVerQuadro($quadro) {
        if (self::isAdmin()) return true;
        $perfil_slug = $_SESSION['perfil_slug'] ?? '';
        
        // Prefeito e Controle Interno veem tudo
        if (in_array($perfil_slug, ['prefeito', 'controle_interno'])) return true;

        // Quadros públicos
        if ($quadro['visibilidade'] === 'publico') return true;

        // Quadros da mesma secretaria
        if ($quadro['visibilidade'] === 'secretaria' && $quadro['secretaria_id'] == $_SESSION['secretaria_id']) return true;

        return false;
    }

    /**
     * Alterar senha
     */
    public function alterarSenha($usuario_id, $senha_atual, $nova_senha) {
        $usuario = $this->db->fetch("SELECT senha FROM usuarios WHERE id = ?", [$usuario_id]);
        
        if (!$usuario || !password_verify($senha_atual, $usuario['senha'])) {
            return ['success' => false, 'message' => 'Senha atual incorreta.'];
        }

        $hash = password_hash($nova_senha, PASSWORD_BCRYPT, ['cost' => HASH_COST]);
        $this->db->update('usuarios', [
            'senha' => $hash,
            'primeiro_acesso' => 0
        ], 'id = ?', [$usuario_id]);

        $_SESSION['primeiro_acesso'] = 0;
        $this->registrarLog($usuario_id, 'alterar_senha', 'auth', 'Senha alterada com sucesso');

        return ['success' => true, 'message' => 'Senha alterada com sucesso.'];
    }

    /**
     * Registrar log de acesso
     */
    private function registrarLog($usuario_id, $acao, $modulo, $descricao = '') {
        $this->db->insert('logs_acesso', [
            'usuario_id' => $usuario_id,
            'acao' => $acao,
            'modulo' => $modulo,
            'descricao' => $descricao,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
    }
}
