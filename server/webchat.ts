/**
 * CAIUS — Gateway do Webchat
 *
 * Responsabilidades:
 *  1. Criar e gerenciar sessões de chat da Central do Cidadão
 *  2. Processar mensagens recebidas via tRPC (não via WebSocket direto)
 *  3. Integrar com o bot-engine para atendimento automático
 *  4. Criar conversas, contatos e protocolos NUP automaticamente
 *  5. Emitir eventos Socket.IO para atualização em tempo real no inbox do agente
 *  6. Permitir que agentes respondam via inbox unificado
 */

import { randomBytes } from "crypto";
import { getDb, upsertContact, createMessage } from "./db";
import { generateNup, createProtocol } from "./db-caius";
import { processBotMessage } from "./bot-engine";
import { getIo } from "./_core/socketio";
import {
  webchatSessions,
  conversations,
  messages,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface WebchatIncomingMessage {
  sessionToken: string;
  content: string;
  contentType?: "text" | "image" | "audio" | "document";
  mediaUrl?: string;
}

export interface WebchatStartPayload {
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  visitorCpf?: string;
  userAgent?: string;
  ipAddress?: string;
  referrerUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Encontra ou cria uma conversa para a sessão webchat.
 */
async function findOrCreateWebchatConversation(
  sessionId: number,
  sessionToken: string,
  contactId: number,
  visitorName: string
): Promise<{ convId: number; nup: string; isNew: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  // Verificar se já existe conversa para esta sessão
  const existing = await db
    .select({ id: conversations.id, nup: conversations.nup })
    .from(conversations)
    .where(
      and(
        eq(conversations.externalId, sessionToken),
        eq(conversations.channel, "web")
      )
    )
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    return { convId: existing[0].id, nup: existing[0].nup ?? "", isNew: false };
  }

  // Nova conversa — gerar NUP
  const nup = await generateNup();

  const result = await db.insert(conversations).values({
    accountId: 1, // accountId virtual para webchat (não requer conta externa)
    contactId,
    channel: "web",
    externalId: sessionToken,
    nup,
    status: "open",
    subject: `Atendimento via Webchat — ${visitorName}`,
    lastMessageAt: new Date(),
  });

  const convId = Number((result[0] as any).insertId);

  // Criar protocolo vinculado
  try {
    await createProtocol({
      conversationId: convId,
      contactId,
      subject: `Atendimento via Webchat — ${visitorName}`,
      requesterName: visitorName,
      type: "request",
      channel: "web",
      status: "open",
      priority: "normal",
      isConfidential: false,
    });
  } catch (err) {
    console.error("[Webchat] Erro ao criar protocolo automático:", err);
  }

  // Atualizar sessão com conversationId e NUP
  await db
    .update(webchatSessions)
    .set({ conversationId: convId, nup, lastActivityAt: new Date() })
    .where(eq(webchatSessions.id, sessionId));

  return { convId, nup, isNew: true };
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicia uma nova sessão de webchat para um visitante.
 * Retorna o token da sessão para uso no widget do cidadão.
 */
export async function startWebchatSession(
  payload: WebchatStartPayload
): Promise<{ sessionToken: string; sessionId: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  const sessionToken = generateToken();

  const result = await db.insert(webchatSessions).values({
    sessionToken,
    accountId: 1, // accountId virtual para webchat
    visitorName: payload.visitorName ?? "Visitante",
    visitorEmail: payload.visitorEmail ?? null,
    visitorPhone: payload.visitorPhone ?? null,
    visitorCpf: payload.visitorCpf ?? null,
    status: "bot",
    userAgent: payload.userAgent ?? null,
    ipAddress: payload.ipAddress ?? null,
    referrerUrl: payload.referrerUrl ?? null,
    lastActivityAt: new Date(),
  });

  const sessionId = Number((result[0] as any).insertId);
  return { sessionToken, sessionId };
}

/**
 * Processa uma mensagem enviada pelo cidadão via widget de chat.
 * Retorna as mensagens de resposta do bot (ou vazio se transferido para agente).
 */
export async function processWebchatMessage(
  msg: WebchatIncomingMessage
): Promise<{ botReplies: string[]; status: string; nup?: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  // Buscar sessão
  const [session] = await db
    .select()
    .from(webchatSessions)
    .where(eq(webchatSessions.sessionToken, msg.sessionToken))
    .limit(1);

  if (!session) throw new Error("Sessão não encontrada");
  if (session.status === "closed") throw new Error("Sessão encerrada");

  // Atualizar atividade
  await db
    .update(webchatSessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(webchatSessions.id, session.id));

  // Garantir que temos contato e conversa
  const visitorName = session.visitorName ?? "Visitante";
  let contactId = session.contactId;
  if (!contactId) {
    contactId = await upsertContact({
      name: visitorName,
      phone: session.visitorPhone ?? undefined,
      email: session.visitorEmail ?? undefined,
      cpfCnpj: session.visitorCpf ?? undefined,
    });
    await db
      .update(webchatSessions)
      .set({ contactId })
      .where(eq(webchatSessions.id, session.id));
  }

  const { convId, nup, isNew } = await findOrCreateWebchatConversation(
    session.id,
    msg.sessionToken,
    contactId,
    visitorName
  );

  // Salvar mensagem do cidadão no banco
  await createMessage({
    conversationId: convId,
    direction: "inbound",
    type: msg.contentType ?? "text",
    content: msg.content,
    senderName: visitorName,
    deliveryStatus: "delivered",
    mediaUrl: msg.mediaUrl ?? undefined,
  });

  // Emitir evento Socket.IO para o inbox do agente
  const io = getIo();
  if (io) {
    io.to(`conv:${convId}`).emit("new_message", {
      conversationId: convId,
      direction: "inbound",
      content: msg.content,
      senderName: visitorName,
      channel: "web",
    });
    // Notificar agentes sobre nova mensagem
    io.emit("conversation_updated", { conversationId: convId, channel: "web" });
  }

  // Se a sessão está em modo "active" (com agente), não processar bot
  if (session.status === "active") {
    return { botReplies: [], status: "active", nup };
  }

  // Processar bot
  const botReplies: string[] = [];
  const sendFn = async (_jid: string, text: string) => {
    botReplies.push(text);
    // Salvar resposta do bot no banco
    await createMessage({
      conversationId: convId,
      direction: "outbound" as const,
      type: "text",
      content: text,
      senderName: "Bot CAIUS",
      deliveryStatus: "sent",
    });
    // Emitir para o cidadão via Socket.IO
    if (io) {
      io.to(`webchat:${msg.sessionToken}`).emit("bot_message", { text });
    }
  };

  const botHandled = await processBotMessage(
    session.accountId ?? 1,
    msg.sessionToken, // usar sessionToken como "jid" no contexto do bot
    msg.content,
    convId,
    sendFn
  );

  // Se o bot não tratou (sem fluxo ativo), enviar mensagem padrão de boas-vindas
  if (!botHandled && isNew) {
    const welcomeText =
      `Olá, ${visitorName}! Recebemos sua mensagem.\n\n` +
      `Seu protocolo é: ${nup}\n\n` +
      `Em breve um atendente irá lhe responder. Você pode acompanhar seu atendimento na Central do Cidadão informando o número do protocolo.`;
    botReplies.push(welcomeText);
    await createMessage({
      conversationId: convId,
      direction: "outbound" as const,
      type: "text",
      content: welcomeText,
      senderName: "Sistema",
      deliveryStatus: "sent",
    });
    if (io) {
      io.to(`webchat:${msg.sessionToken}`).emit("bot_message", { text: welcomeText });
    }
  }

  // Atualizar status da sessão
  const newStatus = session.status === "bot" ? "waiting" : session.status;
  if (newStatus !== session.status) {
    await db
      .update(webchatSessions)
      .set({ status: newStatus as "waiting" })
      .where(eq(webchatSessions.id, session.id));
  }

  return { botReplies, status: newStatus, nup };
}

/**
 * Envia uma mensagem do agente para o cidadão via webchat.
 * Chamado quando o agente responde no inbox unificado.
 */
export async function sendWebchatAgentMessage(
  conversationId: number,
  content: string,
  agentName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Buscar sessão pela conversa
  const [session] = await db
    .select()
    .from(webchatSessions)
    .where(eq(webchatSessions.conversationId, conversationId))
    .limit(1);

  if (!session || session.status === "closed") return;

  // Atualizar status para "active" (agente assumiu)
  if (session.status !== "active") {
    await db
      .update(webchatSessions)
      .set({ status: "active", assignedAt: new Date(), lastActivityAt: new Date() })
      .where(eq(webchatSessions.id, session.id));
  }

  // Emitir mensagem para o cidadão via Socket.IO
  const io = getIo();
  if (io) {
    io.to(`webchat:${session.sessionToken}`).emit("agent_message", {
      content,
      agentName,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Encerra uma sessão de webchat.
 */
export async function closeWebchatSession(sessionToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(webchatSessions)
    .set({ status: "closed", closedAt: new Date(), lastActivityAt: new Date() })
    .where(eq(webchatSessions.sessionToken, sessionToken));

  const io = getIo();
  if (io) {
    io.to(`webchat:${sessionToken}`).emit("session_closed", {
      message: "Atendimento encerrado. Obrigado por entrar em contato!",
    });
  }
}

/**
 * Busca as mensagens de uma sessão webchat para o cidadão.
 */
export async function getWebchatMessages(
  sessionToken: string
): Promise<Array<{ id: number; direction: string; content: string | null; senderName: string | null; createdAt: Date }>> {
  const db = await getDb();
  if (!db) return [];

  const [session] = await db
    .select({ conversationId: webchatSessions.conversationId })
    .from(webchatSessions)
    .where(eq(webchatSessions.sessionToken, sessionToken))
    .limit(1);

  if (!session?.conversationId) return [];

  const msgs = await db
    .select({
      id: messages.id,
      direction: messages.direction,
      content: messages.content,
      senderName: messages.senderName,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, session.conversationId))
    .orderBy(messages.createdAt);

  return msgs as Array<{ id: number; direction: string; content: string | null; senderName: string | null; createdAt: Date }>;
}
