<?php
$pageTitle = 'Meu Perfil';
$breadcrumbs = [['text' => 'Meu Perfil', 'active' => true]];
$db = Database::getInstance();

$usuario = $db->fetch(
    "SELECT u.*, p.nome as perfil_nome, s.nome as secretaria_nome, st.nome as setor_nome 
     FROM usuarios u 
     LEFT JOIN perfis p ON u.perfil_id = p.id 
     LEFT JOIN secretarias s ON u.secretaria_id = s.id 
     LEFT JOIN setores st ON u.setor_id = st.id 
     WHERE u.id = ?", [$_SESSION['usuario_id']]
);

include __DIR__ . '/../layout/header.php';
?>

<div class="row justify-content-center">
    <div class="col-md-8 col-lg-6">
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="bi bi-person me-2"></i>Meu Perfil</h5>
            </div>
            <div class="card-body">
                <div id="perfil-alert"></div>
                <form id="form-perfil">
                    <div class="text-center mb-4">
                        <div class="user-avatar mx-auto mb-2" style="width:64px;height:64px;font-size:1.5rem;">
                            <?php echo getInitials($usuario['nome']); ?>
                        </div>
                        <span class="badge bg-primary"><?php echo $usuario['perfil_nome']; ?></span>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Nome</label>
                        <input type="text" class="form-control" name="nome" value="<?php echo $usuario['nome']; ?>" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">E-mail</label>
                        <input type="email" class="form-control" value="<?php echo $usuario['email']; ?>" disabled>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Telefone</label>
                            <input type="text" class="form-control" name="telefone" value="<?php echo $usuario['telefone'] ?? ''; ?>">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Cargo</label>
                            <input type="text" class="form-control" name="cargo" value="<?php echo $usuario['cargo'] ?? ''; ?>">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Secretaria</label>
                        <input type="text" class="form-control" value="<?php echo $usuario['secretaria_nome'] ?? 'Não definida'; ?>" disabled>
                    </div>
                    <button type="submit" class="btn btn-primary w-100"><i class="bi bi-check-lg me-1"></i>Salvar Alterações</button>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('form-perfil').addEventListener('submit', function(e) {
    e.preventDefault();
    fetch('api.php?module=auth&action=perfil', {
        method: 'POST', body: new FormData(this),
        headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => {
        App.alert('#perfil-alert', data.success ? 'success' : 'danger', data.message);
    });
});
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
