<?php
$pageTitle = 'Setores';
$breadcrumbs = [['text' => 'Setores', 'active' => true]];
$db = Database::getInstance();
$authObj = new Auth();

if (!$authObj->temPermissao('setores', 'visualizar')) {
    setFlash('danger', 'Sem permissão.');
    redirect('?page=dashboard');
}

$secretarias = $db->fetchAll("SELECT * FROM secretarias WHERE ativo = 1 ORDER BY nome");
$setores = $db->fetchAll("SELECT st.*, s.nome as secretaria_nome, s.cor as secretaria_cor FROM setores st LEFT JOIN secretarias s ON st.secretaria_id = s.id WHERE st.ativo = 1 ORDER BY s.nome, st.nome");

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-diagram-3 me-2"></i>Setores</h4>
    <?php if ($authObj->temPermissao('setores', 'criar')): ?>
    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalSetor" onclick="limparForm()">
        <i class="bi bi-plus-lg me-1"></i>Novo Setor
    </button>
    <?php endif; ?>
</div>

<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Setor</th>
                        <th>Secretaria</th>
                        <th>Descrição</th>
                        <th width="80">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($setores as $st): ?>
                    <tr>
                        <td class="fw-semibold"><?php echo $st['nome']; ?></td>
                        <td><span class="badge" style="background:<?php echo $st['secretaria_cor']; ?>"><?php echo $st['secretaria_nome']; ?></span></td>
                        <td class="text-muted small"><?php echo truncate($st['descricao'] ?? '', 60); ?></td>
                        <td>
                            <?php if ($authObj->temPermissao('setores', 'editar')): ?>
                            <button class="btn btn-sm btn-outline-primary" onclick='editarSetor(<?php echo json_encode($st); ?>)'>
                                <i class="bi bi-pencil"></i>
                            </button>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal -->
<div class="modal fade" id="modalSetor" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalSetorTitle">Novo Setor</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="modal-alert-setor"></div>
                <form id="form-setor">
                    <input type="hidden" name="id" id="setor-id">
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Secretaria *</label>
                        <select class="form-select" name="secretaria_id" id="setor-secretaria" required>
                            <option value="">Selecione</option>
                            <?php foreach ($secretarias as $s): ?>
                            <option value="<?php echo $s['id']; ?>"><?php echo $s['nome']; ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Nome do Setor *</label>
                        <input type="text" class="form-control" name="nome" id="setor-nome" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Descrição</label>
                        <textarea class="form-control" name="descricao" id="setor-descricao" rows="3"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="salvarSetor()"><i class="bi bi-check-lg me-1"></i>Salvar</button>
            </div>
        </div>
    </div>
</div>

<script>
function limparForm() {
    document.getElementById('form-setor').reset();
    document.getElementById('setor-id').value = '';
    document.getElementById('modalSetorTitle').textContent = 'Novo Setor';
}

function editarSetor(s) {
    document.getElementById('setor-id').value = s.id;
    document.getElementById('setor-secretaria').value = s.secretaria_id;
    document.getElementById('setor-nome').value = s.nome;
    document.getElementById('setor-descricao').value = s.descricao || '';
    document.getElementById('modalSetorTitle').textContent = 'Editar Setor';
    new bootstrap.Modal(document.getElementById('modalSetor')).show();
}

function salvarSetor() {
    const form = document.getElementById('form-setor');
    const formData = new FormData(form);
    const id = formData.get('id');
    const action = id ? 'editar' : 'criar';

    fetch(`api.php?module=setores&action=${action}`, {
        method: 'POST', body: formData,
        headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) location.reload();
        else App.alert('#modal-alert-setor', 'danger', data.message);
    });
}
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
