<?php
$pageTitle = 'Dashboard';
$db = Database::getInstance();

$perfil = $_SESSION['perfil_slug'];
$where_sec = '';
$params = [];
if (!in_array($perfil, ['admin', 'prefeito', 'controle_interno'])) {
    $where_sec = " AND c.secretaria_id = ?";
    $params[] = $_SESSION['secretaria_id'];
}

$abertas = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.status NOT IN ('concluido','arquivado') {$where_sec}", $params)['total'];
$concluidas = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.status = 'concluido' {$where_sec}", $params)['total'];
$atrasadas = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.prazo < CURDATE() AND c.status NOT IN ('concluido','arquivado') {$where_sec}", $params)['total'];
$hoje = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.prazo = CURDATE() AND c.status NOT IN ('concluido','arquivado') {$where_sec}", $params)['total'];
$semana = $db->fetch("SELECT COUNT(*) as total FROM cartoes c WHERE c.prazo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND c.status NOT IN ('concluido','arquivado') {$where_sec}", $params)['total'];

// Dados para gráficos
$porSecretaria = $db->fetchAll(
    "SELECT s.sigla as label, COUNT(c.id) as total 
     FROM secretarias s 
     LEFT JOIN cartoes c ON c.secretaria_id = s.id AND c.status NOT IN ('concluido','arquivado')
     WHERE s.ativo = 1 GROUP BY s.id HAVING total > 0 ORDER BY total DESC LIMIT 8"
);

$porPrioridade = $db->fetchAll(
    "SELECT p.nome as label, p.cor, COUNT(c.id) as total 
     FROM prioridades p 
     LEFT JOIN cartoes c ON c.prioridade_id = p.id AND c.status NOT IN ('concluido','arquivado')
     GROUP BY p.id ORDER BY p.nivel"
);

// Últimas movimentações
$movimentacoes = $db->fetchAll(
    "SELECT h.*, u.nome as usuario_nome, c.titulo as cartao_titulo 
     FROM cartao_historico h 
     LEFT JOIN usuarios u ON h.usuario_id = u.id 
     LEFT JOIN cartoes c ON h.cartao_id = c.id 
     ORDER BY h.created_at DESC LIMIT 10"
);

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h4 class="fw-bold mb-0">Dashboard</h4>
        <small class="text-muted">Visão geral das demandas - <?php echo date('d/m/Y'); ?></small>
    </div>
    <a href="?page=quadros" class="btn btn-primary">
        <i class="bi bi-kanban me-1"></i>Ver Quadros
    </a>
</div>

<!-- Stat Cards -->
<div class="row g-3 mb-4">
    <div class="col-md-6 col-lg">
        <div class="stat-card card bg-white">
            <div class="d-flex align-items-center gap-3">
                <div class="stat-icon" style="background:#e3f2fd;color:#1976d2;">
                    <i class="bi bi-folder-open"></i>
                </div>
                <div>
                    <div class="stat-value"><?php echo $abertas; ?></div>
                    <div class="stat-label">Abertas</div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-6 col-lg">
        <div class="stat-card card bg-white">
            <div class="d-flex align-items-center gap-3">
                <div class="stat-icon" style="background:#e8f5e9;color:#388e3c;">
                    <i class="bi bi-check-circle"></i>
                </div>
                <div>
                    <div class="stat-value"><?php echo $concluidas; ?></div>
                    <div class="stat-label">Concluídas</div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-6 col-lg">
        <div class="stat-card card bg-white">
            <div class="d-flex align-items-center gap-3">
                <div class="stat-icon" style="background:#fbe9e7;color:#d32f2f;">
                    <i class="bi bi-exclamation-triangle"></i>
                </div>
                <div>
                    <div class="stat-value"><?php echo $atrasadas; ?></div>
                    <div class="stat-label">Atrasadas</div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-6 col-lg">
        <div class="stat-card card bg-white">
            <div class="d-flex align-items-center gap-3">
                <div class="stat-icon" style="background:#fff3e0;color:#f57c00;">
                    <i class="bi bi-calendar-day"></i>
                </div>
                <div>
                    <div class="stat-value"><?php echo $hoje; ?></div>
                    <div class="stat-label">Vencem Hoje</div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-md-6 col-lg">
        <div class="stat-card card bg-white">
            <div class="d-flex align-items-center gap-3">
                <div class="stat-icon" style="background:#f3e5f5;color:#7b1fa2;">
                    <i class="bi bi-calendar-week"></i>
                </div>
                <div>
                    <div class="stat-value"><?php echo $semana; ?></div>
                    <div class="stat-label">Na Semana</div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Charts Row -->
<div class="row g-3 mb-4">
    <div class="col-lg-7">
        <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">Demandas por Secretaria</h6>
            </div>
            <div class="card-body">
                <canvas id="chartSecretarias" height="250"></canvas>
            </div>
        </div>
    </div>
    <div class="col-lg-5">
        <div class="card h-100">
            <div class="card-header">
                <h6 class="mb-0">Demandas por Prioridade</h6>
            </div>
            <div class="card-body">
                <canvas id="chartPrioridades" height="250"></canvas>
            </div>
        </div>
    </div>
</div>

<!-- Recent Activity -->
<div class="row g-3">
    <div class="col-lg-8">
        <div class="card">
            <div class="card-header">
                <h6 class="mb-0"><i class="bi bi-clock-history me-2"></i>Últimas Movimentações</h6>
            </div>
            <div class="card-body p-0">
                <div class="list-group list-group-flush">
                    <?php foreach ($movimentacoes as $m): ?>
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="fw-semibold small"><?php echo $m['descricao']; ?></div>
                                <small class="text-muted">
                                    <?php echo $m['usuario_nome']; ?> em "<?php echo truncate($m['cartao_titulo'] ?? '', 40); ?>"
                                </small>
                            </div>
                            <small class="text-muted"><?php echo timeAgo($m['created_at']); ?></small>
                        </div>
                    </div>
                    <?php endforeach; ?>
                    <?php if (empty($movimentacoes)): ?>
                    <div class="list-group-item text-center text-muted py-4">
                        Nenhuma movimentação recente.
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    <div class="col-lg-4">
        <div class="card">
            <div class="card-header">
                <h6 class="mb-0"><i class="bi bi-lightning me-2"></i>Ações Rápidas</h6>
            </div>
            <div class="card-body">
                <div class="d-grid gap-2">
                    <a href="?page=quadros" class="btn btn-outline-primary btn-sm text-start">
                        <i class="bi bi-kanban me-2"></i>Ver Quadros
                    </a>
                    <a href="?page=minhas-tarefas" class="btn btn-outline-primary btn-sm text-start">
                        <i class="bi bi-person-check me-2"></i>Minhas Tarefas
                    </a>
                    <a href="?page=tarefas-atrasadas" class="btn btn-outline-danger btn-sm text-start">
                        <i class="bi bi-exclamation-triangle me-2"></i>Tarefas Atrasadas
                    </a>
                    <a href="?page=tarefas-hoje" class="btn btn-outline-warning btn-sm text-start">
                        <i class="bi bi-calendar-day me-2"></i>Tarefas do Dia
                    </a>
                    <?php if (Auth::isAdmin()): ?>
                    <a href="?page=relatorios" class="btn btn-outline-success btn-sm text-start">
                        <i class="bi bi-bar-chart me-2"></i>Relatórios
                    </a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Chart: Demandas por Secretaria
    const ctxSec = document.getElementById('chartSecretarias');
    if (ctxSec) {
        new Chart(ctxSec, {
            type: 'bar',
            data: {
                labels: <?php echo json_encode(array_column($porSecretaria, 'label')); ?>,
                datasets: [{
                    label: 'Demandas Abertas',
                    data: <?php echo json_encode(array_column($porSecretaria, 'total')); ?>,
                    backgroundColor: 'rgba(13, 71, 161, 0.7)',
                    borderColor: 'rgba(13, 71, 161, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // Chart: Demandas por Prioridade
    const ctxPri = document.getElementById('chartPrioridades');
    if (ctxPri) {
        new Chart(ctxPri, {
            type: 'doughnut',
            data: {
                labels: <?php echo json_encode(array_column($porPrioridade, 'label')); ?>,
                datasets: [{
                    data: <?php echo json_encode(array_column($porPrioridade, 'total')); ?>,
                    backgroundColor: <?php echo json_encode(array_column($porPrioridade, 'cor')); ?>,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
});
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
