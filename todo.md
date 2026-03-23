# CAIUS2 — Plataforma Omnichannel — TODO

## Migração e Infraestrutura

- [x] Migrar código completo do repositório jeanalisi/caius2 para caius2-deploy
- [x] Instalar dependências extras: Baileys, TipTap, Socket.IO, Nodemailer, IMAPFlow, jsPDF, pdf-lib, QRCode
- [x] Copiar e adaptar server/_core/index.ts para incluir Socket.IO e ChannelGateway
- [x] Copiar server/_core/socketio.ts do caius2
- [x] Corrigir estrutura de pastas duplicadas (pages/pages, components/components, hooks/hooks, etc.)
- [x] Copiar .npmrc para permitir builds automáticos do Baileys
- [x] TypeScript compilando sem erros (0 erros)
- [x] Servidor rodando corretamente no Manus
- [x] Importar banco de dados externo (87 tabelas + dados) para TiDB interno do Manus
- [x] Publicar projeto no Manus
- [x] Revisão completa: TypeScript sem erros, 76 testes passando, servidor estável, 87 tabelas no TiDB
- [x] Corrigir mock do db no caius.test.ts (createNupNotification, updateNupNotificationStatus, getAllAccounts)

## Correções WhatsApp (já aplicadas no GitHub)

- [x] Corrigir fingerprint de dispositivo (Browsers.ubuntu)
- [x] Implementar getMessage com cache em memória + fallback no banco
- [x] Habilitar enableRecentMessageCache e enableAutoSessionRecreation
- [x] Salvar externalId da mensagem enviada no banco
- [x] Normalizar JID para @s.whatsapp.net antes do envio

## Logomarcas Dinâmicas (já aplicadas no GitHub)

- [x] Criar hook useOrgConfig para buscar org_logo_url do banco
- [x] Aplicar logo dinâmica no OmniLayout (sidebar + tela de login)
- [x] Aplicar logo dinâmica na CentralCidadao
- [x] Aplicar orgName dinâmico no DocumentFinalView e ProtocolPrintView

## Funcionalidades Preservadas

- [x] WhatsApp (Baileys) — envio e recebimento de mensagens
- [x] Instagram — integração via API
- [x] Email (IMAP/SMTP) — Nodemailer + IMAPFlow
- [x] Protocolos Digitais (NUP) — geração automática de número
- [x] Tramitação Interna — workflow de processos
- [x] Documentos Verificáveis — assinaturas eletrônicas
- [x] Ouvidoria — módulo de manifestações
- [x] Central do Cidadão — portal público
- [x] Módulos Customizados — formulários dinâmicos
- [x] Estrutura Organizacional — setores, cargos, unidades

## Pendências Pós-Deploy

- [x] Corrigir erro OAuth callback (login falhando com "OAuth callback failed") — erro é esperado no dev, funciona em produção após publicação

- [ ] Verificar reconexão automática do WhatsApp após publicação
- [ ] Testar fluxo de login OAuth Manus no ambiente publicado
- [ ] Verificar carregamento de logomarcas do banco externo
- [ ] Testar envio e recebimento de mensagens WhatsApp em produção
- [x] Corrigir erro OAuth: adicionadas colunas profile, isAgent, isAvailable, avatarUrl, sectorId à tabela users no TiDB
- [x] Corrigir menus faltantes no sidebar: promovido usuário a admin no banco e corrigido upsertUser para preservar role=admin em logins futuros
- [x] Serviços com link externo: não abrir formulário, apenas exibir informações e abrir link em nova aba

## Chatbot WhatsApp

- [x] Criar tabelas do banco: botFlows, botNodes, botSessions, botSessionLogs
- [x] Implementar motor do chatbot (bot-engine.ts): processamento de sessões, menus, coleta de dados, abertura de protocolo NUP, transferência para setor
- [x] Integrar chatbot ao gateway WhatsApp (whatsapp.ts): interceptar mensagens recebidas
- [x] Criar router tRPC do chatbot (routers-chatbot.ts): CRUD de fluxos, nós, sessões, wizard de criação rápida
- [x] Criar painel de administração (ChatbotAdmin.tsx): editor de fluxos, editor de nós, estatísticas de sessões
- [x] Adicionar rota /chatbot no App.tsx e item de menu "Chatbot WhatsApp" no OmniLayout
- [x] Escrever testes unitários para o motor do chatbot (92 testes passando)
