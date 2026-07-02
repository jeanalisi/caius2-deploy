<?php
$pageTitle = 'Notificações';
$breadcrumbs = [['text' => 'Notificações', 'active' => true]];
$db = Database::getInstance();

$notificacoes = $db->fetchAll(
    "SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 50", 
    [$_SESSION['usuario_id']]
);

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-bell me-2"></i>Notificações</h4>
    <button class="btn btn-sm btn-outline-primary" onclick="marcarTodasLidas()">
        <i class="bi bi-check-all me-1"></i>Marcar todas como lidas
    </button>
</div>

<div class="card">
    <div class="card-body p-0">
        <?php if (empty($notificacoes)): ?>
        <div class="text-center py-5 text-muted">
            <i class="bi bi-bell-slash fs-1 d-block mb-3"></i>
            <h5>Nenhuma notificação</h5>
        </div>
        <?php else: ?>
        <div class="list-group list-group-flush">
            <?php foreach ($notificacoes as $n): ?>
            <div class="list-group-item notification-item <?php echo !$n['lida'] ? 'unread' : ''; ?>">
                <div class="d-flex justify-content-between">
                    <div>
                        <h6 class="mb-1 fw-semibold"><?php echo $n['titulo']; ?></h6>
                        <p class="mb-0 small text-muted"><?php echo $n['mensagem']; ?></p>
                    </div>
                    <small class="text-muted"><?php echo timeAgo($n['created_at']); ?></small>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
</div>

<script>
function marcarTodasLidas() {
    App.post('api.php?module=notificacoes&action=marcar-todas', {})
        .then(data => { if (data.success) location.reload(); });
}
</script>

<?php include __DIR__ . '/../layout/footer.php'; ?>
