/**
 * tRPC Routers — Módulo de Estrutura Organizacional
 * Lei Complementar nº 010/2025 — Itabaiana/PB
 */

import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sendEmail } from "./email";
import { getAllAccounts } from "./db";
import { getSystemEmailAccount } from "./system-email";
import {
  getOrgUnits, getOrgUnitById, getOrgUnitTree, getOrgUnitWithBreadcrumb,
  createOrgUnit, updateOrgUnit, deleteOrgUnit, getOrgUnitStats,
  getPositions, getPositionById, createPosition, updatePosition, deletePosition,
  getUserAllocations, createUserAllocation, updateUserAllocation, deactivateUserAllocation, getAllocationHistory,
  getOrgInvites, getOrgInviteByToken, getOrgInviteById, createOrgInvite, updateOrgInviteStatus, expireOldInvites,
} from "./db-org";
import { seedOrgStructure } from "./seed-org";

// ─── Org Units Router ─────────────────────────────────────────────────────────
export const orgUnitsRouter = router({
  list: protectedProcedure
    .input(z.object({
      parentId: z.number().nullable().optional(),
      type: z.string().optional(),
      level: z.number().optional(),
      isActive: z.boolean().optional(),
      search: z.string().optional(),
    }))
    .query(({ input }) => getOrgUnits(input)),

  tree: protectedProcedure
    .input(z.object({ parentId: z.number().nullable().optional() }))
    .query(({ input }) => getOrgUnitTree(input.parentId ?? null)),

  treePublic: publicProcedure
    .query(() => getOrgUnitTree(null)),

  positionsPublic: publicProcedure
    .input(z.object({ orgUnitId: z.number().optional() }).optional())
    .query(({ input }) => getPositions({ orgUnitId: input?.orgUnitId, isActive: true })),

  allocationsPublic: publicProcedure
    .input(z.object({ orgUnitId: z.number() }))
    .query(async ({ input }) => {
      const allocs = await getUserAllocations({ orgUnitId: input.orgUnitId, isActive: true });
      // Return only public functional data — no CPF, personal data, bank info
      return (allocs as any[]).map((a) => ({
        id: a.id,
        orgUnitId: a.orgUnitId,
        positionId: a.positionId,
        systemProfile: a.systemProfile,
        userName: a.user?.name ?? null,
        positionName: a.position?.name ?? null,
        positionLevel: a.position?.level ?? null,
      }));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getOrgUnitById(input.id)),

  withBreadcrumb: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getOrgUnitWithBreadcrumb(input.id)),

  stats: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getOrgUnitStats(input.id)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      acronym: z.string().max(32).optional(),
      type: z.enum([
        "prefeitura", "gabinete", "procuradoria", "controladoria", "secretaria",
        "superintendencia", "secretaria_executiva", "diretoria", "departamento",
        "coordenacao", "gerencia", "supervisao", "secao", "setor", "nucleo",
        "assessoria", "unidade", "junta", "tesouraria", "ouvidoria"
      ]),
      level: z.number().min(1).max(10),
      parentId: z.number().nullable().optional(),
      description: z.string().optional(),
      legalBasis: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return createOrgUnit({ ...input, isActive: true, isSeeded: false });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      acronym: z.string().max(32).optional(),
      type: z.string().optional(),
      parentId: z.number().nullable().optional(),
      description: z.string().optional(),
      legalBasis: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
      managerId: z.number().nullable().optional(),
    }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      return updateOrgUnit(id, data as any);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return deleteOrgUnit(input.id);
    }),

  seed: protectedProcedure
    .mutation(({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return seedOrgStructure();
    }),
});

// ─── Positions Router ─────────────────────────────────────────────────────────
export const positionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      orgUnitId: z.number().optional(),
      level: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(({ input }) => getPositions(input)),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getPositionById(input.id)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      code: z.string().optional(),
      orgUnitId: z.number().optional(),
      level: z.enum([
        "secretario", "secretario_executivo", "diretor", "coordenador",
        "gerente", "supervisor", "chefe", "assessor_tecnico", "assessor_especial", "outro"
      ]),
      provisionType: z.enum(["comissao", "efetivo", "designacao", "contrato"]).optional(),
      canSign: z.boolean().optional(),
      canApprove: z.boolean().optional(),
    }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return createPosition({ ...input, isActive: true, isSeeded: false });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      code: z.string().optional(),
      orgUnitId: z.number().nullable().optional(),
      level: z.string().optional(),
      provisionType: z.string().optional(),
      canSign: z.boolean().optional(),
      canApprove: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      return updatePosition(id, data as any);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return deletePosition(input.id);
    }),
});

// ─── User Allocations Router ──────────────────────────────────────────────────
export const userAllocationsRouter = router({
  list: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      orgUnitId: z.number().optional(),
      isActive: z.boolean().optional(),
      isPrimary: z.boolean().optional(),
    }))
    .query(({ input }) => getUserAllocations(input)),

  myAllocations: protectedProcedure
    .query(({ ctx }) => getUserAllocations({ userId: ctx.user.id, isActive: true })),

  history: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getAllocationHistory(input.userId)),

  myHistory: protectedProcedure
    .query(({ ctx }) => getAllocationHistory(ctx.user.id)),

  allocate: protectedProcedure
    .input(z.object({
      userId: z.number(),
      orgUnitId: z.number(),
      positionId: z.number().optional(),
      isPrimary: z.boolean().optional(),
      systemProfile: z.enum([
        "citizen", "attendant", "sector_server", "analyst", "manager", "authority", "admin"
      ]).optional(),
      startDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return createUserAllocation({
        ...input,
        isPrimary: input.isPrimary ?? true,
        systemProfile: input.systemProfile ?? "attendant",
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        isActive: true,
        allocatedBy: ctx.user.id,
      }, ctx.user.id);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      orgUnitId: z.number().optional(),
      positionId: z.number().nullable().optional(),
      isPrimary: z.boolean().optional(),
      systemProfile: z.string().optional(),
      endDate: z.string().nullable().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.endDate) updateData.endDate = new Date(data.endDate);
      return updateUserAllocation(id, updateData, ctx.user.id);
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return deactivateUserAllocation(input.id, ctx.user.id);
    }),
});

// ─── Org Invites Router ───────────────────────────────────────────────────────
export const orgInvitesRouter = router({
  list: protectedProcedure
    .input(z.object({
      orgUnitId: z.number().optional(),
      status: z.string().optional(),
    }))
    .query(({ input }) => getOrgInvites(input)),

  byToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      await expireOldInvites();
      const invite = await getOrgInviteByToken(input.token);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
      if (invite.status === "expired") throw new TRPCError({ code: "FORBIDDEN", message: "Este convite expirou." });
      if (invite.status === "cancelled") throw new TRPCError({ code: "FORBIDDEN", message: "Este convite foi cancelado." });
      if (invite.status === "accepted") throw new TRPCError({ code: "FORBIDDEN", message: "Este convite já foi aceito." });
      return invite;
    }),

  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      orgUnitId: z.number(),
      positionId: z.number().optional(),
      systemProfile: z.enum([
        "citizen", "attendant", "sector_server", "analyst", "manager", "authority", "admin"
      ]).optional(),
      notes: z.string().optional(),
      expiresInDays: z.number().min(1).max(30).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      const token = nanoid(48);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 7));

      const invite = await createOrgInvite({
        token,
        email: input.email,
        name: input.name ?? null,
        orgUnitId: input.orgUnitId,
        positionId: input.positionId ?? null,
        systemProfile: input.systemProfile ?? "attendant",
        status: "pending",
        invitedBy: ctx.user.id,
        notes: input.notes ?? null,
        expiresAt,
      });

      // Send invite email
      const inviteUrl = `/convite/${token}`;
      let emailSent = false;
      let emailError: string | null = null;
      try {
        const accounts = await getAllAccounts();
        const dbEmailAccount = accounts.find((a) => a.channel === "email" && a.smtpHost && a.smtpUser && a.smtpPassword);
        const emailAccount = dbEmailAccount ?? getSystemEmailAccount();
        if (emailAccount) {
          const orgUnit = await import("./db-org").then((m) => m.getOrgUnitById(input.orgUnitId));
          const unitName = orgUnit?.name ?? "Unidade Organizacional";
          await sendEmail(
            emailAccount,
            input.email,
            `Convite para integrar ${unitName} — CAIUS`,
            `Olá${input.name ? ` ${input.name}` : ""},\n\nVocê foi convidado para integrar ${unitName} no sistema CAIUS.\n\nAcesse o link abaixo para aceitar o convite:\n${process.env.PUBLIC_URL ?? ""}${inviteUrl}\n\nEste convite expira em ${input.expiresInDays ?? 7} dias.\n\nAtenciosamente,\nEquipe CAIUS`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <h2 style="color:#1e40af">Convite CAIUS</h2>
              <p>Olá${input.name ? ` <strong>${input.name}</strong>` : ""},</p>
              <p>Você foi convidado para integrar <strong>${unitName}</strong> no sistema CAIUS.</p>
              <p style="margin:24px 0">
                <a href="${process.env.PUBLIC_URL ?? ''}${inviteUrl}" style="background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Aceitar Convite</a>
              </p>
              <p style="color:#6b7280;font-size:14px">Este convite expira em ${input.expiresInDays ?? 7} dias.</p>
            </div>`
          );
          emailSent = true;
        } else {
          emailError = "E-mail padrão do sistema não configurado. Defina SYSTEM_EMAIL_* nas variáveis de ambiente.";
        }
      } catch (err: any) {
        emailError = err?.message ?? "Falha ao enviar e-mail de convite";
      }
      return { ...invite, inviteUrl, emailSent, emailError };
    }),

  resend: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const invite = await getOrgInviteById(input.id);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
      if (invite.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas convites pendentes podem ser reenviados." });

      // Extend expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await updateOrgInviteStatus(input.id, "pending");

      return { success: true, inviteUrl: `/convite/${invite.token}` };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const invite = await getOrgInviteById(input.id);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND" });
      if (invite.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas convites pendentes podem ser cancelados." });
      return updateOrgInviteStatus(input.id, "cancelled");
    }),

  accept: publicProcedure
    .input(z.object({
      token: z.string(),
      name: z.string().min(2),
      password: z.string().min(8).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await expireOldInvites();
      const invite = await getOrgInviteByToken(input.token);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado." });
      if (invite.status !== "pending") throw new TRPCError({ code: "FORBIDDEN", message: "Este convite não está mais disponível." });

      // Mark as accepted
      await updateOrgInviteStatus(invite.id, "accepted", {
        acceptedAt: new Date(),
        acceptedIp: (ctx.req as any)?.ip ?? "unknown",
      });

      return {
        success: true,
        message: "Convite aceito com sucesso! Sua conta será configurada com as permissões da unidade selecionada.",
        orgUnitId: invite.orgUnitId,
        positionId: invite.positionId,
        systemProfile: invite.systemProfile,
      };
    }),

  expireOld: protectedProcedure
    .mutation(({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return expireOldInvites();
    }),
});
