/**
 * Router omnichannel — Saúde dos canais, envio de mensagens, eventos e dashboard.
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  channelHealthLogs,
  channelSyncState,
  messageEvents,
  accounts,
} from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import {
  channelGateway,
  initChannelGateway,
  EmailConnector,
  WhatsAppConnector,
  InstagramConnector,
} from "./channel-gateway";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  return db;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const omnichannelRouter = router({
  // ── Saúde dos canais ────────────────────────────────────────────────────────
  health: router({
    /** Retorna o status atual de todos os conectores registrados */
    all: protectedProcedure.query(async () => {
      const results = await channelGateway.healthCheckAll();
      return results;
    }),

    /** Retorna histórico de saúde de uma conta específica */
    history: protectedProcedure
      .input(z.object({
        accountId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ input }) => {
        const db = await requireDb();
        return db
          .select()
          .from(channelHealthLogs)
          .where(eq(channelHealthLogs.accountId, input.accountId))
          .orderBy(desc(channelHealthLogs.checkedAt))
          .limit(input.limit);
      }),

    /** Executa health check imediato e persiste no banco */
    check: protectedProcedure.mutation(async () => {
      await channelGateway.persistHealthLogs();
      return { ok: true, checkedAt: new Date() };
    }),

    /** Dashboard: resumo de saúde por canal */
    dashboard: protectedProcedure.query(async () => {
      const db = await requireDb();
      // Últimas 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const logs = await db
        .select()
        .from(channelHealthLogs)
        .where(gte(channelHealthLogs.checkedAt, since))
        .orderBy(desc(channelHealthLogs.checkedAt));

      // Agrupa por accountId — pega o log mais recente de cada conta
      const latestByAccount = new Map<number, typeof logs[0]>();
      for (const log of logs) {
        if (!latestByAccount.has(log.accountId)) {
          latestByAccount.set(log.accountId, log);
        }
      }

      let healthy = 0, degraded = 0, unhealthy = 0, unknown = 0;
      const byChannel: Record<string, { healthy: number; degraded: number; unhealthy: number }> = {
        whatsapp: { healthy: 0, degraded: 0, unhealthy: 0 },
        instagram: { healthy: 0, degraded: 0, unhealthy: 0 },
        email: { healthy: 0, degraded: 0, unhealthy: 0 },
      };

      for (const log of Array.from(latestByAccount.values())) {
        if (log.status === "healthy") healthy++;
        else if (log.status === "degraded") degraded++;
        else if (log.status === "unhealthy") unhealthy++;
        else unknown++;
        const ch = byChannel[log.channel];
        if (ch && log.status !== "unknown") {
          ch[log.status as "healthy" | "degraded" | "unhealthy"] =
            (ch[log.status as "healthy" | "degraded" | "unhealthy"] || 0) + 1;
        }
      }

      const summary = { healthy, degraded, unhealthy, unknown, byChannel, recentLogs: logs.slice(0, 20) };

      return summary;
    }),
  }),

  // ── Sincronização de estado ──────────────────────────────────────────────────
  sync: router({
    /** Retorna o estado de sincronização de uma conta */
    getState: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const [state] = await db
          .select()
          .from(channelSyncState)
          .where(eq(channelSyncState.accountId, input.accountId))
          .limit(1);
        return state ?? null;
      }),

    /** Lista todos os estados de sincronização */
    listAll: protectedProcedure.query(async () => {
      const db = await requireDb();
      return db.select().from(channelSyncState).orderBy(desc(channelSyncState.lastSyncAt));
    }),
  }),

  // ── Eventos de mensagens ─────────────────────────────────────────────────────
  events: router({
    /** Lista eventos recentes de mensagens */
    recent: protectedProcedure
      .input(z.object({
        accountId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const query = db
          .select()
          .from(messageEvents)
          .orderBy(desc(messageEvents.createdAt))
          .limit(input.limit);
        return query;
      }),
  }),

  // ── Envio de mensagens via gateway ───────────────────────────────────────────
  send: router({
    /** Envia mensagem via conector registrado */
    message: protectedProcedure
      .input(z.object({
        channel: z.enum(["whatsapp", "instagram", "email"]),
        accountId: z.number(),
        to: z.string(),
        content: z.string(),
        attachmentUrl: z.string().optional(),
        attachmentMimeType: z.string().optional(),
        attachmentName: z.string().optional(),
        replyToExternalId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const connector = channelGateway.getConnector(input.channel, input.accountId);
        if (!connector) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Nenhum conector registrado para ${input.channel}:${input.accountId}`,
          });
        }
        const result = await connector.sendMessage({
          to: input.to,
          content: input.content,
          attachmentUrl: input.attachmentUrl,
          attachmentMimeType: input.attachmentMimeType,
          attachmentName: input.attachmentName,
          replyToExternalId: input.replyToExternalId,
        });
        return result;
      }),
  }),

  // ── Gerenciamento de conectores ───────────────────────────────────────────────
  connectors: router({
    /** Lista conectores ativos */
    list: protectedProcedure.query(() => {
      return channelGateway.getAllConnectors().map((c) => ({
        channel: c.channel,
        accountId: c.accountId,
      }));
    }),

    /** Reinicializa os conectores a partir do banco */
    reinit: protectedProcedure.mutation(async () => {
      // Limpa conectores existentes
      for (const c of channelGateway.getAllConnectors()) {
        channelGateway.unregister(c.channel, c.accountId);
      }
      await initChannelGateway();
      return {
        ok: true,
        count: channelGateway.getAllConnectors().length,
      };
    }),

    /** Registra um conector para uma conta específica */
    register: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        const [account] = await db
          .select()
          .from(accounts)
          .where(eq(accounts.id, input.accountId))
          .limit(1);

        if (!account) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });
        }

        try {
          if (account.channel === "email" && account.smtpHost && account.smtpUser && account.smtpPassword) {
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
            const connector = new WhatsAppConnector(account.id, account.identifier ?? "");
            channelGateway.register(connector);
            // Inicia a sessão Baileys imediatamente ao registrar
            connector.connect().catch(err =>
              console.error(`[ChannelGateway] Erro ao conectar WhatsApp conta #${account.id}:`, err)
            );
          } else if (account.channel === "instagram" && account.igAccessToken && account.igUserId) {
            const connector = new InstagramConnector(account.id, account.igAccessToken, account.igUserId);
            channelGateway.register(connector);
          } else {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Conta sem credenciais suficientes para registrar conector",
            });
          }
          return { ok: true };
        } catch (err) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Falha ao registrar conector: ${String(err)}`,
          });
        }
      }),

    /** Remove um conector */
    unregister: protectedProcedure
      .input(z.object({
        channel: z.enum(["whatsapp", "instagram", "email"]),
        accountId: z.number(),
      }))
      .mutation(async ({ input }) => {
        channelGateway.unregister(input.channel, input.accountId);
        return { ok: true };
      }),
  }),
});
