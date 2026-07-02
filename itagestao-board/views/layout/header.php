<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle ?? 'ItaGestão Board'; ?> - ItaGestão Board</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body>
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
            <div class="sidebar-logo">
                <i class="bi bi-kanban"></i>
            </div>
            <h6 class="sidebar-title">ItaGestão Board</h6>
            <small class="sidebar-subtitle">Itabaiana-PB</small>
        </div>
        <nav class="sidebar-nav">
            <ul class="nav flex-column">
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('dashboard'); ?>" href="?page=dashboard">
                        <i class="bi bi-speedometer2"></i><span>Dashboard</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('quadros'); ?>" href="?page=quadros">
                        <i class="bi bi-kanban"></i><span>Quadros</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('minhas-tarefas'); ?>" href="?page=minhas-tarefas">
                        <i class="bi bi-person-check"></i><span>Minhas Tarefas</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('tarefas-hoje'); ?>" href="?page=tarefas-hoje">
                        <i class="bi bi-calendar-day"></i><span>Tarefas do Dia</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('tarefas-atrasadas'); ?>" href="?page=tarefas-atrasadas">
                        <i class="bi bi-exclamation-triangle"></i><span>Atrasadas</span>
                    </a>
                </li>
                <hr class="sidebar-divider">
                <?php if (Auth::isAdmin() || (new Auth())->temPermissao('usuarios', 'visualizar')): ?>
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('usuarios'); ?>" href="?page=usuarios">
                        <i class="bi bi-people"></i><span>Usuários</span>
                    </a>
                </li>
                <?php endif; ?>
                <?php if (Auth::isAdmin() || (new Auth())->temPermissao('secretarias', 'visualizar')): ?>
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('secretarias'); ?>" href="?page=secretarias">
                        <i class="bi bi-building"></i><span>Secretarias</span>
                    </a>
                </li>
                <?php endif; ?>
                <?php if (Auth::isAdmin() || (new Auth())->temPermissao('setores', 'visualizar')): ?>
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('setores'); ?>" href="?page=setores">
                        <i class="bi bi-diagram-3"></i><span>Setores</span>
                    </a>
                </li>
                <?php endif; ?>
                <?php if (Auth::isAdmin() || (new Auth())->temPermissao('relatorios', 'visualizar')): ?>
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('relatorios'); ?>" href="?page=relatorios">
                        <i class="bi bi-bar-chart"></i><span>Relatórios</span>
                    </a>
                </li>
                <?php endif; ?>
                <?php if (Auth::isAdmin()): ?>
                <hr class="sidebar-divider">
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('perfis'); ?>" href="?page=perfis">
                        <i class="bi bi-shield-lock"></i><span>Perfis de Acesso</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo menuActive('configuracoes'); ?>" href="?page=configuracoes">
                        <i class="bi bi-gear"></i><span>Configurações</span>
                    </a>
                </li>
                <?php endif; ?>
            </ul>
        </nav>
    </aside>

    <!-- Main Content -->
    <div class="main-content" id="main-content">
        <!-- Top Navbar -->
        <nav class="top-navbar">
            <div class="d-flex align-items-center">
                <button class="btn btn-link sidebar-toggle me-3" id="sidebar-toggle">
                    <i class="bi bi-list fs-4"></i>
                </button>
                <nav aria-label="breadcrumb" class="d-none d-md-block">
                    <ol class="breadcrumb mb-0">
                        <li class="breadcrumb-item"><a href="?page=dashboard">Início</a></li>
                        <?php if (isset($breadcrumbs)): foreach ($breadcrumbs as $bc): ?>
                        <li class="breadcrumb-item <?php echo isset($bc['active']) ? 'active' : ''; ?>">
                            <?php if (isset($bc['url'])): ?>
                            <a href="<?php echo $bc['url']; ?>"><?php echo $bc['text']; ?></a>
                            <?php else: ?>
                            <?php echo $bc['text']; ?>
                            <?php endif; ?>
                        </li>
                        <?php endforeach; endif; ?>
                    </ol>
                </nav>
            </div>
            <div class="d-flex align-items-center gap-3">
                <!-- Notificações -->
                <div class="dropdown">
                    <button class="btn btn-link position-relative" data-bs-toggle="dropdown">
                        <i class="bi bi-bell fs-5"></i>
                        <span class="notification-badge" id="notification-count" style="display:none;"></span>
                    </button>
                    <div class="dropdown-menu dropdown-menu-end notification-dropdown" style="width: 320px;">
                        <h6 class="dropdown-header">Notificações</h6>
                        <div id="notification-list">
                            <div class="text-center py-3 text-muted">Nenhuma notificação</div>
                        </div>
                        <div class="dropdown-divider"></div>
                        <a href="?page=notificacoes" class="dropdown-item text-center small">Ver todas</a>
                    </div>
                </div>
                <!-- Usuário -->
                <div class="dropdown">
                    <button class="btn btn-link d-flex align-items-center gap-2" data-bs-toggle="dropdown">
                        <div class="user-avatar">
                            <?php echo getInitials($_SESSION['usuario_nome']); ?>
                        </div>
                        <div class="d-none d-md-block text-start">
                            <div class="fw-semibold small"><?php echo $_SESSION['usuario_nome']; ?></div>
                            <div class="text-muted" style="font-size: 0.7rem;"><?php echo ucfirst($_SESSION['perfil_slug']); ?></div>
                        </div>
                        <i class="bi bi-chevron-down small"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="?page=meu-perfil"><i class="bi bi-person me-2"></i>Meu Perfil</a></li>
                        <li><a class="dropdown-item" href="?page=alterar-senha"><i class="bi bi-key me-2"></i>Alterar Senha</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="?page=logout"><i class="bi bi-box-arrow-right me-2"></i>Sair</a></li>
                    </ul>
                </div>
            </div>
        </nav>

        <!-- Page Content -->
        <div class="page-content">
            <?php renderFlash(); ?>
