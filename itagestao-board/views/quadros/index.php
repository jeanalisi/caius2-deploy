<?php
$pageTitle = 'Quadros';
$breadcrumbs = [['text' => 'Quadros', 'active' => true]];
$db = Database::getInstance();
$authObj = new Auth();

// Filtrar quadros por permissão
$where = 'q.ativo = 1';
$params = [];
$perfil = $_SESSION['perfil_slug'];
if (!in_array($perfil, ['admin', 'prefeito', 'controle_interno'])) {
    $where .= " AND (q.visibilidade = 'publico' OR q.secretaria_id = ?)";
    $params[] = $_SESSION['secretaria_id'];
}

$quadros = $db->fetchAll(
    "SELECT q.*, s.nome as secretaria_nome, s.cor as secretaria_cor,
            (SELECT COUNT(*) FROM cartoes c WHERE c.quadro_id = q.id) as total_cartoes,
            (SELECT COUNT(*) FROM cartoes c WHERE c.quadro_id = q.id AND c.status = 'concluido') as cartoes_concluidos,
            (SELECT COUNT(*) FROM cartoes c WHERE c.quadro_id = q.id AND c.prazo < CURDATE() AND c.status NOT IN ('concluido','arquivado')) as cartoes_atrasados
     FROM quadros q
     LEFT JOIN secretarias s ON q.secretaria_id = s.id
     WHERE {$where} ORDER BY q.titulo", $params
);

$secretarias = $db->fetchAll("SELECT * FROM secretarias WHERE ativo = 1 ORDER BY nome");

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-kanban me-2"></i>Quadros</h4>
    <?php if ($authObj->temPermissao('quadros', 'criar')): ?>
    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modalQuadro">
        <i class="bi bi-plus-lg me-1"></i>Novo Quadro
    </button>
    <?php endif; ?>
</div>

<div class="row g-3">
    <?php foreach ($quadros as $q): ?>
    <div class="col-md-6 col-lg-4 col-xl-3">
        <a href="?page=quadro&id=<?php echo $q['id']; ?>" class="text-decoration-none">
            <div class="quadro-card card">
                <div class="quadro-card-header" style="background: <?php echo $q['cor']; ?>;">
                    <i class="bi <?php echo $q['icone'] ?: 'bi-kanban'; ?>"></i>
                </div>
                <div class="quadro-card-body">
                    <div class="quadro-card-title"><?php echo $q['titulo']; ?></div>
                    <div class="quadro-card-subtitle"><?php echo $q['secretaria_nome'] ?? 'Geral'; ?></div>
                    <div class="d-flex gap-3 mt-2">
                        <small class="text-muted"><i class="bi bi-card-text me-1"></i><?php echo $q['total_cartoes']; ?> cartões</small>
                        <?php if ($q['cartoes_atrasados'] > 0): ?>
                        <small class="text-danger"><i class="bi bi-exclamation-circle me-1"></i><?php echo $q['cartoes_atrasados']; ?> atrasados</small>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </a>
    </div>
    <?php endforeach; ?>

    <?php if (empty($quadros)): ?>
    <div class="col-12">
        <div class="text-center py-5 text-muted">
            <i class="bi bi-kanban fs-1 d-block mb-3"></i>
            <h5>Nenhum quadro encontrado</h5>
            <p>Crie seu primeiro quadro para começar a organizar as demandas.</p>
        </div>
    </div>
    <?php endif; ?>
</div>

<!-- Modal Novo Quadro -->
<div class="modal fade" id="modalQuadro" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Novo Quadro</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="modal-alert-quadro"></div>
                <form id="form-quadro">
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Título *</label>
                        <input type="text" class="form-control" name="titulo" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Descrição</label>
                        <textarea class="form-control" name="descricao" rows="2"></textarea>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Secretaria</label>
                            <select class="form-select" name="secretaria_id">
                                <option value="">Geral</option>
                                <?php foreach ($secretarias as $s): ?>
                                <option value="<?php echo $s['id']; ?>"><?php echo $s['nome']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Cor</label>
                            <input type="color" class="form-control form-control-color w-100" name="cor" value="#0d6efd">
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Tipo de Fluxo</label>
                            <select class="form-select" name="tipo_fluxo">
                                <option value="padrao">Padrão (Demandas)</option>
                                <option value="licitacao">Licitação</option>
                                <option value="obras">Obras</option>
                                <option value="convenios">Convênios</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Visibilidade</label>
                            <select class="form-select" name="visibilidade">
                                <option value="secretaria">Secretaria</option>
                                <option value="publico">Público (todos)</option>
                                <option value="privado">Privado</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="criarQuadro()"><i class="bi bi-check-lg me-1"></i>Criar Quadro</button>
            </div>
        </div>
    </div>
</div>

<script>
function criarQuadro() {
    const form = document.getElementById('form-quadro');
    const formData = new FormData(form);
    fetch('api.php?module=quadros&action=criar', {
        method: 'POST', body: formData,
        headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            window.location.href = '?page=quadro&id=' + data.id;
        } else {
            App.alert('#modal-alert-quadro', 'danger', data.message);
        }
    });
}
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
