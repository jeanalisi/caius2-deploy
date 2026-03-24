/**
 * CAIUS — Router tRPC do Webchat
 *
 * Rotas públicas (cidadão):
 *  - webchat.start       → Inicia sessão de chat
 *  - webchat.send        → Envia mensagem do cidadão
 *  - webchat.messages    → Busca histórico de mensagens
 *  - webchat.close       → Encerra sessão
 *  - webchat.status      → Verifica status da sessão
 *
 * Rotas protegidas (agente):
 *  - webchat.sessions    → Lista sessões ativas (para o inbox)
 *  - webchat.reply       → Agente responde ao cidadão
 *  - webchat.closeByAgent → Agente encerra sessão
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  startWebchatSession,
  processWebchatMessage,
  sendWebchatAgentMessage,
  closeWebchatSession,
  getWebchatMessages,
} from "./webchat";
import { getDb } from "./db";
import { webchatSessions } from "../drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";

export const webchatRouter = router({
  // ── Cidadão: Iniciar sessão ──────────────────────────────────────────────
  start: publicProcedure
    .input(
      z.object({
        visitorName: z.string().min(2).max(128).optional(),
        visitorEmail: z.string().email().optional(),
        visitorPhone: z.string().max(32).optional(),
        visitorCpf: z.string().max(14).optional(),
        referrerUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userAgent = (ctx.req.headers["user-agent"] as string) ?? undefined;
      const ipAddress =
        ((ctx.req.headers["x-forwarded-for"] as string) ?? ctx.req.socket?.remoteAddress ?? "").split(",")[0]?.trim() ?? undefined;

      const result = await startWebchatSession({
        visitorName: input.visitorName,
        visitorEmail: input.visitorEmail,
        visitorPhone: input.visitorPhone,
        visitorCpf: input.visitorCpf,
        referrerUrl: input.referrerUrl,
        userAgent,
        ipAddress,
      });

      return result;
    }),

  // ── Cidadão: Enviar mensagem ─────────────────────────────────────────────
  send: publicProcedure
    .input(
      z.object({
        sessionToken: z.string().length(64),
        content: z.string().min(1).max(4096),
        contentType: z.enum(["text", "image", "audio", "document"]).optional(),
        mediaUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await processWebchatMessage({
          sessionToken: input.sessionToken,
          content: input.content,
          contentType: input.contentType,
          mediaUrl: input.mediaUrl,
        });
        return result;
      } catch (err: any) {
        if (err.message === "Sessão não encontrada") {
          throw new TRPCError({ code: "NOT_FOUND", message: err.message });
        }
        if (err.message === "Sessão encerrada") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: err.message });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // ── Cidadão: Histórico de mensagens ─────────────────────────────────────
  messages: publicProcedure
    .input(z.object({ sessionToken: z.string().length(64) }))
    .query(async ({ input }) => {
      return getWebchatMessages(input.sessionToken);
    }),

  // ── Cidadão: Verificar status da sessão ─────────────────────────────────
  status: publicProcedure
    .input(z.object({ sessionToken: z.string().length(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [session] = await db
        .select({
          status: webchatSessions.status,
          nup: webchatSessions.nup,
          visitorName: webchatSessions.visitorName,
          conversationId: webchatSessions.conversationId,
          lastActivityAt: webchatSessions.lastActivityAt,
        })
        .from(webchatSessions)
        .where(eq(webchatSessions.sessionToken, input.sessionToken))
        .limit(1);

      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });

      return session;
    }),

  // ── Cidadão: Encerrar sessão ─────────────────────────────────────────────
  close: publicProcedure
    .input(z.object({ sessionToken: z.string().length(64) }))
    .mutation(async ({ input }) => {
      await closeWebchatSession(input.sessionToken);
      return { success: true };
    }),

  // ── Agente: Listar sessões ativas ────────────────────────────────────────
  sessions: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["bot", "waiting", "active", "closed", "abandoned"])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const statusFilter = input?.status ?? "waiting";
      const limit = input?.limit ?? 50;

      const sessions = await db
        .select()
        .from(webchatSessions)
        .where(
          statusFilter !== undefined
            ? inArray(webchatSessions.status, [statusFilter as any])
            : undefined
        )
        .orderBy(desc(webchatSessions.lastActivityAt))
        .limit(limit);

      return sessions;
    }),

  // ── Agente: Responder ao cidadão ─────────────────────────────────────────
  reply: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string().min(1).max(4096),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const agentName = ctx.user.name ?? "Atendente";
      await sendWebchatAgentMessage(input.conversationId, input.content, agentName);

      // Salvar mensagem do agente no banco de conversas
      const { createMessage } = await import("./db");
      await createMessage({
        conversationId: input.conversationId,
        direction: "outbound" as const,
        type: "text",
        content: input.content,
        senderName: agentName,
        senderAgentId: ctx.user.id,
        deliveryStatus: "sent",
      });

      return { success: true };
    }),

  // ── Agente: Encerrar sessão ──────────────────────────────────────────────
  closeByAgent: protectedProcedure
    .input(z.object({ sessionToken: z.string().length(64) }))
    .mutation(async ({ input }) => {
      await closeWebchatSession(input.sessionToken);
      return { success: true };
    }),
});
