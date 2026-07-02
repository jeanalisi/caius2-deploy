<?php
$pageTitle = 'Secretarias';
$breadcrumbs = [['text' => 'Secretarias', 'active' => true]];
$db = Database::getInstance();
$authObj = new Auth();

if (!$authObj->temPermissao('secretarias', 'visualizar')) {
    setFlash('danger', 'Sem permissão para acessar esta página.');
    redirect('?page=dashboard');
}

$secretarias = $db->fetchAll("SELECT s.*, (SELECT COUNT(*) FROM usuarios u WHERE u.secretaria_id = s.id AND u.ativo = 1) as total_usuarios, (SELECT COUNT(*) FROM setores st WHERE st.secretaria_id = s.id AND st.ativo = 1) as total_setores FROM secretarias s WHERE s.ativo = 1 ORDER BY s.nome");

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-building me-2"></i>Secretarias</h4>
    <?php if ($authObj->temPermissao('secretarias', 'criar')): ?>
    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalSecretaria" onclick="limparForm()">
        <i class="bi bi-plus-lg me-1"></i>Nova Secretaria
    </button>
    <?php endif; ?>
</div>

<div class="row g-3">
    <?php foreach ($secretarias as $s): ?>
    <div class="col-md-6 col-lg-4">
        <div class="card h-100">
            <div class="card-body">
                <div class="d-flex align-items-start justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div style="width:40px;height:40px;border-radius:10px;background:<?php echo $s['cor']; ?>;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.8rem;">
                            <?php echo $s['sigla']; ?>
                        </div>
                        <div>
                            <h6 class="fw-bold mb-0"><?php echo $s['nome']; ?></h6>
                            <small class="text-muted"><?php echo $s['total_usuarios']; ?> usuários | <?php echo $s['total_setores']; ?> setores</small>
                        </div>
                    </div>
                    <?php if ($authObj->temPermissao('secretarias', 'editar')): ?>
                    <button class="btn btn-sm btn-outline-primary" onclick='editarSecretaria(<?php echo json_encode($s); ?>)'>
                        <i class="bi bi-pencil"></i>
                    </button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<!-- Modal -->
<div class="modal fade" id="modalSecretaria" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalSecretariaTitle">Nova Secretaria</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="modal-alert-sec"></div>
                <form id="form-secretaria">
                    <input type="hidden" name="id" id="sec-id">
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Nome *</label>
                        <input type="text" class="form-control" name="nome" id="sec-nome" required>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Sigla</label>
                            <input type="text" class="form-control" name="sigla" id="sec-sigla" maxlength="10">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Cor</label>
                            <input type="color" class="form-control form-control-color w-100" name="cor" id="sec-cor" value="#0d6efd">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Descrição</label>
                        <textarea class="form-control" name="descricao" id="sec-descricao" rows="3"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="salvarSecretaria()">
                    <i class="bi bi-check-lg me-1"></i>Salvar
                </button>
            </div>
        </div>
    </div>
</div>

<script>
function limparForm() {
    document.getElementById('form-secretaria').reset();
    document.getElementById('sec-id').value = '';
    document.getElementById('modalSecretariaTitle').textContent = 'Nova Secretaria';
}

function editarSecretaria(s) {
    document.getElementById('sec-id').value = s.id;
    document.getElementById('sec-nome').value = s.nome;
    document.getElementById('sec-sigla').value = s.sigla || '';
    document.getElementById('sec-cor').value = s.cor || '#0d6efd';
    document.getElementById('sec-descricao').value = s.descricao || '';
    document.getElementById('modalSecretariaTitle').textContent = 'Editar Secretaria';
    new bootstrap.Modal(document.getElementById('modalSecretaria')).show();
}

function salvarSecretaria() {
    const form = document.getElementById('form-secretaria');
    const formData = new FormData(form);
    const id = formData.get('id');
    const action = id ? 'editar' : 'criar';

    fetch(`api.php?module=secretarias&action=${action}`, {
        method: 'POST', body: formData,
        headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) location.reload();
        else App.alert('#modal-alert-sec', 'danger', data.message);
    });
}
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
