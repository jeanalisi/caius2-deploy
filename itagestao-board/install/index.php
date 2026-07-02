<?php
/**
 * ItaGestão Board - Instalador Web
 * Prefeitura Municipal de Itabaiana-PB
 */

session_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Verificar se já está instalado
if (file_exists(__DIR__ . '/../config.php')) {
    $config = file_get_contents(__DIR__ . '/../config.php');
    if (strpos($config, 'DB_NAME') !== false) {
        echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Já instalado</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
        </head><body class="bg-light d-flex align-items-center justify-content-center" style="min-height:100vh;">
        <div class="card shadow" style="max-width:500px;width:100%;">
        <div class="card-body text-center p-4">
        <i class="bi bi-check-circle-fill text-success" style="font-size:3rem;"></i>
        <h4 class="mt-3">Sistema já instalado</h4>
        <p class="text-muted">O ItaGestão Board já está configurado. Por segurança, remova ou renomeie a pasta <code>/install</code>.</p>
        <a href="../" class="btn btn-primary">Acessar o Sistema</a>
        </div></div></body></html>';
        exit;
    }
}

$step = intval($_GET['step'] ?? 1);
$error = '';
$success = '';

// Processar instalação
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 3) {
    $db_host = trim($_POST['db_host'] ?? 'localhost');
    $db_port = trim($_POST['db_port'] ?? '3306');
    $db_name = trim($_POST['db_name'] ?? '');
    $db_user = trim($_POST['db_user'] ?? '');
    $db_pass = $_POST['db_pass'] ?? '';
    $site_url = rtrim(trim($_POST['site_url'] ?? ''), '/');
    $admin_nome = trim($_POST['admin_nome'] ?? 'Administrador');
    $admin_email = trim($_POST['admin_email'] ?? 'admin@itabaiana.pb.gov.br');
    $admin_senha = $_POST['admin_senha'] ?? 'admin123';

    try {
        // Testar conexão com o servidor MySQL
        $dsn = "mysql:host={$db_host};port={$db_port};charset=utf8mb4";
        $pdo = new PDO($dsn, $db_user, $db_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]);

        // Criar banco se não existir
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `{$db_name}`");

        // Ler e executar SQL statement por statement
        $sqlFile = __DIR__ . '/../database.sql';
        if (!file_exists($sqlFile)) {
            throw new Exception('Arquivo database.sql não encontrado.');
        }

        $sql = file_get_contents($sqlFile);
        
        // Remover comentários de linha
        $sql = preg_replace('/--.*$/m', '', $sql);
        
        // Dividir por ponto-e-vírgula (respeitando strings)
        $statements = array_filter(array_map('trim', splitSqlStatements($sql)));
        
        foreach ($statements as $stmt) {
            if (!empty($stmt) && $stmt !== ';') {
                try {
                    $pdo->exec($stmt);
                } catch (PDOException $e) {
                    // Ignorar erros de DROP TABLE IF EXISTS e tabela já existe
                    if (strpos($e->getMessage(), '1051') === false && 
                        strpos($e->getMessage(), '1050') === false) {
                        // Log mas não para a execução para INSERTs duplicados
                        if (strpos($e->getMessage(), 'Duplicate entry') === false) {
                            throw $e;
                        }
                    }
                }
            }
        }

        // Criar usuário administrador
        $hash = password_hash($admin_senha, PASSWORD_BCRYPT, ['cost' => 12]);
        
        // Verificar se já existe
        $check = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
        $check->execute([$admin_email]);
        if (!$check->fetch()) {
            $stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, perfil_id, secretaria_id, primeiro_acesso, ativo) VALUES (?, ?, ?, 1, 1, 1, 1)");
            $stmt->execute([$admin_nome, $admin_email, $hash]);
        }

        // Criar quadros iniciais
        $quadros_iniciais = [
            ['Demandas do Gabinete', 1, '#0d47a1', 'bi-building', 'padrao'],
            ['Obras e Infraestrutura', 8, '#f57c00', 'bi-cone-striped', 'obras'],
            ['Licitações e Contratações', 10, '#00897b', 'bi-file-earmark-text', 'licitacao'],
            ['Convênios e TransfereGov', 11, '#3949ab', 'bi-link-45deg', 'convenios'],
            ['Saúde', 5, '#e53935', 'bi-heart-pulse', 'padrao'],
            ['Educação', 6, '#43a047', 'bi-mortarboard', 'padrao'],
            ['Assistência Social', 7, '#8e24aa', 'bi-people', 'padrao'],
            ['Eventos Institucionais', 12, '#d81b60', 'bi-calendar-event', 'padrao'],
            ['Ofícios e PBDoc', 1, '#546e7a', 'bi-envelope', 'padrao'],
            ['Demandas do Orçamento Democrático Estadual', 15, '#7cb342', 'bi-cash-stack', 'padrao'],
            ['Plano de Governo', 1, '#1565c0', 'bi-clipboard-check', 'padrao'],
            ['Projetos de Lei', 9, '#5d4037', 'bi-journal-text', 'padrao'],
            ['Comunicação Institucional', 12, '#d81b60', 'bi-megaphone', 'padrao'],
            ['Controladoria e Prazos Internos', 2, '#1565c0', 'bi-shield-check', 'padrao']
        ];

        $fluxos = [
            'padrao' => ['Nova demanda', 'Em análise', 'Aguardando documentos', 'Em execução', 'Aguardando terceiros', 'Concluído', 'Arquivado'],
            'licitacao' => ['Solicitação', 'DFD', 'ETP', 'Termo de Referência', 'Pesquisa de preços', 'Parecer jurídico', 'Publicação', 'Contratação', 'Execução', 'Concluído'],
            'obras' => ['Demanda recebida', 'Projeto', 'Orçamento', 'Licitação', 'Ordem de serviço', 'Em execução', 'Medição', 'Concluída'],
            'convenios' => ['Ideia', 'Cadastro', 'Plano de trabalho', 'Análise', 'Aprovado', 'Execução', 'Prestação de contas', 'Finalizado']
        ];

        // Verificar se já existem quadros
        $checkQuadros = $pdo->query("SELECT COUNT(*) as total FROM quadros");
        $totalQuadros = $checkQuadros->fetch()['total'];

        if ($totalQuadros == 0) {
            foreach ($quadros_iniciais as $q) {
                $stmt = $pdo->prepare("INSERT INTO quadros (titulo, secretaria_id, cor, icone, tipo_fluxo, visibilidade, criado_por) VALUES (?, ?, ?, ?, ?, 'publico', 1)");
                $stmt->execute([$q[0], $q[1], $q[2], $q[3], $q[4]]);
                $quadro_id = $pdo->lastInsertId();

                $listasFluxo = $fluxos[$q[4]] ?? $fluxos['padrao'];
                foreach ($listasFluxo as $pos => $titulo) {
                    $stmtLista = $pdo->prepare("INSERT INTO listas (quadro_id, titulo, posicao) VALUES (?, ?, ?)");
                    $stmtLista->execute([$quadro_id, $titulo, $pos]);
                }
            }
        }

        // Gerar config.php
        $configContent = '<?php
/**
 * ItaGestão Board - Arquivo de Configuração
 * Gerado automaticamente pelo instalador em ' . date('d/m/Y H:i:s') . '
 */

// Configurações do Banco de Dados
define(\'DB_HOST\', \'' . addslashes($db_host) . '\');
define(\'DB_PORT\', \'' . addslashes($db_port) . '\');
define(\'DB_NAME\', \'' . addslashes($db_name) . '\');
define(\'DB_USER\', \'' . addslashes($db_user) . '\');
define(\'DB_PASS\', \'' . addslashes($db_pass) . '\');
define(\'DB_CHARSET\', \'utf8mb4\');

// Configurações do Sistema
define(\'SITE_URL\', \'' . addslashes($site_url) . '\');
define(\'SITE_NAME\', \'ItaGestão Board\');
define(\'SITE_VERSION\', \'1.0.0\');

// Configurações de Segurança
define(\'SESSION_NAME\', \'itagestao_session\');
define(\'SESSION_LIFETIME\', 7200);
define(\'HASH_COST\', 12);

// Configurações de Upload
define(\'UPLOAD_DIR\', __DIR__ . \'/uploads/\');
define(\'UPLOAD_MAX_SIZE\', 10485760);
define(\'ALLOWED_EXTENSIONS\', \'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif,zip,rar\');

// Configurações de Timezone
define(\'APP_TIMEZONE\', \'America/Recife\');

// Modo de desenvolvimento
define(\'DEBUG_MODE\', false);
';
        $configPath = __DIR__ . '/../config.php';
        if (file_put_contents($configPath, $configContent) === false) {
            throw new Exception('Não foi possível gravar o arquivo config.php. Verifique as permissões da pasta.');
        }

        $success = 'Instalação concluída com sucesso!';
        $step = 4;

    } catch (PDOException $e) {
        $error = 'Erro de banco de dados: ' . $e->getMessage();
        $step = 3;
    } catch (Exception $e) {
        $error = 'Erro: ' . $e->getMessage();
        $step = 3;
    }
}

/**
 * Divide SQL em statements individuais respeitando strings e delimitadores
 */
function splitSqlStatements($sql) {
    $statements = [];
    $current = '';
    $inString = false;
    $stringChar = '';
    $len = strlen($sql);
    
    for ($i = 0; $i < $len; $i++) {
        $char = $sql[$i];
        
        if ($inString) {
            $current .= $char;
            if ($char === $stringChar && ($i === 0 || $sql[$i-1] !== '\\')) {
                $inString = false;
            }
        } else {
            if ($char === '\'' || $char === '"') {
                $inString = true;
                $stringChar = $char;
                $current .= $char;
            } elseif ($char === ';') {
                $trimmed = trim($current);
                if (!empty($trimmed)) {
                    $statements[] = $trimmed;
                }
                $current = '';
            } else {
                $current .= $char;
            }
        }
    }
    
    $trimmed = trim($current);
    if (!empty($trimmed)) {
        $statements[] = $trimmed;
    }
    
    return $statements;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instalação - ItaGestão Board</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        body { background: linear-gradient(135deg, #0d47a1 0%, #1976d2 100%); min-height: 100vh; padding: 2rem 0; }
        .install-card { max-width: 700px; margin: 0 auto; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .install-header { background: #0d47a1; color: #fff; padding: 2rem; text-align: center; border-radius: 16px 16px 0 0; }
        .step-indicator { display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem; }
        .step-dot { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.3); }
        .step-dot.active { background: #fff; }
        .step-dot.done { background: #4caf50; }
    </style>
</head>
<body>
    <div class="install-card card">
        <div class="install-header">
            <h3><i class="bi bi-kanban me-2"></i>ItaGestão Board</h3>
            <p class="mb-0 opacity-75">Assistente de Instalação</p>
            <div class="step-indicator">
                <div class="step-dot <?php echo $step >= 1 ? ($step > 1 ? 'done' : 'active') : ''; ?>"></div>
                <div class="step-dot <?php echo $step >= 2 ? ($step > 2 ? 'done' : 'active') : ''; ?>"></div>
                <div class="step-dot <?php echo $step >= 3 ? ($step > 3 ? 'done' : 'active') : ''; ?>"></div>
                <div class="step-dot <?php echo $step >= 4 ? 'active' : ''; ?>"></div>
            </div>
        </div>
        <div class="card-body p-4">

            <?php if ($error): ?>
            <div class="alert alert-danger"><i class="bi bi-exclamation-circle me-2"></i><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>

            <?php if ($step === 1): ?>
            <!-- PASSO 1: Verificação de Requisitos -->
            <h5 class="fw-bold mb-3">Passo 1: Verificação de Requisitos</h5>
            <?php
            $uploadsDir = __DIR__ . '/../uploads';
            $rootDir = __DIR__ . '/..';
            
            // Tentar criar pasta uploads se não existir
            if (!is_dir($uploadsDir)) {
                @mkdir($uploadsDir, 0755, true);
                @mkdir($uploadsDir . '/anexos', 0755, true);
                @mkdir($uploadsDir . '/evidencias', 0755, true);
            }

            $requisitos = [
                ['PHP >= 8.0', version_compare(PHP_VERSION, '8.0.0', '>='), 'Versão atual: ' . PHP_VERSION],
                ['Extensão PDO', extension_loaded('pdo'), ''],
                ['Extensão PDO MySQL', extension_loaded('pdo_mysql'), ''],
                ['Extensão JSON', extension_loaded('json'), ''],
                ['Extensão mbstring', extension_loaded('mbstring'), ''],
                ['Extensão fileinfo', extension_loaded('fileinfo'), ''],
                ['Pasta uploads gravável', is_dir($uploadsDir) && is_writable($uploadsDir), 'Caminho: ' . realpath($uploadsDir)],
                ['Pasta raiz gravável (config.php)', is_writable($rootDir), 'Caminho: ' . realpath($rootDir)],
                ['Arquivo database.sql presente', file_exists(__DIR__ . '/../database.sql'), ''],
            ];
            $todosOk = true;
            ?>
            <table class="table">
                <tbody>
                    <?php foreach ($requisitos as $r): 
                        if (!$r[1]) $todosOk = false;
                    ?>
                    <tr>
                        <td>
                            <?php echo $r[0]; ?>
                            <?php if (!empty($r[2])): ?>
                            <br><small class="text-muted"><?php echo $r[2]; ?></small>
                            <?php endif; ?>
                        </td>
                        <td class="text-end">
                            <?php if ($r[1]): ?>
                            <span class="badge bg-success"><i class="bi bi-check-lg"></i> OK</span>
                            <?php else: ?>
                            <span class="badge bg-danger"><i class="bi bi-x-lg"></i> Falha</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php if ($todosOk): ?>
            <a href="?step=2" class="btn btn-primary w-100">Próximo <i class="bi bi-arrow-right ms-1"></i></a>
            <?php else: ?>
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>Corrija os requisitos acima antes de continuar.
                <br><small>Se a pasta não é gravável, execute: <code>chmod 755 uploads/ && chmod 755 .</code></small>
            </div>
            <a href="?step=1" class="btn btn-secondary w-100">Verificar Novamente</a>
            <?php endif; ?>

            <?php elseif ($step === 2): ?>
            <!-- PASSO 2: Termos -->
            <h5 class="fw-bold mb-3">Passo 2: Informações</h5>
            <div class="alert alert-info">
                <h6 class="fw-bold">ItaGestão Board v1.0.0</h6>
                <p class="mb-2">Sistema de gestão institucional em formato Kanban para a Prefeitura Municipal de Itabaiana-PB.</p>
                <p class="mb-0 small">No próximo passo, informe os dados de conexão com o banco de dados MySQL/MariaDB e os dados do administrador.</p>
            </div>
            <div class="bg-light p-3 rounded mb-3">
                <h6 class="fw-bold">Requisitos do servidor:</h6>
                <ul class="mb-0 small">
                    <li>PHP 8.0 ou superior</li>
                    <li>MySQL 5.7+ ou MariaDB 10.3+</li>
                    <li>Extensões: PDO, pdo_mysql, mbstring, json, fileinfo</li>
                    <li>Permissão de escrita nas pastas uploads/ e raiz</li>
                </ul>
            </div>
            <a href="?step=3" class="btn btn-primary w-100">Configurar Banco de Dados <i class="bi bi-arrow-right ms-1"></i></a>

            <?php elseif ($step === 3): ?>
            <!-- PASSO 3: Configuração -->
            <h5 class="fw-bold mb-3">Passo 3: Configuração</h5>
            <form method="POST" action="?step=3">
                <h6 class="fw-semibold text-primary mb-2">Banco de Dados</h6>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label small">Host</label>
                        <input type="text" class="form-control" name="db_host" value="<?php echo htmlspecialchars($_POST['db_host'] ?? 'localhost'); ?>" required>
                        <small class="text-muted">Geralmente: localhost</small>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small">Porta</label>
                        <input type="text" class="form-control" name="db_port" value="<?php echo htmlspecialchars($_POST['db_port'] ?? '3306'); ?>" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small">Nome do Banco</label>
                        <input type="text" class="form-control" name="db_name" value="<?php echo htmlspecialchars($_POST['db_name'] ?? 'itagestao'); ?>" required>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label small">Usuário do Banco</label>
                        <input type="text" class="form-control" name="db_user" value="<?php echo htmlspecialchars($_POST['db_user'] ?? ''); ?>" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small">Senha do Banco</label>
                        <input type="password" class="form-control" name="db_pass" value="<?php echo htmlspecialchars($_POST['db_pass'] ?? ''); ?>">
                    </div>
                </div>

                <h6 class="fw-semibold text-primary mb-2 mt-4">URL do Sistema</h6>
                <div class="mb-3">
                    <label class="form-label small">URL completa (sem barra no final)</label>
                    <?php 
                    $defaultUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') 
                                  . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') 
                                  . rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/');
                    ?>
                    <input type="text" class="form-control" name="site_url" value="<?php echo htmlspecialchars($_POST['site_url'] ?? $defaultUrl); ?>" required>
                    <small class="text-muted">Ex: https://gestao.itabaiana.pb.gov.br</small>
                </div>

                <h6 class="fw-semibold text-primary mb-2 mt-4">Administrador</h6>
                <div class="mb-3">
                    <label class="form-label small">Nome completo</label>
                    <input type="text" class="form-control" name="admin_nome" value="<?php echo htmlspecialchars($_POST['admin_nome'] ?? 'Administrador'); ?>" required>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label small">E-mail de acesso</label>
                        <input type="email" class="form-control" name="admin_email" value="<?php echo htmlspecialchars($_POST['admin_email'] ?? 'admin@itabaiana.pb.gov.br'); ?>" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small">Senha</label>
                        <input type="text" class="form-control" name="admin_senha" value="<?php echo htmlspecialchars($_POST['admin_senha'] ?? 'admin123'); ?>" required>
                        <small class="text-muted">Altere após o primeiro login</small>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary w-100 py-2">
                    <i class="bi bi-database-check me-1"></i>Instalar Sistema
                </button>
            </form>

            <?php elseif ($step === 4): ?>
            <!-- PASSO 4: Conclusão -->
            <div class="text-center">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                <h4 class="mt-3 fw-bold">Instalação Concluída!</h4>
                <p class="text-muted">O ItaGestão Board foi instalado com sucesso.</p>
                
                <div class="bg-light rounded p-3 text-start mb-4">
                    <h6 class="fw-bold">Dados de Acesso:</h6>
                    <p class="mb-1"><strong>E-mail:</strong> <?php echo htmlspecialchars($_POST['admin_email'] ?? 'admin@itabaiana.pb.gov.br'); ?></p>
                    <p class="mb-0"><strong>Senha:</strong> <?php echo htmlspecialchars($_POST['admin_senha'] ?? 'admin123'); ?></p>
                </div>

                <div class="alert alert-warning text-start">
                    <i class="bi bi-shield-exclamation me-2"></i>
                    <strong>Importante:</strong> Por segurança, remova ou renomeie a pasta <code>/install</code> após a instalação.
                </div>

                <a href="../" class="btn btn-primary btn-lg w-100">
                    <i class="bi bi-box-arrow-in-right me-2"></i>Acessar o Sistema
                </a>
            </div>
            <?php endif; ?>

        </div>
    </div>
</body>
</html>
