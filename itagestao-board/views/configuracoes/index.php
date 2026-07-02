<?php
$pageTitle = 'Configurações';
$breadcrumbs = [['text' => 'Configurações', 'active' => true]];
$db = Database::getInstance();

if (!Auth::isAdmin()) {
    setFlash('danger', 'Acesso restrito.');
    redirect('?page=dashboard');
}

$configs = $db->fetchAll("SELECT * FROM configuracoes ORDER BY chave");

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-gear me-2"></i>Configurações do Sistema</h4>
</div>

<div class="card">
    <div class="card-body">
        <form id="form-config">
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Configuração</th>
                            <th>Valor</th>
                            <th>Descrição</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($configs as $c): ?>
                        <tr>
                            <td class="fw-semibold"><code><?php echo $c['chave']; ?></code></td>
                            <td>
                                <input type="text" class="form-control form-control-sm" 
                                       name="config[<?php echo $c['chave']; ?>]" 
                                       value="<?php echo htmlspecialchars($c['valor']); ?>">
                            </td>
                            <td class="text-muted small"><?php echo $c['descricao']; ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i>Salvar Configurações</button>
        </form>
    </div>
</div>

<div class="card mt-4">
    <div class="card-header">
        <h6 class="mb-0">Informações do Sistema</h6>
    </div>
    <div class="card-body">
        <div class="row">
            <div class="col-md-4">
                <p class="mb-1"><strong>PHP:</strong> <?php echo phpversion(); ?></p>
                <p class="mb-1"><strong>Servidor:</strong> <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'N/A'; ?></p>
            </div>
            <div class="col-md-4">
                <p class="mb-1"><strong>Versão:</strong> <?php echo SITE_VERSION; ?></p>
                <p class="mb-1"><strong>Timezone:</strong> <?php echo APP_TIMEZONE; ?></p>
            </div>
            <div class="col-md-4">
                <p class="mb-1"><strong>Upload Max:</strong> <?php echo ini_get('upload_max_filesize'); ?></p>
                <p class="mb-1"><strong>Memória:</strong> <?php echo ini_get('memory_limit'); ?></p>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('form-config').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    // Salvar cada configuração
    const configs = {};
    for (let [key, value] of formData.entries()) {
        const match = key.match(/config\[(.+)\]/);
        if (match) configs[match[1]] = value;
    }
    
    fetch('api.php?module=dashboard&action=salvar-config', {
        method: 'POST',
        body: JSON.stringify(configs),
        headers: {'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => App.toast(data.message || 'Configurações salvas', data.success ? 'success' : 'danger'));
});
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
