<?php
$pageTitle = 'Perfis de Acesso';
$breadcrumbs = [['text' => 'Perfis de Acesso', 'active' => true]];
$db = Database::getInstance();

if (!Auth::isAdmin()) {
    setFlash('danger', 'Acesso restrito ao administrador.');
    redirect('?page=dashboard');
}

$perfis = $db->fetchAll("SELECT p.*, (SELECT COUNT(*) FROM usuarios u WHERE u.perfil_id = p.id) as total_usuarios FROM perfis p ORDER BY p.nivel DESC");

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-shield-lock me-2"></i>Perfis de Acesso</h4>
</div>

<div class="row g-3">
    <?php foreach ($perfis as $p): ?>
    <div class="col-md-6 col-lg-4">
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="fw-bold"><?php echo $p['nome']; ?></h6>
                    <span class="badge bg-primary"><?php echo $p['total_usuarios']; ?> usuários</span>
                </div>
                <p class="text-muted small mb-2"><?php echo $p['descricao']; ?></p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">Nível: <?php echo $p['nivel']; ?></small>
                    <span class="badge bg-<?php echo $p['ativo'] ? 'success' : 'secondary'; ?>"><?php echo $p['ativo'] ? 'Ativo' : 'Inativo'; ?></span>
                </div>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<div class="card mt-4">
    <div class="card-header">
        <h6 class="mb-0">Matriz de Permissões</h6>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-sm table-bordered mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Módulo</th>
                        <?php foreach ($perfis as $p): ?>
                        <th class="text-center" style="font-size:0.75rem;"><?php echo $p['nome']; ?></th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $modulos = ['usuarios', 'secretarias', 'setores', 'quadros', 'cartoes', 'relatorios', 'configuracoes'];
                    foreach ($modulos as $mod):
                    ?>
                    <tr>
                        <td class="fw-semibold text-capitalize"><?php echo $mod; ?></td>
                        <?php foreach ($perfis as $p):
                            $perms = $db->fetchAll("SELECT acao FROM permissoes WHERE perfil_id = ? AND modulo = ? AND permitido = 1", [$p['id'], $mod]);
                            $acoes = array_column($perms, 'acao');
                        ?>
                        <td class="text-center">
                            <?php if ($p['slug'] === 'admin'): ?>
                            <i class="bi bi-check-circle-fill text-success"></i>
                            <?php elseif (count($acoes) > 0): ?>
                            <span class="badge bg-info" style="font-size:0.6rem;"><?php echo implode(', ', $acoes); ?></span>
                            <?php else: ?>
                            <i class="bi bi-x-circle text-muted"></i>
                            <?php endif; ?>
                        </td>
                        <?php endforeach; ?>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php include __DIR__ . '/../layout/footer.php'; ?>
