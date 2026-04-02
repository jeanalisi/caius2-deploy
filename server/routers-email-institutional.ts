/**
 * routers-email-institutional.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Router tRPC do Módulo de E-mail Institucional
 *
 * Submódulos expostos:
 *  - mailboxes: CRUD de caixas postais, teste de conexão, sync manual
 *  - messages: listagem, leitura, classificação, atribuição, arquivamento
 *  - compose: composição e envio de e-mails (via fila)
 *  - threads: visualização de threads completas
 *  - rules: CRUD de regras de roteamento
 *  - queue: monitoramento da fila de envio
 *  - audit: trilha de auditoria
 *  - logs: logs técnicos de sincronização
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  emailMailboxes,
  emailMessages,
  emailAttachments,
  emailNupLinks,
  emailRoutingRules,
  emailSendQueue,
  emailSyncLogs,
  emailAuditTrail,
  sectors,
  users,
} from "../drizzle/schema";
import {
  syncMailbox,
  queueEmail,
  scheduleMailboxSync,
  stopMailboxSync,
  getMailboxes,
  getMailboxById,
  getEmailMessages,
  getEmailThread,
  getRoutingRules,
  getSyncLogs,
  getAuditTrail,
  addEmailAudit,
} from "./email-institutional";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  return db;
}

function getIp(ctx: any): string {
  return ctx?.req?.headers?.["x-forwarded-for"] ?? ctx?.req?.socket?.remoteAddress ?? "";
}

// ─── Schemas de validação ─────────────────────────────────────────────────────

const MailboxCreateSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().email().max(320),
  displayName: z.string().max(255).optional(),
  description: z.string().optional(),
  sectorId: z.number().int().optional(),
  imapHost: z.string().min(1).max(255),
  imapPort: z.number().int().min(1).max(65535).default(993),
  imapUser: z.string().min(1).max(320),
  imapPassword: z.string().min(1),
  imapSecure: z.boolean().default(true),
  imapMailbox: z.string().default("INBOX"),
  smtpHost: z.string().min(1).max(255),
  smtpPort: z.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().min(1).max(320),
  smtpPassword: z.string().min(1),
  smtpSecure: z.boolean().default(false),
  syncIntervalMinutes: z.number().int().min(1).max(1440).default(5),
  autoReplyEnabled: z.boolean().default(true),
  autoReplyTemplate: z.string().optional(),
  signature: z.string().optional(),
});

const RoutingConditionSchema = z.object({
  field: z.enum(["subject", "from", "to", "body", "has_attachment"]),
  operator: z.enum(["contains", "equals", "starts_with", "ends_with", "regex", "is_true"]),
  value: z.string(),
});

const RoutingActionSchema = z.object({
  action: z.enum(["set_sector", "set_agent", "set_priority", "add_tag", "auto_reply", "archive", "mark_spam", "create_protocol"]),
  value: z.string().optional(),
});

const RoutingRuleSchema = z.object({
  mailboxId: z.number().int().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(1).max(9999).default(100),
  conditions: z.array(RoutingConditionSchema),
  conditionLogic: z.enum(["and", "or"]).default("and"),
  actions: z.array(RoutingActionSchema),
});

// ─── Router Principal ─────────────────────────────────────────────────────────

export const emailInstitutionalRouter = router({

  // ─── Caixas Postais ─────────────────────────────────────────────────────────

  mailboxes: router({

    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const mailboxes = await db.select({
        id: emailMailboxes.id,
        name: emailMailboxes.name,
        address: emailMailboxes.address,
        displayName: emailMailboxes.displayName,
        description: emailMailboxes.description,
        sectorId: emailMailboxes.sectorId,
        status: emailMailboxes.status,
        lastSyncAt: emailMailboxes.lastSyncAt,
        lastSyncError: emailMailboxes.lastSyncError,
        syncIntervalMinutes: emailMailboxes.syncIntervalMinutes,
        autoReplyEnabled: emailMailboxes.autoReplyEnabled,
        isActive: emailMailboxes.isActive,
        createdAt: emailMailboxes.createdAt,
      }).from(emailMailboxes).orderBy(emailMailboxes.name);
      return mailboxes;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const result = await db.select().from(emailMailboxes)
          .where(eq(emailMailboxes.id, input.id)).limit(1);
        if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Caixa postal não encontrada" });
        // Ocultar senha
        const { imapPassword, smtpPassword, ...safe } = result[0];
        return { ...safe, imapPassword: "••••••••", smtpPassword: "••••••••" };
      }),

    create: protectedProcedure
      .input(MailboxCreateSchema)
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const userId = (ctx as any).user?.id;

        // Verificar endereço único
        const existing = await db.select({ id: emailMailboxes.id })
          .from(emailMailboxes)
          .where(eq(emailMailboxes.address, input.address.toLowerCase()))
          .limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Já existe uma caixa postal com este endereço" });
        }

        const result = await db.insert(emailMailboxes).values({
          ...input,
          address: input.address.toLowerCase(),
          status: "inactive",
          lastUid: 0,
          createdById: userId,
        });
        const id = Number((result[0] as any).insertId);

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "mailbox_created",
          entityType: "mailbox",
          entityId: id,
          mailboxId: id,
          description: `Caixa postal "${input.name}" (${input.address}) criada`,
        });

        // Iniciar polling para a nova caixa
        const mailbox = await getMailboxById(id);
        if (mailbox) scheduleMailboxSync(mailbox);

        return { id };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int() }).merge(MailboxCreateSchema.partial()))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const { id, ...data } = input;
        const userId = (ctx as any).user?.id;

        // Não atualizar senha se for placeholder
        if (data.imapPassword === "••••••••") delete data.imapPassword;
        if (data.smtpPassword === "••••••••") delete data.smtpPassword;

        await db.update(emailMailboxes).set(data).where(eq(emailMailboxes.id, id));

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "mailbox_updated",
          entityType: "mailbox",
          entityId: id,
          mailboxId: id,
          description: `Caixa postal #${id} atualizada`,
        });

        // Reiniciar polling com novo intervalo
        const mailbox = await getMailboxById(id);
        if (mailbox) {
          stopMailboxSync(id);
          if (mailbox.isActive) scheduleMailboxSync(mailbox);
        }

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const userId = (ctx as any).user?.id;

        stopMailboxSync(input.id);
        await db.update(emailMailboxes)
          .set({ isActive: false, status: "inactive" })
          .where(eq(emailMailboxes.id, input.id));

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "mailbox_deleted",
          entityType: "mailbox",
          entityId: input.id,
          mailboxId: input.id,
          description: `Caixa postal #${input.id} desativada`,
        });

        return { success: true };
      }),

    testConnection: protectedProcedure
      .input(z.object({
        imapHost: z.string(),
        imapPort: z.number().int(),
        imapUser: z.string(),
        imapPassword: z.string(),
        imapSecure: z.boolean(),
        smtpHost: z.string(),
        smtpPort: z.number().int(),
        smtpUser: z.string(),
        smtpPassword: z.string(),
        smtpSecure: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const results = { imap: false, smtp: false, imapError: "", smtpError: "" };

        // Testar IMAP
        try {
          const Imap = require("imap");
          await new Promise<void>((resolve, reject) => {
            const imap = new Imap({
              user: input.imapUser,
              password: input.imapPassword,
              host: input.imapHost,
              port: input.imapPort,
              tls: input.imapSecure,
              tlsOptions: { rejectUnauthorized: false },
              connTimeout: 15000,
              authTimeout: 10000,
            });
            imap.once("ready", () => { imap.end(); resolve(); });
            imap.once("error", (err: any) => reject(err));
            imap.connect();
          });
          results.imap = true;
        } catch (err: any) {
          results.imapError = err?.message ?? String(err);
        }

        // Testar SMTP
        try {
          const nodemailer = require("nodemailer");
          const transporter = nodemailer.createTransport({
            host: input.smtpHost,
            port: input.smtpPort,
            secure: input.smtpSecure,
            auth: { user: input.smtpUser, pass: input.smtpPassword },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 15000,
          });
          await transporter.verify();
          results.smtp = true;
        } catch (err: any) {
          results.smtpError = err?.message ?? String(err);
        }

        return results;
      }),

    syncNow: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        const mailbox = await getMailboxById(input.id);
        if (!mailbox) throw new TRPCError({ code: "NOT_FOUND", message: "Caixa postal não encontrada" });

        // Sync assíncrono (não bloqueia a resposta)
        syncMailbox(mailbox).catch(err => console.error("[EmailInst] Sync manual falhou:", err));

        return { started: true };
      }),

    stats: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const [total, unread, pending, sent] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(emailMessages).where(eq(emailMessages.mailboxId, input.id)),
          db.select({ count: sql<number>`count(*)` }).from(emailMessages).where(and(eq(emailMessages.mailboxId, input.id), eq(emailMessages.isRead, false), eq(emailMessages.direction, "inbound"))),
          db.select({ count: sql<number>`count(*)` }).from(emailMessages).where(and(eq(emailMessages.mailboxId, input.id), eq(emailMessages.status, "received"))),
          db.select({ count: sql<number>`count(*)` }).from(emailMessages).where(and(eq(emailMessages.mailboxId, input.id), eq(emailMessages.direction, "outbound"))),
        ]);
        return {
          total: Number(total[0]?.count ?? 0),
          unread: Number(unread[0]?.count ?? 0),
          pending: Number(pending[0]?.count ?? 0),
          sent: Number(sent[0]?.count ?? 0),
        };
      }),
  }),

  // ─── Mensagens ──────────────────────────────────────────────────────────────

  messages: router({

    list: protectedProcedure
      .input(z.object({
        mailboxId: z.number().int().optional(),
        status: z.string().optional(),
        direction: z.enum(["inbound", "outbound"]).optional(),
        sectorId: z.number().int().optional(),
        nup: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }))
      .query(async ({ input }) => {
        return getEmailMessages(input);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ input, ctx }) => {
        const db = await requireDb();
        const result = await db.select().from(emailMessages)
          .where(eq(emailMessages.id, input.id)).limit(1);
        if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem não encontrada" });

        // Buscar anexos
        const attachments = await db.select().from(emailAttachments)
          .where(eq(emailAttachments.emailMessageId, input.id));

        // Buscar vínculos NUP
        const nupLinks = await db.select().from(emailNupLinks)
          .where(eq(emailNupLinks.emailMessageId, input.id));

        // Marcar como lida
        if (!result[0].isRead) {
          await db.update(emailMessages)
            .set({ isRead: true })
            .where(eq(emailMessages.id, input.id));

          await addEmailAudit({
            userId: (ctx as any).user?.id,
            userName: (ctx as any).user?.name,
            userIp: getIp(ctx),
            action: "message_read",
            entityType: "message",
            entityId: input.id,
            mailboxId: result[0].mailboxId,
            emailMessageId: input.id,
            nup: result[0].nup ?? undefined,
            description: `Mensagem #${input.id} marcada como lida`,
          });
        }

        return { ...result[0], attachments, nupLinks };
      }),

    thread: protectedProcedure
      .input(z.object({ threadId: z.string() }))
      .query(async ({ input }) => {
        return getEmailThread(input.threadId);
      }),

    markRead: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int()), isRead: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        for (const id of input.ids) {
          await db.update(emailMessages).set({ isRead: input.isRead }).where(eq(emailMessages.id, id));
        }
        return { updated: input.ids.length };
      }),

    markStarred: protectedProcedure
      .input(z.object({ id: z.number().int(), isStarred: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db.update(emailMessages).set({ isStarred: input.isStarred }).where(eq(emailMessages.id, input.id));
        return { success: true };
      }),

    classify: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        status: z.enum(["received", "triaged", "in_progress", "replied", "archived", "spam"]).optional(),
        sectorId: z.number().int().optional(),
        assignedUserId: z.number().int().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const { id, ...updates } = input;
        const userId = (ctx as any).user?.id;

        const prev = await db.select().from(emailMessages).where(eq(emailMessages.id, id)).limit(1);
        if (!prev[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem não encontrada" });

        const updateData: any = {};
        if (updates.status) updateData.status = updates.status;
        if (updates.sectorId !== undefined) updateData.sectorId = updates.sectorId;
        if (updates.assignedUserId !== undefined) updateData.assignedUserId = updates.assignedUserId;
        if (updates.priority) updateData.priority = updates.priority;
        if (updates.tags) updateData.tags = JSON.stringify(updates.tags);

        await db.update(emailMessages).set(updateData).where(eq(emailMessages.id, id));

        const action = updates.status === "spam" ? "message_spam"
          : updates.status === "archived" ? "message_archived"
          : updates.assignedUserId ? "message_assigned"
          : "message_assigned";

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: action as any,
          entityType: "message",
          entityId: id,
          mailboxId: prev[0].mailboxId,
          emailMessageId: id,
          nup: prev[0].nup ?? undefined,
          previousValue: { status: prev[0].status, sectorId: prev[0].sectorId },
          newValue: updateData,
          description: `Mensagem #${id} classificada`,
        });

        return { success: true };
      }),

    linkNup: protectedProcedure
      .input(z.object({
        emailMessageId: z.number().int(),
        nup: z.string(),
        entityType: z.enum(["protocol", "process", "ombudsman", "conversation", "document"]),
        entityId: z.number().int(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const userId = (ctx as any).user?.id;

        await db.insert(emailNupLinks).values({
          emailMessageId: input.emailMessageId,
          nup: input.nup,
          entityType: input.entityType,
          entityId: input.entityId,
          linkMethod: "manual",
          linkedById: userId,
        });

        // Atualizar NUP principal da mensagem
        await db.update(emailMessages)
          .set({ nup: input.nup })
          .where(eq(emailMessages.id, input.emailMessageId));

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "nup_linked",
          entityType: "message",
          entityId: input.emailMessageId,
          emailMessageId: input.emailMessageId,
          nup: input.nup,
          description: `Mensagem #${input.emailMessageId} vinculada manualmente ao NUP ${input.nup}`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const userId = (ctx as any).user?.id;
        const msg = await db.select({ mailboxId: emailMessages.mailboxId, nup: emailMessages.nup })
          .from(emailMessages).where(eq(emailMessages.id, input.id)).limit(1);

        await db.update(emailMessages)
          .set({ status: "archived" })
          .where(eq(emailMessages.id, input.id));

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "message_deleted",
          entityType: "message",
          entityId: input.id,
          mailboxId: msg[0]?.mailboxId,
          emailMessageId: input.id,
          nup: msg[0]?.nup ?? undefined,
          description: `Mensagem #${input.id} arquivada`,
        });

        return { success: true };
      }),
  }),

  // ─── Composição e Envio ─────────────────────────────────────────────────────

  compose: router({

    send: protectedProcedure
      .input(z.object({
        mailboxId: z.number().int(),
        to: z.array(z.object({ address: z.string().email(), name: z.string().optional() })).min(1),
        cc: z.array(z.object({ address: z.string().email(), name: z.string().optional() })).optional(),
        bcc: z.array(z.object({ address: z.string().email(), name: z.string().optional() })).optional(),
        replyTo: z.string().email().optional(),
        subject: z.string().min(1).max(998),
        bodyText: z.string().optional(),
        bodyHtml: z.string().optional(),
        inReplyTo: z.string().optional(),
        references: z.string().optional(),
        nup: z.string().optional(),
        scheduledAt: z.string().datetime().optional(),
        emailMessageId: z.number().int().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = (ctx as any).user?.id;

        const queueId = await queueEmail({
          mailboxId: input.mailboxId,
          toAddresses: JSON.stringify(input.to),
          ccAddresses: input.cc ? JSON.stringify(input.cc) : undefined,
          bccAddresses: input.bcc ? JSON.stringify(input.bcc) : undefined,
          replyTo: input.replyTo,
          subject: input.subject,
          bodyText: input.bodyText,
          bodyHtml: input.bodyHtml,
          inReplyTo: input.inReplyTo,
          references: input.references,
          nup: input.nup,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          createdById: userId,
          emailMessageId: input.emailMessageId,
        });

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "message_replied",
          entityType: "queue",
          entityId: queueId,
          mailboxId: input.mailboxId,
          nup: input.nup,
          description: `E-mail enfileirado para ${input.to.map(t => t.address).join(", ")}: "${input.subject}"`,
        });

        return { queueId };
      }),

    reply: protectedProcedure
      .input(z.object({
        emailMessageId: z.number().int(),
        bodyText: z.string().optional(),
        bodyHtml: z.string().optional(),
        replyAll: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const userId = (ctx as any).user?.id;

        const msg = await db.select().from(emailMessages)
          .where(eq(emailMessages.id, input.emailMessageId)).limit(1);
        if (!msg[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem não encontrada" });

        const original = msg[0];
        const toAddresses = [{ address: original.fromAddress, name: original.fromName ?? undefined }];

        // Incluir NUP no assunto se existir
        const subject = original.nup
          ? `Re: ${original.subject.replace(/^Re:\s*/i, "")} [${original.nup}]`
          : `Re: ${original.subject.replace(/^Re:\s*/i, "")}`;

        // Construir References
        const refs = [
          ...(original.references?.split(/\s+/) ?? []),
          original.messageId,
        ].filter(Boolean).join(" ");

        const queueId = await queueEmail({
          mailboxId: original.mailboxId,
          toAddresses: JSON.stringify(toAddresses),
          subject,
          bodyText: input.bodyText,
          bodyHtml: input.bodyHtml,
          inReplyTo: original.messageId ?? undefined,
          references: refs || undefined,
          nup: original.nup ?? undefined,
          createdById: userId,
          emailMessageId: input.emailMessageId,
        });

        // Atualizar status da mensagem original
        await db.update(emailMessages)
          .set({ status: "replied" })
          .where(eq(emailMessages.id, input.emailMessageId));

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "message_replied",
          entityType: "message",
          entityId: input.emailMessageId,
          mailboxId: original.mailboxId,
          emailMessageId: input.emailMessageId,
          nup: original.nup ?? undefined,
          description: `Resposta enviada para ${original.fromAddress}`,
        });

        return { queueId };
      }),

    forward: protectedProcedure
      .input(z.object({
        emailMessageId: z.number().int(),
        to: z.array(z.object({ address: z.string().email(), name: z.string().optional() })).min(1),
        note: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const userId = (ctx as any).user?.id;

        const msg = await db.select().from(emailMessages)
          .where(eq(emailMessages.id, input.emailMessageId)).limit(1);
        if (!msg[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem não encontrada" });

        const original = msg[0];
        const fwdSubject = `Fwd: ${original.subject.replace(/^Fwd:\s*/i, "")}`;
        const fwdBody = `${input.note ? input.note + "\n\n" : ""}--- Mensagem encaminhada ---\nDe: ${original.fromAddress}\nAssunto: ${original.subject}\n\n${original.bodyText ?? ""}`;

        const queueId = await queueEmail({
          mailboxId: original.mailboxId,
          toAddresses: JSON.stringify(input.to),
          subject: fwdSubject,
          bodyText: fwdBody,
          nup: original.nup ?? undefined,
          createdById: userId,
        });

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "message_forwarded",
          entityType: "message",
          entityId: input.emailMessageId,
          mailboxId: original.mailboxId,
          emailMessageId: input.emailMessageId,
          nup: original.nup ?? undefined,
          description: `Mensagem encaminhada para ${input.to.map(t => t.address).join(", ")}`,
        });

        return { queueId };
      }),
  }),

  // ─── Regras de Roteamento ───────────────────────────────────────────────────

  rules: router({

    list: protectedProcedure
      .input(z.object({ mailboxId: z.number().int().optional() }))
      .query(async ({ input }) => {
        return getRoutingRules(input.mailboxId);
      }),

    create: protectedProcedure
      .input(RoutingRuleSchema)
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const userId = (ctx as any).user?.id;

        const result = await db.insert(emailRoutingRules).values({
          ...input,
          conditions: input.conditions,
          actions: input.actions,
          matchCount: 0,
          createdById: userId,
        });
        const id = Number((result[0] as any).insertId);

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "rule_created",
          entityType: "rule",
          entityId: id,
          mailboxId: input.mailboxId,
          description: `Regra de roteamento "${input.name}" criada`,
        });

        return { id };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int() }).merge(RoutingRuleSchema.partial()))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const { id, ...data } = input;
        const userId = (ctx as any).user?.id;

        await db.update(emailRoutingRules).set(data).where(eq(emailRoutingRules.id, id));

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "rule_updated",
          entityType: "rule",
          entityId: id,
          description: `Regra de roteamento #${id} atualizada`,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const userId = (ctx as any).user?.id;

        await db.update(emailRoutingRules)
          .set({ isActive: false })
          .where(eq(emailRoutingRules.id, input.id));

        await addEmailAudit({
          userId,
          userName: (ctx as any).user?.name,
          userIp: getIp(ctx),
          action: "rule_deleted",
          entityType: "rule",
          entityId: input.id,
          description: `Regra de roteamento #${input.id} desativada`,
        });

        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.array(z.object({ id: z.number().int(), priority: z.number().int() })))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        for (const item of input) {
          await db.update(emailRoutingRules)
            .set({ priority: item.priority })
            .where(eq(emailRoutingRules.id, item.id));
        }
        return { success: true };
      }),
  }),

  // ─── Fila de Envio ──────────────────────────────────────────────────────────

  queue: router({

    list: protectedProcedure
      .input(z.object({
        mailboxId: z.number().int().optional(),
        status: z.enum(["pending", "processing", "sent", "failed", "cancelled"]).optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const conditions = [];
        if (input.mailboxId) conditions.push(eq(emailSendQueue.mailboxId, input.mailboxId));
        if (input.status) conditions.push(eq(emailSendQueue.status, input.status));

        const [items, countResult] = await Promise.all([
          db.select().from(emailSendQueue)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(emailSendQueue.createdAt))
            .limit(input.limit)
            .offset(input.offset),
          db.select({ count: sql<number>`count(*)` }).from(emailSendQueue)
            .where(conditions.length > 0 ? and(...conditions) : undefined),
        ]);

        return { items, total: Number(countResult[0]?.count ?? 0) };
      }),

    retry: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        await db.update(emailSendQueue)
          .set({ status: "pending", attempts: 0, nextAttemptAt: new Date(), errorMessage: null })
          .where(eq(emailSendQueue.id, input.id));

        await addEmailAudit({
          userId: (ctx as any).user?.id,
          action: "queue_retried",
          entityType: "queue",
          entityId: input.id,
          description: `Item #${input.id} da fila reenfileirado manualmente`,
        });

        return { success: true };
      }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db.update(emailSendQueue)
          .set({ status: "cancelled" })
          .where(eq(emailSendQueue.id, input.id));
        return { success: true };
      }),
  }),

  // ─── Logs de Sincronização ──────────────────────────────────────────────────

  logs: router({
    list: protectedProcedure
      .input(z.object({
        mailboxId: z.number().int(),
        limit: z.number().int().min(1).max(200).default(50),
      }))
      .query(async ({ input }) => {
        return getSyncLogs(input.mailboxId, input.limit);
      }),
  }),

  // ─── Auditoria ──────────────────────────────────────────────────────────────

  audit: router({
    list: protectedProcedure
      .input(z.object({
        mailboxId: z.number().int().optional(),
        emailMessageId: z.number().int().optional(),
        nup: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(100),
      }))
      .query(async ({ input }) => {
        return getAuditTrail(input);
      }),
  }),

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  dashboard: protectedProcedure.query(async () => {
    const db = await requireDb();

    const [
      totalMailboxes,
      activeMailboxes,
      totalMessages,
      unreadMessages,
      pendingQueue,
      failedQueue,
      recentMessages,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(emailMailboxes).where(eq(emailMailboxes.isActive, true)),
      db.select({ count: sql<number>`count(*)` }).from(emailMailboxes).where(eq(emailMailboxes.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(emailMessages),
      db.select({ count: sql<number>`count(*)` }).from(emailMessages).where(and(eq(emailMessages.isRead, false), eq(emailMessages.direction, "inbound"))),
      db.select({ count: sql<number>`count(*)` }).from(emailSendQueue).where(eq(emailSendQueue.status, "pending")),
      db.select({ count: sql<number>`count(*)` }).from(emailSendQueue).where(eq(emailSendQueue.status, "failed")),
      db.select({
        id: emailMessages.id,
        subject: emailMessages.subject,
        fromAddress: emailMessages.fromAddress,
        fromName: emailMessages.fromName,
        nup: emailMessages.nup,
        status: emailMessages.status,
        isRead: emailMessages.isRead,
        receivedAt: emailMessages.receivedAt,
        mailboxId: emailMessages.mailboxId,
      }).from(emailMessages)
        .where(eq(emailMessages.direction, "inbound"))
        .orderBy(desc(emailMessages.receivedAt))
        .limit(10),
    ]);

    return {
      totalMailboxes: Number(totalMailboxes[0]?.count ?? 0),
      activeMailboxes: Number(activeMailboxes[0]?.count ?? 0),
      totalMessages: Number(totalMessages[0]?.count ?? 0),
      unreadMessages: Number(unreadMessages[0]?.count ?? 0),
      pendingQueue: Number(pendingQueue[0]?.count ?? 0),
      failedQueue: Number(failedQueue[0]?.count ?? 0),
      recentMessages,
    };
  }),
});
