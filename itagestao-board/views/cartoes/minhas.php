<?php
$pageTitle = 'Minhas Tarefas';
$breadcrumbs = [['text' => 'Minhas Tarefas', 'active' => true]];
$db = Database::getInstance();

$usuario_id = $_SESSION['usuario_id'];
$cartoes = $db->fetchAll(
    "SELECT c.*, p.nome as prioridade_nome, p.cor as prioridade_cor,
            l.titulo as lista_titulo, q.titulo as quadro_titulo, s.nome as secretaria_nome
     FROM cartoes c
     LEFT JOIN prioridades p ON c.prioridade_id = p.id
     LEFT JOIN listas l ON c.lista_id = l.id
     LEFT JOIN quadros q ON c.quadro_id = q.id
     LEFT JOIN secretarias s ON c.secretaria_id = s.id
     WHERE (c.responsavel_id = ? OR c.id IN (SELECT cartao_id FROM cartao_responsaveis WHERE usuario_id = ?))
     AND c.status NOT IN ('concluido', 'arquivado')
     ORDER BY CASE WHEN c.prazo IS NULL THEN 1 ELSE 0 END, c.prazo ASC", [$usuario_id, $usuario_id]
);

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-person-check me-2"></i>Minhas Tarefas</h4>
    <span class="badge bg-primary fs-6"><?php echo count($cartoes); ?> tarefas</span>
</div>

<?php if (empty($cartoes)): ?>
<div class="text-center py-5 text-muted">
    <i class="bi bi-check-circle fs-1 d-block mb-3"></i>
    <h5>Nenhuma tarefa pendente</h5>
    <p>Você não possui tarefas atribuídas no momento.</p>
</div>
<?php else: ?>
<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Tarefa</th>
                        <th>Quadro</th>
                        <th>Lista</th>
                        <th>Prioridade</th>
                        <th>Prazo</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($cartoes as $c): ?>
                    <tr>
                        <td>
                            <a href="?page=quadro&id=<?php echo $c['quadro_id']; ?>" class="fw-semibold text-decoration-none">
                                <?php echo $c['titulo']; ?>
                            </a>
                            <?php if ($c['secretaria_nome']): ?>
                            <br><small class="text-muted"><?php echo $c['secretaria_nome']; ?></small>
                            <?php endif; ?>
                        </td>
                        <td><small><?php echo $c['quadro_titulo']; ?></small></td>
                        <td><span class="badge bg-light text-dark"><?php echo $c['lista_titulo']; ?></span></td>
                        <td>
                            <?php if ($c['prioridade_nome']): ?>
                            <span class="badge" style="background:<?php echo $c['prioridade_cor']; ?>;color:#fff;"><?php echo $c['prioridade_nome']; ?></span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($c['prazo']): ?>
                            <span class="<?php echo prazoVencido($c['prazo']) ? 'text-danger fw-bold' : (prazoHoje($c['prazo']) ? 'text-warning fw-bold' : ''); ?>">
                                <?php echo formatDate($c['prazo']); ?>
                            </span>
                            <?php else: ?>
                            <span class="text-muted">-</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <a href="?page=quadro&id=<?php echo $c['quadro_id']; ?>" class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-eye"></i>
                            </a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php endif; ?>

<?php include __DIR__ . '/../layout/footer.php'; ?>
