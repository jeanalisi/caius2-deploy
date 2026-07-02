<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - ItaGestão Board</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        :root {
            --primary: #0d47a1;
            --primary-light: #1976d2;
            --primary-dark: #002171;
        }
        body {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .login-card {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            max-width: 420px;
            width: 100%;
        }
        .login-header {
            background: var(--primary);
            color: #fff;
            padding: 2rem;
            text-align: center;
        }
        .login-header h1 {
            font-size: 1.5rem;
            margin-bottom: 0.25rem;
            font-weight: 700;
        }
        .login-header p {
            opacity: 0.8;
            margin: 0;
            font-size: 0.85rem;
        }
        .login-body {
            padding: 2rem;
        }
        .form-control {
            border-radius: 8px;
            padding: 0.75rem 1rem;
            border: 1px solid #e0e0e0;
        }
        .form-control:focus {
            border-color: var(--primary-light);
            box-shadow: 0 0 0 0.2rem rgba(13,71,161,0.15);
        }
        .btn-primary {
            background: var(--primary);
            border-color: var(--primary);
            border-radius: 8px;
            padding: 0.75rem;
            font-weight: 600;
        }
        .btn-primary:hover {
            background: var(--primary-dark);
            border-color: var(--primary-dark);
        }
        .login-logo {
            width: 64px;
            height: 64px;
            background: rgba(255,255,255,0.15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1rem;
            font-size: 1.8rem;
        }
        .input-group-text {
            background: #f8f9fa;
            border-right: 0;
            border-radius: 8px 0 0 8px;
        }
        .input-group .form-control {
            border-left: 0;
            border-radius: 0 8px 8px 0;
        }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="login-header">
            <div class="login-logo">
                <i class="bi bi-kanban"></i>
            </div>
            <h1>ItaGestão Board</h1>
            <p>Prefeitura Municipal de Itabaiana-PB</p>
        </div>
        <div class="login-body">
            <?php renderFlash(); ?>
            <div id="alert-container"></div>
            <form id="form-login" method="POST">
                <div class="mb-3">
                    <label class="form-label fw-semibold">E-mail</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                        <input type="email" class="form-control" name="email" placeholder="seu@email.gov.br" required autofocus>
                    </div>
                </div>
                <div class="mb-4">
                    <label class="form-label fw-semibold">Senha</label>
                    <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-lock"></i></span>
                        <input type="password" class="form-control" name="senha" placeholder="••••••••" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary w-100" id="btn-login">
                    <i class="bi bi-box-arrow-in-right me-2"></i>Entrar
                </button>
            </form>
            <div class="text-center mt-3">
                <small class="text-muted">Sistema de Gestão Institucional</small>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
    document.getElementById('form-login').addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-login');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Entrando...';

        const formData = new FormData(this);
        
        fetch('api.php?module=auth&action=login', {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                window.location.href = '<?php echo SITE_URL ?? ""; ?>/?page=dashboard';
            } else {
                document.getElementById('alert-container').innerHTML = 
                    '<div class="alert alert-danger alert-dismissible fade show"><i class="bi bi-exclamation-circle me-2"></i>' + 
                    data.message + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>';
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Entrar';
            }
        })
        .catch(() => {
            document.getElementById('alert-container').innerHTML = 
                '<div class="alert alert-danger">Erro de conexão. Tente novamente.</div>';
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Entrar';
        });
    });
    </script>
</body>
</html>
