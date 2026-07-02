<?php
$pageTitle = 'Tarefas Atrasadas';
$breadcrumbs = [['text' => 'Tarefas Atrasadas', 'active' => true]];
$db = Database::getInstance();

$where = "c.prazo < CURDATE() AND c.status NOT IN ('concluido', 'arquivado')";
$params = [];
$perfil = $_SESSION['perfil_slug'];
if (!in_array($perfil, ['admin', 'prefeito', 'controle_interno'])) {
    $where .= " AND c.secretaria_id = ?";
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
     WHERE {$where} ORDER BY c.prazo ASC", $params
);

include __DIR__ . '/../layout/header.php';
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <h4 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle text-danger me-2"></i>Tarefas Atrasadas</h4>
    <span class="badge bg-danger fs-6"><?php echo count($cartoes); ?> atrasadas</span>
</div>

<?php if (empty($cartoes)): ?>
<div class="text-center py-5 text-muted">
    <i class="bi bi-check-circle text-success fs-1 d-block mb-3"></i>
    <h5>Nenhuma tarefa atrasada</h5>
    <p>Parabéns! Todas as tarefas estão em dia.</p>
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
                        <th>Responsável</th>
                        <th>Secretaria</th>
                        <th>Prioridade</th>
                        <th>Prazo</th>
                        <th>Atraso</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($cartoes as $c): 
                        $diasAtraso = floor((time() - strtotime($c['prazo'])) / 86400);
                    ?>
                    <tr>
                        <td class="fw-semibold">
                            <a href="?page=quadro&id=<?php echo $c['quadro_id']; ?>" class="text-decoration-none"><?php echo $c['titulo']; ?></a>
                        </td>
                        <td><small><?php echo $c['quadro_titulo']; ?></small></td>
                        <td><?php echo $c['responsavel_nome'] ?? '<em class="text-muted">Não atribuído</em>'; ?></td>
                        <td><small><?php echo $c['secretaria_nome'] ?? '-'; ?></small></td>
                        <td>
                            <?php if ($c['prioridade_nome']): ?>
                            <span class="badge" style="background:<?php echo $c['prioridade_cor']; ?>;color:#fff;"><?php echo $c['prioridade_nome']; ?></span>
                            <?php endif; ?>
                        </td>
                        <td class="text-danger fw-bold"><?php echo formatDate($c['prazo']); ?></td>
                        <td><span class="badge bg-danger"><?php echo $diasAtraso; ?> dias</span></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php endif; ?>

<?php include __DIR__ . '/../layout/footer.php'; ?>
