/**
 * whatsapp.ts
 * Integração WhatsApp via Baileys 7.x para o CAIUS2.
 *
 * Correções aplicadas:
 * 1. Sessão persistida no banco via useAuthStateDB (tabela waSessions criada automaticamente)
 * 2. makeCacheableSignalKeyStore para evitar race conditions nas chaves Signal
 * 3. Reconexão com backoff exponencial (5s → 10s → 20s → 40s → máx 60s)
 * 4. Guard contra múltiplas sessões simultâneas para a mesma conta
 * 5. Limpeza automática de sessão ao detectar loggedOut
 * 6. getMessage implementado para retry de descriptografia
 * 7. Suporte a mídia (imagem, áudio, documento, vídeo) no recebimento
 */

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  type WAMessageContent,
} from "@whiskeysockets/baileys";
import P from "pino";
import { Boom } from "@hapi/boom";
import { getDb } from "./db";
import { updateAccount, createMessage, upsertContact } from "./db";
import { conversations, messages } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateNup, createProtocol } from "./db-caius";
import { processBotMessage } from "./bot-engine";
import {
  useAuthStateDB,
  clearAccountSession,
  hasAccountSession,
} from "./wa-session-store";

// ─── Estado em memória ────────────────────────────────────────────────────────
const sessions = new Map<number, ReturnType<typeof makeWASocket>>();
const qrCallbacks = new Map<number, (qr: string) => void>();
const statusCallbacks = new Map<number, (status: string) => void>();
const reconnectAttempts = new Map<number, number>();
const connectingAccounts = new Set<number>(); // evita conexões paralelas

// Cache de mensagens para retry de descriptografia (máx 500 entradas)
const messageStore = new Map<string, WAMessageContent>();

// ─── Callbacks públicos ───────────────────────────────────────────────────────
export function onQrCode(accountId: number, cb: (qr: string) => void) {
  qrCallbacks.set(accountId, cb);
}

export function onStatusChange(accountId: number, cb: (status: string) => void) {
  statusCallbacks.set(accountId, cb);
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
function addToMessageStore(id: string | null | undefined, content: WAMessageContent | null | undefined) {
  if (!id || !content) return;
  messageStore.set(id, content);
  // Manter no máximo 500 entradas (FIFO)
  if (messageStore.size > 500) {
    const firstKey = messageStore.keys().next().value;
    if (firstKey) messageStore.delete(firstKey);
  }
}

/**
 * Extrai o conteúdo textual de uma mensagem WhatsApp.
 * Suporta texto simples, texto estendido, legendas de mídia e reações.
 */
function extractMessageContent(msg: any): { text: string; type: string } {
  const m = msg.message;
  if (!m) return { text: "[mensagem vazia]", type: "text" };

  if (m.conversation) return { text: m.conversation, type: "text" };
  if (m.extendedTextMessage?.text) return { text: m.extendedTextMessage.text, type: "text" };
  if (m.imageMessage) return { text: m.imageMessage.caption || "[imagem]", type: "image" };
  if (m.videoMessage) return { text: m.videoMessage.caption || "[vídeo]", type: "video" };
  if (m.audioMessage) return { text: "[áudio]", type: "audio" };
  if (m.documentMessage) return { text: m.documentMessage.fileName || "[documento]", type: "document" };
  if (m.stickerMessage) return { text: "[figurinha]", type: "sticker" };
  if (m.reactionMessage) return { text: `[reação: ${m.reactionMessage.text}]`, type: "reaction" };
  if (m.locationMessage) return { text: "[localização]", type: "location" };
  if (m.contactMessage) return { text: `[contato: ${m.contactMessage.displayName}]`, type: "contact" };
  if (m.buttonsResponseMessage) return { text: m.buttonsResponseMessage.selectedDisplayText || "[resposta de botão]", type: "text" };
  if (m.listResponseMessage) return { text: m.listResponseMessage.title || "[resposta de lista]", type: "text" };

  return { text: "[mensagem não suportada]", type: "text" };
}

// ─── Conversa / NUP ───────────────────────────────────────────────────────────
async function findOrCreateConversation(
  accountId: number,
  jid: string,
  contactId: number,
  senderName: string,
  sock: ReturnType<typeof makeWASocket>
): Promise<{ convId: number; isNew: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

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

  // Nova conversa — gerar NUP e criar protocolo
  const nup = await generateNup();

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

  // Mensagem de boas-vindas com NUP
  const welcomeMsg =
    `Olá, ${senderName}! Recebemos sua mensagem.\n\n` +
    `Seu número de protocolo é: *${nup}*\n\n` +
    `Em breve um atendente irá lhe responder. Para acompanhar seu atendimento, ` +
    `acesse nossa Central do Cidadão e informe o número do protocolo.`;

  try {
    const sent = await sock.sendMessage(jid, { text: welcomeMsg });
    addToMessageStore(sent?.key?.id, sent?.message ?? undefined);
    await createMessage({
      conversationId: convId,
      direction: "outbound",
      type: "text",
      content: welcomeMsg,
      senderName: "Sistema",
      deliveryStatus: "sent",
    });
  } catch (err) {
    console.error("[WhatsApp] Erro ao enviar boas-vindas:", err);
  }

  return { convId, isNew: true };
}

// ─── Conexão principal ────────────────────────────────────────────────────────
export async function connectWhatsApp(accountId: number) {
  // Guard: evitar sessões paralelas para a mesma conta
  if (sessions.has(accountId) || connectingAccounts.has(accountId)) {
    console.log(`[WhatsApp] Conta #${accountId}: sessão já ativa ou em processo de conexão.`);
    return;
  }

  connectingAccounts.add(accountId);

  try {
    const { state, saveCreds } = await useAuthStateDB(accountId);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[WhatsApp] Iniciando conexão para conta #${accountId} com Baileys v${version.join(".")}`);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS("Chrome"),
      logger: P({ level: "silent" }),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      // Necessário para retry de descriptografia pelo destinatário
      getMessage: async (key) => {
        if (key.id && messageStore.has(key.id)) {
          return messageStore.get(key.id);
        }
        // Fallback: buscar no banco de dados
        try {
          const db = await getDb();
          if (db && key.id) {
            const [row] = await db
              .select({ content: messages.content })
              .from(messages)
              .where(eq(messages.externalId, key.id))
              .limit(1);
            if (row?.content) return { conversation: row.content } as any;
          }
        } catch (_) { /* ignorar */ }
        return undefined;
      },
    });

    sessions.set(accountId, sock);

    // ── Eventos de conexão ──
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const QRCode = await import("qrcode");
          const qrDataUrl = await QRCode.toDataURL(qr);
          await updateAccount(accountId, { waQrCode: qrDataUrl, status: "connecting" });
          qrCallbacks.get(accountId)?.(qrDataUrl);
          console.log(`[WhatsApp] QR Code gerado para conta #${accountId}`);
        } catch (err) {
          console.error("[WhatsApp] Erro ao gerar QR Code:", err);
        }
      }

      if (connection === "close") {
        const boom = lastDisconnect?.error as Boom | undefined;
        const statusCode = boom?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isRestartRequired = statusCode === DisconnectReason.restartRequired;

        console.log(
          `[WhatsApp] Conexão encerrada para conta #${accountId}. ` +
          `Código: ${statusCode}. LoggedOut: ${isLoggedOut}. RestartRequired: ${isRestartRequired}`
        );

        await updateAccount(accountId, { status: "disconnected", waQrCode: null });
        statusCallbacks.get(accountId)?.("disconnected");
        sessions.delete(accountId);
        connectingAccounts.delete(accountId);

        if (isLoggedOut) {
          // Sessão revogada pelo celular — limpar credenciais para forçar novo QR
          console.log(`[WhatsApp] Conta #${accountId} desconectada pelo celular. Limpando sessão.`);
          await clearAccountSession(accountId);
        } else {
          // Reconexão com backoff exponencial
          const attempts = (reconnectAttempts.get(accountId) ?? 0) + 1;
          reconnectAttempts.set(accountId, attempts);

          if (attempts > 10) {
            console.error(`[WhatsApp] Conta #${accountId}: máximo de tentativas atingido (${attempts}). Parando reconexão.`);
            await updateAccount(accountId, { status: "error" });
            reconnectAttempts.delete(accountId);
            return;
          }

          const delay = Math.min(5000 * Math.pow(2, attempts - 1), 60000);
          console.log(
            `[WhatsApp] Reconectando conta #${accountId} em ${delay / 1000}s ` +
            `(tentativa ${attempts}/10)...`
          );
          setTimeout(() => connectWhatsApp(accountId), delay);
        }
      } else if (connection === "open") {
        console.log(`[WhatsApp] ✅ Conta #${accountId} conectada com sucesso!`);
        await updateAccount(accountId, { status: "connected", waQrCode: null });
        reconnectAttempts.delete(accountId);
        connectingAccounts.delete(accountId);
        statusCallbacks.get(accountId)?.("connected");
      } else if (connection === "connecting") {
        console.log(`[WhatsApp] Conta #${accountId}: conectando...`);
        await updateAccount(accountId, { status: "connecting" });
        statusCallbacks.get(accountId)?.("connecting");
      }
    });

    // ── Salvar credenciais ao atualizar ──
    sock.ev.on("creds.update", saveCreds);

    // ── Processar mensagens recebidas ──
    sock.ev.on("messages.upsert", async ({ messages: msgs, type }) => {
      // Armazenar mensagens enviadas por nós no cache de retry
      for (const msg of msgs) {
        if (msg.key.fromMe && msg.key.id && msg.message) {
          addToMessageStore(msg.key.id, msg.message);
        }
      }

      if (type !== "notify") return;

      for (const msg of msgs) {
        if (msg.key.fromMe) continue;

        const jid = msg.key.remoteJid ?? "";
        // Ignorar grupos e broadcasts
        if (jid.endsWith("@g.us") || jid.endsWith("@broadcast")) continue;
        // Ignorar mensagens de status do WhatsApp
        if (jid === "status@broadcast") continue;

        const { text: content, type: msgType } = extractMessageContent(msg);
        const senderName = msg.pushName ?? jid.split("@")[0] ?? "Desconhecido";
        const sentAt = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000)
          : new Date();

        try {
          // Upsert do contato
          const contactId = await upsertContact({
            name: senderName,
            phone: jid.split("@")[0],
          });

          // Buscar ou criar conversa com NUP automático
          const { convId } = await findOrCreateConversation(
            accountId,
            jid,
            contactId,
            senderName,
            sock
          );

          // Tentar processar via chatbot
          const botHandled = await processBotMessage(
            accountId,
            jid,
            content,
            convId,
            async (toJid, text) => {
              try {
                const sent = await sock.sendMessage(toJid, { text });
                addToMessageStore(sent?.key?.id, sent?.message ?? undefined);
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
                console.error("[Bot] Erro ao enviar resposta:", err);
              }
            }
          );

          // Registrar mensagem recebida no banco (sempre, para histórico completo)
          await createMessage({
            conversationId: convId,
            externalId: msg.key.id ?? undefined,
            direction: "inbound",
            type: msgType,
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
          console.error(`[WhatsApp] Erro ao processar mensagem de ${jid}:`, err);
        }
      }
    });

    return sock;
  } catch (err) {
    connectingAccounts.delete(accountId);
    console.error(`[WhatsApp] Erro crítico ao iniciar conexão para conta #${accountId}:`, err);
    await updateAccount(accountId, { status: "error" });
    throw err;
  }
}

// ─── Desconexão explícita ─────────────────────────────────────────────────────
export async function disconnectWhatsApp(accountId: number) {
  const sock = sessions.get(accountId);
  if (sock) {
    try {
      await sock.logout();
    } catch (_) { /* ignorar erros ao desconectar */ }
    sessions.delete(accountId);
  }
  connectingAccounts.delete(accountId);
  reconnectAttempts.delete(accountId);
  await clearAccountSession(accountId);
  await updateAccount(accountId, { status: "disconnected", waQrCode: null });
  console.log(`[WhatsApp] Conta #${accountId} desconectada explicitamente.`);
}

// ─── Envio de mensagem ────────────────────────────────────────────────────────
export async function sendWhatsAppMessage(accountId: number, jid: string, text: string) {
  const sock = sessions.get(accountId);
  if (!sock) {
    throw new Error(
      `WhatsApp: sessão não ativa para a conta #${accountId}. ` +
      `Verifique a conexão na aba Contas.`
    );
  }

  // Normalizar JID
  const normalizedJid = jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;

  const sent = await sock.sendMessage(normalizedJid, { text });
  addToMessageStore(sent?.key?.id, sent?.message ?? undefined);

  return sent;
}

// ─── Status da sessão ─────────────────────────────────────────────────────────
export function getSessionStatus(accountId: number): "connected" | "connecting" | "disconnected" {
  if (sessions.has(accountId)) return "connected";
  if (connectingAccounts.has(accountId)) return "connecting";
  return "disconnected";
}

// ─── Inicialização automática ao subir o servidor ────────────────────────────
/**
 * Reconecta automaticamente todas as contas WhatsApp que tinham sessão ativa
 * antes do servidor ser reiniciado.
 */
export async function initWhatsAppAccounts() {
  try {
    const db = await getDb();
    if (!db) return;

    const { accounts } = await import("../drizzle/schema");
    const { eq: eqOp } = await import("drizzle-orm");

    const waAccounts = await db
      .select({ id: accounts.id, status: accounts.status })
      .from(accounts)
      .where(eqOp(accounts.channel, "whatsapp"));

    for (const account of waAccounts) {
      const hasSavedSession = await hasAccountSession(account.id);
      if (hasSavedSession) {
        console.log(`[WhatsApp] Reconectando conta #${account.id} (sessão salva encontrada)...`);
        // Pequeno delay para não sobrecarregar o banco na inicialização
        setTimeout(() => connectWhatsApp(account.id), 2000 * waAccounts.indexOf(account));
      } else {
        // Marcar como desconectada se não há sessão salva
        await updateAccount(account.id, { status: "disconnected" });
      }
    }
  } catch (err) {
    console.error("[WhatsApp] Erro ao inicializar contas WhatsApp:", err);
  }
}
