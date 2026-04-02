/**
 * routers-modules.ts
 * CRUD de módulos dinâmicos (tipos de processos customizados) e seus registros.
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { customModules, customModuleRecords } from "../drizzle/schema";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { generateNup } from "./db-caius";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getModuleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(customModules).where(eq(customModules.id, id)).limit(1);
  return rows[0] ?? null;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const customModulesRouter = router({
  // ── Module CRUD ────────────────────────────────────────────────────────────
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(customModules).orderBy(customModules.menuOrder, customModules.name);
  }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(customModules).where(eq(customModules.slug, input.slug)).limit(1);
      return rows[0] ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2).max(128),
      slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
      description: z.string().optional(),
      icon: z.string().default("FileText"),
      color: z.string().default("#6366f1"),
      menuSection: z.string().default("gestao-publica"),
      menuOrder: z.number().default(0),
      fields: z.array(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check slug uniqueness
      const existing = await db.select({ id: customModules.id }).from(customModules).where(eq(customModules.slug, input.slug)).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Já existe um módulo com este slug." });
      await db.insert(customModules).values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        icon: input.icon,
        color: input.color,
        menuSection: input.menuSection,
        menuOrder: input.menuOrder,
        fields: input.fields ?? [],
        createdBy: ctx.user.id,
        isActive: true,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).max(128).optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      menuSection: z.string().optional(),
      menuOrder: z.number().optional(),
      isActive: z.boolean().optional(),
      fields: z.array(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(customModules).set(data as any).where(eq(customModules.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Delete all records first
      await db.delete(customModuleRecords).where(eq(customModuleRecords.moduleId, input.id));
      await db.delete(customModules).where(eq(customModules.id, input.id));
      return { success: true };
    }),

  // ── Records CRUD ───────────────────────────────────────────────────────────
  records: router({
    list: protectedProcedure
      .input(z.object({
        moduleId: z.number(),
        status: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { records: [], total: 0 };
        const conditions = [eq(customModuleRecords.moduleId, input.moduleId)];
        if (input.status) conditions.push(eq(customModuleRecords.status, input.status));
        if (input.priority) conditions.push(eq(customModuleRecords.priority, input.priority));
        if (input.search) conditions.push(like(customModuleRecords.title, `%${input.search}%`));
        const where = conditions.length > 1 ? and(...conditions as [any, ...any[]]) : conditions[0];
        const [rows, countRows] = await Promise.all([
          db.select().from(customModuleRecords).where(where)
            .orderBy(desc(customModuleRecords.createdAt))
            .limit(input.pageSize).offset((input.page - 1) * input.pageSize),
          db.select({ c: sql<number>`count(*)` }).from(customModuleRecords).where(where),
        ]);
        return { records: rows, total: Number(countRows[0]?.c ?? 0) };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const rows = await db.select().from(customModuleRecords).where(eq(customModuleRecords.id, input.id)).limit(1);
        return rows[0] ?? null;
      }),

    create: protectedProcedure
      .input(z.object({
        moduleId: z.number(),
        title: z.string().min(2).max(256),
        status: z.string().default("open"),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        assignedTo: z.number().optional(),
        sectorId: z.number().optional(),
        data: z.record(z.string(), z.any()).optional(),
        content: z.string().optional(),
        isConfidential: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const nup = await generateNup();
        await db.insert(customModuleRecords).values({
          ...input,
          nup,
          createdBy: ctx.user.id,
        });
        return { success: true, nup };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(2).max(256).optional(),
        status: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        assignedTo: z.number().optional(),
        sectorId: z.number().optional(),
        data: z.record(z.string(), z.any()).optional(),
        content: z.string().optional(),
        isConfidential: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { id, ...data } = input;
        await db.update(customModuleRecords).set(data as any).where(eq(customModuleRecords.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(customModuleRecords).where(eq(customModuleRecords.id, input.id));
        return { success: true };
      }),
  }),
});
