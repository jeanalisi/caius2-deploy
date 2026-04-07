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

## Bug: Erro ao Criar Controle

- [x] Investigar e corrigir erro ao criar controle no módulo Controle

## Validação de Unicidade — Módulo Controle

- [x] Backend: função checkDuplicateControl em db-controle.ts
- [x] Backend: validação no endpoint configuracao.create (lançar CONFLICT se duplicado)
- [x] Frontend: exibir mensagem de erro clara ao tentar criar controle duplicado
- [x] Testes Vitest: validar que duplicata é rejeitada com erro adequado

## Número Inicial ao Criar Controle

- [x] Backend: aceitar nextNumber opcional no createControl (padrão = 1)
- [x] Frontend: campo "Número Inicial" no formulário de criação com dica de continuidade
- [x] Testes Vitest: validar que nextNumber é persistido corretamente

## Vinculação de Setores à Estrutura Organizacional

- [x] Mapear todas as tabelas e páginas que usam "setores" criados manualmente
- [x] Backend: getSectors() retorna orgUnits (mesmas 143 unidades reais da Prefeitura)
- [x] Frontend: página /sectors redireciona automaticamente para /org-structure
- [x] Menu: item "Setores" no adminItems aponta para /org-structure
- [x] 119 testes passando após a vinculação

## Correção Google Maps — Proxy Integrado Manus

- [x] Remover mensagem de "configure a chave de API" do Google Maps
- [x] Usar proxy integrado do Manus (sem necessidade de chave)
- [x] Centralizar mapa em Itabaiana-PB automaticamente (lat: -7.3259, lng: -35.8578)

## Envio de Documentos Oficiais e PDF de Protocolo

- [ ] Backend: tabela doc_recipients (destinatário, tipo interno/externo, canal, status)
- [ ] Backend: endpoint sendDocument (e-mail institucional para internos, e-mail/WhatsApp para externos)
- [ ] Backend: geração de PDF do documento oficial para envio
- [ ] Frontend: painel de envio no OfficialDocuments (seleção de destinatário interno ou externo)
- [ ] Frontend: tag visual de origem interna/externa nos documentos
- [ ] Backend: geração de PDF do protocolo NUP com dados completos
- [ ] Backend: envio automático do PDF do protocolo ao cidadão (e-mail ou WhatsApp)
- [ ] Frontend: indicador visual de "PDF enviado" no protocolo NUP

## Envio de Documentos Oficiais e PDF do Protocolo NUP

- [x] Schema: tabela docRecipients (destinatário, tipo interno/externo, canal, status)
- [x] Backend: helper protocol-pdf.ts para gerar PDF do protocolo NUP com pdf-lib
- [x] Backend: helper doc-sender.ts para enviar documento por e-mail/WhatsApp com PDF
- [x] Backend: endpoint documents.send no routers-caius.ts (tag interno/externo)
- [x] Backend: endpoint documents.recipients no routers-caius.ts (histórico de envios)
- [x] Backend: integração do envio de PDF ao criar protocolo NUP (routers-caius.ts)
- [x] Frontend: painel de envio no Documents.tsx com seleção de destinatários internos e externos
- [x] 119 testes passando após as mudanças

## Correção Coordenadas GeoMonitor

- [x] Corrigir coordenadas de Itabaiana-PB no GeoMonitor (lat: -7.3297, lng: -35.3330)

## Bug: Painel de Envio de Documentos Não Visível

- [ ] Diagnosticar e corrigir visibilidade do painel de envio no Documents.tsx

## Melhorias de UX: Inline Panels e Notificações (Sessão Atual)
- [x] Central do Cidadão: converter Dialog de detalhe do serviço para painel inline (sem popup)
- [x] Documents.tsx: converter Dialog "Criar Documento" para painel inline
- [x] Documents.tsx: converter Dialog "Enviar Documento" para painel inline com histórico de envios lateral
- [x] Backend: notificação interna ao enviar documento para destinatário interno (caius.documents.send)
- [x] ServicoDetalhe.tsx: corrigir validação do formulário (assunto usa nome do serviço como fallback, valida campos dinâmicos obrigatórios)
- [x] Testes: mock de createNotification adicionado, 120 testes passando

## Melhorias Adicionais (Sessão Atual)
- [x] Documents.tsx: adicionar coluna "Último Envio" na tabela com status do envio mais recente
- [x] Protocols.tsx: converter CreateProtocolDialog para painel inline
- [x] Consulta pública NUP: verificar e corrigir página /consulta com histórico de tramitações

## Notificação no Inbox ao Receber Documento Interno
- [x] Backend: criar notificação na tabela notifications ao enviar documento para destinatário interno
- [x] Backend: endpoint notifications.list e notifications.markRead no router
- [x] Frontend: sino do header exibe badge de não lidas e lista de notificações de documentos
- [x] Frontend: link direto para o documento na notificação

## Widget de Serviços para Portal Institucional (iframe)
- [x] Criar página pública /widget/servicos embeddável via iframe
- [x] Exibir categorias e serviços com busca e filtro
- [x] Configurar headers X-Frame-Options e CSP para permitir embedding externo
- [x] Documentar código de incorporação para o portal

## Widget: Grade de Blocos com Paginação
- [x] Converter widget /widget/servicos de lista para grade de blocos
- [x] 16 serviços por página com paginação abaixo

## Widget de Consulta de NUP (iframe)
- [x] Criar página pública /widget/consulta embeddável via iframe
- [x] Busca por NUP e por CPF/CNPJ com linha do tempo de tramitações
- [x] Registrar rota em App.tsx e configurar headers para embedding externo

## Bug: Links do Widget não funcionam no iframe
- [x] Corrigir links do WidgetServicos (Solicitar serviço, Acessar Central do Cidadão)
- [x] Corrigir links do WidgetConsulta (Acessar Central do Cidadão)
- [x] Garantir que todos os links abram em nova aba (target="_blank") quando em iframe

## Widget de Criação de Protocolo (iframe)
- [x] Criar página pública /widget/protocolo embeddável via iframe
- [x] Formulário multi-etapas: dados pessoais → tipo de serviço → confirmação
- [x] Usar endpoint cidadao.submitRequest existente
- [x] Exibir NUP gerado na tela de sucesso com link para /widget/consulta
- [x] Registrar rota em App.tsx e configurar headers para embedding externo

## Bot: Integração de Serviços Cadastrados (WhatsApp + WebChat)
- [x] WhatsApp: novo tipo de nó `service_list` no schema e motor do bot
- [x] WhatsApp: listar serviços dinâmicos por número, ver detalhes, confirmar e abrir protocolo
- [x] WhatsApp: serviços externos exibem link e retornam à lista
- [x] Editor visual do bot atualizado com tipo `service_list` (painel indigo + dica informativa)
- [x] Migração SQL aplicada: `service_list` adicionado ao enum nodeType no banco

## Bug: React Error #31 nos Widgets
- [x] Corrigir renderização de objeto {nup, protocolId} como filho React nos widgets (submitRequest retornava objeto em vez de string)

## Melhoria: Evidência visual do nó service_list no chatbot
- [x] Corrigir nodeInputSchema no backend: adicionar service_list ao z.enum (bloqueava criação do nó com erro de validação)
- [x] Fluxo padrão atualizado: nó 7 agora é service_list real (em vez de mensagem genérica de texto)
- [x] Card do nó service_list com borda ring indigo, gradiente e banner "Catálogo Dinâmico de Serviços"
- [x] Painel expandido no card com explicação de como funciona o nó
- [x] Dialog de criação com painel destacado (3 blocos: como funciona, fluxo após seleção, pré-requisito)
- [x] Item no Select de tipo de nó com ícone Sparkles e badge "Novo" para fácil identificação

## Fluxo Automatizado service_list: interno vs externo
- [x] Serviço externo: exibir instruções + link e encerrar automaticamente (sem precisar de "Próximo Nó")
- [x] Serviço interno: após confirmação, coletar nome/CPF/assunto automaticamente e abrir protocolo NUP sem nós adicionais
- [x] Exibir detalhes completos do serviço (descrição, purpose, whoCanRequest, cost, formOfService, importantNotes) antes de confirmar
- [x] Atualizar painel informativo no ChatbotAdmin para refletir o novo comportamento autônomo

## Melhoria: Pop-ups inline e PDF completo
- [x] OuvidoriaAdmin: converter Dialog para painel inline (split-view: lista à esquerda, detalhe à direita)
- [x] OuvidoriaAdmin: adicionar histórico de status e respostas no painel inline
- [x] OuvidoriaAdmin: adicionar botão Exportar PDF com tramitação completa
- [x] Protocols.tsx: já usa inline via ProtocolDetail — sem modais internos a converter
- [x] AdminProcesses.tsx: converter Sheet lateral para painel inline (split-view)
- [x] AdminProcesses.tsx: converter DeadlineModal para painel inline dentro do detalhe (DeadlineInlinePanel)
- [x] ProtocolPrintView: incluir transcrição da conversa (conversationMessages) no PDF
- [x] ProtocolPrintView: incluir dados do contato vinculado (nome, CPF, e-mail, telefone) no PDF
- [x] ProtocolPrintView: incluir histórico de tramitações completo no PDF
- [x] OuvidoriaAdmin: criar exportação PDF com histórico de status, respostas e dados completos

## Funcionalidade: Duplicar Tipos de Atendimento
- [x] Backend: procedure `duplicate` no router de tipos de atendimento (copia todas as configurações)
- [x] Frontend: botão "Duplicar" (cópia) na lista/card de cada tipo de atendimento
- [x] Frontend: dialog com card de origem, campo de novo nome e código opcional
- [x] Feedback visual: toast de sucesso e atualização da lista após duplicação

## Melhoria: Renumeração automática do código ao duplicar
- [x] Backend: procedure `nextCode` que recebe um código base e retorna o próximo código disponível na sequência
- [x] Frontend: ao abrir o dialog de duplicar, chamar nextCode automaticamente e preencher o campo de código
- [x] Frontend: exibir indicador de carregamento enquanto busca o próximo código disponível

## Melhoria: Cópia completa ao duplicar tipo de atendimento
- [x] Backend: copiar campos do formulário (serviceTypeFields) para o novo tipo
- [x] Backend: copiar documentos exigidos (serviceTypeDocuments) para o novo tipo
- [x] Backend: copiar assuntos vinculados (serviceSubjects) para o novo tipo
- [x] Backend: copiar informações de publicação (purpose, whoCanRequest, cost, formOfService, responseChannel, importantNotes, faq)
- [x] Frontend: exibir resumo do que será copiado no dialog com badges (configurações gerais, publicação, campos, documentos, assuntos)
- [x] Frontend: toast de sucesso exibe quantos campos, documentos e assuntos foram copiados

## Melhoria: Copiar modelos de formulário na duplicação
- [x] Backend: copiar formTemplates vinculados ao tipo original para o novo tipo
- [x] Backend: copiar formFields de cada formTemplate copiado
- [x] Frontend: adicionar badge "✓ Modelos de formulário" no dialog de duplicar
- [x] Frontend: toast de sucesso exibe quantos modelos foram copiados

## URGENTE: Coleta dinâmica de campos/documentos dos tipos de atendimento nos bots
- [ ] bot-engine.ts (WhatsApp): substituir coleta estática (nome/CPF/assunto) por coleta dinâmica dos serviceTypeFields obrigatórios
- [ ] bot-engine.ts (WhatsApp): após coleta de campos, exibir lista de documentos exigidos (serviceTypeDocuments) e solicitar confirmação
- [ ] webchat-bot.ts: idem — coleta dinâmica de campos e documentos conforme tipo de atendimento
- [ ] Salvar respostas coletadas nos campos corretos do protocolo (collectedData mapeado para campos do tipo)
- [ ] Validação básica por tipo de campo (CPF, e-mail, número, data) durante a coleta

## URGENTE: Coleta dinâmica de campos e documentos nos bots (WhatsApp e Webchat)
- [x] bot-engine.ts (WhatsApp): substituir coleta estática (nome/CPF/assunto) por campos dinâmicos do tipo de atendimento
- [x] bot-engine.ts (WhatsApp): exibir documentos exigidos antes da confirmação
- [x] webchat-bot.ts: implementar o mesmo fluxo dinâmico do WhatsApp (service_list com campos, documentos e confirmação)
- [x] Fallback: se tipo não tiver campos cadastrados, usar campos padrão (nome, CPF, assunto)
- [x] Serviço externo: exibir detalhes e link externo, sem coleta de dados

## URGENTE: Coleta de documentos via WhatsApp e Webchat
- [x] bot-engine.ts (WhatsApp): após coletar campos, solicitar cada documento exigido um a um
- [x] bot-engine.ts (WhatsApp): aguardar envio de arquivo (image/document) do cidadão e salvar no S3 via downloadMediaMessage do Baileys
- [x] bot-engine.ts (WhatsApp): anexar documentos coletados ao protocolo (tabela attachments) antes de abrir o NUP
- [x] webchat-bot.ts: após coletar campos, solicitar cada documento exigido com botão de upload
- [x] WebchatWidget.tsx: adicionar botão de upload (Paperclip) com destaque animado quando bot aguarda documento
- [x] webchat-bot.ts: salvar arquivo enviado no S3 e anexar ao protocolo (procedure sendFile)
- [x] Documentos opcionais: aceitar "Pular" ou "0" para continuar sem o documento
- [x] Exibir lista de documentos coletados no resumo antes da confirmação final

## Melhoria: Exibir e exportar anexos do protocolo
- [x] Backend: incluir anexos (attachments) no retorno de protocols.byId (busca por NUP + fallback por entityId)
- [x] ProtocolDetail: exibir seção "Documentos Anexados" com grid de cards (thumbnail, nome, tipo, tamanho, data, link)
- [x] ProtocolPrintView: incluir tabela de anexos no PDF (nome, tipo, tamanho, categoria, data, link)
- [x] Interface ProtocolData atualizada para incluir protocolAttachments

## Selfie/Foto pelo canal (WhatsApp e Webchat)
- [ ] Verificar fluxo atual de selfie no bot-engine.ts e webchat-bot.ts
- [ ] bot-engine.ts: ao solicitar selfie, aceitar imagem enviada pelo WhatsApp (hasMedia + mimetype image)
- [ ] bot-engine.ts: salvar imagem no S3 e anexar ao protocolo como selfie
- [ ] webchat-bot.ts: ao solicitar selfie, exibir botão de câmera/upload no widget
- [ ] WebchatWidget.tsx: adicionar botão de câmera com captura direta (getUserMedia) e upload
- [ ] Feedback visual: exibir miniatura da selfie enviada no chat antes de confirmar

## Envio em Massa WhatsApp via Planilha
- [x] Schema: tabelas bulkCampaigns e bulkRecipients criadas no banco (migração 0010 aplicada)
- [x] Backend: procedures create, list, byId, start, pause, cancel, delete, stats
- [x] Backend: parser de planilha XLSX/CSV com colunas telefone, nome, mensagem
- [x] Backend: worker runCampaign com rate limiting, personalização {nome}, pausa/cancelamento
- [x] Frontend: página BulkCampaigns.tsx com lista de campanhas e detalhes inline
- [x] Frontend: dialog para criar campanha (nome, conta WhatsApp, mensagem, upload planilha)
- [x] Frontend: painel de progresso com contadores (enviados, pendentes, erros) e barra de progresso
- [x] Frontend: lista de destinatários com status individual (enviado, pendente, falha)
- [x] Navegação: item "Envio em Massa WhatsApp" adicionado na seção Canais do OmniLayout
- [x] Rota /bulk-campaigns registrada no App.tsx
- [x] TypeScript: corrigidos 26 erros de 'db possibly null' no routers-bulk.ts

## Assinatura Digital — Chancela Atualizada
- [x] Unidade certificadora fixa: "Município de Itabaiana-PB — CNPJ: 09.072.430/0001-93" no rodapé da chancela e na faixa lateral
- [x] Capturar IP do assinante (já existia no backend, agora exibido na chancela)
- [x] Capturar coordenadas geográficas via Geolocation API no frontend (DocumentSignatures.tsx e SignExternalPDF.tsx)
- [x] Persistir latitude e longitude na tabela documentSignatures (migração 0011 aplicada)
- [x] Exibir IP e coordenadas no bloco de cada assinatura na página de chancela
- [x] Chancela nas páginas originais: faixa lateral direita com textos verticais rotacionados 90°, fontes escuras (rgb 0.15,0.15,0.15)

## Correção PDF — Erro WinAnsi (caracteres especiais)
- [x] Substituir StandardFonts (Helvetica/Courier) por fontes TTF Liberation Sans/Mono com suporte Unicode completo
- [x] Registrar fontkit (@pdf-lib/fontkit) no PDFDocument para habilitar fontes customizadas
- [x] Fontes copiadas para server/fonts/ e uploadádas para CDN
- [x] Testado: ç, ã, ê, ú, á, é, í, ó, â, ô renderizados corretamente no PDF

## Unificação Motor Chatbot (WhatsApp + WebChat)
- [x] Estender bot-engine.ts: nova função processWebchatBotMessage com suporte a canal "web"
- [x] Estender bot-engine.ts: adapter de envio para WebChat (acumula respostas em array)
- [x] Estender bot-engine.ts: abertura de protocolo com channel="web" (openWebchatProtocolUnified)
- [x] Estender bot-engine.ts: busca de fluxo por nome contendo "webchat" (getWebchatFlow)
- [x] Estender bot-engine.ts: suporte a consultNup no nó collect
- [x] Estender bot-engine.ts: suporte a upload de arquivo (WebchatUploadedFile)
- [x] Atualizar webchat.ts para importar processWebchatBotMessage do bot-engine em vez do webchat-bot
- [x] Manter webchat-bot.ts com createDefaultWebchatFlow (função única do webchat-bot)
- [x] Atualizar mock do webchat.test.ts para usar bot-engine
- [x] 120 testes passando após a unificação

## Apresentação Interativa do Sistema (Tour/Demo)
- [x] Criar página SystemPresentation.tsx com 10 slides interativos
- [x] Slide 1: Capa com identidade visual do CAIUS e badges de canais
- [x] Slide 2: Visão Geral com grid de 8 módulos principais
- [x] Slide 3: Atendimento Omnichannel (4 canais + recursos do Inbox)
- [x] Slide 4: Chatbot Inteligente (fluxo de 6 etapas + motor unificado)
- [x] Slide 5: Gestão de Protocolos (ciclo de vida + recursos)
- [x] Slide 6: Assinatura Digital (unidade certificadora + funcionalidades)
- [x] Slide 7: Envio em Massa WhatsApp (como funciona + recursos avançados)
- [x] Slide 8: Ouvidoria, e-SIC e Processos Adm. (3 colunas)
- [x] Slide 9: Analytics, IA e Automação (cAIus + Dashboard Executivo)
- [x] Slide 10: Encerramento com estatísticas e identidade institucional
- [x] Navegação: setas anterior/próximo, barra de progresso, dots, atalhos de teclado
- [x] Modo tela cheia (Fullscreen API) com botão e atalho F
- [x] Animações de transição entre slides (fade + slide)
- [x] Rota /apresentacao registrada no App.tsx
- [x] Item "Apresentação do Sistema" adicionado na seção Configurações do menu lateral

## Três Apresentações do Sistema
- [x] Apresentação Interna: SystemPresentation.tsx revisada — removido slide de Envio em Massa, adicionado slide de Documentos Oficiais, foco operacional
- [x] Apresentação Interna: 10 slides cobrindo Inbox, Protocolos, Documentos, Assinatura Digital, Ouvidoria, Chatbot, Relatórios, IA
- [x] Apresentação Cidadão: PresentationCidadao.tsx criada — linguagem acessível, 10 slides sobre canais, protocolo, consulta, webchat
- [x] Onboarding Servidor: PresentationOnboarding.tsx criado — guia passo a passo para novos servidores (10 slides)
- [x] Rotas /apresentacao-cidadao e /apresentacao-onboarding registradas no App.tsx
- [x] Seção dedicada "Apresentações" adicionada no menu lateral com os 3 itens
- [x] 120 testes passando após as alterações
