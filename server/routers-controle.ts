import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import {
  getAllUnits,
  getUnitById,
  getAllControls,
  getControlById,
  createControl,
  checkDuplicateControl,
  updateControl,
  setControlActive,
  manualSetNextNumber,
  reserveAndUseNumber,
  formatNumber,
  getUsageHistory,
  getDocAuditLogs,
  addDocAuditLog,
  getDocUserPermissions,
  getAllDocUserPermissions,
  upsertDocUserPermissions,
  getDocDashboardStats,
  getDocUserUnits,
  setDocUserUnits,
} from "./db-controle";

type DocPermKey =
  | "canAccessOficios"
  | "canAccessMemorandos"
  | "canAccessDecretos"
  | "canAccessLeis"
  | "canAccessDiarioOficial"
  | "canAccessContratos"
  | "canAccessPortarias";

const permMap: Record<string, DocPermKey> = {
  oficio: "canAccessOficios",
  memorando: "canAccessMemorandos",
  decreto: "canAccessDecretos",
  lei: "canAccessLeis",
  diario_oficial: "canAccessDiarioOficial",
  contrato: "canAccessContratos",
  portaria: "canAccessPortarias",
};

export const controleRouter = router({
  // ─── Unidades Organizacionais (integrado com /org-structure) ───────────────
  // As unidades são gerenciadas em /org-structure e reutilizadas aqui.
  unidades: router({
    list: protectedProcedure.query(async () => {
      return getAllUnits();
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const unit = await getUnitById(input.id);
        if (!unit) throw new TRPCError({ code: "NOT_FOUND" });
        return unit;
      }),
  }),

  // ─── Configuração de Controles ──────────────────────────────────────────────
  configuracao: router({
    list: protectedProcedure.query(async () => {
      return getAllControls();
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const control = await getControlById(input.id);
        if (!control) throw new TRPCError({ code: "NOT_FOUND" });
        return control;
      }),
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(2),
          documentType: z.enum(["oficio", "memorando", "decreto", "lei", "diario_oficial", "contrato", "portaria"]),
          unitId: z.number(),
          prefix: z.string().optional(),
          numberFormat: z.enum(["sequencial", "ano_sequencial", "sequencial_ano"]),
          digits: z.number().min(1).max(10),
          referenceYear: z.number().min(2000).max(2100),
          resetAnnually: z.boolean(),
          nextNumber: z.number().min(1).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { isDuplicate, existing } = await checkDuplicateControl({
          documentType: input.documentType,
          unitId: input.unitId,
          referenceYear: input.referenceYear,
        });
        if (isDuplicate) {
          const status = existing?.active ? "ativo" : "inativo";
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe um controle ${status} para este tipo documental, unidade e ano: "${existing?.name}". Desative-o antes de criar um novo ou escolha outro tipo, unidade ou ano.`,
          });
        }
        await createControl({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(2).optional(),
          prefix: z.string().optional(),
          numberFormat: z.enum(["sequencial", "ano_sequencial", "sequencial_ano"]).optional(),
          digits: z.number().min(1).max(10).optional(),
          referenceYear: z.number().min(2000).max(2100).optional(),
          resetAnnually: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const control = await getControlById(id);
        if (!control) throw new TRPCError({ code: "NOT_FOUND" });
        await updateControl(id, data);
        await addDocAuditLog({
          controlId: id,
          userId: ctx.user.id,
          action: "control_updated",
          newValue: JSON.stringify(data),
        });
        return { success: true };
      }),
    setActive: adminProcedure
      .input(z.object({ id: z.number(), active: z.boolean(), justification: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const control = await getControlById(input.id);
        if (!control) throw new TRPCError({ code: "NOT_FOUND" });
        await setControlActive(input.id, input.active);
        await addDocAuditLog({
          controlId: input.id,
          userId: ctx.user.id,
          action: input.active ? "control_activated" : "control_deactivated",
          justification: input.justification,
        });
        return { success: true };
      }),
    manualSetNumber: adminProcedure
      .input(
        z.object({
          id: z.number(),
          nextNumber: z.number().min(1),
          justification: z.string().min(5),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const control = await getControlById(input.id);
        if (!control) throw new TRPCError({ code: "NOT_FOUND" });
        const prev = String(control.nextNumber);
        await manualSetNextNumber(input.id, input.nextNumber);
        await addDocAuditLog({
          controlId: input.id,
          userId: ctx.user.id,
          action: "manual_number_change",
          previousValue: prev,
          newValue: String(input.nextNumber),
          justification: input.justification,
        });
        return { success: true };
      }),
  }),

  // ─── Uso de Números ─────────────────────────────────────────────────────────
  numeracao: router({
    useNumber: protectedProcedure
      .input(
        z.object({
          controlId: z.number(),
          documentDescription: z.string().min(3),
          documentType: z.enum(["oficio", "memorando", "decreto", "lei", "diario_oficial", "contrato", "portaria"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          const perms = await getDocUserPermissions(ctx.user.id);
          const permKey = permMap[input.documentType];
          if (!perms || !perms[permKey]) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para este tipo documental" });
          }
        }
        return reserveAndUseNumber(input.controlId, input.documentDescription, ctx.user.id);
      }),
    previewNumber: protectedProcedure
      .input(z.object({ controlId: z.number() }))
      .query(async ({ input }) => {
        const control = await getControlById(input.controlId);
        if (!control) throw new TRPCError({ code: "NOT_FOUND" });
        const formatted = formatNumber(
          control.nextNumber,
          control.numberFormat,
          control.digits,
          control.referenceYear,
          control.prefix
        );
        return { nextNumber: control.nextNumber, formattedNumber: formatted, control };
      }),
  }),

  // ─── Histórico ──────────────────────────────────────────────────────────────
  historico: router({
    list: protectedProcedure
      .input(z.object({
        controlId: z.number().optional(),
        unitId: z.number().optional(),
        limit: z.number().min(1).max(500).default(100),
      }))
      .query(async ({ input, ctx }) => {
        // Admins vêem tudo; usuários comuns só vêem suas unidades vinculadas
        if (ctx.user.role === "admin") {
          return getUsageHistory({ controlId: input.controlId, unitId: input.unitId, limit: input.limit });
        }
        // Buscar unidades vinculadas ao usuário
        const userUnits = await getDocUserUnits(ctx.user.id);
        const userUnitIds = userUnits.map((u: { id: number }) => u.id);
        if (userUnitIds.length === 0) return [];
        // Se o usuário filtrou por uma unidade específica, verificar se tem acesso
        if (input.unitId) {
          if (!userUnitIds.includes(input.unitId)) return [];
          return getUsageHistory({ controlId: input.controlId, unitId: input.unitId, limit: input.limit });
        }
        // Sem filtro de unidade: retorna apenas das unidades vinculadas
        return getUsageHistory({ controlId: input.controlId, unitIds: userUnitIds, limit: input.limit });
      }),
  }),

  // ─── Auditoria ──────────────────────────────────────────────────────────────
  auditoria: router({
    list: adminProcedure
      .input(z.object({ controlId: z.number().optional(), limit: z.number().min(1).max(500).default(200) }))
      .query(async ({ input }) => {
        return getDocAuditLogs(input.controlId, input.limit);
      }),
  }),

  // ─── Permissões ─────────────────────────────────────────────────────────────
  permissoes: router({
    listAll: adminProcedure.query(async () => {
      return getAllDocUserPermissions();
    }),
    getByUserId: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const perms = await getDocUserPermissions(input.userId);
        return {
          canAccessOficios: perms?.canAccessOficios ?? false,
          canAccessMemorandos: perms?.canAccessMemorandos ?? false,
          canAccessDecretos: perms?.canAccessDecretos ?? false,
          canAccessLeis: perms?.canAccessLeis ?? false,
          canAccessDiarioOficial: perms?.canAccessDiarioOficial ?? false,
          canAccessContratos: perms?.canAccessContratos ?? false,
          canAccessPortarias: perms?.canAccessPortarias ?? false,
        };
      }),
    getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return {
          canAccessOficios: true,
          canAccessMemorandos: true,
          canAccessDecretos: true,
          canAccessLeis: true,
          canAccessDiarioOficial: true,
          canAccessContratos: true,
          canAccessPortarias: true,
        };
      }
      const perms = await getDocUserPermissions(ctx.user.id);
      return {
        canAccessOficios: perms?.canAccessOficios ?? false,
        canAccessMemorandos: perms?.canAccessMemorandos ?? false,
        canAccessDecretos: perms?.canAccessDecretos ?? false,
        canAccessLeis: perms?.canAccessLeis ?? false,
        canAccessDiarioOficial: perms?.canAccessDiarioOficial ?? false,
        canAccessContratos: perms?.canAccessContratos ?? false,
        canAccessPortarias: perms?.canAccessPortarias ?? false,
      };
    }),
    upsert: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          canAccessOficios: z.boolean(),
          canAccessMemorandos: z.boolean(),
          canAccessDecretos: z.boolean(),
          canAccessLeis: z.boolean(),
          canAccessDiarioOficial: z.boolean(),
          canAccessContratos: z.boolean(),
          canAccessPortarias: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { userId, ...permissions } = input;
        await upsertDocUserPermissions(userId, permissions, ctx.user.id);
        return { success: true };
      }),
    getUserUnits: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getDocUserUnits(input.userId);
      }),
    setUserUnits: adminProcedure
      .input(z.object({ userId: z.number(), unitIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await setDocUserUnits(input.userId, input.unitIds);
        return { success: true };
      }),
    getMyUnits: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") return null; // admin vê tudo
      return getDocUserUnits(ctx.user.id);
    }),
  }),

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return getDocDashboardStats();
    }),
  }),
});
