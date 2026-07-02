<?php
$pageTitle = 'Usuários';
$breadcrumbs = [['text' => 'Usuários', 'active' => true]];
$db = Database::getInstance();
$authObj = new Auth();

if (!$authObj->temPermissao('usuarios', 'visualizar')) {
    setFlash('danger', 'Sem permissão para acessar esta página.');
    redirect('?page=dashboard');
}

$perfis = $db->fetchAll("SELECT * FROM perfis ORDER BY nome");
$secretarias = $db->fetchAll("SELECT * FROM secretarias WHERE ativo = 1 ORDER BY nome");

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-people me-2"></i>Usuários</h4>
    <?php if ($authObj->temPermissao('usuarios', 'criar')): ?>
    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalUsuario" onclick="limparForm()">
        <i class="bi bi-plus-lg me-1"></i>Novo Usuário
    </button>
    <?php endif; ?>
</div>

<!-- Filtros -->
<div class="card mb-4">
    <div class="card-body py-2">
        <form class="row g-2 align-items-center" id="filter-form">
            <input type="hidden" name="page" value="usuarios">
            <div class="col-md-4">
                <input type="text" class="form-control form-control-sm" name="busca" placeholder="Buscar por nome ou e-mail..." value="<?php echo get('busca'); ?>">
            </div>
            <div class="col-md-3">
                <select class="form-select form-select-sm" name="secretaria_id">
                    <option value="">Todas as secretarias</option>
                    <?php foreach ($secretarias as $s): ?>
                    <option value="<?php echo $s['id']; ?>" <?php echo get('secretaria_id') == $s['id'] ? 'selected' : ''; ?>><?php echo $s['nome']; ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-sm btn-primary w-100"><i class="bi bi-search me-1"></i>Filtrar</button>
            </div>
        </form>
    </div>
</div>

<!-- Tabela -->
<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Perfil</th>
                        <th>Secretaria</th>
                        <th>Status</th>
                        <th width="120">Ações</th>
                    </tr>
                </thead>
                <tbody id="usuarios-tbody">
                    <?php
                    $where = '1=1';
                    $params = [];
                    $busca = get('busca');
                    $sec = get('secretaria_id');
                    if ($busca) { $where .= " AND (u.nome LIKE ? OR u.email LIKE ?)"; $params[] = "%{$busca}%"; $params[] = "%{$busca}%"; }
                    if ($sec) { $where .= " AND u.secretaria_id = ?"; $params[] = $sec; }

                    $usuarios = $db->fetchAll(
                        "SELECT u.*, p.nome as perfil_nome, s.nome as secretaria_nome 
                         FROM usuarios u 
                         LEFT JOIN perfis p ON u.perfil_id = p.id 
                         LEFT JOIN secretarias s ON u.secretaria_id = s.id 
                         WHERE {$where} ORDER BY u.nome", $params
                    );
                    foreach ($usuarios as $u):
                    ?>
                    <tr>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div class="user-avatar" style="width:32px;height:32px;font-size:0.7rem;"><?php echo getInitials($u['nome']); ?></div>
                                <div>
                                    <div class="fw-semibold"><?php echo $u['nome']; ?></div>
                                    <small class="text-muted"><?php echo $u['cargo'] ?? ''; ?></small>
                                </div>
                            </div>
                        </td>
                        <td><?php echo $u['email']; ?></td>
                        <td><span class="badge bg-primary"><?php echo $u['perfil_nome']; ?></span></td>
                        <td><?php echo $u['secretaria_nome'] ?? '-'; ?></td>
                        <td>
                            <?php if ($u['ativo']): ?>
                            <span class="badge bg-success">Ativo</span>
                            <?php else: ?>
                            <span class="badge bg-secondary">Inativo</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($authObj->temPermissao('usuarios', 'editar')): ?>
                            <button class="btn btn-sm btn-outline-primary" onclick="editarUsuario(<?php echo htmlspecialchars(json_encode($u)); ?>)" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="resetarSenha(<?php echo $u['id']; ?>)" title="Resetar Senha">
                                <i class="bi bi-key"></i>
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

<!-- Modal Usuário -->
<div class="modal fade" id="modalUsuario" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalUsuarioTitle">Novo Usuário</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="modal-alert"></div>
                <form id="form-usuario">
                    <input type="hidden" name="id" id="usuario-id">
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Nome Completo *</label>
                        <input type="text" class="form-control" name="nome" id="usuario-nome" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">E-mail *</label>
                        <input type="email" class="form-control" name="email" id="usuario-email" required>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Perfil *</label>
                            <select class="form-select" name="perfil_id" id="usuario-perfil" required>
                                <option value="">Selecione</option>
                                <?php foreach ($perfis as $p): ?>
                                <option value="<?php echo $p['id']; ?>"><?php echo $p['nome']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Cargo</label>
                            <input type="text" class="form-control" name="cargo" id="usuario-cargo">
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Secretaria</label>
                            <select class="form-select" name="secretaria_id" id="usuario-secretaria">
                                <option value="">Nenhuma</option>
                                <?php foreach ($secretarias as $s): ?>
                                <option value="<?php echo $s['id']; ?>"><?php echo $s['nome']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Status</label>
                            <select class="form-select" name="ativo" id="usuario-ativo">
                                <option value="1">Ativo</option>
                                <option value="0">Inativo</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3" id="senha-info">
                        <small class="text-muted"><i class="bi bi-info-circle me-1"></i>Senha padrão: <strong>mudar123</strong> (o usuário será solicitado a alterar no primeiro acesso)</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="salvarUsuario()">
                    <i class="bi bi-check-lg me-1"></i>Salvar
                </button>
            </div>
        </div>
    </div>
</div>

<script>
function limparForm() {
    document.getElementById('form-usuario').reset();
    document.getElementById('usuario-id').value = '';
    document.getElementById('modalUsuarioTitle').textContent = 'Novo Usuário';
    document.getElementById('senha-info').style.display = 'block';
}

function editarUsuario(u) {
    document.getElementById('usuario-id').value = u.id;
    document.getElementById('usuario-nome').value = u.nome;
    document.getElementById('usuario-email').value = u.email;
    document.getElementById('usuario-perfil').value = u.perfil_id;
    document.getElementById('usuario-cargo').value = u.cargo || '';
    document.getElementById('usuario-secretaria').value = u.secretaria_id || '';
    document.getElementById('usuario-ativo').value = u.ativo;
    document.getElementById('modalUsuarioTitle').textContent = 'Editar Usuário';
    document.getElementById('senha-info').style.display = 'none';
    new bootstrap.Modal(document.getElementById('modalUsuario')).show();
}

function salvarUsuario() {
    const form = document.getElementById('form-usuario');
    const formData = new FormData(form);
    const id = formData.get('id');
    const action = id ? 'editar' : 'criar';

    fetch(`api.php?module=usuarios&action=${action}`, {
        method: 'POST', body: formData,
        headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            App.alert('#modal-alert', 'danger', data.message);
        }
    });
}

function resetarSenha(id) {
    if (!confirm('Resetar a senha deste usuário para "mudar123"?')) return;
    App.post('api.php?module=usuarios&action=resetar-senha', {id: id})
        .then(data => App.toast(data.message, data.success ? 'success' : 'danger'));
}
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
