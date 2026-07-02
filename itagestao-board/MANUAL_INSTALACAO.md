# Manual de Instalação - ItaGestão Board

## Requisitos Mínimos

| Componente | Versão Mínima |
|-----------|---------------|
| PHP | 8.0+ |
| MySQL | 5.7+ ou MariaDB 10.3+ |
| Apache | 2.4+ com mod_rewrite |
| Extensões PHP | PDO, pdo_mysql, mbstring, json, fileinfo |

## Passo a Passo

### 1. Preparar o Servidor

No painel de hospedagem (Plesk ou cPanel):

1. Crie um banco de dados MySQL
2. Crie um usuário para o banco com todas as permissões
3. Anote: host, nome do banco, usuário e senha

### 2. Upload dos Arquivos

1. Extraia o arquivo `itagestao-board.zip`
2. Faça upload de todo o conteúdo para o diretório público do servidor
   - No cPanel: `public_html/` ou subpasta
   - No Plesk: `httpdocs/` ou subpasta
3. Certifique-se de que a pasta `uploads/` tenha permissão 755

### 3. Executar o Instalador

1. Acesse pelo navegador: `https://seudominio.com.br/install/`
2. **Passo 1:** O sistema verificará os requisitos automaticamente
3. **Passo 2:** Leia as informações e prossiga
4. **Passo 3:** Preencha os dados:
   - Host do banco (geralmente `localhost`)
   - Nome do banco de dados
   - Usuário do banco
   - Senha do banco
   - URL completa do sistema
   - Nome, e-mail e senha do administrador
5. Clique em "Instalar Sistema"
6. **Passo 4:** Instalação concluída!

### 4. Pós-Instalação

1. **Remova a pasta `/install`** do servidor
2. Acesse o sistema com as credenciais definidas
3. Altere a senha no primeiro acesso
4. Configure as secretarias, setores e usuários

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| Erro de conexão com banco | Verifique host, usuário e senha do MySQL |
| Pasta não gravável | Defina permissão 755 para uploads/ e raiz |
| Página em branco | Ative exibição de erros no PHP ou verifique logs |
| Drag-and-drop não funciona | Verifique se JavaScript está habilitado |
| Erro 500 | Verifique se mod_rewrite está ativo no Apache |

## Configuração Nginx (alternativa ao Apache)

```nginx
server {
    listen 80;
    server_name seudominio.com.br;
    root /var/www/itagestao-board;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /(includes|controllers|models) {
        deny all;
    }

    location ~ /uploads/.*\.php$ {
        deny all;
    }
}
```

## Backup

Recomenda-se configurar backup automático:
- **Banco de dados:** `mysqldump -u usuario -p banco > backup.sql`
- **Arquivos:** Backup da pasta `uploads/`
