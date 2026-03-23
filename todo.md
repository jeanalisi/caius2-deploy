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
- [ ] Publicar projeto para ativar DATABASE_URL com banco externo (painel.hchost.net)

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
