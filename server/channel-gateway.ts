/**
 * ChannelGateway — Abstração central de canais de comunicação omnichannel
 * Implementa interface modular com conectores independentes por canal.
 */

import { getDb } from "./db";
import {
  channelSyncState,
  channelHealthLogs,
  messageEvents,
  type InsertChannelHealthLog,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { sendEmail, testSmtpConnection } from "./email";
import { sendWhatsAppMessage, connectWhatsApp, disconnectWhatsApp } from "./whatsapp";
import type { Account } from "../drizzle/schema";

// ─── Interface base do conector ───────────────────────────────────────────────

export interface NormalizedMessage {
  externalId: string;
  channel: "whatsapp" | "instagram" | "email";
  accountId: number;
  fromIdentifier: string; // telefone, email ou username
  fromName?: string;
  toIdentifier?: string;
  content: string;
  contentType: "text" | "image" | "audio" | "video" | "document" | "sticker" | "location";
  attachmentUrl?: string;
  attachmentMimeType?: string;
  attachmentName?: string;
  isFromMe: boolean;
  externalTimestamp: Date;
  rawPayload?: unknown;
}

export interface SendMessagePayload {
  to: string;
  content: string;
  attachmentUrl?: string;
  attachmentMimeType?: string;
  attachmentName?: string;
  replyToExternalId?: string;
}

export interface ChannelConnector {
  channel: "whatsapp" | "instagram" | "email";
  accountId: number;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<{ status: "healthy" | "degraded" | "unhealthy"; latencyMs: number; error?: string }>;
  pullMessages(cursor?: string): Promise<{ messages: NormalizedMessage[]; nextCursor?: string }>;
  sendMessage(payload: SendMessagePayload): Promise<{ externalId: string; sentAt: Date }>;
  sendAttachment(payload: SendMessagePayload): Promise<{ externalId: string; sentAt: Date }>;
  markAsRead(externalId: string): Promise<void>;
  resolveIdentity(identifier: string): Promise<{ name?: string; avatarUrl?: string } | null>;
}

// ─── Email Connector ──────────────────────────────────────────────────────────

export class EmailConnector implements ChannelConnector {
  channel = "email" as const;
  accountId: number;
  private config: {
    smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string;
    imapHost: string; imapPort: number; smtpSecure: boolean; imapSecure: boolean;
    fromName?: string;
  };

  constructor(accountId: number, config: typeof EmailConnector.prototype.config) {
    this.accountId = accountId;
    this.config = config;
  }

  async connect(): Promise<void> {
    // IMAP connection is stateless per pull — no persistent connection needed
  }

  async disconnect(): Promise<void> {
    // No-op for email
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const fakeAccount = {
        smtpHost: this.config.smtpHost,
        smtpPort: this.config.smtpPort,
        smtpUser: this.config.smtpUser,
        smtpPassword: this.config.smtpPass,
        smtpSecure: this.config.smtpSecure ? 1 : 0,
        imapHost: this.config.imapHost,
        imapPort: this.config.imapPort,
        imapUser: this.config.smtpUser,
        imapPassword: this.config.smtpPass,
        imapSecure: this.config.imapSecure ? 1 : 0,
      } as unknown as Account;
      const smtpOk = await testSmtpConnection(fakeAccount);
      const latencyMs = Date.now() - start;
      if (!smtpOk.ok) {
        return { status: "degraded" as const, latencyMs, error: smtpOk.error };
      }
      return { status: "healthy" as const, latencyMs };
    } catch (err: unknown) {
      return { status: "unhealthy" as const, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  async pullMessages(cursor?: string): Promise<{ messages: NormalizedMessage[]; nextCursor?: string }> {
    // Email pulling is handled by the existing email.ts IMAP sync
    // This connector delegates to the existing infrastructure
    return { messages: [], nextCursor: cursor };
  }

  async sendMessage(payload: SendMessagePayload): Promise<{ externalId: string; sentAt: Date }> {
    const messageId = `email-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fakeAccount = {
      smtpHost: this.config.smtpHost,
      smtpPort: this.config.smtpPort,
      smtpUser: this.config.smtpUser,
      smtpPassword: this.config.smtpPass,
      smtpSecure: this.config.smtpSecure ? 1 : 0,
      name: this.config.fromName ?? this.config.smtpUser,
    } as unknown as Account;
    await sendEmail(fakeAccount, payload.to, "Mensagem do sistema", payload.content, `<p>${payload.content}</p>`);
    return { externalId: messageId, sentAt: new Date() };
  }

  async sendAttachment(payload: SendMessagePayload): Promise<{ externalId: string; sentAt: Date }> {
    return this.sendMessage(payload);
  }

  async markAsRead(_externalId: string): Promise<void> {
    // Email read status is managed by IMAP flags — handled separately
  }

  async resolveIdentity(email: string): Promise<{ name?: string } | null> {
    return { name: email.split("@")[0] };
  }
}

// ─── WhatsApp Connector (Baileys-based) ───────────────────────────────────────

export class WhatsAppConnector implements ChannelConnector {
  channel = "whatsapp" as const;
  accountId: number;
  private phoneNumber: string;

  constructor(accountId: number, phoneNumber: string) {
    this.accountId = accountId;
    this.phoneNumber = phoneNumber;
  }

   async connect(): Promise<void> {
    // Inicia a sessão Baileys para esta conta
    await connectWhatsApp(this.accountId);
  }
  async disconnect(): Promise<void> {
    // Encerra a sessão Baileys para esta conta
    await disconnectWhatsApp(this.accountId);
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const db = await getDb();
      if (!db) return { status: "unhealthy" as const, latencyMs: Date.now() - start, error: "DB unavailable" };
      const { accounts } = await import("../drizzle/schema");
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, this.accountId))
        .limit(1);
      const latencyMs = Date.now() - start;
      if (!account) return { status: "unhealthy" as const, latencyMs, error: "Account not found" };
      if (account.status === "connected") return { status: "healthy" as const, latencyMs };
      if (account.status === "connecting") return { status: "degraded" as const, latencyMs, error: "Connecting..." };
      return { status: "unhealthy" as const, latencyMs, error: account.status ?? "disconnected" };
    } catch (err: unknown) {
      return { status: "unhealthy" as const, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  async pullMessages(_cursor?: string): Promise<{ messages: NormalizedMessage[]; nextCursor?: string }> {
    // WhatsApp messages are pushed via webhook/Baileys events — pull is a no-op
    return { messages: [] };
  }

  async sendMessage(payload: SendMessagePayload): Promise<{ externalId: string; sentAt: Date }> {
    // Usa o Baileys real para enviar a mensagem
    const jid = payload.to.includes("@") ? payload.to : `${payload.to}@s.whatsapp.net`;
    await sendWhatsAppMessage(this.accountId, jid, payload.content);
    const externalId = `wpp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { externalId, sentAt: new Date() };
  }

  async sendAttachment(payload: SendMessagePayload): Promise<{ externalId: string; sentAt: Date }> {
    return this.sendMessage(payload);
  }

  async markAsRead(_externalId: string): Promise<void> {
    // Handled by Baileys session
  }

  async resolveIdentity(phone: string): Promise<{ name?: string } | null> {
    return { name: phone };
  }
}

// ─── Instagram Connector ──────────────────────────────────────────────────────

export class InstagramConnector implements ChannelConnector {
  channel = "instagram" as const;
  accountId: number;
  private accessToken: string;
  private pageId: string;

  constructor(accountId: number, accessToken: string, pageId: string) {
    this.accountId = accountId;
    this.accessToken = accessToken;
    this.pageId = pageId;
  }

  async connect(): Promise<void> {
    // OAuth token is managed by account configuration
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}?fields=id,name&access_token=${this.accessToken}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const latencyMs = Date.now() - start;
      if (res.ok) return { status: "healthy" as const, latencyMs };
      const body = await res.json() as { error?: { message?: string } };
      return { status: "unhealthy" as const, latencyMs, error: body?.error?.message ?? "API error" };
    } catch (err: unknown) {
      return { status: "unhealthy" as const, latencyMs: Date.now() - start, error: String(err) };
    }
  }

  async pullMessages(cursor?: string): Promise<{ messages: NormalizedMessage[]; nextCursor?: string }> {
    try {
      const url = new URL(`https://graph.facebook.com/v18.0/${this.pageId}/conversations`);
      url.searchParams.set("fields", "messages{id,message,from,created_time,attachments}");
      url.searchParams.set("access_token", this.accessToken);
      if (cursor) url.searchParams.set("after", cursor);

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return { messages: [] };

      const data = await res.json() as {
        data?: Array<{
          messages?: {
            data?: Array<{
              id: string; message?: string;
              from?: { id: string; name?: string };
              created_time?: string;
              attachments?: { data?: Array<{ mime_type?: string; file_url?: string; name?: string }> };
            }>;
          };
        }>;
        paging?: { cursors?: { after?: string } };
      };

      const messages: NormalizedMessage[] = [];
      for (const conv of data.data ?? []) {
        for (const msg of conv.messages?.data ?? []) {
          const attachment = msg.attachments?.data?.[0];
          messages.push({
            externalId: msg.id,
            channel: "instagram",
            accountId: this.accountId,
            fromIdentifier: msg.from?.id ?? "unknown",
            fromName: msg.from?.name,
            content: msg.message ?? "",
            contentType: attachment ? "document" : "text",
            attachmentUrl: attachment?.file_url,
            attachmentMimeType: attachment?.mime_type,
            attachmentName: attachment?.name,
            isFromMe: msg.from?.id === this.pageId,
            externalTimestamp: msg.created_time ? new Date(msg.created_time) : new Date(),
            rawPayload: msg,
          });
        }
      }

      return { messages, nextCursor: data.paging?.cursors?.after };
    } catch {
      return { messages: [] };
    }
  }

  async sendMessage(payload: SendMessagePayload): Promise<{ externalId: string; sentAt: Date }> {
    const res = await fetch(`https://graph.facebook.com/v18.0/${this.pageId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: payload.to },
        message: { text: payload.content },
        access_token: this.accessToken,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json() as { message_id?: string };
    return { externalId: data.message_id ?? `ig-${Date.now()}`, sentAt: new Date() };
  }

  async sendAttachment(payload: SendMessagePayload): Promise<{ externalId: string; sentAt: Date }> {
    if (!payload.attachmentUrl) return this.sendMessage(payload);
    const res = await fetch(`https://graph.facebook.com/v18.0/${this.pageId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: payload.to },
        message: {
          attachment: {
            type: "file",
            payload: { url: payload.attachmentUrl, is_reusable: false },
          },
        },
        access_token: this.accessToken,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json() as { message_id?: string };
    return { externalId: data.message_id ?? `ig-${Date.now()}`, sentAt: new Date() };
  }

  async markAsRead(externalId: string): Promise<void> {
    await fetch(`https://graph.facebook.com/v18.0/${this.pageId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: externalId },
        sender_action: "mark_seen",
        access_token: this.accessToken,
      }),
    }).catch(() => {});
  }

  async resolveIdentity(userId: string): Promise<{ name?: string; avatarUrl?: string } | null> {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${userId}?fields=name,profile_pic&access_token=${this.accessToken}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return null;
      const data = await res.json() as { name?: string; profile_pic?: string };
      return { name: data.name, avatarUrl: data.profile_pic };
    } catch {
      return null;
    }
  }
}

// ─── ChannelGateway — Registro e despacho central ────────────────────────────

export class ChannelGateway {
  private connectors = new Map<string, ChannelConnector>();

  register(connector: ChannelConnector): void {
    const key = `${connector.channel}:${connector.accountId}`;
    this.connectors.set(key, connector);
  }

  unregister(channel: string, accountId: number): void {
    this.connectors.delete(`${channel}:${accountId}`);
  }

  getConnector(channel: string, accountId: number): ChannelConnector | undefined {
    return this.connectors.get(`${channel}:${accountId}`);
  }

  getAllConnectors(): ChannelConnector[] {
    return Array.from(this.connectors.values());
  }

  getActiveConnectors(channel?: "whatsapp" | "instagram" | "email"): ChannelConnector[] {
    const all = this.getAllConnectors();
    return channel ? all.filter((c) => c.channel === channel) : all;
  }

  async sendMessage(
    channel: "whatsapp" | "instagram" | "email",
    accountId: number,
    payload: SendMessagePayload
  ): Promise<{ externalId: string; sentAt: Date }> {
    const connector = this.getConnector(channel, accountId);
    if (!connector) throw new Error(`No connector registered for ${channel}:${accountId}`);
    return connector.sendMessage(payload);
  }

  async healthCheckAll(): Promise<
    Array<{ channel: string; accountId: number; status: string; latencyMs: number; error?: string }>
  > {
    const results = await Promise.allSettled(
      this.getAllConnectors().map(async (c) => {
        const health = await c.healthCheck();
        return { channel: c.channel, accountId: c.accountId, ...health };
      })
    );
    return results.map((r, i) => {
      const c = this.getAllConnectors()[i];
      if (r.status === "fulfilled") return r.value;
      return { channel: c.channel, accountId: c.accountId, status: "unhealthy", latencyMs: 0, error: String(r.reason) };
    });
  }

  /** Persiste logs de saúde no banco */
  async persistHealthLogs(): Promise<void> {
    const results = await this.healthCheckAll();
    const db = await getDb();
    for (const r of results) {
      const log: InsertChannelHealthLog = {
        accountId: r.accountId,
        channel: r.channel as "whatsapp" | "instagram" | "email",
        status: r.status as "healthy" | "degraded" | "unhealthy" | "unknown",
        latencyMs: r.latencyMs,
        errorMessage: r.error ?? null,
      };
      if (db) await db.insert(channelHealthLogs).values(log);
    }
  }
}

// ─── Singleton global ─────────────────────────────────────────────────────────
export const channelGateway = new ChannelGateway();

/** Inicializa os conectores a partir das contas ativas no banco */
export async function initChannelGateway(): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[ChannelGateway] DB unavailable, skipping init"); return; }
  const { accounts } = await import("../drizzle/schema");
  const { hasAccountSession } = await import("./wa-session-store");

  // Busca todas as contas do banco
  const allAccounts = await db.select().from(accounts);

  for (const account of allAccounts) {
    try {
      if (account.channel === "email" && account.status === "connected" &&
          account.smtpHost && account.smtpUser && account.smtpPassword) {
        const connector = new EmailConnector(account.id, {
          smtpHost: account.smtpHost,
          smtpPort: account.smtpPort ?? 587,
          smtpUser: account.smtpUser,
          smtpPass: account.smtpPassword,
          imapHost: account.imapHost ?? account.smtpHost,
          imapPort: account.imapPort ?? 993,
          smtpSecure: account.smtpSecure ?? false,
          imapSecure: true,
          fromName: account.name ?? undefined,
        });
        channelGateway.register(connector);
      } else if (account.channel === "whatsapp") {
        // Registra o conector e reconecta se houver sessão persistida no banco TiDB
        const connector = new WhatsAppConnector(account.id, account.identifier ?? "");
        channelGateway.register(connector);
        // Verificar sessão no banco (sobrevive a reinicializações do servidor)
        const hasSavedSession = await hasAccountSession(account.id);
        if (hasSavedSession) {
          console.log(`[ChannelGateway] Reconectando WhatsApp conta #${account.id} (${account.name}) via sessão persistida no banco...`);
          connector.connect().catch(err =>
            console.error(`[ChannelGateway] Erro ao reconectar WhatsApp conta #${account.id}:`, err)
          );
        } else {
          console.log(`[ChannelGateway] WhatsApp conta #${account.id} (${account.name}): sem sessão salva, aguardando QR Code.`);
        }
      } else if (account.channel === "instagram" && account.status === "connected" &&
                 account.igAccessToken && account.igUserId) {
        const connector = new InstagramConnector(account.id, account.igAccessToken, account.igUserId);
        channelGateway.register(connector);
      }
    } catch (err) {
      console.error(`[ChannelGateway] Failed to init connector for account ${account.id}:`, err);
    }
  }

  console.log(`[ChannelGateway] Initialized ${channelGateway.getAllConnectors().length} connectors`);
}
