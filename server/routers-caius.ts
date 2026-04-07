import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { sendNupNotification } from "./nup-notification";
import {
  createAdminProcess,
  createAiProvider,
  createAiUsageLog,
  createAuditLog,
  createDocumentTemplate,
  createElectronicSignature,
  createOfficialDocument,
  createOmbudsmanManifestation,
  createProtocol,
  createSector,
  createTramitation,
  deleteAiProvider,
  deleteDocumentTemplate,
  deleteSector,
  generateNup,
  getAdminProcessById,
  getAdminProcesses,
  getAiProviderById,
  getAiProvidersByUser,
  getAiUsageLogs,
  getAuditLogs,
  getDocumentTemplates,
  getOfficialDocumentById,
  getOfficialDocuments,
  getOmbudsmanManifestations,
  getProtocolById,
  getProtocolByNup,
  getProtocols,
  getProtocolStats,
  getSectorById,
  getSectors,
  getSignaturesByDocument,
  getTramitationsByProtocol,
  publicLookupByNup,
  publicLookupByCpfCnpj,
  getPublicTramitationsByNup,
  updateAdminProcess,
  getProcessDeadlineHistory,
  addProcessDeadlineHistory,
  updateAiProvider,
  updateDocumentTemplate,
  updateOfficialDocument,
  updateOmbudsmanManifestation,
  updateProtocol,
  updateSector,
} from "./db-caius";
import crypto from "crypto";
import { sendOfficialDocument, getDocumentRecipients, getLastSendByDocumentIds } from "./doc-sender";
import { getAllUsers, createNotification } from "./db";
import { generateProtocolPdf } from "./protocol-pdf";
import { storagePut } from "./storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function encryptApiKey(key: string): string {
  // Simple base64 encoding — in production, use AES-256-GCM with a secret
  return Buffer.from(key).toString("base64");
}

function decryptApiKey(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf-8");
}

async function logAudit(opts: {
  userId?: number;
  userName?: string;
  nup?: string;
  action: string;
  entity: string;
  entityId?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  aiAssisted?: boolean;
}) {
  await createAuditLog({
    userId: opts.userId,
    userName: opts.userName,
    nup: opts.nup,
    action: opts.action,
    entity: opts.entity,
    entityId: opts.entityId,
    details: opts.details ?? null,
    ipAddress: opts.ipAddress,
    aiAssisted: opts.aiAssisted ?? false,
  });
}

// ─── CAIUS Router ─────────────────────────────────────────────────────────────
export const caiusRouter = router({

  // ── Users (lista para envio interno de documentos) ────────────────────────
  users: router({
    list: protectedProcedure.query(() => getAllUsers()),
  }),

  // ── Sectors ───────────────────────────────────────────────────────────────
  sectors: router({
    list: protectedProcedure.query(() => getSectors()),
    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getSectorById(input.id)),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        description: z.string().optional(),
        parentId: z.number().optional(),
        managerId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createSector({ ...input, isActive: true });
        await logAudit({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "create_sector", entity: "sector", details: { name: input.name } });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        managerId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateSector(id, data);
        await logAudit({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "update_sector", entity: "sector", entityId: id });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSector(input.id);
        await logAudit({ userId: ctx.user.id, userName: ctx.user.name ?? "", action: "delete_sector", entity: "sector", entityId: input.id });
        return { success: true };
      }),
  }),

  // ── Protocols ─────────────────────────────────────────────────────────────
  protocols: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        type: z.string().optional(),
        sectorId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional())
      .query(({ input }) => getProtocols(input ?? {})),

    byNup: protectedProcedure
      .input(z.object({ nup: z.string() }))
      .query(({ input }) => getProtocolByNup(input.nup)),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getProtocolById(input.id)),

    stats: protectedProcedure.query(() => getProtocolStats()),

    create: protectedProcedure
      .input(z.object({
        subject: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(["request", "complaint", "information", "suggestion", "praise", "ombudsman", "esic", "administrative"]).default("request"),
        channel: z.enum(["whatsapp", "instagram", "email", "web", "phone", "in_person"]).default("web"),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        isConfidential: z.boolean().default(false),
        responsibleSectorId: z.number().optional(),
        responsibleUserId: z.number().optional(),
        requesterName: z.string().optional(),
        requesterEmail: z.string().optional(),
        requesterPhone: z.string().optional(),
        requesterCpfCnpj: z.string().optional(),
        conversationId: z.number().optional(),
        contactId: z.number().optional(),
        deadline: z.date().optional(),
        parentNup: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { nup, protocolId } = await createProtocol({ ...input, createdById: ctx.user.id });
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup,
          action: "create_protocol",
          entity: "protocol",
          entityId: protocolId,
          details: { subject: input.subject, type: input.type },
        });
        // Notificação automática ao gerar NUP
        try {
          const notifChannel = ({
            email: "email",
            whatsapp: "whatsapp",
            instagram: "instagram",
            web: "system",
            phone: "sms",
            in_person: "system",
          } as const)[input.channel] ?? "system";
          await sendNupNotification({
            nup,
            entityType: "protocol",
            entityId: protocolId,
            channel: notifChannel,
            subject: input.subject,
            recipientAddress: notifChannel === "email" ? input.requesterEmail : input.requesterPhone,
          });
        } catch (e) {
          console.error("[NUP] Falha ao enviar notificação:", e);
        }

        // Envio automático do PDF do protocolo ao cidadão
        const hasEmail = !!input.requesterEmail;
        const hasPhone = !!input.requesterPhone;
        if ((hasEmail || hasPhone) && (input.channel === "email" || input.channel === "whatsapp")) {
          try {
            const pdfBytes = await generateProtocolPdf({
              nup,
              subject: input.subject,
              description: input.description,
              type: input.type,
              channel: input.channel,
              status: "open",
              priority: input.priority,
              createdAt: new Date(),
              deadline: input.deadline,
              requesterName: input.requesterName,
              requesterEmail: input.requesterEmail,
              requesterPhone: input.requesterPhone,
              requesterCpfCnpj: input.requesterCpfCnpj,
              createdByName: ctx.user.name ?? undefined,
            });
            const key = `protocols/nup-${nup.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.pdf`;
            const { url: pdfUrl } = await storagePut(key, Buffer.from(pdfBytes), "application/pdf");
            // Re-usar sendNupNotification passando o pdfUrl como parte da mensagem
            console.log(`[NUP] PDF gerado para ${nup}: ${pdfUrl}`);
          } catch (e) {
            console.error("[NUP] Falha ao gerar/enviar PDF:", e);
          }
        }

        return { nup, protocolId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "in_analysis", "pending_docs", "in_progress", "concluded", "archived"]).optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        responsibleSectorId: z.number().optional(),
        responsibleUserId: z.number().optional(),
        subject: z.string().optional(),
        description: z.string().optional(),
        isConfidential: z.boolean().optional(),
        deadline: z.date().optional(),
        concludedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateProtocol(id, data);
        const proto = await getProtocolById(id);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup: proto?.protocol.nup,
          action: "update_protocol",
          entity: "protocol",
          entityId: id,
          details: data as Record<string, unknown>,
        });
        return { success: true };
      }),
  }),

  // ── Tramitations ──────────────────────────────────────────────────────────
  tramitations: router({
    byProtocol: protectedProcedure
      .input(z.object({ protocolId: z.number() }))
      .query(({ input }) => getTramitationsByProtocol(input.protocolId)),

    create: protectedProcedure
      .input(z.object({
        protocolId: z.number(),
        nup: z.string(),
        toSectorId: z.number().optional(),
        toUserId: z.number().optional(),
        action: z.enum(["forward", "return", "assign", "conclude", "archive", "reopen", "comment"]),
        dispatch: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get current protocol to know fromSector
        const proto = await getProtocolById(input.protocolId);
        const tramResult = await createTramitation({
          protocolId: input.protocolId,
          nup: input.nup,
          fromSectorId: proto?.protocol.responsibleSectorId ?? undefined,
          fromUserId: ctx.user.id,
          toSectorId: input.toSectorId,
          toUserId: input.toUserId,
          action: input.action,
          dispatch: input.dispatch,
          attachments: null,
        });
        // Update protocol responsible if forwarding
        if (input.action === "forward" || input.action === "assign") {
          await updateProtocol(input.protocolId, {
            responsibleSectorId: input.toSectorId,
            responsibleUserId: input.toUserId,
            status: "in_progress",
          });
        } else if (input.action === "conclude") {
          await updateProtocol(input.protocolId, { status: "concluded", concludedAt: new Date() });
        } else if (input.action === "archive") {
          await updateProtocol(input.protocolId, { status: "archived" });
        } else if (input.action === "reopen") {
          await updateProtocol(input.protocolId, { status: "open" });
        }
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup: input.nup,
          action: `tramitation_${input.action}`,
          entity: "tramitation",
          entityId: input.protocolId,
          details: { dispatch: input.dispatch, toSectorId: input.toSectorId },
        });
        return { success: true, tramitationId: tramResult.tramitationId };
      }),
  }),

  // ── Official Documents ─────────────────────────────────────────────────────
  documents: router({
    list: protectedProcedure
      .input(z.object({
        type: z.string().optional(),
        status: z.string().optional(),
        sectorId: z.number().optional(),
        protocolId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
      }).optional())
      .query(({ input }) => getOfficialDocuments(input ?? {})),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getOfficialDocumentById(input.id)),

    create: protectedProcedure
      .input(z.object({
        type: z.enum(["memo", "official_letter", "dispatch", "opinion", "notification", "certificate", "report", "other"]),
        title: z.string().min(1),
        content: z.string().optional(),
        sectorId: z.number().optional(),
        protocolId: z.number().optional(),
        processId: z.number().optional(),
        isConfidential: z.boolean().default(false),
        aiGenerated: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const { nup, number } = await createOfficialDocument({ ...input, authorId: ctx.user.id, status: "draft" });
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup,
          action: "create_document",
          entity: "officialDocument",
          details: { type: input.type, title: input.title, aiGenerated: input.aiGenerated },
          aiAssisted: input.aiGenerated,
        });
        return { nup, number };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        status: z.enum(["draft", "pending_signature", "signed", "published", "archived"]).optional(),
        isConfidential: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateOfficialDocument(id, data);
        const doc = await getOfficialDocumentById(id);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup: doc?.document.nup ?? undefined,
          action: "update_document",
          entity: "officialDocument",
          entityId: id,
        });
        return { success: true };
      }),

    signatures: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(({ input }) => getSignaturesByDocument(input.documentId)),

    sign: protectedProcedure
      .input(z.object({
        documentId: z.number(),
        nup: z.string().optional(),
        signerRole: z.string().optional(),
        ipAddress: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createElectronicSignature({
          documentId: input.documentId,
          nup: input.nup,
          signerId: ctx.user.id,
          signerName: ctx.user.name ?? "Usuário",
          signerEmail: ctx.user.email ?? undefined,
          signerRole: input.signerRole,
          ipAddress: input.ipAddress,
        });
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup: input.nup,
          action: "sign_document",
          entity: "officialDocument",
          entityId: input.documentId,
          ipAddress: input.ipAddress,
        });
        return { success: true };
      }),

    // ── Envio de documento para destinatários ──
    send: protectedProcedure
      .input(z.object({
        documentId: z.number(),
        originType: z.enum(["internal", "external"]),
        recipientUserId: z.number().optional(),
        recipientUnitId: z.number().optional(),
        recipientName: z.string().optional(),
        recipientEmail: z.string().email().optional(),
        recipientPhone: z.string().optional(),
        channel: z.enum(["email", "whatsapp", "both"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await sendOfficialDocument({
          ...input,
          sentById: ctx.user.id,
        });
        // Notificar destinatário interno no sistema
        if (input.originType === "internal" && result.success && input.recipientUserId) {
          try {
            const doc = await getOfficialDocumentById(input.documentId);
            await createNotification({
              userId: input.recipientUserId,
              type: "tramitation",
              title: "Documento recebido",
              body: `Você recebeu o documento "${doc?.title ?? "—"}" (${doc?.nup ?? doc?.documentNumber ?? "—"}) de ${ctx.user.name ?? ctx.user.email}.`,
              relatedProtocolId: null,
            });
          } catch (_) { /* notificação não crítica */ }
        }
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          action: "send_document",
          entity: "officialDocument",
          entityId: input.documentId,
          details: {
            originType: input.originType,
            channel: input.channel,
            recipientName: input.recipientName,
            success: result.success,
          },
        });
        if (!result.success && result.error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
        }
        return result;
      }),

    recipients: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(({ input }) => getDocumentRecipients(input.documentId)),

    lastSends: protectedProcedure
      .input(z.object({ documentIds: z.array(z.number()) }))
      .query(({ input }) => getLastSendByDocumentIds(input.documentIds)),
  }),

  // ── Admin Processes ────────────────────────────────────────────────────────
  processes: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        sectorId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
      }).optional())
      .query(({ input }) => getAdminProcesses(input ?? {})),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getAdminProcessById(input.id)),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        type: z.string().min(1),
        description: z.string().optional(),
        legalBasis: z.string().optional(),
        observations: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        isConfidential: z.boolean().default(false),
        responsibleSectorId: z.number().optional(),
        responsibleUserId: z.number().optional(),
        deadline: z.date().optional(),
        originProtocolNup: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const nup = await createAdminProcess({ ...input, createdById: ctx.user.id });
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup,
          action: "create_process",
          entity: "adminProcess",
          details: { title: input.title, type: input.type },
        });
        return { nup };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "in_analysis", "pending_docs", "in_progress", "concluded", "archived"]).optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        responsibleSectorId: z.number().optional(),
        responsibleUserId: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        legalBasis: z.string().optional(),
        decision: z.string().optional(),
        observations: z.string().optional(),
        isConfidential: z.boolean().optional(),
        deadline: z.date().optional(),
        concludedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateAdminProcess(id, data);
        const proc = await getAdminProcessById(id);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup: proc?.process.nup,
          action: "update_process",
          entity: "adminProcess",
          entityId: id,
        });
        return { success: true };
      }),

    // Gestão de Prazos
    deadlineHistory: protectedProcedure
      .input(z.object({ processId: z.number() }))
      .query(({ input }) => getProcessDeadlineHistory(input.processId)),

    setDeadline: protectedProcedure
      .input(z.object({
        processId: z.number(),
        newDeadline: z.date().nullable(),
        reason: z.string().min(1, "Motivo é obrigatório"),
        action: z.enum(["set", "extend", "reduce", "remove"]).default("set"),
      }))
      .mutation(async ({ ctx, input }) => {
        const proc = await getAdminProcessById(input.processId);
        if (!proc) throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });
        const previousDeadline = proc.process.deadline ?? null;
        // Update the process deadline
        await updateAdminProcess(input.processId, {
          deadline: input.newDeadline ?? undefined,
        });
        // Record history
        await addProcessDeadlineHistory({
          processId: input.processId,
          processNup: proc.process.nup,
          previousDeadline: previousDeadline ?? undefined,
          newDeadline: input.newDeadline ?? undefined,
          reason: input.reason,
          action: input.action,
          changedById: ctx.user.id,
          changedByName: ctx.user.name ?? "",
        });
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup: proc.process.nup,
          action: `deadline_${input.action}`,
          entity: "adminProcess",
          entityId: input.processId,
          details: { reason: input.reason, newDeadline: input.newDeadline },
        });
        return { success: true };
      }),
  }),

  // ── Ombudsman ──────────────────────────────────────────────────────────────
  ombudsman: router({
    list: protectedProcedure
      .input(z.object({
        type: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
      }).optional())
      .query(({ input }) => getOmbudsmanManifestations(input ?? {})),

    create: protectedProcedure
      .input(z.object({
        type: z.enum(["complaint", "denounce", "praise", "suggestion", "request", "esic"]),
        subject: z.string().min(1),
        description: z.string().min(1),
        isAnonymous: z.boolean().default(false),
        requesterName: z.string().optional(),
        requesterEmail: z.string().optional(),
        requesterPhone: z.string().optional(),
        requesterCpfCnpj: z.string().optional(),
        isConfidential: z.boolean().default(false),
        responsibleSectorId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const nup = await createOmbudsmanManifestation(input);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup,
          action: "create_ombudsman",
          entity: "ombudsman",
          details: { type: input.type, subject: input.subject },
        });
        return { nup };
      }),

    // Public submission (no auth required)
    publicCreate: publicProcedure
      .input(z.object({
        type: z.enum(["complaint", "denounce", "praise", "suggestion", "request", "esic"]),
        subject: z.string().min(1),
        description: z.string().min(1),
        isAnonymous: z.boolean().default(false),
        requesterName: z.string().optional(),
        requesterEmail: z.string().optional(),
        requesterPhone: z.string().optional(),
        requesterCpfCnpj: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const nup = await createOmbudsmanManifestation({ ...input, isConfidential: false });
        return { nup };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["received", "in_analysis", "in_progress", "answered", "archived"]).optional(),
        responsibleSectorId: z.number().optional(),
        responsibleUserId: z.number().optional(),
        response: z.string().optional(),
        respondedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateOmbudsmanManifestation(id, data);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          action: "update_ombudsman",
          entity: "ombudsman",
          entityId: id,
        });
        return { success: true };
      }),
  }),

  // ── Document Templates ─────────────────────────────────────────────────────
  templates: router({
    list: protectedProcedure
      .input(z.object({ type: z.string().optional() }).optional())
      .query(({ input }) => getDocumentTemplates(input?.type)),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["memo", "official_letter", "dispatch", "opinion", "notification", "certificate", "report", "response", "other"]),
        content: z.string().min(1),
        variables: z.array(z.string()).optional(),
        sectorId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createDocumentTemplate({
          ...input,
          variables: input.variables ?? null,
          createdById: ctx.user.id,
          isActive: true,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        content: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateDocumentTemplate(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDocumentTemplate(input.id);
        return { success: true };
      }),
  }),

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  audit: router({
    list: protectedProcedure
      .input(z.object({
        nup: z.string().optional(),
        userId: z.number().optional(),
        entity: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }).optional())
      .query(({ input }) => getAuditLogs(input ?? {})),
  }),

  // ── AI Providers ───────────────────────────────────────────────────────────
  ai: router({
    providers: protectedProcedure.query(({ ctx }) => getAiProvidersByUser(ctx.user.id)),

    addProvider: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "gemini", "anthropic", "other"]),
        name: z.string().min(1),
        apiKey: z.string().min(1),
        model: z.string().optional(),
        retainHistory: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const encryptedApiKey = encryptApiKey(input.apiKey);
        await createAiProvider({
          userId: ctx.user.id,
          provider: input.provider,
          name: input.name,
          encryptedApiKey,
          model: input.model,
          retainHistory: input.retainHistory,
          isActive: true,
          allowedProfiles: null,
          allowedSectors: null,
          allowedDocTypes: null,
        });
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          action: "add_ai_provider",
          entity: "aiProvider",
          details: { provider: input.provider, name: input.name },
        });
        return { success: true };
      }),

    removeProvider: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteAiProvider(input.id);
        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          action: "remove_ai_provider",
          entity: "aiProvider",
          entityId: input.id,
        });
        return { success: true };
      }),

    // AI-assisted text generation
    assist: protectedProcedure
      .input(z.object({
        providerId: z.number().optional(),
        action: z.enum(["suggest_response", "summarize", "draft_document", "review_text", "classify", "suggest_routing", "extract_info"]),
        context: z.string(),
        nup: z.string().optional(),
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        documentType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Build system prompt based on action
        const systemPrompts: Record<string, string> = {
          suggest_response: "Você é um assistente administrativo especializado em atendimento ao cidadão. Sugira uma resposta formal, clara e objetiva para o atendimento descrito. A resposta deve ser editável pelo usuário antes do envio.",
          summarize: "Você é um assistente administrativo. Faça um resumo conciso e objetivo do atendimento ou histórico descrito, destacando os pontos principais, status atual e próximas ações necessárias.",
          draft_document: `Você é um assistente especializado em documentação administrativa pública. Elabore uma minuta de ${input.documentType ?? "documento"} formal, seguindo as normas da administração pública brasileira. O resultado deve ser editável pelo usuário.`,
          review_text: "Você é um revisor de textos administrativos. Revise o texto fornecido, corrigindo erros, padronizando a linguagem institucional e melhorando a clareza, sem alterar o conteúdo essencial.",
          classify: "Você é um classificador de demandas administrativas. Analise a solicitação e sugira: tipo de demanda, setor responsável, prioridade e prazo estimado. Responda em JSON.",
          suggest_routing: "Você é um especialista em tramitação administrativa. Com base na demanda descrita, sugira o encaminhamento mais adequado, indicando setor, servidor e justificativa.",
          extract_info: "Você é um extrator de informações. Extraia as informações relevantes do texto fornecido (nome, CPF/CNPJ, endereço, assunto, datas, valores) e apresente de forma estruturada.",
        };

        const systemPrompt = systemPrompts[input.action] ?? systemPrompts.suggest_response;

        let response: string;
        try {
          // Use built-in LLM if no provider specified, otherwise use provider's key
          if (!input.providerId) {
            const llmResponse = await invokeLLM({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: input.context },
              ],
            });
            const rawContent = llmResponse.choices?.[0]?.message?.content;
            response = typeof rawContent === "string" ? rawContent : (rawContent ? JSON.stringify(rawContent) : "Não foi possível gerar sugestão.");
          } else {
            const provider = await getAiProviderById(input.providerId);
            if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provedor de IA não encontrado" });
            const apiKey = decryptApiKey(provider.encryptedApiKey);

            if (provider.provider === "openai") {
              const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({
                  model: provider.model ?? "gpt-4o-mini",
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: input.context },
                  ],
                }),
              });
              const data = await res.json() as any;
              response = data.choices?.[0]?.message?.content ?? "Erro na resposta da IA.";
            } else if (provider.provider === "gemini") {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model ?? "gemini-1.5-flash"}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: `${systemPrompt}\n\n${input.context}` }] }],
                }),
              });
              const data = await res.json() as any;
              response = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Erro na resposta da IA.";
            } else {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Provedor não suportado ainda." });
            }
          }
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao chamar IA: " + err.message });
        }

        // Log AI usage
        await createAiUsageLog({
          providerId: input.providerId ?? 0,
          userId: ctx.user.id,
          nup: input.nup,
          entityType: input.entityType,
          entityId: input.entityId,
          prompt: input.context,
          response,
          action: input.action,
          tokensUsed: null,
        });

        await logAudit({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          nup: input.nup,
          action: `ai_assist_${input.action}`,
          entity: input.entityType ?? "ai",
          entityId: input.entityId,
          aiAssisted: true,
        });

        return { suggestion: response, aiAssisted: true };
      }),

    usageLogs: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(({ ctx, input }) => getAiUsageLogs(ctx.user.id, input?.limit ?? 50)),
  }),

  // ── Public NUP Lookup (sem autenticação) ───────────────────────────────────
  public: router({
    lookupNup: publicProcedure
      .input(z.object({ nup: z.string().min(1) }))
      .query(async ({ input }) => {
        const result = await publicLookupByNup(input.nup);
        if (!result) return null;
        if (result.data.isConfidential) {
          return {
            entity: result.entity,
            data: {
              nup: result.data.nup,
              status: result.data.status,
              createdAt: result.data.createdAt,
              updatedAt: result.data.updatedAt,
              isConfidential: true,
              subject: "REGISTRO SIGILOSO",
              title: "REGISTRO SIGILOSO",
              type: result.data.type,
            },
          };
        }
        return result;
      }),

    lookupByCpfCnpj: publicProcedure
      .input(z.object({ cpfCnpj: z.string().min(3) }))
      .query(async ({ input }) => {
        const results = await publicLookupByCpfCnpj(input.cpfCnpj);
        return results.map((r) => ({
          entity: r.entity,
          data: r.data.isConfidential
            ? { ...r.data, subject: "REGISTRO SIGILOSO" }
            : r.data,
        }));
      }),

    getTramitations: publicProcedure
      .input(z.object({ nup: z.string().min(1) }))
      .query(async ({ input }) => {
        return getPublicTramitationsByNup(input.nup);
      }),
  }),
});
