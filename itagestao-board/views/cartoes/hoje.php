<?php
$pageTitle = 'Tarefas do Dia';
$breadcrumbs = [['text' => 'Tarefas do Dia', 'active' => true]];
$db = Database::getInstance();

$where = "c.prazo = CURDATE() AND c.status NOT IN ('concluido', 'arquivado')";
$params = [];
$perfil = $_SESSION['perfil_slug'];
if (!in_array($perfil, ['admin', 'prefeito', 'controle_interno'])) {
    $where .= " AND (c.responsavel_id = ? OR c.secretaria_id = ?)";
    $params[] = $_SESSION['usuario_id'];
    $params[] = $_SESSION['secretaria_id'];
}

$cartoes = $db->fetchAll(
    "SELECT c.*, p.nome as prioridade_nome, p.cor as prioridade_cor,
            u.nome as responsavel_nome, l.titulo as lista_titulo, 
            q.titulo as quadro_titulo, s.nome as secretaria_nome
     FROM cartoes c
     LEFT JOIN prioridades p ON c.prioridade_id = p.id
     LEFT JOIN usuarios u ON c.responsavel_id = u.id
     LEFT JOIN listas l ON c.lista_id = l.id
     LEFT JOIN quadros q ON c.quadro_id = q.id
     LEFT JOIN secretarias s ON c.secretaria_id = s.id
     WHERE {$where} ORDER BY c.prioridade_id DESC", $params
);

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-calendar-day me-2"></i>Tarefas do Dia - <?php echo date('d/m/Y'); ?></h4>
    <span class="badge bg-warning text-dark fs-6"><?php echo count($cartoes); ?> tarefas</span>
</div>

<?php if (empty($cartoes)): ?>
<div class="text-center py-5 text-muted">
    <i class="bi bi-calendar-check fs-1 d-block mb-3"></i>
    <h5>Nenhuma tarefa vencendo hoje</h5>
</div>
<?php else: ?>
<div class="row g-3">
    <?php foreach ($cartoes as $c): ?>
    <div class="col-md-6 col-lg-4">
        <div class="card h-100 priority-<?php echo strtolower($c['prioridade_nome'] ?? 'baixa'); ?>">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="fw-bold mb-0"><?php echo $c['titulo']; ?></h6>
                    <?php if ($c['prioridade_nome']): ?>
                    <span class="badge" style="background:<?php echo $c['prioridade_cor']; ?>;color:#fff;"><?php echo $c['prioridade_nome']; ?></span>
                    <?php endif; ?>
                </div>
                <p class="text-muted small mb-2"><?php echo $c['quadro_titulo']; ?> > <?php echo $c['lista_titulo']; ?></p>
                <div class="d-flex justify-content-between align-items-center">
                    <small><?php echo $c['responsavel_nome'] ?? 'Não atribuído'; ?></small>
                    <a href="?page=quadro&id=<?php echo $c['quadro_id']; ?>" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-eye"></i>
                    </a>
                </div>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<?php include __DIR__ . '/../layout/footer.php'; ?>
