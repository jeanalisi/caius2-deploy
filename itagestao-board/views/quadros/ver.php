<?php
$db = Database::getInstance();
$authObj = new Auth();
$quadro_id = intval($_GET['id'] ?? 0);

$quadro = $db->fetch(
    "SELECT q.*, s.nome as secretaria_nome FROM quadros q 
     LEFT JOIN secretarias s ON q.secretaria_id = s.id WHERE q.id = ? AND q.ativo = 1", [$quadro_id]
);

if (!$quadro) {
    setFlash('danger', 'Quadro não encontrado.');
    redirect('?page=quadros');
}

$pageTitle = $quadro['titulo'];
$breadcrumbs = [
    ['text' => 'Quadros', 'url' => '?page=quadros'],
    ['text' => $quadro['titulo'], 'active' => true]
];

$listas = $db->fetchAll("SELECT * FROM listas WHERE quadro_id = ? AND ativo = 1 ORDER BY posicao", [$quadro_id]);

// Carregar cartões para cada lista
foreach ($listas as &$lista) {
    $lista['cartoes'] = $db->fetchAll(
        "SELECT c.*, p.nome as prioridade_nome, p.cor as prioridade_cor, p.nivel as prioridade_nivel,
                u.nome as responsavel_nome
         FROM cartoes c
         LEFT JOIN prioridades p ON c.prioridade_id = p.id
         LEFT JOIN usuarios u ON c.responsavel_id = u.id
         WHERE c.lista_id = ? ORDER BY c.posicao", [$lista['id']]
    );
}

$secretarias = $db->fetchAll("SELECT * FROM secretarias WHERE ativo = 1 ORDER BY nome");
$usuarios = $db->fetchAll("SELECT id, nome FROM usuarios WHERE ativo = 1 ORDER BY nome");
$prioridades = $db->fetchAll("SELECT * FROM prioridades ORDER BY nivel");
$etiquetas = $db->fetchAll("SELECT * FROM etiquetas WHERE quadro_id IS NULL OR quadro_id = ? ORDER BY nome", [$quadro_id]);

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <div class="d-flex align-items-center gap-3">
        <div style="width:36px;height:36px;border-radius:8px;background:<?php echo $quadro['cor']; ?>;display:flex;align-items:center;justify-content:center;color:#fff;">
            <i class="bi <?php echo $quadro['icone'] ?: 'bi-kanban'; ?>"></i>
        </div>
        <div>
            <h5 class="fw-bold mb-0"><?php echo $quadro['titulo']; ?></h5>
            <small class="text-muted"><?php echo $quadro['secretaria_nome'] ?? 'Geral'; ?> | <?php echo ucfirst($quadro['tipo_fluxo']); ?></small>
        </div>
    </div>
    <div class="d-flex gap-2">
        <?php if ($authObj->temPermissao('quadros', 'editar')): ?>
        <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#modalAddList">
            <i class="bi bi-plus-lg me-1"></i>Nova Lista
        </button>
        <?php endif; ?>
        <?php if ($authObj->temPermissao('cartoes', 'criar')): ?>
        <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#modalCartao" onclick="prepararNovoCartao()">
            <i class="bi bi-plus-lg me-1"></i>Novo Cartão
        </button>
        <?php endif; ?>
    </div>
</div>

<!-- Kanban Board -->
<div class="kanban-board">
    <?php foreach ($listas as $lista): ?>
    <div class="kanban-list" data-list-id="<?php echo $lista['id']; ?>">
        <div class="kanban-list-header">
            <span class="kanban-list-title"><?php echo $lista['titulo']; ?></span>
            <span class="kanban-list-count"><?php echo count($lista['cartoes']); ?></span>
        </div>
        <div class="kanban-cards" data-list-id="<?php echo $lista['id']; ?>">
            <?php foreach ($lista['cartoes'] as $cartao): ?>
            <div class="kanban-card priority-<?php echo strtolower($cartao['prioridade_nome'] ?? 'baixa'); ?>" 
                 data-card-id="<?php echo $cartao['id']; ?>" 
                 onclick="openCardModal(<?php echo $cartao['id']; ?>)">
                <?php
                $cardEtiquetas = $db->fetchAll("SELECT e.* FROM cartao_etiquetas ce LEFT JOIN etiquetas e ON ce.etiqueta_id = e.id WHERE ce.cartao_id = ?", [$cartao['id']]);
                if ($cardEtiquetas):
                ?>
                <div class="kanban-card-labels">
                    <?php foreach ($cardEtiquetas as $et): ?>
                    <div class="kanban-card-label" style="background:<?php echo $et['cor']; ?>" title="<?php echo $et['nome']; ?>"></div>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
                <div class="kanban-card-title"><?php echo $cartao['titulo']; ?></div>
                <div class="kanban-card-meta">
                    <div class="d-flex align-items-center gap-2">
                        <?php if ($cartao['prazo']): ?>
                        <span class="badge <?php echo prazoVencido($cartao['prazo']) ? 'bg-danger' : (prazoHoje($cartao['prazo']) ? 'bg-warning' : 'bg-light text-dark'); ?>">
                            <i class="bi bi-clock me-1"></i><?php echo formatDate($cartao['prazo']); ?>
                        </span>
                        <?php endif; ?>
                        <?php if ($cartao['prioridade_nome']): ?>
                        <span class="badge" style="background:<?php echo $cartao['prioridade_cor']; ?>;color:#fff;font-size:0.6rem;">
                            <?php echo $cartao['prioridade_nome']; ?>
                        </span>
                        <?php endif; ?>
                    </div>
                    <?php if ($cartao['responsavel_nome']): ?>
                    <div class="kanban-card-avatars">
                        <div class="mini-avatar" title="<?php echo $cartao['responsavel_nome']; ?>">
                            <?php echo getInitials($cartao['responsavel_nome']); ?>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<!-- Modal Novo Cartão -->
<div class="modal fade" id="modalCartao" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Novo Cartão</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div id="modal-alert-cartao"></div>
                <form id="form-cartao">
                    <input type="hidden" name="quadro_id" value="<?php echo $quadro_id; ?>">
                    <div class="row mb-3">
                        <div class="col-md-8">
                            <label class="form-label fw-semibold">Título *</label>
                            <input type="text" class="form-control" name="titulo" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-semibold">Lista *</label>
                            <select class="form-select" name="lista_id" id="cartao-lista" required>
                                <?php foreach ($listas as $l): ?>
                                <option value="<?php echo $l['id']; ?>"><?php echo $l['titulo']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Descrição</label>
                        <textarea class="form-control" name="descricao" rows="3"></textarea>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <label class="form-label fw-semibold">Secretaria</label>
                            <select class="form-select" name="secretaria_id">
                                <option value="">Selecione</option>
                                <?php foreach ($secretarias as $s): ?>
                                <option value="<?php echo $s['id']; ?>"><?php echo $s['nome']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-semibold">Responsável</label>
                            <select class="form-select" name="responsavel_id">
                                <option value="">Selecione</option>
                                <?php foreach ($usuarios as $u): ?>
                                <option value="<?php echo $u['id']; ?>"><?php echo $u['nome']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-semibold">Prioridade</label>
                            <select class="form-select" name="prioridade_id">
                                <option value="">Selecione</option>
                                <?php foreach ($prioridades as $p): ?>
                                <option value="<?php echo $p['id']; ?>"><?php echo $p['nome']; ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-4">
                            <label class="form-label fw-semibold">Prazo</label>
                            <input type="date" class="form-control" name="prazo">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-semibold">Solicitante</label>
                            <input type="text" class="form-control" name="solicitante">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Observações Internas</label>
                        <textarea class="form-control" name="observacoes_internas" rows="2"></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="salvarCartao()"><i class="bi bi-check-lg me-1"></i>Criar Cartão</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Detalhes do Cartão -->
<div class="modal fade" id="cardModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Detalhes do Cartão</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-8">
                        <h6 class="fw-bold">Descrição</h6>
                        <div id="card-description" class="mb-3"></div>
                        
                        <ul class="nav nav-tabs mb-3" role="tablist">
                            <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#tab-comments">Comentários</a></li>
                            <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-checklist">Checklist</a></li>
                            <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-attachments">Anexos</a></li>
                            <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-history">Histórico</a></li>
                        </ul>
                        <div class="tab-content">
                            <div class="tab-pane fade show active" id="tab-comments">
                                <div id="comments-list"></div>
                                <div class="mt-3">
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="comment-input" placeholder="Escreva um comentário...">
                                        <button class="btn btn-primary" onclick="addComment(currentCardId)">Enviar</button>
                                    </div>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="tab-checklist">
                                <div id="checklist-list"></div>
                                <div class="mt-3">
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="checklist-input" placeholder="Novo item...">
                                        <button class="btn btn-primary" onclick="addChecklistItem(currentCardId)">Adicionar</button>
                                    </div>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="tab-attachments">
                                <div id="attachments-list"></div>
                                <div class="mt-3">
                                    <form id="form-upload" enctype="multipart/form-data">
                                        <input type="hidden" name="cartao_id" id="upload-cartao-id">
                                        <div class="input-group">
                                            <input type="file" class="form-control" name="arquivo" id="file-input">
                                            <button class="btn btn-primary" type="button" onclick="uploadAnexo()">Upload</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="tab-history">
                                <div class="timeline" id="history-list"></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="bg-light rounded p-3">
                            <div class="mb-3">
                                <small class="text-muted d-block">Responsável</small>
                                <strong id="card-responsavel">-</strong>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted d-block">Prazo</small>
                                <strong id="card-prazo">-</strong>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted d-block">Prioridade</small>
                                <strong id="card-prioridade">-</strong>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted d-block">Secretaria</small>
                                <strong id="card-secretaria">-</strong>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted d-block">Lista</small>
                                <strong id="card-lista">-</strong>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted d-block">Criado em</small>
                                <strong id="card-criado">-</strong>
                            </div>
                            <hr>
                            <button class="btn btn-sm btn-outline-primary w-100 mb-2" onclick="editarCartaoModal()">
                                <i class="bi bi-pencil me-1"></i>Editar
                            </button>
                            <button class="btn btn-sm btn-outline-success w-100" onclick="concluirCartao(currentCardId)">
                                <i class="bi bi-check-lg me-1"></i>Concluir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Modal Nova Lista -->
<div class="modal fade" id="modalAddList" tabindex="-1">
    <div class="modal-dialog modal-sm">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Nova Lista</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="form-lista">
                    <input type="hidden" name="quadro_id" value="<?php echo $quadro_id; ?>">
                    <div class="mb-3">
                        <label class="form-label fw-semibold">Título da Lista</label>
                        <input type="text" class="form-control" name="titulo" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" onclick="criarLista()">Criar</button>
            </div>
        </div>
    </div>
</div>

<script>
let currentCardId = null;

function prepararNovoCartao() {
    document.getElementById('form-cartao').reset();
    document.querySelector('#form-cartao [name="quadro_id"]').value = <?php echo $quadro_id; ?>;
}

function salvarCartao() {
    const form = document.getElementById('form-cartao');
    const formData = new FormData(form);
    fetch('api.php?module=cartoes&action=criar', {
        method: 'POST', body: formData,
        headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) location.reload();
        else App.alert('#modal-alert-cartao', 'danger', data.message);
    });
}

function criarLista() {
    const form = document.getElementById('form-lista');
    const formData = new FormData(form);
    fetch('api.php?module=listas&action=criar', {
        method: 'POST', body: formData,
        headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) location.reload();
    });
}

function openCardModal(cardId) {
    currentCardId = cardId;
    document.getElementById('upload-cartao-id').value = cardId;
    
    App.ajax(`api.php?module=cartoes&action=detalhes&id=${cardId}`)
        .then(data => {
            if (data.success) {
                const c = data.cartao;
                document.querySelector('#cardModal .modal-title').textContent = c.titulo;
                document.getElementById('card-description').innerHTML = c.descricao || '<em class="text-muted">Sem descrição</em>';
                document.getElementById('card-responsavel').textContent = c.responsavel_nome || 'Não atribuído';
                document.getElementById('card-prazo').textContent = c.prazo ? new Date(c.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
                document.getElementById('card-prioridade').textContent = c.prioridade_nome || '-';
                document.getElementById('card-secretaria').textContent = c.secretaria_nome || '-';
                document.getElementById('card-lista').textContent = c.lista_titulo || '-';
                document.getElementById('card-criado').textContent = c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '-';

                loadComments(cardId);
                loadChecklist(cardId);
                loadAttachments(cardId);
                loadHistory(cardId);

                new bootstrap.Modal(document.getElementById('cardModal')).show();
            }
        });
}

function concluirCartao(id) {
    if (!confirm('Marcar este cartão como concluído?')) return;
    App.post('api.php?module=cartoes&action=concluir', {id: id})
        .then(data => {
            if (data.success) location.reload();
        });
}

function uploadAnexo() {
    const form = document.getElementById('form-upload');
    const formData = new FormData(form);
    fetch('api.php?module=anexos&action=upload', {
        method: 'POST', body: formData,
        headers: {'X-Requested-With': 'XMLHttpRequest'}
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            document.getElementById('file-input').value = '';
            loadAttachments(currentCardId);
            App.toast('Arquivo enviado com sucesso');
        } else {
            App.toast(data.message, 'danger');
        }
    });
}
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
