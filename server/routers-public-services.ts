/**
 * Router de Serviços Públicos — Dashboard Executivo, Ouvidoria/e-SIC,
 * Georreferenciamento, Base de Conhecimento, Respostas Rápidas, Métricas
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  ombudsmanManifestations,
  manifestationTypes,
  manifestationStatusHistory,
  manifestationDeadlines,
  manifestationResponses,
  geoPoints,
  geoEvents,
  geoAttachments,
  knowledgeCategories,
  knowledgeArticles,
  knowledgeTags,
  agentStatus,
  conversationTransfers,
  quickReplies,
  attendanceMetricsSnapshots,
  serviceCategories,
  servicePublications,
  serviceFaqs,
  serviceChecklists,
  protocols,
  conversations,
  accounts,
  orgUnits,
  users,
  complianceEvents,
  sensitiveAccessLogs,
} from "../drizzle/schema";
import { eq, and, desc, asc, gte, lte, like, count, sql } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  return db;
}

function generateNup(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `OUV-${year}-${random}`;
}

// ─── Router ────────────────────────────────────────────────────────────────────
export const publicServicesRouter = router({

  // ══ DASHBOARD EXECUTIVO ══════════════════════════════════════════════════════
  dashboard: router({
    kpis: protectedProcedure.query(async () => {
      const db = await requireDb();

      const [totalProtocols] = await db.select({ count: count() }).from(protocols);
      const [openProtocols] = await db.select({ count: count() }).from(protocols).where(eq(protocols.status, "open"));
      const [totalConversations] = await db.select({ count: count() }).from(conversations);
      const [openConversations] = await db.select({ count: count() }).from(conversations).where(eq(conversations.status, "open"));
      const [totalManifestations] = await db.select({ count: count() }).from(ombudsmanManifestations);
      const [pendingManifestations] = await db.select({ count: count() }).from(ombudsmanManifestations).where(
        eq(ombudsmanManifestations.status, "received")
      );

      return {
        totalProtocols: totalProtocols.count,
        openProtocols: openProtocols.count,
        totalConversations: totalConversations.count,
        openConversations: openConversations.count,
        totalManifestations: totalManifestations.count,
        pendingManifestations: pendingManifestations.count,
      };
    }),

    byChannel: protectedProcedure.query(async () => {
      const db = await requireDb();
      return db
        .select({
          channel: accounts.channel,
          total: count(),
        })
        .from(conversations)
        .leftJoin(accounts, eq(conversations.accountId, accounts.id))
        .groupBy(accounts.channel);
    }),

    bySector: protectedProcedure.query(async () => {
      const db = await requireDb();
      return db
        .select({
          sectorId: protocols.responsibleSectorId,
          total: count(),
        })
        .from(protocols)
        .groupBy(protocols.responsibleSectorId)
        .limit(20);
    }),

    timeSeries: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const since = new Date(Date.now() - input.days * 24 * 3600 * 1000);
        return db
          .select({
            date: sql<string>`DATE(${protocols.createdAt})`,
            total: count(),
          })
          .from(protocols)
          .where(gte(protocols.createdAt, since))
          .groupBy(sql`DATE(${protocols.createdAt})`)
          .orderBy(sql`DATE(${protocols.createdAt})`);
      }),

    overdueProtocols: protectedProcedure.query(async () => {
      const db = await requireDb();
      const now = new Date();
      return db
        .select()
        .from(protocols)
        .where(and(eq(protocols.status, "open"), lte(protocols.deadline, now)))
        .orderBy(asc(protocols.deadline))
        .limit(50);
    }),
  }),

  // ══ OUVIDORIA / e-SIC ════════════════════════════════════════════════════════
  ouvidoria: router({
    // Tipos de manifestação
    types: router({
      list: publicProcedure.query(async () => {
        const db = await requireDb();
        return db.select().from(manifestationTypes).where(eq(manifestationTypes.isActive, true)).orderBy(asc(manifestationTypes.name));
      }),

      upsert: protectedProcedure
        .input(
          z.object({
            id: z.number().optional(),
            name: z.string(),
            code: z.string(),
            description: z.string().optional(),
            deadlineDays: z.number().optional(),
            allowAnonymous: z.boolean().optional(),
            requiresSecrecy: z.boolean().optional(),
            isEsic: z.boolean().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const { id, ...data } = input;
          if (id) {
            await db.update(manifestationTypes).set(data).where(eq(manifestationTypes.id, id));
            return { id };
          }
          const [result] = await db.insert(manifestationTypes).values(data);
          return { id: (result as { insertId: number }).insertId };
        }),
    }),

    // Manifestações
    list: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          type: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await requireDb();
        const conditions = [];
        if (input.status) conditions.push(eq(ombudsmanManifestations.status, input.status as "received" | "in_analysis" | "in_progress" | "answered" | "archived"));
        if (input.type) conditions.push(eq(ombudsmanManifestations.type, input.type as "complaint" | "denounce" | "praise" | "suggestion" | "request" | "esic"));
        if (input.search) conditions.push(like(ombudsmanManifestations.subject, `%${input.search}%`));

        return db
          .select()
          .from(ombudsmanManifestations)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(ombudsmanManifestations.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const [manifestation] = await db
          .select()
          .from(ombudsmanManifestations)
          .where(eq(ombudsmanManifestations.id, input.id));
        if (!manifestation) throw new TRPCError({ code: "NOT_FOUND", message: "Manifestação não encontrada" });

        const history = await db
          .select()
          .from(manifestationStatusHistory)
          .where(eq(manifestationStatusHistory.manifestationId, input.id))
          .orderBy(desc(manifestationStatusHistory.createdAt));

        const responses = await db
          .select()
          .from(manifestationResponses)
          .where(eq(manifestationResponses.manifestationId, input.id))
          .orderBy(asc(manifestationResponses.createdAt));

        const [deadline] = await db
          .select()
          .from(manifestationDeadlines)
          .where(eq(manifestationDeadlines.manifestationId, input.id));

        return { ...manifestation, history, responses, deadline };
      }),

    create: publicProcedure
      .input(
        z.object({
          type: z.enum(["complaint", "denounce", "praise", "suggestion", "request", "esic"]),
          subject: z.string().min(5),
          description: z.string().min(10),
          isAnonymous: z.boolean().optional(),
          requesterName: z.string().optional(),
          requesterEmail: z.string().email().optional(),
          requesterPhone: z.string().optional(),
          isConfidential: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await requireDb();
        const nup = generateNup();

        const [result] = await db.insert(ombudsmanManifestations).values({
          nup,
          type: input.type,
          subject: input.subject,
          description: input.description,
          isAnonymous: input.isAnonymous ?? false,
          requesterName: input.requesterName,
          requesterEmail: input.requesterEmail,
          requesterPhone: input.requesterPhone,
          isConfidential: input.isConfidential ?? false,
          status: "received",
        });

        const id = (result as { insertId: number }).insertId;

        // Set deadline based on type
        const deadlineDays = input.type === "esic" ? 20 : 30;
        const dueAt = new Date(Date.now() + deadlineDays * 24 * 3600 * 1000);
        await db.insert(manifestationDeadlines).values({ manifestationId: id, dueAt });

        return { id, nup };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["received", "in_analysis", "in_progress", "answered", "archived"]),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();

        const [current] = await db
          .select()
          .from(ombudsmanManifestations)
          .where(eq(ombudsmanManifestations.id, input.id));

        await db
          .update(ombudsmanManifestations)
          .set({ status: input.status })
          .where(eq(ombudsmanManifestations.id, input.id));

        await db.insert(manifestationStatusHistory).values({
          manifestationId: input.id,
          fromStatus: current?.status,
          toStatus: input.status,
          notes: input.notes,
          changedById: ctx.user.id,
        });

        return { success: true };
      }),

    respond: protectedProcedure
      .input(
        z.object({
          manifestationId: z.number(),
          content: z.string().min(10),
          responseType: z.enum(["internal", "citizen", "forward", "archive"]).optional(),
          isPublic: z.boolean().optional(),
          forwardedToOrgUnitId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();

        const [result] = await db.insert(manifestationResponses).values({
          manifestationId: input.manifestationId,
          content: input.content,
          responseType: input.responseType ?? "citizen",
          isPublic: input.isPublic ?? false,
          respondedById: ctx.user.id,
          forwardedToOrgUnitId: input.forwardedToOrgUnitId,
        });

        // If citizen response, update status to answered
        if (input.responseType === "citizen") {
          await db
            .update(ombudsmanManifestations)
            .set({ status: "answered", response: input.content, respondedAt: new Date() })
            .where(eq(ombudsmanManifestations.id, input.manifestationId));
        }

        return { id: (result as { insertId: number }).insertId };
      }),

    publicTrack: publicProcedure
      .input(z.object({ nup: z.string() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const [manifestation] = await db
          .select()
          .from(ombudsmanManifestations)
          .where(eq(ombudsmanManifestations.nup, input.nup));

        if (!manifestation) return { found: false };

        // Only return public info
        return {
          found: true,
          nup: manifestation.nup,
          type: manifestation.type,
          subject: manifestation.subject,
          status: manifestation.status,
          createdAt: manifestation.createdAt,
          respondedAt: manifestation.respondedAt,
          response: manifestation.status === "answered" && !manifestation.isConfidential
            ? manifestation.response
            : null,
        };
      }),
  }),

  // ══ GEORREFERENCIAMENTO ══════════════════════════════════════════════════════
  geo: router({
    points: router({
      list: protectedProcedure
        .input(
          z.object({
            neighborhood: z.string().optional(),
            zone: z.string().optional(),
            entityType: z.string().optional(),
            limit: z.number().default(100),
          })
        )
        .query(async ({ input }) => {
          const db = await requireDb();
          const conditions = [];
          if (input.neighborhood) conditions.push(eq(geoPoints.neighborhood, input.neighborhood));
          if (input.zone) conditions.push(eq(geoPoints.zone, input.zone));
          if (input.entityType) conditions.push(eq(geoPoints.entityType, input.entityType));

          return db
            .select()
            .from(geoPoints)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(geoPoints.createdAt))
            .limit(input.limit);
        }),

      create: protectedProcedure
        .input(
          z.object({
            entityType: z.string().optional(),
            entityId: z.number().optional(),
            nup: z.string().optional(),
            latitude: z.string(),
            longitude: z.string(),
            address: z.string().optional(),
            neighborhood: z.string().optional(),
            zone: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await requireDb();
          const [result] = await db.insert(geoPoints).values({
            ...input,
            createdById: ctx.user.id,
          });
          return { id: (result as { insertId: number }).insertId };
        }),
    }),

    events: router({
      list: protectedProcedure
        .input(
          z.object({
            status: z.string().optional(),
            severity: z.string().optional(),
            eventType: z.string().optional(),
            limit: z.number().default(100),
            offset: z.number().default(0),
          })
        )
        .query(async ({ input }) => {
          const db = await requireDb();
          const conditions = [];
          if (input.status) conditions.push(eq(geoEvents.status, input.status as "open" | "in_progress" | "resolved" | "closed"));
          if (input.severity) conditions.push(eq(geoEvents.severity, input.severity as "low" | "medium" | "high" | "critical"));
          if (input.eventType) conditions.push(eq(geoEvents.eventType, input.eventType));

          return db
            .select()
            .from(geoEvents)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(geoEvents.createdAt))
            .limit(input.limit)
            .offset(input.offset);
        }),

      get: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const db = await requireDb();
          const [event] = await db.select().from(geoEvents).where(eq(geoEvents.id, input.id));
          if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Ocorrência não encontrada" });

          const [point] = await db.select().from(geoPoints).where(eq(geoPoints.id, event.geoPointId));
          const attachments = await db.select().from(geoAttachments).where(eq(geoAttachments.geoEventId, input.id));

          return { ...event, geoPoint: point, attachments };
        }),

      create: protectedProcedure
        .input(
          z.object({
            latitude: z.string(),
            longitude: z.string(),
            address: z.string().optional(),
            neighborhood: z.string().optional(),
            zone: z.string().optional(),
            title: z.string(),
            description: z.string().optional(),
            eventType: z.string().optional(),
            severity: z.enum(["low", "medium", "high", "critical"]).optional(),
            orgUnitId: z.number().optional(),
            nup: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await requireDb();

          // Create geo point first
          const [pointResult] = await db.insert(geoPoints).values({
            latitude: input.latitude,
            longitude: input.longitude,
            address: input.address,
            neighborhood: input.neighborhood,
            zone: input.zone,
            createdById: ctx.user.id,
          });
          const geoPointId = (pointResult as { insertId: number }).insertId;

          // Create geo event
          const [result] = await db.insert(geoEvents).values({
            geoPointId,
            title: input.title,
            description: input.description,
            eventType: input.eventType,
            severity: input.severity ?? "medium",
            orgUnitId: input.orgUnitId,
            nup: input.nup,
            reportedById: ctx.user.id,
          });

          return { id: (result as { insertId: number }).insertId, geoPointId };
        }),

      updateStatus: protectedProcedure
        .input(
          z.object({
            id: z.number(),
            status: z.enum(["open", "in_progress", "resolved", "closed"]),
          })
        )
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const updates: Record<string, unknown> = { status: input.status };
          if (input.status === "resolved" || input.status === "closed") {
            updates.resolvedAt = new Date();
          }
          await db.update(geoEvents).set(updates).where(eq(geoEvents.id, input.id));
          return { success: true };
        }),
    }),

    mapData: protectedProcedure.query(async () => {
      const db = await requireDb();
      const events = await db
        .select()
        .from(geoEvents)
        .where(eq(geoEvents.status, "open"))
        .limit(500);

      const pointIds = Array.from(new Set(events.map((e) => e.geoPointId)));
      if (!pointIds.length) return [];

      const points = await db.select().from(geoPoints).where(eq(geoPoints.id, pointIds[0]));

      const pointMap = new Map(points.map((p) => [p.id, p]));
      return events.map((e) => ({
        ...e,
        geoPoint: pointMap.get(e.geoPointId),
      }));
    }),
  }),

  // ══ BASE DE CONHECIMENTO ═════════════════════════════════════════════════════
  knowledge: router({
    categories: router({
      list: publicProcedure.query(async () => {
        const db = await requireDb();
        return db.select().from(knowledgeCategories).where(eq(knowledgeCategories.isActive, true)).orderBy(asc(knowledgeCategories.sortOrder));
      }),

      upsert: protectedProcedure
        .input(
          z.object({
            id: z.number().optional(),
            name: z.string(),
            slug: z.string(),
            description: z.string().optional(),
            parentId: z.number().optional(),
            icon: z.string().optional(),
            sortOrder: z.number().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const { id, ...data } = input;
          if (id) {
            await db.update(knowledgeCategories).set(data).where(eq(knowledgeCategories.id, id));
            return { id };
          }
          const [result] = await db.insert(knowledgeCategories).values(data);
          return { id: (result as { insertId: number }).insertId };
        }),
    }),

    articles: router({
      list: protectedProcedure
        .input(
          z.object({
            categoryId: z.number().optional(),
            search: z.string().optional(),
            isPublic: z.boolean().optional(),
            limit: z.number().default(50),
            offset: z.number().default(0),
          })
        )
        .query(async ({ input }) => {
          const db = await requireDb();
          const conditions = [eq(knowledgeArticles.isActive, true)];
          if (input.categoryId) conditions.push(eq(knowledgeArticles.categoryId, input.categoryId));
          if (input.isPublic !== undefined) conditions.push(eq(knowledgeArticles.isPublic, input.isPublic));
          if (input.search) conditions.push(like(knowledgeArticles.title, `%${input.search}%`));

          return db
            .select()
            .from(knowledgeArticles)
            .where(and(...conditions))
            .orderBy(desc(knowledgeArticles.viewCount))
            .limit(input.limit)
            .offset(input.offset);
        }),

      publicList: publicProcedure
        .input(z.object({ search: z.string().optional(), categoryId: z.number().optional() }))
        .query(async ({ input }) => {
          const db = await requireDb();
          const conditions = [eq(knowledgeArticles.isPublic, true), eq(knowledgeArticles.isActive, true)];
          if (input.categoryId) conditions.push(eq(knowledgeArticles.categoryId, input.categoryId));
          if (input.search) conditions.push(like(knowledgeArticles.title, `%${input.search}%`));

          return db
            .select({
              id: knowledgeArticles.id,
              title: knowledgeArticles.title,
              slug: knowledgeArticles.slug,
              summary: knowledgeArticles.summary,
              categoryId: knowledgeArticles.categoryId,
              viewCount: knowledgeArticles.viewCount,
              publishedAt: knowledgeArticles.publishedAt,
            })
            .from(knowledgeArticles)
            .where(and(...conditions))
            .orderBy(desc(knowledgeArticles.viewCount))
            .limit(20);
        }),

      get: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const db = await requireDb();
          const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, input.id));
          if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Artigo não encontrado" });

          // Increment view count
          await db.update(knowledgeArticles).set({ viewCount: (article.viewCount ?? 0) + 1 }).where(eq(knowledgeArticles.id, input.id));

          return article;
        }),

      publicGet: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input }) => {
          const db = await requireDb();
          const [article] = await db
            .select()
            .from(knowledgeArticles)
            .where(and(eq(knowledgeArticles.slug, input.slug), eq(knowledgeArticles.isPublic, true)));
          if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Artigo não encontrado" });

          await db.update(knowledgeArticles).set({ viewCount: (article.viewCount ?? 0) + 1 }).where(eq(knowledgeArticles.id, article.id));
          return article;
        }),

      upsert: protectedProcedure
        .input(
          z.object({
            id: z.number().optional(),
            categoryId: z.number().optional(),
            title: z.string(),
            slug: z.string(),
            summary: z.string().optional(),
            content: z.string(),
            tags: z.array(z.string()).optional(),
            isPublic: z.boolean().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await requireDb();
          const { id, ...data } = input;
          const payload = { ...data, updatedById: ctx.user.id };
          if (id) {
            await db.update(knowledgeArticles).set(payload).where(eq(knowledgeArticles.id, id));
            return { id };
          }
          const [result] = await db.insert(knowledgeArticles).values({ ...payload, createdById: ctx.user.id });
          return { id: (result as { insertId: number }).insertId };
        }),

      markHelpful: publicProcedure
        .input(z.object({ id: z.number(), helpful: z.boolean() }))
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, input.id));
          if (!article) return { success: false };

          if (input.helpful) {
            await db.update(knowledgeArticles).set({ helpfulCount: (article.helpfulCount ?? 0) + 1 }).where(eq(knowledgeArticles.id, input.id));
          } else {
            await db.update(knowledgeArticles).set({ notHelpfulCount: (article.notHelpfulCount ?? 0) + 1 }).where(eq(knowledgeArticles.id, input.id));
          }
          return { success: true };
        }),
    }),
  }),

  // ══ RESPOSTAS RÁPIDAS ════════════════════════════════════════════════════════
  quickReplies: router({
    list: protectedProcedure
      .input(z.object({ channel: z.string().optional(), orgUnitId: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const conditions = [];
        if (input.channel) conditions.push(eq(quickReplies.channel, input.channel));
        if (input.orgUnitId) conditions.push(eq(quickReplies.orgUnitId, input.orgUnitId));

        return db
          .select()
          .from(quickReplies)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(quickReplies.usageCount));
      }),

    upsert: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(),
          title: z.string(),
          content: z.string(),
          shortcut: z.string().optional(),
          channel: z.string().optional(),
          orgUnitId: z.number().optional(),
          isGlobal: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const { id, ...data } = input;
        if (id) {
          await db.update(quickReplies).set(data).where(eq(quickReplies.id, id));
          return { id };
        }
        const [result] = await db.insert(quickReplies).values({ ...data, createdById: ctx.user.id });
        return { id: (result as { insertId: number }).insertId };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db.delete(quickReplies).where(eq(quickReplies.id, input.id));
        return { success: true };
      }),

    recordUsage: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        const [qr] = await db.select().from(quickReplies).where(eq(quickReplies.id, input.id));
        if (qr) {
          await db.update(quickReplies).set({ usageCount: (qr.usageCount ?? 0) + 1 }).where(eq(quickReplies.id, input.id));
        }
        return { success: true };
      }),
  }),

  // ══ STATUS DO AGENTE ════════════════════════════════════════════════════════
  agentStatus: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const [status] = await db.select().from(agentStatus).where(eq(agentStatus.userId, ctx.user.id));
      return status ?? { userId: ctx.user.id, status: "offline", currentChats: 0, maxConcurrentChats: 5 };
    }),

    update: protectedProcedure
      .input(
        z.object({
          status: z.enum(["online", "away", "busy", "offline"]),
          statusMessage: z.string().optional(),
          maxConcurrentChats: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const [existing] = await db.select().from(agentStatus).where(eq(agentStatus.userId, ctx.user.id));

        if (existing) {
          await db.update(agentStatus).set({ ...input, lastSeenAt: new Date() }).where(eq(agentStatus.userId, ctx.user.id));
        } else {
          await db.insert(agentStatus).values({ userId: ctx.user.id, ...input, lastSeenAt: new Date() });
        }
        return { success: true };
      }),

    listOnline: protectedProcedure.query(async () => {
      const db = await requireDb();
      return db
        .select()
        .from(agentStatus)
        .where(eq(agentStatus.status, "online"))
        .orderBy(asc(agentStatus.userId));
    }),
  }),

  // ══ TRANSFERÊNCIAS ═══════════════════════════════════════════════════════════
  transfers: router({
    create: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          toAgentId: z.number().optional(),
          toOrgUnitId: z.number().optional(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const [result] = await db.insert(conversationTransfers).values({
          conversationId: input.conversationId,
          fromAgentId: ctx.user.id,
          toAgentId: input.toAgentId,
          toOrgUnitId: input.toOrgUnitId,
          reason: input.reason,
          status: "pending",
        });
        return { id: (result as { insertId: number }).insertId };
      }),

    accept: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db.update(conversationTransfers).set({ status: "accepted", acceptedAt: new Date() }).where(eq(conversationTransfers.id, input.id));
        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db.update(conversationTransfers).set({ status: "rejected" }).where(eq(conversationTransfers.id, input.id));
        return { success: true };
      }),
  }),

  // ══ MÉTRICAS DE ATENDIMENTO ══════════════════════════════════════════════════
  metrics: router({
    snapshot: protectedProcedure
      .input(
        z.object({
          agentId: z.number().optional(),
          orgUnitId: z.number().optional(),
          totalConversations: z.number(),
          resolvedConversations: z.number(),
          avgResponseTimeMs: z.number().optional(),
          avgHandleTimeMs: z.number().optional(),
          firstResponseTimeMs: z.number().optional(),
          satisfactionScore: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await requireDb();
        const [result] = await db.insert(attendanceMetricsSnapshots).values({
          ...input,
          snapshotDate: new Date(),
        });
        return { id: (result as { insertId: number }).insertId };
      }),

    listByAgent: protectedProcedure
      .input(z.object({ agentId: z.number(), days: z.number().default(30) }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const since = new Date(Date.now() - input.days * 24 * 3600 * 1000);
        return db
          .select()
          .from(attendanceMetricsSnapshots)
          .where(and(eq(attendanceMetricsSnapshots.agentId, input.agentId), gte(attendanceMetricsSnapshots.snapshotDate, since)))
          .orderBy(desc(attendanceMetricsSnapshots.snapshotDate));
      }),
  }),

  // ══ SERVIÇOS PÚBLICOS (PUBLICAÇÃO) ══════════════════════════════════════════
  services: router({
    categories: router({
      list: publicProcedure.query(async () => {
        const db = await requireDb();
        return db.select().from(serviceCategories).where(eq(serviceCategories.isActive, true)).orderBy(asc(serviceCategories.sortOrder));
      }),

      upsert: protectedProcedure
        .input(
          z.object({
            id: z.number().optional(),
            name: z.string(),
            slug: z.string(),
            description: z.string().optional(),
            icon: z.string().optional(),
            color: z.string().optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().optional(),
          })
        )
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const { id, ...data } = input;
          if (id) {
            await db.update(serviceCategories).set(data).where(eq(serviceCategories.id, id));
            return { id };
          }
          const [result] = await db.insert(serviceCategories).values(data);
          return { id: (result as { insertId: number }).insertId };
        }),
    }),

    publications: router({
      list: publicProcedure
        .input(z.object({ categoryId: z.number().optional(), search: z.string().optional() }))
        .query(async ({ input }) => {
          const db = await requireDb();
          const conditions = [eq(servicePublications.isPublic, true), eq(servicePublications.isActive, true)];
          if (input.categoryId) conditions.push(eq(servicePublications.categoryId, input.categoryId));
          if (input.search) conditions.push(like(servicePublications.title, `%${input.search}%`));

          return db
            .select()
            .from(servicePublications)
            .where(and(...conditions))
            .orderBy(asc(servicePublications.sortOrder));
        }),

      adminList: protectedProcedure.query(async () => {
        const db = await requireDb();
        return db.select().from(servicePublications).orderBy(desc(servicePublications.createdAt));
      }),

      get: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          const db = await requireDb();
          const [pub] = await db.select().from(servicePublications).where(eq(servicePublications.id, input.id));
          if (!pub) throw new TRPCError({ code: "NOT_FOUND", message: "Serviço não encontrado" });

          const faqs = await db.select().from(serviceFaqs).where(eq(serviceFaqs.serviceTypeId, pub.serviceTypeId)).orderBy(asc(serviceFaqs.sortOrder));
          const checklist = await db.select().from(serviceChecklists).where(eq(serviceChecklists.serviceTypeId, pub.serviceTypeId)).orderBy(asc(serviceChecklists.sortOrder));

          return { ...pub, faqs, checklist };
        }),

      upsert: protectedProcedure
        .input(
          z.object({
            id: z.number().optional(),
            serviceTypeId: z.number(),
            categoryId: z.number().optional(),
            orgUnitId: z.number().optional(),
            title: z.string(),
            description: z.string().optional(),
            citizenDescription: z.string().optional(),
            requirements: z.string().optional(),
            estimatedTime: z.string().optional(),
            cost: z.string().optional(),
            isPublic: z.boolean().optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await requireDb();
          const { id, ...data } = input;
          if (id) {
            await db.update(servicePublications).set(data).where(eq(servicePublications.id, id));
            return { id };
          }
          const [result] = await db.insert(servicePublications).values({ ...data, publishedById: ctx.user.id });
          return { id: (result as { insertId: number }).insertId };
        }),
    }),

    faqs: router({
      list: publicProcedure
        .input(z.object({ serviceTypeId: z.number() }))
        .query(async ({ input }) => {
          const db = await requireDb();
          return db.select().from(serviceFaqs).where(and(eq(serviceFaqs.serviceTypeId, input.serviceTypeId), eq(serviceFaqs.isActive, true))).orderBy(asc(serviceFaqs.sortOrder));
        }),

      upsert: protectedProcedure
        .input(
          z.object({
            id: z.number().optional(),
            serviceTypeId: z.number(),
            question: z.string(),
            answer: z.string(),
            sortOrder: z.number().optional(),
            isActive: z.boolean().optional(),
          })
        )
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const { id, ...data } = input;
          if (id) {
            await db.update(serviceFaqs).set(data).where(eq(serviceFaqs.id, id));
            return { id };
          }
          const [result] = await db.insert(serviceFaqs).values(data);
          return { id: (result as { insertId: number }).insertId };
        }),
    }),

    checklists: router({
      list: publicProcedure
        .input(z.object({ serviceTypeId: z.number() }))
        .query(async ({ input }) => {
          const db = await requireDb();
          return db.select().from(serviceChecklists).where(eq(serviceChecklists.serviceTypeId, input.serviceTypeId)).orderBy(asc(serviceChecklists.sortOrder));
        }),

      upsert: protectedProcedure
        .input(
          z.object({
            id: z.number().optional(),
            serviceTypeId: z.number(),
            item: z.string(),
            description: z.string().optional(),
            isRequired: z.boolean().optional(),
            sortOrder: z.number().optional(),
          })
        )
        .mutation(async ({ input }) => {
          const db = await requireDb();
          const { id, ...data } = input;
          if (id) {
            await db.update(serviceChecklists).set(data).where(eq(serviceChecklists.id, id));
            return { id };
          }
          const [result] = await db.insert(serviceChecklists).values(data);
          return { id: (result as { insertId: number }).insertId };
        }),
    }),
  }),

  // ══ AUDITORIA / COMPLIANCE ═══════════════════════════════════════════════════
  audit: router({
    sensitiveAccess: router({
      log: protectedProcedure
        .input(
          z.object({
            entityType: z.string(),
            entityId: z.number(),
            action: z.string(),
            ipAddress: z.string().optional(),
            justification: z.string().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          const db = await requireDb();
          await db.insert(sensitiveAccessLogs).values({
            userId: ctx.user.id,
            ...input,
          });
          return { success: true };
        }),

      list: protectedProcedure
        .input(z.object({ entityType: z.string().optional(), limit: z.number().default(100) }))
        .query(async ({ input }) => {
          const db = await requireDb();
          const conditions = [];
          if (input.entityType) conditions.push(eq(sensitiveAccessLogs.entityType, input.entityType));
          return db
            .select()
            .from(sensitiveAccessLogs)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(sensitiveAccessLogs.createdAt))
            .limit(input.limit);
        }),
    }),

    compliance: router({
      log: protectedProcedure
        .input(
          z.object({
            eventType: z.string(),
            entityType: z.string().optional(),
            entityId: z.number().optional(),
            nup: z.string().optional(),
            description: z.string().optional(),
            severity: z.enum(["info", "warning", "critical"]).optional(),
          })
        )
        .mutation(async ({ input }) => {
          const db = await requireDb();
          await db.insert(complianceEvents).values(input);
          return { success: true };
        }),

      list: protectedProcedure
        .input(z.object({ severity: z.string().optional(), limit: z.number().default(100) }))
        .query(async ({ input }) => {
          const db = await requireDb();
          const conditions = [];
          if (input.severity) conditions.push(eq(complianceEvents.severity, input.severity as "info" | "warning" | "critical"));
          return db
            .select()
            .from(complianceEvents)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(complianceEvents.createdAt))
            .limit(input.limit);
        }),
    }),
  }),
});
