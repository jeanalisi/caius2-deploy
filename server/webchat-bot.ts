/**
 * CAIUS — Chatbot Dedicado para o Canal Webchat
 *
 * Motor de chatbot específico para o widget da Central do Cidadão.
 * Segue a mesma lógica operacional do bot-engine.ts (WhatsApp), mas:
 *  - Usa o mesmo fluxo de botFlows/botNodes do banco (reutiliza a estrutura)
 *  - Busca fluxo ativo com channel="web" ou channel=null (global)
 *  - Garante que o NUP gerado no nó "protocol" é o MESMO já atribuído à conversa
 *  - Retorna respostas como array de strings (não via callback assíncrono)
 *  - Suporta os mesmos tipos de nó: menu, message, collect, transfer, protocol, end
 *
 * Fluxo padrão (criado automaticamente se não existir):
 *  1. Boas-vindas + menu principal
 *  2. Opção 1 — Abrir protocolo: coleta nome → CPF → assunto → gera NUP → encerra
 *  3. Opção 2 — Consultar protocolo: solicita NUP → busca no banco → exibe status
 *  4. Opção 3 — Falar com atendente: transfere para fila de espera
 *  5. Opção 4 — Encerrar: despedida
 */

import { getDb } from "./db";
import { generateNup, createProtocolWithNup, getProtocolByNup } from "./db-caius";
import { getCidadaoServices, getCidadaoServiceDetail } from "./db-service-config";
import { storagePut } from "./storage";
import {
  botFlows,
  botNodes,
  botSessions,
  botSessionLogs,
  conversations,
  protocols,
  webchatSessions,
  attachments,
} from "../drizzle/schema";
import { eq, and, isNull, or } from "drizzle-orm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface BotNodeOption {
  label: string;
  nextNodeId: number;
}

// Tipos para coleta dinâmica de campos
export interface WebchatServiceFieldDef {
  id: number;
  name: string;
  label: string;
  fieldType: string;
  requirement: string;
  placeholder?: string | null;
  helpText?: string | null;
  options?: string | null;
}
export interface WebchatServiceDocDef {
  id: number;
  name: string;
  description?: string | null;
  requirement: string;
  acceptedFormats?: string | null;
}

// Documento coletado via webchat
export interface WebchatCollectedDocument {
  docName: string;
  requirement: string;
  s3Key: string;
  s3Url: string;
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
}
// Tipo para upload de arquivo recebido pelo webchat
export interface WebchatUploadedFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
}
export interface WebchatBotCollectedData {
  requesterName?: string;
  requesterPhone?: string;
  requesterCpf?: string;
  requesterEmail?: string;
  subject?: string;
  description?: string;
  consultNup?: string;
  // Campos dinâmicos do service_list
  _serviceListState?: string;
  _serviceListCache?: Array<{
    id: number; name: string; category?: string | null;
    slaResponseHours?: number | null; serviceMode?: string | null;
    externalUrl?: string | null; description?: string | null;
    purpose?: string | null; whoCanRequest?: string | null;
    cost?: string | null; formOfService?: string | null; importantNotes?: string | null;
  }>;
  _selectedServiceId?: string;
  _selectedServiceName?: string;
  _selectedServiceMode?: string;
  _fieldsToCollect?: WebchatServiceFieldDef[];
  _docsRequired?: WebchatServiceDocDef[];
  _currentFieldIndex?: number;
  _dynamicFields?: Record<string, string>;
  // Documentos coletados pelo cidadão
  _collectedDocs?: WebchatCollectedDocument[];
  _currentDocIndex?: number;
  [key: string]: unknown;
}

export interface WebchatBotResult {
  /** Mensagens a serem enviadas ao cidadão */
  replies: string[];
  /** Novo status da sessão webchat */
  sessionStatus: "bot" | "waiting" | "active" | "closed";
  /** NUP gerado (se houver) */
  nup?: string;
  /** Indica se o bot encerrou o atendimento */
  ended: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function interpolate(template: string, data: WebchatBotCollectedData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (data[key] as string | undefined) ?? "");
}

function formatMenuMessage(message: string, options: BotNodeOption[]): string {
  const lines = options.map((opt, i) => `*${i + 1}.* ${opt.label}`).join("\n");
  return `${message}\n\n${lines}`;
}

/**
 * Busca o fluxo ativo para o canal web.
 * Prioridade: fluxo com channel="web" > fluxo global (accountId null, sem channel).
 */
async function getWebchatFlow() {
  const db = await getDb();
  if (!db) return null;

  // Fluxo específico para webchat (accountId pode ser null para fluxo global)
  const allActive = await db
    .select()
    .from(botFlows)
    .where(eq(botFlows.isActive, true));

  // Prioridade 1: fluxo marcado como webchat (channel = "web" no nome ou tag)
  const webFlow = allActive.find(
    (f) => f.name?.toLowerCase().includes("webchat") || f.name?.toLowerCase().includes("web")
  );
  if (webFlow) return webFlow;

  // Prioridade 2: fluxo global sem conta específica
  const globalFlow = allActive.find((f) => f.accountId === null);
  if (globalFlow) return globalFlow;

  // Prioridade 3: qualquer fluxo ativo
  return allActive[0] ?? null;
}

/**
 * Busca ou cria a sessão do bot para um token de webchat.
 */
async function getOrCreateBotSession(
  sessionToken: string,
  conversationId: number,
  flow: typeof botFlows.$inferSelect
): Promise<{ session: typeof botSessions.$inferSelect; isNew: boolean } | null> {
  const db = await getDb();
  if (!db || !flow.rootNodeId) return null;

  // Buscar sessão ativa existente
  const [existing] = await db
    .select()
    .from(botSessions)
    .where(
      and(
        eq(botSessions.jid, sessionToken),
        eq(botSessions.status, "active")
      )
    )
    .limit(1);

  if (existing) {
    // Verificar timeout
    const timeoutMinutes = flow.sessionTimeoutMinutes ?? 60;
    const diffMinutes =
      (Date.now() - new Date(existing.lastInteractionAt).getTime()) / 60000;

    if (diffMinutes > timeoutMinutes) {
      await db
        .update(botSessions)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(botSessions.id, existing.id));
      // Criar nova sessão
    } else {
      return { session: existing, isNew: false };
    }
  }

  // Criar nova sessão
  const result = await db.insert(botSessions).values({
    jid: sessionToken,
    accountId: flow.accountId ?? 1,
    flowId: flow.id,
    currentNodeId: flow.rootNodeId,
    collectedData: {},
    status: "active",
    conversationId,
    lastInteractionAt: new Date(),
  });

  const sessionId = Number((result[0] as any).insertId);
  const [newSession] = await db
    .select()
    .from(botSessions)
    .where(eq(botSessions.id, sessionId))
    .limit(1);

  return newSession ? { session: newSession, isNew: true } : null;
}

async function logInteraction(
  sessionId: number,
  nodeId: number | null,
  botMessage: string | null,
  userInput: string | null
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(botSessionLogs).values({
    sessionId,
    nodeId: nodeId ?? undefined,
    botMessage: botMessage ?? undefined,
    userInput: userInput ?? undefined,
  });
}

/**
 * Gera a mensagem de um nó (com interpolação e formatação de menu).
 */
function buildNodeMessage(
  node: typeof botNodes.$inferSelect,
  data: WebchatBotCollectedData
): string {
  let text = interpolate(node.message, data);
  if (node.nodeType === "menu" && Array.isArray(node.options)) {
    text = formatMenuMessage(text, node.options as BotNodeOption[]);
  }
  return text;
}

/**
 * Abre um protocolo NUP no nó "protocol" do webchat.
 * Usa o NUP já atribuído à conversa para evitar divergência.
 */
async function openWebchatProtocol(
  session: typeof botSessions.$inferSelect,
  node: typeof botNodes.$inferSelect,
  conversationId: number,
  existingNup: string | null
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  const data = (session.collectedData as WebchatBotCollectedData) ?? {};

  // Usar NUP existente da conversa (já gerado em findOrCreateWebchatConversation)
  // Se por algum motivo não existir, gerar um novo
  let nup = existingNup;
  if (!nup) {
    // Buscar NUP da conversa
    const [conv] = await db
      .select({ nup: conversations.nup })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    nup = conv?.nup ?? null;
  }

  const subject = node.protocolSubject
    ? interpolate(node.protocolSubject, data)
    : `Atendimento via Webchat — ${data.requesterName ?? "Cidadão"}`;

  if (nup) {
    // Verificar se já existe protocolo com este NUP
    const existing = await db
      .select({ id: protocols.id })
      .from(protocols)
      .where(eq(protocols.nup, nup))
      .limit(1);

    if (existing.length === 0) {
      // Criar protocolo com o NUP da conversa
      await createProtocolWithNup(nup, {
        conversationId,
        contactId: undefined,
        subject,
        requesterName: data.requesterName ?? "Cidadão",
        requesterPhone: data.requesterPhone ?? undefined,
        requesterEmail: data.requesterEmail ?? undefined,
        requesterCpfCnpj: data.requesterCpf ?? undefined,
        description: data.description ?? undefined,
        type: node.protocolType ?? "request",
        channel: "web",
        status: "open",
        priority: "normal",
        isConfidential: false,
      });
    }
  } else {
    // Fallback: gerar novo NUP (não deveria acontecer)
    const newNup = await generateNup();
    nup = newNup;
    await createProtocolWithNup(nup, {
      conversationId,
      subject,
      requesterName: data.requesterName ?? "Cidadão",
      requesterPhone: data.requesterPhone ?? undefined,
      requesterEmail: data.requesterEmail ?? undefined,
      requesterCpfCnpj: data.requesterCpf ?? undefined,
      description: data.description ?? undefined,
      type: node.protocolType ?? "request",
      channel: "web",
      status: "open",
      priority: "normal",
      isConfidential: false,
    });

    // Atualizar NUP na conversa
    await db
      .update(conversations)
      .set({ nup })
      .where(eq(conversations.id, conversationId));
  }

  // Atualizar sessão do bot com o NUP
  await db
    .update(botSessions)
    .set({ generatedNup: nup, status: "completed", updatedAt: new Date() })
    .where(eq(botSessions.id, session.id));

  // Atualizar NUP na sessão webchat
  await db
    .update(webchatSessions)
    .set({ nup, lastActivityAt: new Date() })
    .where(eq(webchatSessions.conversationId, conversationId));

  return nup;
}

/**
 * Consulta o status de um protocolo pelo NUP.
 */
async function consultProtocol(nup: string): Promise<string> {
  try {
    const row = await getProtocolByNup(nup.trim().toUpperCase());
    if (!row) {
      return `❌ Protocolo *${nup}* não encontrado. Verifique o número e tente novamente.`;
    }

    const p = row.protocol;
    const statusLabels: Record<string, string> = {
      open: "Aberto",
      in_analysis: "Em análise",
      in_progress: "Em andamento",
      concluded: "Concluído",
      archived: "Arquivado",
      rejected: "Indeferido",
    };

    const status = statusLabels[p.status] ?? p.status;
    const createdAt = new Date(p.createdAt).toLocaleDateString("pt-BR");

    return (
      `📋 *Protocolo ${p.nup}*\n\n` +
      `📌 Assunto: ${p.subject}\n` +
      `📅 Aberto em: ${createdAt}\n` +
      `🔄 Status: *${status}*\n` +
      (p.requesterName ? `👤 Solicitante: ${p.requesterName}\n` : "") +
      `\nPara mais detalhes, acesse a Central do Cidadão e consulte pelo NUP.`
    );
  } catch {
    return `❌ Não foi possível consultar o protocolo. Tente novamente mais tarde.`;
  }
}

// ─── Motor principal ──────────────────────────────────────────────────────────

/**
 * Processa uma mensagem do cidadão no webchat usando o fluxo de chatbot.
 *
 * @param sessionToken  Token da sessão webchat (usado como JID no bot)
 * @param userInput     Texto enviado pelo cidadão
 * @param conversationId ID da conversa no banco
 * @param existingNup   NUP já atribuído à conversa (para evitar divergência)
 *
 * @returns WebchatBotResult com as respostas e novo status
 */
export async function processWebchatBotMessage(
  sessionToken: string,
  userInput: string,
  conversationId: number,
  existingNup: string | null,
  uploadedFile?: WebchatUploadedFile
): Promise<WebchatBotResult> {
  const db = await getDb();
  if (!db) {
    return {
      replies: ["Serviço temporariamente indisponível. Tente novamente em instantes."],
      sessionStatus: "bot",
      ended: false,
    };
  }

  const replies: string[] = [];
  let sessionStatus: "bot" | "waiting" | "active" | "closed" = "bot";
  let generatedNup: string | undefined;
  let ended = false;

  // 1. Buscar fluxo ativo para webchat
  const flow = await getWebchatFlow();
  if (!flow || !flow.rootNodeId) {
    // Sem fluxo configurado — usar resposta padrão
    replies.push(
      "Olá! Recebemos sua mensagem. Em breve um atendente irá lhe responder.\n\n" +
      (existingNup ? `Seu protocolo de atendimento é: *${existingNup}*` : "")
    );
    return { replies, sessionStatus: "waiting", nup: existingNup ?? undefined, ended: false };
  }

  // 2. Buscar ou criar sessão do bot
  const sessionResult = await getOrCreateBotSession(sessionToken, conversationId, flow);
  if (!sessionResult) {
    replies.push("Erro ao iniciar atendimento. Tente novamente.");
    return { replies, sessionStatus: "bot", ended: false };
  }

  const { session, isNew } = sessionResult;
  const data = (session.collectedData as WebchatBotCollectedData) ?? {};

  // 3. Buscar nó atual
  const [currentNode] = await db
    .select()
    .from(botNodes)
    .where(eq(botNodes.id, session.currentNodeId))
    .limit(1);

  if (!currentNode) {
    replies.push("Atendimento encerrado. Obrigado por entrar em contato!");
    return { replies, sessionStatus: "waiting", ended: true };
  }

  // 4. Nova sessão — enviar mensagem do nó raiz
  if (isNew) {
    const msg = buildNodeMessage(currentNode, data);
    replies.push(msg);
    await logInteraction(session.id, currentNode.id, msg, null);
    return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
  }

  // 5. Processar entrada do usuário
  const trimmed = userInput.trim();
  await logInteraction(session.id, currentNode.id, null, trimmed);

  let nextNodeId: number | null = null;
  const updatedData: WebchatBotCollectedData = { ...data };

  if (currentNode.nodeType === "menu") {
    const options = (currentNode.options as BotNodeOption[]) ?? [];
    const idx = parseInt(trimmed, 10) - 1;

    if (isNaN(idx) || idx < 0 || idx >= options.length) {
      // Opção inválida — reenviar menu
      const menuMsg = buildNodeMessage(currentNode, data);
      replies.push(menuMsg);
      replies.push(`⚠️ Opção inválida. Digite um número de 1 a ${options.length}.`);
      return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
    }

    nextNodeId = options[idx]!.nextNodeId;

  } else if (currentNode.nodeType === "collect") {
    // Nó de consulta de NUP — tratamento especial
    if (currentNode.collectField === "consultNup") {
      updatedData.consultNup = trimmed;
      const consultReply = await consultProtocol(trimmed);
      replies.push(consultReply);
      nextNodeId = currentNode.nextNodeId ?? null;
    } else {
      if (currentNode.collectField) {
        updatedData[currentNode.collectField] = trimmed;
      }
      nextNodeId = currentNode.nextNodeId ?? null;
    }

  } else if (currentNode.nodeType === "service_list") {
    // ─── Fluxo dinâmico do catálogo de serviços ───────────────────────────────
    const slState = updatedData._serviceListState ?? "listing";
    const slCache = updatedData._serviceListCache;

    const saveData = async () => {
      await db.update(botSessions).set({
        collectedData: updatedData as any,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(botSessions.id, session.id));
    };

    const buildFieldPromptWC = (field: WebchatServiceFieldDef): string => {
      let prompt = `📝 *${field.label}*`;
      if (field.requirement === "complementary") prompt += " _(opcional \u2014 envie '-' para pular)_";
      if (field.helpText) prompt += `\n_${field.helpText}_`;
      if (field.placeholder) prompt += `\nEx: _${field.placeholder}_`;
      if (field.options) {
        try {
          const opts: string[] = JSON.parse(field.options);
          if (opts.length > 0) prompt += "\n\nOpções:\n" + opts.map((o, i) => `*${i + 1}.* ${o}`).join("\n");
        } catch { /* ignore */ }
      }
      if (field.fieldType === "cpf") prompt += "\n_(apenas números)_";
      if (field.fieldType === "phone") prompt += "\n_(com DDD)_";
      return prompt;
    };

    const buildConfirmWC = (data: WebchatBotCollectedData, fields: WebchatServiceFieldDef[]): string => {
      const dynFields = (data._dynamicFields as Record<string, string>) ?? {};
      let msg = `📋 *Confirme os dados para abertura do protocolo:*\n\n`;
      msg += `📌 *Serviço:* ${data._selectedServiceName ?? "—"}\n`;
      fields.forEach(f => { msg += `📝 *${f.label}:* ${dynFields[f.name] ?? "—"}\n`; });
      msg += `\n*1.* ✅ Confirmar e abrir protocolo\n*0.* ❌ Cancelar e voltar à lista`;
      return msg;
    };

    const formatListWC = (header: string, services: typeof slCache): string => {
      if (!services || services.length === 0) return `${header}\n\n⚠️ Nenhum serviço disponível.\n\n*0.* Voltar`;
      const lines = services.map((s, i) => {
        const sla = s.slaResponseHours ? ` (${s.slaResponseHours}h)` : "";
        return `*${i + 1}.* ${s.name}${sla}`;
      }).join("\n");
      return `${header}\n\n${lines}\n\n*0.* Voltar`;
    };

    const buildDocPromptWC = (doc: WebchatServiceDocDef, idx: number, total: number): string => {
      const req = doc.requirement === "required" ? "*obrigatório*" : "_opcional_";
      let msg = `📎 *Documento ${idx + 1} de ${total}: ${doc.name}* (${req})\n`;
      if (doc.description) msg += `_${doc.description}_\n`;
      if (doc.acceptedFormats) msg += `Formatos aceitos: ${doc.acceptedFormats}\n`;
      msg += `\nEnvie o arquivo agora`;
      if (doc.requirement !== "required") msg += ` ou clique em *Pular* para continuar sem este documento`;
      msg += `.`;
      return msg;
    };

    const cancelWC = async () => {
      const services = slCache ?? await getCidadaoServices();
      updatedData._serviceListCache = services;
      updatedData._serviceListState = "listing";
      updatedData._selectedServiceId = undefined;
      updatedData._selectedServiceName = undefined;
      updatedData._selectedServiceMode = undefined;
      updatedData._fieldsToCollect = undefined;
      updatedData._docsRequired = undefined;
      updatedData._currentFieldIndex = undefined;
      updatedData._dynamicFields = undefined;
      replies.push(formatListWC(currentNode.message, services));
      await saveData();
    };

    const openProtocolWC = async () => {
      const nup = await generateNup();
      const dynFields = (updatedData._dynamicFields as Record<string, string>) ?? {};
      const fields = (updatedData._fieldsToCollect as WebchatServiceFieldDef[]) ?? [];
      const fieldLines = fields.map(f => `${f.label}: ${dynFields[f.name] ?? "—"}`).join("\n");
      const subject = `${updatedData._selectedServiceName ?? "Solicitação"} — ${dynFields["subject"] ?? updatedData.subject ?? "via Webchat"}`;
      await db.insert(protocols).values({
        nup,
        conversationId,
        requesterName: updatedData.requesterName ?? dynFields["requesterName"] ?? "Cidadão",
        requesterPhone: updatedData.requesterPhone ?? undefined,
        requesterEmail: updatedData.requesterEmail ?? dynFields["requesterEmail"] ?? undefined,
        requesterCpfCnpj: updatedData.requesterCpf ?? dynFields["requesterCpf"] ?? undefined,
        subject,
        description: (fieldLines || updatedData.description) ?? undefined,
        type: "request",
        channel: "web",
        status: "open",
        priority: "normal",
        isConfidential: false,
      });
      // Anexar documentos coletados ao protocolo
      const collectedDocsWC = (updatedData._collectedDocs ?? []) as WebchatCollectedDocument[];
      if (collectedDocsWC.length > 0) {
        for (const doc of collectedDocsWC) {
          await db.insert(attachments).values({
            nup,
            entityType: "protocol",
            entityId: 0,
            uploadedById: 1,
            fileName: doc.fileName,
            originalName: doc.docName,
            mimeType: doc.mimeType,
            fileSizeBytes: doc.fileSizeBytes,
            s3Key: doc.s3Key,
            s3Url: doc.s3Url,
            category: "documento_exigido",
          });
        }
      }
      await db.update(botSessions).set({
        generatedNup: nup,
        status: "completed",
        collectedData: updatedData as any,
        updatedAt: new Date(),
      }).where(eq(botSessions.id, session.id));
      generatedNup = nup;
      const docsConfirmWC = collectedDocsWC.length > 0 ? `\n\n📎 *Documentos anexados:* ${collectedDocsWC.length}` : "";
      replies.push(`✅ *Protocolo aberto com sucesso!*\n\n📋 *NUP:* ${nup}${docsConfirmWC}\n\nSua solicitação foi registrada. Guarde este número para acompanhar o andamento.`);
      if (currentNode.nextNodeId) {
        const [endNode] = await db.select().from(botNodes).where(eq(botNodes.id, currentNode.nextNodeId)).limit(1);
        if (endNode) replies.push(buildNodeMessage(endNode, updatedData));
      }
      sessionStatus = "waiting";
    };

    // ── Estado: coletando campo dinâmico ────────────────────────────────────
    if (slState === "collecting_field") {
      const fields = (updatedData._fieldsToCollect as WebchatServiceFieldDef[]) ?? [];
      const idx = (updatedData._currentFieldIndex as number) ?? 0;
      const currentField = fields[idx];
      if (currentField) {
        const isOptional = currentField.requirement === "complementary";
        const skipped = isOptional && (trimmed === "-" || trimmed === "");
        if (!skipped) {
          const dynFields = (updatedData._dynamicFields as Record<string, string>) ?? {};
          // Resolver opção numerada de select
          if (currentField.options) {
            try {
              const opts: string[] = JSON.parse(currentField.options);
              const numInput = parseInt(trimmed, 10);
              if (opts.length > 0 && !isNaN(numInput) && numInput >= 1 && numInput <= opts.length) {
                dynFields[currentField.name] = opts[numInput - 1]!;
              } else if (opts.length > 0) {
                replies.push(`⚠️ Opção inválida. Digite o número de 1 a ${opts.length}.`);
                await saveData();
                return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
              } else {
                dynFields[currentField.name] = trimmed;
              }
            } catch { dynFields[currentField.name] = trimmed; }
          } else {
            dynFields[currentField.name] = trimmed;
          }
          updatedData._dynamicFields = dynFields;
          if (currentField.fieldType === "cpf") updatedData.requesterCpf = trimmed;
          if (currentField.fieldType === "email") updatedData.requesterEmail = trimmed;
          if (currentField.name === "requesterName" || currentField.label.toLowerCase() === "nome" || currentField.label.toLowerCase().includes("nome completo")) updatedData.requesterName = trimmed;
        }
        const nextIdx = idx + 1;
        if (nextIdx < fields.length) {
          updatedData._currentFieldIndex = nextIdx;
          replies.push(buildFieldPromptWC(fields[nextIdx]!));
          await saveData();
          return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
        } else {
          // Todos os campos coletados — iniciar coleta de documentos (se houver)
          const docs = (updatedData._docsRequired as WebchatServiceDocDef[]) ?? [];
          const docsToCollect = docs.filter(d => d.requirement === "required" || d.requirement === "complementary");
          if (docsToCollect.length > 0) {
            updatedData._serviceListState = "collecting_doc";
            updatedData._currentDocIndex = 0;
            updatedData._collectedDocs = [];
            replies.push(buildDocPromptWC(docsToCollect[0]!, 0, docsToCollect.length));
          } else {
            updatedData._serviceListState = "awaiting_confirm_protocol";
            replies.push(buildConfirmWC(updatedData, fields));
          }
          await saveData();
          return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
        }
      }
    }

    // ── Estado: coletando documentos um a um ────────────────────────────────
    if (slState === "collecting_doc") {
      const docs = (updatedData._docsRequired as WebchatServiceDocDef[]) ?? [];
      const docsToCollect = docs.filter(d => d.requirement === "required" || d.requirement === "complementary");
      const docIdx = (updatedData._currentDocIndex as number) ?? 0;
      const currentDoc = docsToCollect[docIdx];
      const collectedDocs = ((updatedData._collectedDocs ?? []) as WebchatCollectedDocument[]);

      if (!currentDoc) {
        // Todos os documentos coletados
        updatedData._serviceListState = "awaiting_confirm_protocol";
        const fields2 = (updatedData._fieldsToCollect ?? []) as WebchatServiceFieldDef[];
        replies.push(buildConfirmWC(updatedData, fields2));
        await saveData();
        return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
      }

      const isOptional = currentDoc.requirement !== "required";

      // Verificar se o cidadão pulou (opcional)
      if (isOptional && (trimmed.toLowerCase() === "pular" || trimmed === "0")) {
        const nextDocIdx = docIdx + 1;
        if (nextDocIdx < docsToCollect.length) {
          updatedData._currentDocIndex = nextDocIdx;
          replies.push(buildDocPromptWC(docsToCollect[nextDocIdx]!, nextDocIdx, docsToCollect.length));
        } else {
          updatedData._serviceListState = "awaiting_confirm_protocol";
          const fields2 = (updatedData._fieldsToCollect ?? []) as WebchatServiceFieldDef[];
          replies.push(buildConfirmWC(updatedData, fields2));
        }
        await saveData();
        return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
      }

      // Verificar se veio um arquivo
      if (uploadedFile) {
        const suffix = Date.now();
        const ext = uploadedFile.fileName.split(".").pop() ?? "bin";
        const s3Key = `bot-docs/${sessionToken}-${suffix}.${ext}`;
        const { url: s3Url } = await storagePut(s3Key, uploadedFile.buffer, uploadedFile.mimeType);
        collectedDocs.push({
          docName: currentDoc.name,
          requirement: currentDoc.requirement,
          s3Key,
          s3Url,
          mimeType: uploadedFile.mimeType,
          fileName: uploadedFile.fileName,
          fileSizeBytes: uploadedFile.fileSizeBytes,
        });
        updatedData._collectedDocs = collectedDocs;
        const nextDocIdx = docIdx + 1;
        if (nextDocIdx < docsToCollect.length) {
          updatedData._currentDocIndex = nextDocIdx;
          replies.push(`✅ *${currentDoc.name}* recebido!\n\n` + buildDocPromptWC(docsToCollect[nextDocIdx]!, nextDocIdx, docsToCollect.length));
        } else {
          updatedData._serviceListState = "awaiting_confirm_protocol";
          const fields2 = (updatedData._fieldsToCollect ?? []) as WebchatServiceFieldDef[];
          const docsLine = collectedDocs.map(d => `  📎 ${d.docName}`).join("\n");
          replies.push(`✅ Todos os documentos recebidos!\n\n${docsLine}\n\n` + buildConfirmWC(updatedData, fields2));
        }
        await saveData();
        return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
      }

      // Nenhum arquivo recebido
      replies.push(`⚠️ Por favor, envie o arquivo do documento *${currentDoc.name}*${isOptional ? " ou clique em *Pular* para continuar sem ele" : ""}.`);
      await saveData();
      return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
    }

    // ── Estado: confirmação final antes de abrir protocolo ─────────────────
    if (slState === "awaiting_confirm_protocol") {
      if (trimmed === "1") {
        await openProtocolWC();
      } else {
        await cancelWC();
      }
      return { replies, sessionStatus, nup: generatedNup ?? existingNup ?? undefined, ended: sessionStatus !== "bot" };
    }

    // ── Estado: aguardando confirmação de solicitar serviço interno ──────────
    if (slState === "awaiting_service_confirm") {
      if (trimmed === "1") {
        const serviceId = updatedData._selectedServiceId ? parseInt(updatedData._selectedServiceId as string, 10) : null;
        let fieldsToCollect: WebchatServiceFieldDef[] = [];
        let docsRequired: WebchatServiceDocDef[] = [];
        if (serviceId) {
          const detail = await getCidadaoServiceDetail(serviceId);
          if (detail) {
            fieldsToCollect = (detail.fields ?? []).filter(f => f.requirement === "required" || f.requirement === "complementary") as WebchatServiceFieldDef[];
            docsRequired = (detail.documents ?? []) as WebchatServiceDocDef[];
          }
        }
        if (fieldsToCollect.length === 0) {
          fieldsToCollect = [
            { id: -1, name: "requesterName", label: "Nome completo", fieldType: "text", requirement: "required", placeholder: "Ex: João da Silva" },
            { id: -2, name: "requesterCpf", label: "CPF", fieldType: "cpf", requirement: "required", placeholder: "Ex: 12345678901" },
            { id: -3, name: "subject", label: "Assunto da solicitação", fieldType: "textarea", requirement: "required", placeholder: `Descreva sua solicitação sobre ${updatedData._selectedServiceName}` },
          ];
        }
        updatedData._fieldsToCollect = fieldsToCollect;
        updatedData._docsRequired = docsRequired;
        updatedData._currentFieldIndex = 0;
        updatedData._dynamicFields = {};
        updatedData._serviceListState = "collecting_field";
        const intro = `Para abrir o protocolo de *${updatedData._selectedServiceName}*, preciso de algumas informações.\n\n` + buildFieldPromptWC(fieldsToCollect[0]!);
        replies.push(intro);
        await saveData();
        return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
      } else {
        await cancelWC();
        return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
      }
    }

    // ── Estado padrão: exibindo lista ───────────────────────────────────────
    if (trimmed === "0") {
      nextNodeId = currentNode.nextNodeId ?? null;
    } else {
      const services = slCache ?? await getCidadaoServices();
      updatedData._serviceListCache = services;
      const selectedIndex = parseInt(trimmed, 10) - 1;
      if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= services.length) {
        replies.push(formatListWC(currentNode.message, services));
        replies.push(`⚠️ Opção inválida. Digite o número do serviço (1 a ${services.length}) ou *0* para voltar.`);
        await saveData();
        return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
      }
      const chosen = services[selectedIndex]!;
      updatedData._selectedServiceId = String(chosen.id);
      updatedData._selectedServiceName = chosen.name;
      updatedData._selectedServiceMode = chosen.serviceMode ?? "form";

      let detail = `📋 *${chosen.name}*`;
      if (chosen.category) detail += `\n🏷 _${chosen.category}_`;
      if (chosen.description) detail += `\n\n${chosen.description}`;
      if (chosen.purpose) detail += `\n\n📌 *Para que serve:* ${chosen.purpose}`;
      if (chosen.whoCanRequest) detail += `\n👥 *Quem pode solicitar:* ${chosen.whoCanRequest}`;
      if (chosen.cost) detail += `\n💰 *Custo:* ${chosen.cost}`;
      if (chosen.formOfService) detail += `\n🏢 *Forma de atendimento:* ${chosen.formOfService}`;
      if (chosen.slaResponseHours) detail += `\n⏱ *Prazo:* ${chosen.slaResponseHours}h`;
      if (chosen.importantNotes) detail += `\n\n⚠️ *Informações importantes:*\n${chosen.importantNotes}`;

      if (chosen.serviceMode === "external" && chosen.externalUrl) {
        detail += `\n\n🔗 *Este serviço é realizado pelo portal externo:*\n${chosen.externalUrl}\n\nAcesse o link para realizar sua solicitação.\n\nDigite *0* para voltar.`;
        replies.push(detail);
        updatedData._serviceListState = "listing";
        await saveData();
        return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
      }

      detail += `\n\n*1.* ✅ Solicitar este serviço\n*0.* ↩ Voltar à lista`;
      replies.push(detail);
      updatedData._serviceListState = "awaiting_service_confirm";
      await saveData();
      return { replies, sessionStatus: "bot", nup: existingNup ?? undefined, ended: false };
    }

  } else {
    // message, transfer, protocol, end — avançar automaticamente
    nextNodeId = currentNode.nextNodeId ?? null;
  }

  // 6. Atualizar dados coletados
  await db
    .update(botSessions)
    .set({
      collectedData: updatedData,
      lastInteractionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(botSessions.id, session.id));

  // Recarregar sessão
  const [updatedSession] = await db
    .select()
    .from(botSessions)
    .where(eq(botSessions.id, session.id))
    .limit(1);

  if (!updatedSession) {
    return { replies, sessionStatus: "waiting", ended: true };
  }

  // 7. Sem próximo nó — encerrar
  if (!nextNodeId) {
    await db
      .update(botSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(botSessions.id, session.id));
    return { replies, sessionStatus: "waiting", ended: true };
  }

  // 8. Avançar para o próximo nó
  const [nextNode] = await db
    .select()
    .from(botNodes)
    .where(eq(botNodes.id, nextNodeId))
    .limit(1);

  if (!nextNode) {
    return { replies, sessionStatus: "waiting", ended: true };
  }

  await db
    .update(botSessions)
    .set({ currentNodeId: nextNodeId, updatedAt: new Date() })
    .where(eq(botSessions.id, session.id));

  // 9. Executar ação do próximo nó
  if (nextNode.nodeType === "protocol") {
    // Abrir protocolo com o NUP da conversa (sem gerar novo)
    const nup = await openWebchatProtocol(updatedSession, nextNode, conversationId, existingNup);
    generatedNup = nup;

    const protocolMsg = interpolate(nextNode.message, { ...updatedData, nup });
    replies.push(protocolMsg);
    await logInteraction(session.id, nextNode.id, protocolMsg, null);

    // Continuar para próximo nó após protocolo
    if (nextNode.nextNodeId) {
      const [afterNode] = await db
        .select()
        .from(botNodes)
        .where(eq(botNodes.id, nextNode.nextNodeId))
        .limit(1);
      if (afterNode) {
        await db
          .update(botSessions)
          .set({ currentNodeId: nextNode.nextNodeId, updatedAt: new Date() })
          .where(eq(botSessions.id, session.id));
        const afterMsg = buildNodeMessage(afterNode, { ...updatedData, nup });
        replies.push(afterMsg);
        await logInteraction(session.id, afterNode.id, afterMsg, null);
      }
    }

    sessionStatus = "waiting";

  } else if (nextNode.nodeType === "transfer") {
    // Transferir para fila de atendimento humano
    if (nextNode.transferSectorId) {
      await db
        .update(conversations)
        .set({ assignedSectorId: nextNode.transferSectorId, updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));
    }

    const transferMsg = buildNodeMessage(nextNode, updatedData);
    replies.push(transferMsg);
    await logInteraction(session.id, nextNode.id, transferMsg, null);

    await db
      .update(botSessions)
      .set({ status: "transferred", updatedAt: new Date() })
      .where(eq(botSessions.id, session.id));

    sessionStatus = "waiting";

  } else if (nextNode.nodeType === "end") {
    const endMsg = buildNodeMessage(nextNode, updatedData);
    replies.push(endMsg);
    await logInteraction(session.id, nextNode.id, endMsg, null);

    await db
      .update(botSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(botSessions.id, session.id));

    sessionStatus = "closed";
    ended = true;

  } else {
    // message, menu, collect — enviar e aguardar próxima entrada
    const msg = buildNodeMessage(nextNode, updatedData);
    replies.push(msg);
    await logInteraction(session.id, nextNode.id, msg, null);
  }

  return {
    replies,
    sessionStatus,
    nup: generatedNup ?? existingNup ?? undefined,
    ended,
  };
}

// ─── Criação do fluxo padrão para webchat ─────────────────────────────────────

/**
 * Cria o fluxo padrão de chatbot para o canal Webchat.
 * Chamado automaticamente na primeira vez que o webchat é usado sem fluxo ativo.
 *
 * Estrutura do fluxo:
 *  Nó 1 (menu): Boas-vindas + menu principal
 *    → Opção 1: Abrir protocolo (Nó 2)
 *    → Opção 2: Consultar protocolo (Nó 6)
 *    → Opção 3: Falar com atendente (Nó 7)
 *    → Opção 4: Encerrar (Nó 8)
 *  Nó 2 (collect: requesterName): Qual é o seu nome?
 *  Nó 3 (collect: requesterCpf): Informe seu CPF (opcional)
 *  Nó 4 (collect: subject): Descreva brevemente sua solicitação
 *  Nó 5 (protocol): Abrindo protocolo... → Nó 8 (end)
 *  Nó 6 (collect: consultNup): Informe o número do protocolo
 *  Nó 7 (transfer): Transferindo para atendente...
 *  Nó 8 (end): Encerramento
 */
export async function createDefaultWebchatFlow(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  // Criar o fluxo
  const flowResult = await db.insert(botFlows).values({
    name: "Webchat — Fluxo Padrão",
    description: "Fluxo padrão de atendimento ao cidadão via Webchat da Central do Cidadão",
    isActive: true,
    accountId: null, // fluxo global
    sessionTimeoutMinutes: 60,
  });
  const flowId = Number((flowResult[0] as any).insertId);

  // Criar nós (sem nextNodeId/options por enquanto — serão corrigidos depois)
  const insertNode = async (data: {
    flowId: number;
    nodeType: string;
    message: string;
    sortOrder: number;
    collectField?: string;
    protocolType?: string;
    protocolSubject?: string;
    transferSectorId?: number;
  }) => {
    const r = await db.insert(botNodes).values(data as any);
    return Number((r[0] as any).insertId);
  };

  const n1 = await insertNode({
    flowId,
    nodeType: "menu",
    sortOrder: 1,
    message:
      "👋 Olá! Bem-vindo ao *Atendimento Digital* da Prefeitura.\n\n" +
      "Como posso ajudá-lo hoje?",
  });

  const n2 = await insertNode({
    flowId,
    nodeType: "collect",
    sortOrder: 2,
    message: "Por favor, informe o seu *nome completo*:",
    collectField: "requesterName",
  });

  const n3 = await insertNode({
    flowId,
    nodeType: "collect",
    sortOrder: 3,
    message:
      "Informe seu *CPF* (somente números) para vincular a solicitação ao seu cadastro.\n\n" +
      "_(Digite 0 para pular)_",
    collectField: "requesterCpf",
  });

  const n4 = await insertNode({
    flowId,
    nodeType: "collect",
    sortOrder: 4,
    message: "Descreva brevemente o *assunto da sua solicitação*:",
    collectField: "subject",
  });

  const n5 = await insertNode({
    flowId,
    nodeType: "protocol",
    sortOrder: 5,
    message:
      "✅ Sua solicitação foi registrada com sucesso!\n\n" +
      "📋 *Número do Protocolo (NUP): {{nup}}*\n\n" +
      "Guarde este número para acompanhar o andamento. " +
      "Você pode consultar o status a qualquer momento aqui no chat ou na Central do Cidadão.",
    protocolType: "request",
    protocolSubject: "{{subject}}",
  });

  const n6 = await insertNode({
    flowId,
    nodeType: "collect",
    sortOrder: 6,
    message:
      "🔍 Informe o *número do protocolo* que deseja consultar:\n\n" +
      "_(Exemplo: PMI-2026-000001)_",
    collectField: "consultNup",
  });

  const n7 = await insertNode({
    flowId,
    nodeType: "transfer",
    sortOrder: 7,
    message:
      "👤 Estou transferindo você para um *atendente humano*.\n\n" +
      "Por favor, aguarde. Em breve alguém irá lhe atender.\n\n" +
      (existingNupPlaceholder => existingNupPlaceholder)(
        "Seu protocolo de atendimento é: *{{nup}}*"
      ),
  });

  const n8 = await insertNode({
    flowId,
    nodeType: "end",
    sortOrder: 8,
    message:
      "👋 Obrigado por entrar em contato com a Prefeitura!\n\n" +
      "Seu atendimento foi encerrado. Caso precise de ajuda novamente, " +
      "basta enviar uma nova mensagem.\n\n" +
      "Tenha um ótimo dia! 😊",
  });

  // Patch: configurar opções do menu (n1) e nextNodeIds
  await db
    .update(botNodes)
    .set({
      options: [
        { label: "Abrir protocolo / solicitação", nextNodeId: n2 },
        { label: "Consultar protocolo existente", nextNodeId: n6 },
        { label: "Falar com um atendente", nextNodeId: n7 },
        { label: "Encerrar atendimento", nextNodeId: n8 },
      ] as any,
    })
    .where(eq(botNodes.id, n1));

  // n2 → n3 → n4 → n5 → n8
  await db.update(botNodes).set({ nextNodeId: n3 } as any).where(eq(botNodes.id, n2));
  await db.update(botNodes).set({ nextNodeId: n4 } as any).where(eq(botNodes.id, n3));
  await db.update(botNodes).set({ nextNodeId: n5 } as any).where(eq(botNodes.id, n4));
  await db.update(botNodes).set({ nextNodeId: n8 } as any).where(eq(botNodes.id, n5));

  // n6 → n8 (após consulta, encerrar)
  await db.update(botNodes).set({ nextNodeId: n8 } as any).where(eq(botNodes.id, n6));

  // n7 → sem próximo (transferência encerra o bot)
  // n8 → sem próximo (fim)

  // Definir nó raiz do fluxo
  await db
    .update(botFlows)
    .set({ rootNodeId: n1 })
    .where(eq(botFlows.id, flowId));

  return flowId;
}

// Placeholder para interpolação no createDefaultWebchatFlow
function existingNupPlaceholder(s: string) { return s; }
