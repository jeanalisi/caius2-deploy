# ItaGestão Board

**Sistema de Gestão Institucional em formato Kanban**  
Prefeitura Municipal de Itabaiana-PB

---

## Sobre o Sistema

O ItaGestão Board é uma plataforma de gestão institucional em formato de quadros, listas e cartões (estilo Kanban/Trello), desenvolvida para a administração pública municipal. Permite que o Gabinete, secretarias, setores e servidores acompanhem demandas, prazos, responsáveis, prioridades, anexos, comentários, checklists e histórico de movimentações.

## Tecnologias

- **PHP 8.3** (puro, sem frameworks)
- **MySQL/MariaDB**
- **Bootstrap 5.3**
- **JavaScript/AJAX**
- **SortableJS** (drag-and-drop)
- **Chart.js** (gráficos)
- **Bootstrap Icons**

## Requisitos do Servidor

- PHP 8.0 ou superior
- MySQL 5.7+ ou MariaDB 10.3+
- Extensões PHP: PDO, pdo_mysql, mbstring, json, fileinfo
- Apache com mod_rewrite (ou Nginx equivalente)
- Hospedagem com Plesk ou cPanel

## Instalação

### 1. Upload dos Arquivos

Faça upload de todos os arquivos para o diretório público do servidor (public_html ou equivalente).

### 2. Criar Banco de Dados

Crie um banco de dados MySQL/MariaDB no painel de hospedagem (Plesk/cPanel).

### 3. Executar o Instalador

Acesse pelo navegador:
```
https://seudominio.com.br/install/
```

O instalador irá:
- Verificar os requisitos do servidor
- Solicitar dados de conexão com o banco
- Criar todas as tabelas automaticamente
- Inserir dados iniciais (secretarias, perfis, prioridades)
- Criar os quadros institucionais
- Gerar o arquivo de configuração
- Criar o usuário administrador

### 4. Remover Pasta de Instalação

Após a instalação, **remova ou renomeie** a pasta `/install` por segurança.

### 5. Acessar o Sistema

Acesse o sistema com as credenciais definidas na instalação.

## Dados de Acesso Padrão

| Campo | Valor |
|-------|-------|
| E-mail | admin@itabaiana.pb.gov.br |
| Senha | admin123 |
| Perfil | Administrador Geral |

**Importante:** Altere a senha no primeiro acesso.

## Estrutura de Pastas

```
itagestao-board/
├── assets/
│   ├── css/          # Estilos CSS
│   ├── js/           # JavaScript
│   ├── img/          # Imagens
│   └── fonts/        # Fontes
├── controllers/      # Controllers AJAX
├── includes/         # Classes e helpers
├── install/          # Instalador web
├── uploads/          # Arquivos enviados
│   ├── anexos/       # Anexos dos cartões
│   └── evidencias/   # Evidências de execução
├── views/            # Views/páginas
│   ├── auth/         # Login e autenticação
│   ├── dashboard/    # Dashboard
│   ├── quadros/      # Quadros Kanban
│   ├── cartoes/      # Cartões/tarefas
│   ├── usuarios/     # Gestão de usuários
│   ├── secretarias/  # Secretarias
│   ├── setores/      # Setores
│   ├── perfis/       # Perfis de acesso
│   ├── relatorios/   # Relatórios
│   ├── configuracoes/# Configurações
│   ├── layout/       # Header/Footer
│   └── errors/       # Páginas de erro
├── exports/          # Relatórios exportados
├── .htaccess         # Configuração Apache
├── api.php           # Endpoint AJAX
├── config.php        # Configuração (gerado)
├── config.sample.php # Exemplo de configuração
├── database.sql      # Schema do banco
├── index.php         # Roteador principal
└── README.md         # Este arquivo
```

## Módulos

- Dashboard com gráficos e estatísticas
- Quadros Kanban com drag-and-drop
- Cartões com comentários, checklists, anexos e histórico
- Gestão de usuários com perfis de acesso
- Cadastro de secretarias e setores
- Relatórios com filtros e exportação CSV
- Notificações
- Configurações do sistema

## Perfis de Acesso

| Perfil | Descrição |
|--------|-----------|
| Administrador Geral | Acesso total ao sistema |
| Prefeito/Gabinete | Visualiza todos os quadros e relatórios |
| Secretário | Gerencia quadros da própria secretaria |
| Coordenador | Cria e movimenta tarefas do setor |
| Servidor | Visualiza e executa tarefas atribuídas |
| Controle Interno | Visualiza histórico, prazos e gargalos |
| Visualizador | Apenas consulta |

## Fluxos Disponíveis

- **Padrão:** Nova demanda > Em análise > Aguardando documentos > Em execução > Aguardando terceiros > Concluído > Arquivado
- **Licitação:** Solicitação > DFD > ETP > Termo de Referência > Pesquisa de preços > Parecer jurídico > Publicação > Contratação > Execução > Concluído
- **Obras:** Demanda recebida > Projeto > Orçamento > Licitação > Ordem de serviço > Em execução > Medição > Concluída
- **Convênios:** Ideia > Cadastro > Plano de trabalho > Análise > Aprovado > Execução > Prestação de contas > Finalizado

## Segurança

- Senhas criptografadas com `password_hash` (bcrypt)
- Proteção contra SQL Injection via PDO com prepared statements
- Controle de sessão com timeout
- Verificação de permissões por perfil em todas as ações
- Upload seguro com validação de extensão e tamanho
- Proteção contra acesso direto a arquivos PHP em pastas restritas
- Logs de ações relevantes
- Token CSRF em formulários

## Observações Pós-Instalação

1. **Remova a pasta `/install`** após concluir a instalação
2. **Altere a senha padrão** do administrador imediatamente
3. Configure o **backup automático** do banco de dados
4. Verifique as permissões de pasta: `uploads/` deve ter permissão 755
5. Em produção, defina `DEBUG_MODE` como `false` no config.php
6. Configure HTTPS/SSL para segurança das credenciais

## Licença

Sistema desenvolvido exclusivamente para a Prefeitura Municipal de Itabaiana-PB.

## Versão

**1.0.0** - Julho/2026
