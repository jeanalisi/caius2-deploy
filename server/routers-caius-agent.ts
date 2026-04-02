/**
 * routers-caius-agent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Router tRPC do módulo cAIus — Agente Institucional de IA
 *
 * Submódulos expostos:
 *  - chat: envio de mensagens, histórico de sessão
 *  - sessions: gestão de sessões
 *  - knowledge: CRUD da base de conhecimento
 *  - actions: revisão e aplicação de ações sugeridas
 *  - agents: configuração de agentes
 *  - audit: trilha de auditoria
 *  - dashboard: estatísticas e painel
 *  - feedback: avaliação de respostas
 *  - email: análise de e-mails via IA
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  caiusAgents,
  caiusSessions,
  caiusMessages,
  caiusSuggestedActions,
  caiusKnowledgeItems,
  caiusKnowledgeVersions,
  caiusVoiceInteractions,
  caiusAuditLogs,
  caiusFeedback,
} from "../drizzle/schema";
import {
  processChat,
  createSession,
  closeSession,
  getSession,
  getSessionMessages,
  getSessions,
  getDefaultAgent,
  createKnowledgeItem,
  updateKnowledgeItem,
  getKnowledgeItems,
  analyzeEmail,
  summarizeProtocol,
  getAuditLogs,
  getDashboardStats,
  logCaiusAudit,
} from "./caius-agent";

// ─── Sub-router: Chat ─────────────────────────────────────────────────────────

const chatRouter = router({
  // Enviar mensagem (cria sessão se não existir)
  send: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      agentSlug: z.string().optional(),
      context: z.enum(["external", "internal"]).default("internal"),
      channel: z.enum(["chat", "whatsapp", "email", "voice", "internal"]).default("chat"),
      nup: z.string().optional(),
      protocolId: z.number().optional(),
      emailMessageId: z.number().optional(),
      conversationId: z.number().optional(),
      message: z.string().min(1).max(8000),
      contentType: z.enum(["text", "audio", "image", "file"]).default("text"),
      audioUrl: z.string().optional(),
      fileUrl: z.string().optional(),
      fileName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await processChat(
        {
          sessionId: input.sessionId,
          agentSlug: input.agentSlug,
          userId: ctx.user.id,
          context: input.context,
          channel: input.channel,
          nup: input.nup,
          protocolId: input.protocolId,
          emailMessageId: input.emailMessageId,
          conversationId: input.conversationId,
          userIp: ctx.ip,
          userName: ctx.user.name ?? undefined,
        },
        {
          message: input.message,
          contentType: input.contentType,
          audioUrl: input.audioUrl,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
        }
      );
      return result;
    }),

  // Histórico de mensagens de uma sessão
  history: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      return getSessionMessages(input.sessionId);
    }),
});

// ─── Sub-router: Sessões ──────────────────────────────────────────────────────

const sessionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      context: z.enum(["external", "internal"]).optional(),
      status: z.enum(["active", "closed", "archived"]).optional(),
      nup: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      return getSessions({
        userId: ctx.user.id,
        context: input.context,
        status: input.status,
        nup: input.nup,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const session = await getSession(input.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Sessão não encontrada" });
      return session;
    }),

  create: protectedProcedure
    .input(z.object({
      agentSlug: z.string().optional(),
      context: z.enum(["external", "internal"]).default("internal"),
      channel: z.enum(["chat", "whatsapp", "email", "voice", "internal"]).default("chat"),
      nup: z.string().optional(),
      protocolId: z.number().optional(),
      emailMessageId: z.number().optional(),
      conversationId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const agent = await getDefaultAgent(input.context);
      return createSession({
        agentId: agent.id,
        userId: ctx.user.id,
        context: input.context,
        channel: input.channel,
        nup: input.nup,
        protocolId: input.protocolId,
        emailMessageId: input.emailMessageId,
        conversationId: input.conversationId,
        status: "active",
        startedAt: new Date(),
        updatedAt: new Date(),
      });
    }),

  close: protectedProcedure
    .input(z.object({
      id: z.number(),
      summary: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await closeSession(input.id, input.summary);
      await logCaiusAudit({
        sessionId: input.id,
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        userIp: ctx.ip,
        event: "session_closed",
        inputSummary: input.summary?.substring(0, 200),
      });
      return { success: true };
    }),
});

// ─── Sub-router: Base de Conhecimento ────────────────────────────────────────

const knowledgeRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      category: z.string().optional(),
      sectorId: z.number().optional(),
      sourceType: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return getKnowledgeItems(input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const items = await db
        .select()
        .from(caiusKnowledgeItems)
        .where(eq(caiusKnowledgeItems.id, input.id))
        .limit(1);
      if (!items[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return items[0];
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(512),
      sourceType: z.enum(["document", "text", "link", "faq", "regulation", "manual", "flow", "template"]),
      content: z.string().optional(),
      summary: z.string().optional(),
      fileUrl: z.string().optional(),
      fileName: z.string().optional(),
      fileMimeType: z.string().optional(),
      fileSizeBytes: z.number().optional(),
      linkUrl: z.string().optional(),
      linkAutoUpdate: z.boolean().optional(),
      category: z.string().optional(),
      sectorId: z.number().optional(),
      serviceId: z.number().optional(),
      tags: z.array(z.string()).optional(),
      keywords: z.string().optional(),
      status: z.enum(["draft", "active", "archived", "revoked"]).default("draft"),
      validFrom: z.string().optional(),
      validUntil: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createKnowledgeItem({
        ...input,
        tags: input.tags ?? null,
        content: input.content ?? null,
        summary: input.summary ?? null,
        fileUrl: input.fileUrl ?? null,
        fileName: input.fileName ?? null,
        fileMimeType: input.fileMimeType ?? null,
        fileSizeBytes: input.fileSizeBytes ?? null,
        linkUrl: input.linkUrl ?? null,
        linkAutoUpdate: input.linkAutoUpdate ?? false,
        category: input.category ?? null,
        sectorId: input.sectorId ?? null,
        serviceId: input.serviceId ?? null,
        keywords: input.keywords ?? null,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        authorId: ctx.user.id,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(3).max(512).optional(),
      content: z.string().optional(),
      summary: z.string().optional(),
      category: z.string().optional(),
      status: z.enum(["draft", "active", "archived", "revoked"]).optional(),
      keywords: z.string().optional(),
      tags: z.array(z.string()).optional(),
      changeNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, changeNote, ...data } = input;
      await updateKnowledgeItem(id, {
        ...data,
        tags: data.tags ?? undefined,
      }, ctx.user.id, changeNote);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await updateKnowledgeItem(input.id, { status: "revoked" }, ctx.user.id, "Removido pelo usuário");
      return { success: true };
    }),

  versions: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(caiusKnowledgeVersions)
        .where(eq(caiusKnowledgeVersions.itemId, input.itemId))
        .orderBy(desc(caiusKnowledgeVersions.version));
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(2), limit: z.number().default(5) }))
    .query(async ({ input }) => {
      const { items, scores } = await import("./caius-agent").then(m => m.searchKnowledge(input.query, input.limit));
      return items.map(item => ({
        ...item,
        relevanceScore: scores.get(item.id) ?? 0,
      }));
    }),
});

// ─── Sub-router: Ações Sugeridas ──────────────────────────────────────────────

const actionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      status: z.enum(["pending", "approved", "rejected", "edited", "applied"]).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.sessionId) conditions.push(eq(caiusSuggestedActions.sessionId, input.sessionId));
      if (input.status) conditions.push(eq(caiusSuggestedActions.status, input.status));
      return db
        .select()
        .from(caiusSuggestedActions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(caiusSuggestedActions.createdAt))
        .limit(input.limit);
    }),

  review: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected", "edited"]),
      reviewNote: z.string().optional(),
      editedPayload: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(caiusSuggestedActions)
        .set({
          status: input.status,
          reviewedById: ctx.user.id,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote ?? null,
          payload: input.editedPayload ?? undefined,
        })
        .where(eq(caiusSuggestedActions.id, input.id));

      await logCaiusAudit({
        actionId: input.id,
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        userIp: ctx.ip,
        event: input.status === "approved" ? "action_approved" : "action_rejected",
        inputSummary: `Ação ${input.id} ${input.status}`,
      });

      return { success: true };
    }),

  apply: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(caiusSuggestedActions)
        .set({ status: "applied", appliedAt: new Date() })
        .where(eq(caiusSuggestedActions.id, input.id));

      await logCaiusAudit({
        actionId: input.id,
        userId: ctx.user.id,
        userName: ctx.user.name ?? undefined,
        userIp: ctx.ip,
        event: "action_applied",
      });

      return { success: true };
    }),
});

// ─── Sub-router: Agentes ──────────────────────────────────────────────────────

const agentsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = getDb();
    return db.select().from(caiusAgents).orderBy(desc(caiusAgents.createdAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const agents = await db.select().from(caiusAgents).where(eq(caiusAgents.id, input.id)).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return agents[0];
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(3).max(128),
      slug: z.string().min(3).max(64),
      context: z.enum(["external", "internal", "both"]).default("both"),
      systemPrompt: z.string().min(10),
      description: z.string().optional(),
      model: z.string().default("gemini-2.5-flash"),
      maxTokens: z.number().default(2048),
      temperature: z.string().default("0.4"),
      allowVoice: z.boolean().default(true),
      allowKnowledgeBase: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [result] = await db.insert(caiusAgents).values({
        ...input,
        description: input.description ?? null,
        isActive: true,
        isDefault: false,
        createdById: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).$returningId();
      return { id: result.id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      systemPrompt: z.string().optional(),
      description: z.string().optional(),
      model: z.string().optional(),
      maxTokens: z.number().optional(),
      temperature: z.string().optional(),
      isActive: z.boolean().optional(),
      allowVoice: z.boolean().optional(),
      allowKnowledgeBase: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(caiusAgents)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(caiusAgents.id, id));
      return { success: true };
    }),
});

// ─── Sub-router: Auditoria ────────────────────────────────────────────────────

const auditRouter = router({
  list: protectedProcedure
    .input(z.object({
      sessionId: z.number().optional(),
      userId: z.number().optional(),
      nup: z.string().optional(),
      event: z.string().optional(),
      limit: z.number().min(1).max(200).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      return getAuditLogs(input);
    }),
});

// ─── Sub-router: Dashboard ────────────────────────────────────────────────────

const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    return getDashboardStats();
  }),
});

// ─── Sub-router: Feedback ─────────────────────────────────────────────────────

const feedbackRouter = router({
  submit: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      messageId: z.number().optional(),
      rating: z.enum(["positive", "negative", "neutral"]),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(caiusFeedback).values({
        sessionId: input.sessionId,
        messageId: input.messageId ?? null,
        userId: ctx.user.id,
        rating: input.rating,
        comment: input.comment ?? null,
        createdAt: new Date(),
      });
      return { success: true };
    }),
});

// ─── Sub-router: E-mail ───────────────────────────────────────────────────────

const emailAiRouter = router({
  analyze: protectedProcedure
    .input(z.object({
      subject: z.string(),
      fromAddress: z.string(),
      fromName: z.string().optional(),
      body: z.string(),
      existingNup: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return analyzeEmail({
        ...input,
        userId: ctx.user.id,
        userIp: ctx.ip,
      });
    }),

  summarizeProtocol: protectedProcedure
    .input(z.object({
      nup: z.string(),
      subject: z.string(),
      description: z.string(),
      tramitations: z.array(z.object({
        action: z.string(),
        dispatch: z.string().optional(),
        createdAt: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const summary = await summarizeProtocol({
        nup: input.nup,
        subject: input.subject,
        description: input.description,
        tramitations: input.tramitations.map(t => ({
          ...t,
          createdAt: new Date(t.createdAt),
        })),
        userId: ctx.user.id,
      });
      return { summary };
    }),
});

// ─── Router Principal do cAIus ────────────────────────────────────────────────

export const caiusAgentRouter = router({
  chat: chatRouter,
  sessions: sessionsRouter,
  knowledge: knowledgeRouter,
  actions: actionsRouter,
  agents: agentsRouter,
  audit: auditRouter,
  dashboard: dashboardRouter,
  feedback: feedbackRouter,
  email: emailAiRouter,
});
