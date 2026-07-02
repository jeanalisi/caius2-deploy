<?php
$pageTitle = 'Relatórios';
$breadcrumbs = [['text' => 'Relatórios', 'active' => true]];
$db = Database::getInstance();
$authObj = new Auth();

if (!$authObj->temPermissao('relatorios', 'visualizar')) {
    setFlash('danger', 'Sem permissão.');
    redirect('?page=dashboard');
}

$secretarias = $db->fetchAll("SELECT * FROM secretarias WHERE ativo = 1 ORDER BY nome");
$prioridades = $db->fetchAll("SELECT * FROM prioridades ORDER BY nivel");

// Filtros aplicados
$filtros = [
    'secretaria_id' => get('secretaria_id'),
    'prioridade_id' => get('prioridade_id'),
    'data_inicio' => get('data_inicio'),
    'data_fim' => get('data_fim'),
    'status' => get('status')
];

$where = '1=1';
$params = [];
if ($filtros['secretaria_id']) { $where .= ' AND c.secretaria_id = ?'; $params[] = $filtros['secretaria_id']; }
if ($filtros['prioridade_id']) { $where .= ' AND c.prioridade_id = ?'; $params[] = $filtros['prioridade_id']; }
if ($filtros['data_inicio']) { $where .= ' AND c.created_at >= ?'; $params[] = $filtros['data_inicio']; }
if ($filtros['data_fim']) { $where .= ' AND c.created_at <= ?'; $params[] = $filtros['data_fim'] . ' 23:59:59'; }
if ($filtros['status'] === 'atrasado') { $where .= " AND c.prazo < CURDATE() AND c.status NOT IN ('concluido','arquivado')"; }
elseif ($filtros['status']) { $where .= ' AND c.status = ?'; $params[] = $filtros['status']; }

$cartoes = $db->fetchAll(
    "SELECT c.*, p.nome as prioridade_nome, p.cor as prioridade_cor, u.nome as responsavel_nome, 
            s.nome as secretaria_nome, l.titulo as lista_titulo, q.titulo as quadro_titulo
     FROM cartoes c
     LEFT JOIN prioridades p ON c.prioridade_id = p.id
     LEFT JOIN usuarios u ON c.responsavel_id = u.id
     LEFT JOIN secretarias s ON c.secretaria_id = s.id
     LEFT JOIN listas l ON c.lista_id = l.id
     LEFT JOIN quadros q ON c.quadro_id = q.id
     WHERE {$where} ORDER BY c.created_at DESC LIMIT 200", $params
);

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-bar-chart me-2"></i>Relatórios</h4>
    <div class="d-flex gap-2">
        <a href="api.php?module=relatorios&action=exportar-csv&<?php echo http_build_query($filtros); ?>" class="btn btn-sm btn-success">
            <i class="bi bi-file-earmark-excel me-1"></i>Exportar CSV
        </a>
    </div>
</div>

<!-- Filtros -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" class="row g-2 align-items-end">
            <input type="hidden" name="page" value="relatorios">
            <div class="col-md-2">
                <label class="form-label small fw-semibold">Secretaria</label>
                <select class="form-select form-select-sm" name="secretaria_id">
                    <option value="">Todas</option>
                    <?php foreach ($secretarias as $s): ?>
                    <option value="<?php echo $s['id']; ?>" <?php echo $filtros['secretaria_id'] == $s['id'] ? 'selected' : ''; ?>><?php echo $s['sigla']; ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-semibold">Prioridade</label>
                <select class="form-select form-select-sm" name="prioridade_id">
                    <option value="">Todas</option>
                    <?php foreach ($prioridades as $p): ?>
                    <option value="<?php echo $p['id']; ?>" <?php echo $filtros['prioridade_id'] == $p['id'] ? 'selected' : ''; ?>><?php echo $p['nome']; ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-semibold">Status</label>
                <select class="form-select form-select-sm" name="status">
                    <option value="">Todos</option>
                    <option value="aberto" <?php echo $filtros['status'] == 'aberto' ? 'selected' : ''; ?>>Aberto</option>
                    <option value="em_andamento" <?php echo $filtros['status'] == 'em_andamento' ? 'selected' : ''; ?>>Em andamento</option>
                    <option value="concluido" <?php echo $filtros['status'] == 'concluido' ? 'selected' : ''; ?>>Concluído</option>
                    <option value="atrasado" <?php echo $filtros['status'] == 'atrasado' ? 'selected' : ''; ?>>Atrasado</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-semibold">Data Início</label>
                <input type="date" class="form-control form-control-sm" name="data_inicio" value="<?php echo $filtros['data_inicio']; ?>">
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-semibold">Data Fim</label>
                <input type="date" class="form-control form-control-sm" name="data_fim" value="<?php echo $filtros['data_fim']; ?>">
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary btn-sm w-100"><i class="bi bi-funnel me-1"></i>Filtrar</button>
            </div>
        </form>
    </div>
</div>

<!-- Resultado -->
<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <h6 class="mb-0">Resultado: <?php echo count($cartoes); ?> registros</h6>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover table-sm mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Título</th>
                        <th>Quadro</th>
                        <th>Lista</th>
                        <th>Secretaria</th>
                        <th>Responsável</th>
                        <th>Prioridade</th>
                        <th>Prazo</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($cartoes as $c): ?>
                    <tr>
                        <td class="fw-semibold"><?php echo truncate($c['titulo'], 50); ?></td>
                        <td><small><?php echo $c['quadro_titulo']; ?></small></td>
                        <td><span class="badge bg-light text-dark"><?php echo $c['lista_titulo']; ?></span></td>
                        <td><small><?php echo $c['secretaria_nome'] ?? '-'; ?></small></td>
                        <td><small><?php echo $c['responsavel_nome'] ?? '-'; ?></small></td>
                        <td>
                            <?php if ($c['prioridade_nome']): ?>
                            <span class="badge" style="background:<?php echo $c['prioridade_cor']; ?>;color:#fff;font-size:0.7rem;"><?php echo $c['prioridade_nome']; ?></span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($c['prazo']): ?>
                            <small class="<?php echo prazoVencido($c['prazo']) ? 'text-danger fw-bold' : ''; ?>"><?php echo formatDate($c['prazo']); ?></small>
                            <?php else: ?>-<?php endif; ?>
                        </td>
                        <td>
                            <?php
                            $statusBadge = ['aberto' => 'primary', 'em_andamento' => 'info', 'concluido' => 'success', 'arquivado' => 'secondary'];
                            $badge = $statusBadge[$c['status']] ?? 'secondary';
                            ?>
                            <span class="badge bg-<?php echo $badge; ?>" style="font-size:0.65rem;"><?php echo ucfirst(str_replace('_', ' ', $c['status'])); ?></span>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($cartoes)): ?>
                    <tr><td colspan="8" class="text-center py-4 text-muted">Nenhum registro encontrado com os filtros aplicados.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php include __DIR__ . '/../layout/footer.php'; ?>
