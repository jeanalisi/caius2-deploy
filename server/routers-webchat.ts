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
import { createDefaultWebchatFlow } from "./webchat-bot";
import { getDb } from "./db";
import { webchatSessions, webchatAttachments } from "../drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { storagePut } from "./storage";

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

  // ── Cidadão: Enviar arquivo (documento exigido pelo bot) ──────────────────
  sendFile: publicProcedure
    .input(
      z.object({
        sessionToken: z.string().length(64),
        fileBase64: z.string(), // arquivo codificado em base64
        mimeType: z.string(),
        fileName: z.string(),
        fileSizeBytes: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const fileBuffer = Buffer.from(input.fileBase64, "base64");
        const result = await processWebchatMessage({
          sessionToken: input.sessionToken,
          content: `[Arquivo: ${input.fileName}]`,
          contentType: "document",
          fileBuffer,
          fileMimeType: input.mimeType,
          fileName: input.fileName,
          fileSizeBytes: input.fileSizeBytes,
        });
        return result;
      } catch (err: any) {
        if (err.message === "Sessão não encontrada") {
          throw new TRPCError({ code: "NOT_FOUND", message: err.message });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // ── Cidadão: Histórico de mensagens ──────────────────────────────────────
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

  //  // ── Agente: Encerrar sessão ──────────────────────────────────────────
  closeByAgent: protectedProcedure
    .input(z.object({ sessionToken: z.string().length(64) }))
    .mutation(async ({ input }) => {
      await closeWebchatSession(input.sessionToken);
      return { success: true };
    }),

  // ── Admin: Criar fluxo padrão do chatbot webchat ────────────────────────
  createDefaultFlow: protectedProcedure
    .mutation(async () => {
      const flowId = await createDefaultWebchatFlow();
      return { success: true, flowId };
    }),

  // ── Cidadão: Upload de anexo ─────────────────────────────────────────────
  // Recebe o arquivo em base64 e armazena no S3, vinculando à sessão.
  // Limite: 10 MB por arquivo. Tipos permitidos: imagens, PDF, Word, Excel.
  uploadAttachment: publicProcedure
    .input(
      z.object({
        sessionToken: z.string().length(64),
        base64: z.string().max(14_000_000), // ~10 MB em base64
        originalName: z.string().max(512),
        mimeType: z.string().max(128),
        fileSizeBytes: z.number().int().max(10 * 1024 * 1024), // 10 MB
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar se a sessão existe e está ativa
      const [session] = await db
        .select({
          sessionToken: webchatSessions.sessionToken,
          conversationId: webchatSessions.conversationId,
          nup: webchatSessions.nup,
          visitorName: webchatSessions.visitorName,
          status: webchatSessions.status,
        })
        .from(webchatSessions)
        .where(eq(webchatSessions.sessionToken, input.sessionToken))
        .limit(1);

      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      if (session.status === "closed" || session.status === "abandoned") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Sessão encerrada" });
      }

      // Validar tipo MIME permitido
      const ALLOWED_MIMES = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
      ];
      if (!ALLOWED_MIMES.includes(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tipo de arquivo não permitido. Use imagens, PDF, Word, Excel ou texto.",
        });
      }

      // Gerar chave S3 única
      const ext = input.originalName.split(".").pop() ?? "bin";
      const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
      const s3Key = `webchat-attachments/${input.sessionToken.slice(0, 8)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

      // Upload para S3
      const buffer = Buffer.from(input.base64, "base64");
      const { url: s3Url } = await storagePut(s3Key, buffer, input.mimeType);

      // Salvar no banco
      const [result] = await db.insert(webchatAttachments).values({
        sessionToken: input.sessionToken,
        conversationId: session.conversationId ?? undefined,
        nup: session.nup ?? undefined,
        originalName: input.originalName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        s3Key,
        s3Url,
        uploadedByName: session.visitorName ?? undefined,
      });

      // Enviar mensagem automática no chat informando o anexo
      try {
        await processWebchatMessage({
          sessionToken: input.sessionToken,
          content: `📎 Anexo enviado: ${input.originalName}`,
          contentType: "document",
          mediaUrl: s3Url,
        });
      } catch {
        // Não falhar se o envio da mensagem falhar
      }

      return {
        id: (result as any).insertId as number,
        s3Url,
        originalName: input.originalName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
      };
    }),

  // ── Agente/Admin: Listar anexos de uma sessão ───────────────────────────
  attachments: protectedProcedure
    .input(z.object({ sessionToken: z.string().optional(), conversationId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      if (!input.sessionToken && !input.conversationId) return [];

      const rows = await db
        .select()
        .from(webchatAttachments)
        .where(
          input.conversationId
            ? eq(webchatAttachments.conversationId, input.conversationId)
            : eq(webchatAttachments.sessionToken, input.sessionToken!)
        )
        .orderBy(desc(webchatAttachments.createdAt));

      return rows.filter((r) => !r.isDeleted);
    }),

  // ── Admin: Listar todas as sessões (com filtro de status) ────────────────
  allSessions: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["bot", "waiting", "active", "closed", "abandoned"])
          .optional(),
        limit: z.number().min(1).max(200).default(100),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const sessions = await db
        .select()
        .from(webchatSessions)
        .orderBy(desc(webchatSessions.lastActivityAt))
        .limit(input?.limit ?? 100);
      return input?.status
        ? sessions.filter((s) => s.status === input.status)
        : sessions;
    }),
});
