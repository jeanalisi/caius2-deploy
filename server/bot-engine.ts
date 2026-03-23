/**
 * CAIUS — Motor do Chatbot para WhatsApp
 *
 * Responsabilidades:
 *  1. Verificar se existe fluxo ativo para a conta
 *  2. Gerenciar sessões por JID (criar, avançar, expirar)
 *  3. Processar a entrada do usuário e avançar para o próximo nó
 *  4. Enviar a mensagem do nó atual via callback
 *  5. Ao chegar em nó "protocol", abrir NUP automaticamente
 *  6. Ao chegar em nó "transfer", atribuir setor à conversa
 */

import { getDb } from "./db";
import { generateNup } from "./db-caius";
import {
  botFlows,
  botNodes,
  botSessions,
  botSessionLogs,
  conversations,
  protocols,
} from "../drizzle/schema";
import { eq, and, lt } from "drizzle-orm";

// Tipo para opções de menu de um nó
export interface BotNodeOption {
  label: string;
  nextNodeId: number;
}

// Tipo para dados coletados durante o fluxo
export interface BotCollectedData {
  requesterName?: string;
  requesterPhone?: string;
  requesterCpf?: string;
  requesterEmail?: string;
  subject?: string;
  description?: string;
  [key: string]: string | undefined;
}

// Callback para enviar mensagem ao usuário via WhatsApp
export type SendMessageFn = (jid: string, text: string) => Promise<void>;

// ─── Funções auxiliares ────────────────────────────────────────────────────────

/**
 * Substitui variáveis como {{requesterName}} pelos dados coletados.
 */
function interpolate(template: string, data: BotCollectedData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

/**
 * Formata a mensagem de um nó do tipo "menu" com as opções numeradas.
 */
function formatMenuMessage(message: string, options: BotNodeOption[]): string {
  const optionLines = options
    .map((opt, i) => `*${i + 1}.* ${opt.label}`)
    .join("\n");
  return `${message}\n\n${optionLines}`;
}

/**
 * Busca o fluxo ativo para uma conta WhatsApp.
 * Prioriza fluxo específico da conta; fallback para fluxo global (accountId null).
 */
async function getActiveFlow(accountId: number) {
  const db = await getDb();
  if (!db) return null;

  // Fluxo específico da conta
  const [specific] = await db
    .select()
    .from(botFlows)
    .where(and(eq(botFlows.accountId, accountId), eq(botFlows.isActive, true)))
    .limit(1);
  if (specific) return specific;

  // Fluxo global
  const globals = await db
    .select()
    .from(botFlows)
    .where(eq(botFlows.isActive, true))
    .limit(1);
  return globals.find((f) => f.accountId === null) ?? null;
}

/**
 * Busca a sessão ativa de um JID. Expira sessões antigas automaticamente.
 */
async function getActiveSession(jid: string, accountId: number) {
  const db = await getDb();
  if (!db) return null;

  const [session] = await db
    .select()
    .from(botSessions)
    .where(
      and(
        eq(botSessions.jid, jid),
        eq(botSessions.accountId, accountId),
        eq(botSessions.status, "active")
      )
    )
    .limit(1);

  if (!session) return null;

  // Verificar timeout
  const flow = await db
    .select({ sessionTimeoutMinutes: botFlows.sessionTimeoutMinutes })
    .from(botFlows)
    .where(eq(botFlows.id, session.flowId))
    .limit(1);

  const timeoutMinutes = flow[0]?.sessionTimeoutMinutes ?? 30;
  const lastInteraction = new Date(session.lastInteractionAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastInteraction.getTime()) / 60000;

  if (diffMinutes > timeoutMinutes) {
    // Expirar sessão
    await db
      .update(botSessions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(botSessions.id, session.id));
    return null;
  }

  return session;
}

/**
 * Cria uma nova sessão para o usuário no nó raiz do fluxo.
 */
async function createSession(
  jid: string,
  accountId: number,
  flow: typeof botFlows.$inferSelect,
  conversationId: number
) {
  const db = await getDb();
  if (!db || !flow.rootNodeId) return null;

  const result = await db.insert(botSessions).values({
    jid,
    accountId,
    flowId: flow.id,
    currentNodeId: flow.rootNodeId,
    collectedData: {},
    status: "active",
    conversationId,
    lastInteractionAt: new Date(),
  });

  const sessionId = Number((result[0] as any).insertId);
  const [session] = await db
    .select()
    .from(botSessions)
    .where(eq(botSessions.id, sessionId))
    .limit(1);
  return session ?? null;
}

/**
 * Registra uma entrada no log da sessão.
 */
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
 * Envia a mensagem do nó atual ao usuário e registra no log.
 */
async function sendNodeMessage(
  session: typeof botSessions.$inferSelect,
  node: typeof botNodes.$inferSelect,
  sendFn: SendMessageFn
) {
  const data = (session.collectedData as BotCollectedData) ?? {};
  let text = interpolate(node.message, data);

  if (node.nodeType === "menu" && Array.isArray(node.options)) {
    text = formatMenuMessage(text, node.options as BotNodeOption[]);
  }

  await sendFn(session.jid, text);
  await logInteraction(session.id, node.id, text, null);
}

/**
 * Abre um protocolo NUP automaticamente ao chegar no nó "protocol".
 */
async function openProtocol(
  session: typeof botSessions.$inferSelect,
  node: typeof botNodes.$inferSelect
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  const data = (session.collectedData as BotCollectedData) ?? {};
  const nup = await generateNup();

  const subject = node.protocolSubject
    ? interpolate(node.protocolSubject, data)
    : `Atendimento via WhatsApp — ${data.requesterName ?? session.jid.split("@")[0]}`;

  await db.insert(protocols).values({
    nup,
    conversationId: session.conversationId ?? undefined,
    requesterName: data.requesterName ?? session.jid.split("@")[0],
    requesterPhone: data.requesterPhone ?? session.jid.split("@")[0],
    requesterEmail: data.requesterEmail ?? undefined,
    requesterCpfCnpj: data.requesterCpf ?? undefined,
    subject,
    description: data.description ?? undefined,
    type: node.protocolType ?? "request",
    channel: "whatsapp",
    status: "open",
    priority: "normal",
    isConfidential: false,
    responsibleSectorId: undefined,
  });

  // Atualizar sessão com o NUP gerado
  await db
    .update(botSessions)
    .set({ generatedNup: nup, status: "completed", updatedAt: new Date() })
    .where(eq(botSessions.id, session.id));

  return nup;
}

/**
 * Transfere a conversa para um setor específico.
 */
async function transferToSector(
  session: typeof botSessions.$inferSelect,
  sectorId: number
) {
  const db = await getDb();
  if (!db || !session.conversationId) return;

  await db
    .update(conversations)
    .set({ assignedSectorId: sectorId, updatedAt: new Date() })
    .where(eq(conversations.id, session.conversationId));

  await db
    .update(botSessions)
    .set({ status: "transferred", updatedAt: new Date() })
    .where(eq(botSessions.id, session.id));
}

// ─── Função principal: processar mensagem recebida ────────────────────────────

/**
 * Processa uma mensagem recebida de um usuário no WhatsApp.
 *
 * Retorna `true` se o bot tratou a mensagem (não deve ser exibida como mensagem
 * normal ao atendente), ou `false` se não há bot ativo e a mensagem deve seguir
 * o fluxo normal.
 */
export async function processBotMessage(
  accountId: number,
  jid: string,
  userInput: string,
  conversationId: number,
  sendFn: SendMessageFn
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // 1. Verificar se há fluxo ativo para esta conta
  const flow = await getActiveFlow(accountId);
  if (!flow || !flow.rootNodeId) return false;

  // 2. Buscar ou criar sessão
  let session = await getActiveSession(jid, accountId);
  let isNewSession = false;

  if (!session) {
    session = await createSession(jid, accountId, flow, conversationId);
    isNewSession = true;
    if (!session) return false;
  }

  // 3. Buscar nó atual
  const [currentNode] = await db
    .select()
    .from(botNodes)
    .where(eq(botNodes.id, session.currentNodeId))
    .limit(1);

  if (!currentNode) return false;

  // 4. Se é nova sessão, enviar mensagem do nó raiz e aguardar resposta
  if (isNewSession) {
    await sendNodeMessage(session, currentNode, sendFn);
    return true;
  }

  // 5. Processar a resposta do usuário de acordo com o tipo do nó atual
  const trimmedInput = userInput.trim();
  await logInteraction(session.id, currentNode.id, null, trimmedInput);

  let nextNodeId: number | null = null;
  const updatedData: BotCollectedData = {
    ...((session.collectedData as BotCollectedData) ?? {}),
  };

  if (currentNode.nodeType === "menu") {
    // Interpretar número digitado como seleção de opção
    const options = (currentNode.options as BotNodeOption[]) ?? [];
    const selectedIndex = parseInt(trimmedInput, 10) - 1;

    if (
      isNaN(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= options.length
    ) {
      // Opção inválida — reenviar o menu
      await sendNodeMessage(session, currentNode, sendFn);
      await sendFn(
        jid,
        `⚠️ Opção inválida. Por favor, digite o número correspondente à opção desejada (1 a ${options.length}).`
      );
      return true;
    }

    nextNodeId = options[selectedIndex]!.nextNodeId;
  } else if (currentNode.nodeType === "collect") {
    // Armazenar dado coletado
    if (currentNode.collectField) {
      updatedData[currentNode.collectField] = trimmedInput;
    }
    nextNodeId = currentNode.nextNodeId ?? null;
  } else if (
    currentNode.nodeType === "message" ||
    currentNode.nodeType === "transfer" ||
    currentNode.nodeType === "protocol" ||
    currentNode.nodeType === "end"
  ) {
    // Esses nós não esperam entrada — avançar automaticamente
    nextNodeId = currentNode.nextNodeId ?? null;
  }

  // 6. Atualizar dados coletados na sessão
  await db
    .update(botSessions)
    .set({
      collectedData: updatedData,
      lastInteractionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(botSessions.id, session.id));

  // Recarregar sessão com dados atualizados
  const [updatedSession] = await db
    .select()
    .from(botSessions)
    .where(eq(botSessions.id, session.id))
    .limit(1);
  if (!updatedSession) return true;

  // 7. Se não há próximo nó, encerrar
  if (!nextNodeId) {
    await db
      .update(botSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(botSessions.id, session.id));
    return true;
  }

  // 8. Avançar para o próximo nó
  const [nextNode] = await db
    .select()
    .from(botNodes)
    .where(eq(botNodes.id, nextNodeId))
    .limit(1);

  if (!nextNode) return true;

  // Atualizar nó atual na sessão
  await db
    .update(botSessions)
    .set({ currentNodeId: nextNodeId, updatedAt: new Date() })
    .where(eq(botSessions.id, session.id));

  // 9. Executar ação do próximo nó
  if (nextNode.nodeType === "protocol") {
    // Abrir protocolo NUP automaticamente
    const nup = await openProtocol(updatedSession, nextNode);
    const data = (updatedSession.collectedData as BotCollectedData) ?? {};
    const protocolMsg = interpolate(nextNode.message, { ...data, nup });
    await sendFn(jid, protocolMsg);
    await logInteraction(session.id, nextNode.id, protocolMsg, null);

    // Se há próximo nó após o protocolo, continuar
    if (nextNode.nextNodeId) {
      const [afterProtocol] = await db
        .select()
        .from(botNodes)
        .where(eq(botNodes.id, nextNode.nextNodeId))
        .limit(1);
      if (afterProtocol) {
        await db
          .update(botSessions)
          .set({ currentNodeId: nextNode.nextNodeId, updatedAt: new Date() })
          .where(eq(botSessions.id, session.id));
        await sendNodeMessage(updatedSession, afterProtocol, sendFn);
      }
    }
  } else if (nextNode.nodeType === "transfer") {
    // Transferir para setor
    if (nextNode.transferSectorId) {
      await transferToSector(updatedSession, nextNode.transferSectorId);
    }
    await sendNodeMessage(updatedSession, nextNode, sendFn);

    // Encerrar bot após transferência
    await db
      .update(botSessions)
      .set({ status: "transferred", updatedAt: new Date() })
      .where(eq(botSessions.id, session.id));
  } else if (nextNode.nodeType === "end") {
    await sendNodeMessage(updatedSession, nextNode, sendFn);
    await db
      .update(botSessions)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(botSessions.id, session.id));
  } else {
    // message, menu, collect — enviar mensagem e aguardar próxima entrada
    await sendNodeMessage(updatedSession, nextNode, sendFn);
  }

  return true;
}

// ─── Funções de gerenciamento de fluxos (usadas pelo painel admin) ────────────

export async function getFlows(accountId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(botFlows).orderBy(botFlows.createdAt);
}

export async function getFlowById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [flow] = await db
    .select()
    .from(botFlows)
    .where(eq(botFlows.id, id))
    .limit(1);
  return flow ?? null;
}

export async function getNodesByFlow(flowId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(botNodes)
    .where(eq(botNodes.flowId, flowId))
    .orderBy(botNodes.sortOrder);
}

export async function createFlow(data: typeof botFlows.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const result = await db.insert(botFlows).values(data);
  const id = Number((result[0] as any).insertId);
  return getFlowById(id);
}

export async function updateFlow(
  id: number,
  data: Partial<typeof botFlows.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db
    .update(botFlows)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(botFlows.id, id));
  return getFlowById(id);
}

export async function deleteFlow(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  // Deletar nós e sessões vinculadas
  await db.delete(botNodes).where(eq(botNodes.flowId, id));
  await db.delete(botSessions).where(eq(botSessions.flowId, id));
  await db.delete(botFlows).where(eq(botFlows.id, id));
}

export async function createNode(data: typeof botNodes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  const result = await db.insert(botNodes).values(data);
  const id = Number((result[0] as any).insertId);
  const [node] = await db
    .select()
    .from(botNodes)
    .where(eq(botNodes.id, id))
    .limit(1);
  return node ?? null;
}

export async function updateNode(
  id: number,
  data: Partial<typeof botNodes.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db
    .update(botNodes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(botNodes.id, id));
  const [node] = await db
    .select()
    .from(botNodes)
    .where(eq(botNodes.id, id))
    .limit(1);
  return node ?? null;
}

export async function deleteNode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");
  await db.delete(botNodes).where(eq(botNodes.id, id));
}

export async function setFlowActive(flowId: number, accountId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  // Desativar outros fluxos da mesma conta
  if (accountId !== null) {
    await db
      .update(botFlows)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(botFlows.accountId, accountId));
  }

  await db
    .update(botFlows)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(botFlows.id, flowId));
}

export async function getSessionStats(flowId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, completed: 0, transferred: 0, expired: 0 };

  const sessions = flowId
    ? await db.select().from(botSessions).where(eq(botSessions.flowId, flowId))
    : await db.select().from(botSessions);

  return {
    total: sessions.length,
    active: sessions.filter((s) => s.status === "active").length,
    completed: sessions.filter((s) => s.status === "completed").length,
    transferred: sessions.filter((s) => s.status === "transferred").length,
    expired: sessions.filter((s) => s.status === "expired").length,
  };
}
