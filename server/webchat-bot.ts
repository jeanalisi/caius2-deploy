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
import {
  botFlows,
  botNodes,
  botSessions,
  botSessionLogs,
  conversations,
  protocols,
  webchatSessions,
} from "../drizzle/schema";
import { eq, and, isNull, or } from "drizzle-orm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface BotNodeOption {
  label: string;
  nextNodeId: number;
}

export interface WebchatBotCollectedData {
  requesterName?: string;
  requesterPhone?: string;
  requesterCpf?: string;
  requesterEmail?: string;
  subject?: string;
  description?: string;
  consultNup?: string;
  [key: string]: string | undefined;
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
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
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
  existingNup: string | null
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
