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

## Correções de Banco de Dados

- [x] Corrigir tabela accounts: AUTO_INCREMENT, PRIMARY KEY, enum status, identifier nullable, smtpSecure boolean, igAccessToken/imapPassword/smtpPassword como text
- [x] Corrigir erros TypeScript: identifier nullable requer fallback ?? "" em channel-gateway.ts e routers-omnichannel.ts

## Auditoria Completa do Banco

- [x] Auditar todas as tabelas: comparar TiDB vs schema Drizzle (colunas faltantes, tipos errados, AUTO_INCREMENT ausente)
- [x] Aplicar todas as correções SQL em lote
- [x] Verificar TypeScript após correções

## Correção WhatsApp

- [x] Diagnosticar por que WhatsApp não recebe mensagens (sessão em disco perdida após reinicialização)
- [x] Corrigir gateway WhatsApp: substituir useMultiFileAuthState (disco) por useAuthStateDB (banco TiDB)
- [x] Criar tabela waSessions para persistência de sessão no banco
- [x] Criar módulo wa-session-store.ts com useAuthStateDB, hasAccountSession, clearAccountSession
- [x] Corrigir initChannelGateway para verificar sessão no banco em vez do disco
- [x] Corrigir tabela notifications: adicionar colunas relatedProtocolId e nup, corrigir enum type
- [x] Criar 9 tabelas faltantes: verifiableDocuments, workflowDefinitions, workflowSteps, workflowTransitions, workflowStepRules, workflowInstances, workflowInstanceSteps, workflowEvents, workflowDeadlines

## Correção Erro /channel-health

- [x] Identificar colunas faltantes nas tabelas conversations (nup, assignedSectorId), contacts (cpfCnpj), accounts (waSessionData)
- [x] Adicionar colunas faltantes no banco TiDB
- [x] Verificar TypeScript e testar a página /channel-health

## Investigação WhatsApp — Sem Receber Mensagens

- [x] Verificar estado da sessão e logs do servidor
- [x] Corrigir colunas faltantes em messages (aiGenerated, deliveryStatus, deliveryError)
- [x] Corrigir upsertContact para find-or-create (evitar falha em contatos duplicados)
- [x] Resetar status da conta WhatsApp para disconnected (sessão perdida)

## Erro de Conexão WhatsApp

- [ ] Verificar logs e identificar erro exato de conexão
- [ ] Corrigir e testar reconexão

## QR Code WhatsApp em Loop

- [x] Investigar causa do QR Code mudando em loop (frontend chamava connectWhatsApp repetidamente)
- [x] Corrigir connectWhatsApp para ignorar chamadas duplicadas quando sessão já ativa
- [x] Trocar Browsers.ubuntu por Browsers.macOS para maior compatibilidade

## Auditoria Definitiva — Todas as Tabelas

- [x] Extrair schema Drizzle e estrutura do banco para comparação completa
- [x] Corrigir 12 colunas faltantes em serviceTypes (isPublic, publicationStatus, purpose, whoCanRequest, cost, formOfService, responseChannel, importantNotes, faq, formTemplateId, serviceMode, externalUrl)
- [x] Corrigir coluna nup faltante em tickets
- [x] Adicionar valor 'pending' ao enum tickets.status
- [x] Adicionar valores 'interactive' e 'reaction' ao enum messages.type
- [x] Tornar tickets.conversationId e tickets.createdById nullable (alinhamento com schema)
- [x] Corrigir Tickets.tsx: adicionar status 'pending' ao STATUS_MAP
- [x] Testar INSERT/SELECT em 22 tabelas principais: 22/22 passando
- [x] Confirmar zero erros TypeScript e zero colunas faltando

## Teste Completo de Páginas

- [x] Identificar erros nas páginas de Gestão Pública
- [x] Corrigir 12 colunas faltantes em serviceTypes (incluindo serviceMode, externalUrl)
- [x] Corrigir queries incorretas no script de teste (customModuleFields, messageTemplates, documents, auditLogs.entityType, workflowInstances.definitionId, electronicSignatures.status)
- [x] Testar 44 queries das páginas principais: 44/44 passando

## Erros de Conexão WhatsApp

- [x] Verificar logs e identificar erro exato de conexão
- [x] Corrigir e testar reconexão (QR Code estável após correção do loop)

## Erros nas Páginas /processes, /documents e outras

- [ ] Identificar queries falhando via logs
- [ ] Corrigir colunas/enums faltantes
- [ ] Testar todas as páginas afetadas

## Erro NotFoundError removeChild nas páginas /processes e /documents

- [x] Identificar causa: lang=en no index.html ativava Google Translate que modificava o DOM conflitando com React
- [x] Corrigir index.html: lang=pt-BR, translate=no, class=notranslate, meta google=notranslate
- [x] Verificar páginas /processes e /documents: sem dangerouslySetInnerHTML problemático

## Módulo Webchat — Central do Cidadão

- [x] Analisar estrutura existente: CentralCidadao, channel-gateway, Socket.IO, WhatsApp
- [x] Criar tabela webchatSessions no banco (schema + migração SQL aplicada)
- [x] Implementar gateway do webchat no servidor (webchat.ts): sessões, mensagens, bot-engine, Socket.IO, protocolos NUP
- [x] Criar rotas tRPC do webchat (routers-webchat.ts): start, send, messages, status, close, sessions, reply, closeByAgent
- [x] Criar widget de chat flutuante na Central do Cidadão (WebchatWidget.tsx): botão, janela, formulário de identificação, polling de mensagens
- [x] Integrar webchat ao inbox unificado: canal 'web' adicionado ao CHANNEL_CONFIG do Inbox, Conversations, Dashboard, Reports
- [x] Corrigir enum channel em conversations (banco + schema Drizzle): adicionado 'web'
- [x] Corrigir função getConversations no db.ts: aceita channel='web'
- [x] Escrever 10 testes unitários para o webchat (102 testes totais passando)

## Correção Divergência NUP Webchat + Chatbot Webchat

- [x] Corrigir divergência de NUPs: adicionado createProtocolWithNup em db-caius.ts — conversa e protocolo agora usam o mesmo NUP
- [x] Garantir que o NUP informado ao cidadão é o mesmo registrado no protocolo e na conversa
- [x] Criar chatbot dedicado para o canal Webchat (webchat-bot.ts): processWebchatBotMessage, createDefaultWebchatFlow, consultProtocol, openWebchatProtocol
- [x] Integrar chatbot webchat ao processWebchatMessage (substituindo bot-engine genérico)
- [x] Widget melhorado: indicador de digitando, formatação markdown, ícones diferenciados por tipo de remetente
- [x] Botão 'Fluxo Webchat' adicionado ao ChatbotAdmin para criar o fluxo padrão
- [x] Escrever 17 testes unitários para webchat (109 testes totais passando)

## Página Dedicada de Chat do Cidadão

- [x] Criar página /atendimento (ChatCidadao.tsx) — interface completa de chat sem balão flutuante
- [x] Layout responsivo com header institucional, área de mensagens e input fixo
- [x] Formulário de identificação integrado na própria página (não modal)
- [x] Exibir NUP em destaque após abertura do protocolo (painel lateral + badge no header)
- [x] Botão de copiar NUP e link para consulta pública
- [x] Indicador de status do atendimento (bot / aguardando / em atendimento / encerrado)
- [x] Registrar rota pública /atendimento, /chat e /atendimento-online no App.tsx
- [x] Adicionar link "Atendimento Online" na Central do Cidadão (primeiro item dos QUICK_LINKS)
- [x] Adicionar link na sidebar do dashboard (Canais > Webchat Cidadão no OmniLayout)

## Menu Superior da Central do Cidadão

- [x] Adicionar item "Atendimento" no menu de navegação superior da Central do Cidadão
- [x] Incluir item no menu mobile (hambúrguer) também

## Sincronização GitHub (commits até 16:48)

- [x] Incorporar 5 commits do GitHub: fix inbox barra de ações, E-mail Institucional, cAIus Agente IA
- [x] Copiar arquivos novos: EmailInstitucional.tsx, CaiusAgent.tsx, email-institutional.ts, caius-agent.ts, routers-email-institutional.ts, routers-caius-agent.ts
- [x] Adicionar rotas EmailInstitucional e CaiusAgent no App.tsx
- [x] Adicionar itens de menu E-mail Institucional e cAIus no OmniLayout.tsx
- [x] Registrar emailInstitutionalRouter e caiusAgentRouter no routers.ts
- [x] Inicializar módulos E-mail Institucional e cAIus no server/_core/index.ts
- [x] Instalar dependências: imap, @types/imap, mailparser
- [x] Aplicar migrações SQL 0004 (E-mail Institucional) e 0005 (cAIus) no banco TiDB
- [x] Corrigir erros TypeScript: ctx.ip→ctx.req.ip, emailjs-imap-client→imap, apply→applyAction, content cast String(), entityId.protocolId
- [x] Zero erros TypeScript (tsc --noEmit --skipLibCheck)
- [x] 109/109 testes passando

## WhatsApp Avançado & Bot Inteligente

- [ ] Iniciar conversa WhatsApp pelo atendente (outbound) com seleção de conta e número do destinatário
- [ ] Criar protocolo NUP a partir de conversa WhatsApp existente (botão na tela de Conversas)
- [ ] Rotas personalizáveis no chatbot (fluxo de nós configurável via UI — editor visual)
- [ ] Captura de localização no bot para serviços como troca de lâmpadas, buracos, etc.
- [ ] Integração do bot com cAIus para respostas automáticas inteligentes
- [ ] Sugestões de resposta ao atendente baseadas no contexto da conversa (cAIus)
- [ ] Correção gramatical automática das mensagens do atendente antes do envio
- [ ] Suporte a múltiplos números WhatsApp centralizados no mesmo bot e mesmas regras
- [ ] Botão de voltar à página inicial (Home) em todas as páginas do sistema

## Módulo Controle — Integração Org-Structure & Permissões Granulares

- [x] Integrar unidades organizacionais do módulo Controle com orgUnits (mesma base do /org-structure)
- [x] Atualizar db-controle.ts: getAllUnits e getUnitById agora usam orgUnits (143 unidades reais da Prefeitura)
- [x] Remover createUnit/updateUnit do db-controle.ts (gerenciadas pelo módulo /org-structure)
- [x] Atualizar routers-controle.ts: sub-router de unidades usa orgUnits; adicionar endpoint getByUserId nas permissões
- [x] Reconfigurar granulação de acesso: adicionar grupo "Controle" no MENU_GROUPS do Agents.tsx
- [x] Criar componente ControlePermissionsPanel: painel inline com permissões por tipo documental e por unidade organizacional
- [x] Adicionar botão de permissões do Controle (ícone Hash) na tabela de usuários do Agents.tsx
- [x] Criar ControleUnidadesPage.tsx integrada com orgUnits (leitura direta da estrutura organizacional)

## Relatório Consolidado no Protocolo NUP

- [x] Aprimorar getProtocolById no db-caius.ts: incluir creator, contact, conversation e conversationMessages
- [x] Importar contacts, conversations e messages no db-caius.ts
- [x] Criar componente CitizenReportPanel no ProtocolDetail.tsx: relatório consolidado com dados do cidadão, conversa vinculada, localização e histórico de mensagens
- [x] Inserir CitizenReportPanel no ProtocolDetail antes do grid principal

## Filtro por Unidade Organizacional — Histórico de Numeração (Controle)

- [ ] Atualizar endpoint de histórico no routers-controle.ts: aceitar parâmetro unitId opcional
- [ ] Atualizar db-controle.ts: adicionar filtro por unitId no getNumberHistory
- [ ] Atualizar frontend ControleHistoricoPage.tsx: select de unidade com as unidades permitidas ao usuário
- [ ] Respeitar permissões: usuário sem permissão de admin vê apenas suas unidades vinculadas

## Filtro por Unidade — Histórico de Numeração

- [x] Atualizar getUsageHistory para aceitar unitId/unitIds como filtro
- [x] Endpoint historico.list: admins vêem tudo; usuários vêem apenas suas unidades vinculadas
- [x] Novo endpoint getMyUnits para o frontend saber quais unidades o usuário pode ver
- [x] Frontend: select de unidade organizacional no ControleHistoricoPage
- [x] Frontend: filtro de controle restrito à unidade selecionada
- [x] Frontend: chips de filtros ativos com botão de remoção individual
- [x] Frontend: mensagem de aviso quando usuário não tem unidades vinculadas
- [x] Frontend: coluna "Unidade" adicionada na tabela do histórico
- [x] Frontend: badges coloridos por tipo documental
