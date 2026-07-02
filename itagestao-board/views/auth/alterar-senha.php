<?php include __DIR__ . '/../layout/header.php'; ?>

<div class="container-fluid py-4">
    <div class="row justify-content-center">
        <div class="col-md-6 col-lg-5">
            <div class="card shadow-sm">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0"><i class="bi bi-key me-2"></i>Alterar Senha</h5>
                </div>
                <div class="card-body p-4">
                    <?php if ($_SESSION['primeiro_acesso']): ?>
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        Por segurança, altere sua senha no primeiro acesso.
                    </div>
                    <?php endif; ?>
                    <div id="alert-container"></div>
                    <form id="form-alterar-senha">
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Senha Atual</label>
                            <input type="password" class="form-control" name="senha_atual" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Nova Senha</label>
                            <input type="password" class="form-control" name="nova_senha" required minlength="6">
                            <small class="text-muted">Mínimo de 6 caracteres</small>
                        </div>
                        <div class="mb-4">
                            <label class="form-label fw-semibold">Confirmar Nova Senha</label>
                            <input type="password" class="form-control" name="confirmar_senha" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="bi bi-check-lg me-2"></i>Alterar Senha
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('form-alterar-senha').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    fetch('api.php?module=auth&action=alterar-senha', {
        method: 'POST',
        body: formData,
        headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => {
        const tipo = data.success ? 'success' : 'danger';
        document.getElementById('alert-container').innerHTML = 
            `<div class="alert alert-${tipo}">${data.message}</div>`;
        if (data.success) {
            setTimeout(() => window.location.href = '?page=dashboard', 1500);
        }
    });
});
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
