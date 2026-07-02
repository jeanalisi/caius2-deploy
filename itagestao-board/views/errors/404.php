<?php
$pageTitle = 'Página não encontrada';
include __DIR__ . '/../layout/header.php';
?>

<div class="text-center py-5">
    <i class="bi bi-exclamation-circle text-muted" style="font-size: 4rem;"></i>
    <h3 class="mt-3">Página não encontrada</h3>
    <p class="text-muted">A página que você está procurando não existe ou foi removida.</p>
    <a href="?page=dashboard" class="btn btn-primary mt-3">
        <i class="bi bi-house me-1"></i>Voltar ao Início
    </a>
</div>

<?php include __DIR__ . '/../layout/footer.php'; ?>
