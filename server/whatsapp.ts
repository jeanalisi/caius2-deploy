import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} from "@whiskeysockets/baileys";
import P from "pino";
import { Boom } from "@hapi/boom";
import { getDb } from "./db";
import {
  updateAccount,
  createMessage,
  upsertContact,
} from "./db";
import { conversations, messages } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateNup, createProtocol } from "./db-caius";
import { processBotMessage } from "./bot-engine";
import { useAuthStateDB, clearAccountSession, hasAccountSession } from "./wa-session-store";

const sessions = new Map<number, ReturnType<typeof makeWASocket>>();
const qrCallbacks = new Map<number, (qr: string) => void>();
const statusCallbacks = new Map<number, (status: string) => void>();
const reconnectAttempts = new Map<number, number>(); // controle de tentativas de reconexão

// Cache em memória para retry de mensagens enviadas (necessário para o Baileys reenviar
// mensagens que o destinatário não conseguiu descriptografar na primeira tentativa)
const messageStore = new Map<string, object>();

export function onQrCode(accountId: number, cb: (qr: string) => void) {
  qrCallbacks.set(accountId, cb);
}

export function onStatusChange(accountId: number, cb: (status: string) => void) {
  statusCallbacks.set(accountId, cb);
}

/**
 * Busca ou cria uma conversa pelo externalId (JID).
 * Se for nova, gera NUP, cria protocolo vinculado e envia mensagem de boas-vindas.
 */
async function findOrCreateConversation(
  accountId: number,
  jid: string,
  contactId: number,
  senderName: string,
  sock: ReturnType<typeof makeWASocket>
): Promise<{ convId: number; isNew: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Verificar se já existe conversa aberta para este JID
  const existing = await db
    .select({ id: conversations.id, nup: conversations.nup })
    .from(conversations)
    .where(
      and(
        eq(conversations.accountId, accountId),
        eq(conversations.externalId, jid),
        eq(conversations.channel, "whatsapp")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { convId: existing[0]!.id, isNew: false };
  }

  // Nova conversa — gerar NUP
  const nup = await generateNup();

  // Criar conversa com NUP
  const result = await db.insert(conversations).values({
    accountId,
    contactId,
    channel: "whatsapp",
    externalId: jid,
    nup,
    status: "open",
    subject: `Atendimento via WhatsApp — ${senderName}`,
    lastMessageAt: new Date(),
  });
  const convId = Number((result[0] as any).insertId);

  // Criar protocolo vinculado à conversa
  try {
    await createProtocol({
      conversationId: convId,
      contactId,
      subject: `Atendimento via WhatsApp — ${senderName}`,
      requesterName: senderName,
      requesterPhone: jid.split("@")[0],
      type: "request",
      channel: "whatsapp",
      status: "open",
      priority: "normal",
      isConfidential: false,
    });
  } catch (err) {
    console.error("[WhatsApp] Erro ao criar protocolo automático:", err);
  }

  // Enviar mensagem de boas-vindas com NUP
  const welcomeMsg =
    `Olá, ${senderName}! Recebemos sua mensagem.\n\n` +
    `Seu número de protocolo é: *${nup}*\n\n` +
    `Em breve um atendente irá lhe responder. Para acompanhar seu atendimento, acesse nossa Central do Cidadão e informe o número do protocolo.`;

  try {
    const sent = await sock.sendMessage(jid, { text: welcomeMsg });
    // Armazenar no cache para retry
    if (sent?.key?.id && sent.message) {
      messageStore.set(sent.key.id, sent.message);
    }
    // Registrar mensagem de boas-vindas como outbound
    await createMessage({
      conversationId: convId,
      direction: "outbound",
      type: "text",
      content: welcomeMsg,
      senderName: "Sistema",
      deliveryStatus: "sent",
    });
  } catch (err) {
    console.error("[WhatsApp] Erro ao enviar mensagem de boas-vindas:", err);
  }

  return { convId, isNew: true };
}

export async function connectWhatsApp(accountId: number) {
  // Se já existe uma sessão ativa (aguardando QR ou conectada), não reiniciar.
  // Isso evita o loop de QR Code causado por chamadas repetidas do frontend.
  if (sessions.has(accountId)) {
    console.log(`[WhatsApp] Conta #${accountId}: sessão já ativa, ignorando nova chamada de connect.`);
    return;
  }

  // Usar persistência de sessão no banco TiDB (sobrevive a reinicializações do servidor)
  const { state, saveCreds } = await useAuthStateDB(accountId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    // Usar Browsers.macOS para maior compatibilidade com servidores WhatsApp
    browser: Browsers.macOS("Chrome"),
    logger: P({ level: "silent" }),
    // Necessário para que o Baileys possa reenviar mensagens que falharam na
    // descriptografia do destinatário (resolve o problema de mensagens não entregues)
    getMessage: async (key) => {
      if (key.id && messageStore.has(key.id)) {
        return messageStore.get(key.id);
      }
      // Tentar buscar no banco de dados como fallback
      try {
        const db = await getDb();
        if (db && key.id) {
          const [row] = await db
            .select({ content: messages.content })
            .from(messages)
            .where(eq(messages.externalId, key.id))
            .limit(1);
          if (row?.content) {
            return { conversation: row.content };
          }
        }
      } catch (_) { /* ignorar */ }
      return undefined;
    },
    // Não sincronizar histórico completo (melhora performance)
    syncFullHistory: false,
    // Marcar como online ao conectar
    markOnlineOnConnect: true,
  });

  sessions.set(accountId, sock);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const QRCode = await import("qrcode");
      const qrDataUrl = await QRCode.toDataURL(qr);
      await updateAccount(accountId, { waQrCode: qrDataUrl, status: "connecting" });
      qrCallbacks.get(accountId)?.(qrDataUrl);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[WhatsApp] Conexão encerrada para conta #${accountId}. Código: ${statusCode}. Reconectar: ${shouldReconnect}`);
      await updateAccount(accountId, { status: "disconnected", waQrCode: null });
      statusCallbacks.get(accountId)?.("disconnected");
      sessions.delete(accountId);
      if (shouldReconnect) {
        // Backoff exponencial: 5s, 10s, 20s, 40s, máx 60s — evita loop de reconexão agressivo
        const attempts = (reconnectAttempts.get(accountId) ?? 0) + 1;
        reconnectAttempts.set(accountId, attempts);
        const delay = Math.min(5000 * Math.pow(2, attempts - 1), 60000);
        console.log(`[WhatsApp] Tentativa de reconexão #${attempts} para conta #${accountId} em ${delay / 1000}s...`);
        setTimeout(() => connectWhatsApp(accountId), delay);
      }
    } else if (connection === "open") {
      console.log(`[WhatsApp] Conta #${accountId} conectada com sucesso.`);
      await updateAccount(accountId, { status: "connected", waQrCode: null });
      reconnectAttempts.delete(accountId); // resetar contador ao conectar com sucesso
      statusCallbacks.get(accountId)?.("connected");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Armazenar mensagens enviadas no cache para possível retry
  sock.ev.on("messages.upsert", async ({ messages: msgs, type }) => {
    for (const msg of msgs) {
      // Armazenar no cache de retry mensagens enviadas por nós
      if (msg.key.fromMe && msg.key.id && msg.message) {
        messageStore.set(msg.key.id, msg.message);
        // Limpar entradas antigas do cache (manter no máximo 500 mensagens)
        if (messageStore.size > 500) {
          const firstKey = messageStore.keys().next().value;
          if (firstKey) messageStore.delete(firstKey);
        }
      }
    }

    if (type !== "notify") return;
    for (const msg of msgs) {
      if (msg.key.fromMe) continue;
      const jid = msg.key.remoteJid ?? "";
      // Ignorar mensagens de grupo
      if (jid.endsWith("@g.us")) continue;

      const content =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "[media]";
      const senderName = msg.pushName ?? jid.split("@")[0];
      const sentAt = new Date((msg.messageTimestamp as number) * 1000);

      try {
        // Upsert contact
        const contactId = await upsertContact({
          name: senderName,
          phone: jid.split("@")[0],
        });

        // Find or create conversation (com NUP automático para novas conversas)
        const { convId, isNew } = await findOrCreateConversation(
          accountId,
          jid,
          contactId,
          senderName,
          sock
        );

        // Tentar processar via chatbot antes de registrar como mensagem normal
        // O bot retorna `true` se tratou a mensagem (não exibir ao atendente)
        const botHandled = await processBotMessage(
          accountId,
          jid,
          content,
          convId,
          async (toJid, text) => {
            try {
              const sent = await sock.sendMessage(toJid, { text });
              if (sent?.key?.id && sent.message) {
                messageStore.set(sent.key.id, sent.message);
              }
              // Registrar resposta do bot como mensagem outbound
              await createMessage({
                conversationId: convId,
                externalId: sent?.key?.id ?? undefined,
                direction: "outbound",
                type: "text",
                content: text,
                senderName: "Bot",
                deliveryStatus: "sent",
              });
            } catch (err) {
              console.error("[Bot] Erro ao enviar mensagem:", err);
            }
          }
        );

        // Registrar mensagem recebida (sempre — para histórico completo)
        await createMessage({
          conversationId: convId,
          externalId: msg.key.id ?? undefined,
          direction: "inbound",
          type: "text",
          content,
          senderName,
          sentAt,
          deliveryStatus: "delivered",
        });

        // Atualizar lastMessageAt da conversa
        const db = await getDb();
        if (db) {
          await db
            .update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, convId));
        }
      } catch (err) {
        console.error("[WhatsApp] Erro ao processar mensagem recebida:", err);
      }
    }
  });

  return sock;
}

export async function disconnectWhatsApp(accountId: number) {
  const sock = sessions.get(accountId);
  if (sock) {
    try {
      await sock.logout();
    } catch (_) { /* ignorar erros ao desconectar */ }
    sessions.delete(accountId);
  }
  // Limpar sessão persistida no banco ao desconectar explicitamente
  await clearAccountSession(accountId);
  await updateAccount(accountId, { status: "disconnected", waQrCode: null });
}

export async function sendWhatsAppMessage(accountId: number, jid: string, text: string) {
  const sock = sessions.get(accountId);
  if (!sock) throw new Error(`WhatsApp: sessão não ativa para a conta #${accountId}. Verifique a conexão.`);

  // Garantir que o JID está no formato correto
  const normalizedJid = jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;

  const sent = await sock.sendMessage(normalizedJid, { text });

  // Armazenar no cache para possível retry de descriptografia pelo destinatário
  if (sent?.key?.id && sent.message) {
    messageStore.set(sent.key.id, sent.message);
  }

  return sent;
}

export function getSessionStatus(accountId: number): "connected" | "disconnected" {
  const sock = sessions.get(accountId);
  return sock ? "connected" : "disconnected";
}
