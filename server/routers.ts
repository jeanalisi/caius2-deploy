import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import {
  addToQueue,
  createMessage,
  updateMessageDeliveryStatus,
  createNotification,
  createTicket,
  deleteAccount,
  getAccountById,
  getAccountsByUser,
  getAllAccounts,
  getAllUsers,
  getAgents,
  getAnalytics,
  getConversationById,
  getConversationStats,
  getConversations,
  getMessagesByConversation,
  getNextQueuePosition,
  getNotificationsByUser,
  getQueue,
  getTagsByConversation,
  getTags,
  createTag,
  deleteTag,
  getTickets,
  markMessagesAsRead,
  markNotificationsAsRead,
  createAccount,
  updateAccount,
  updateConversation,
  updateQueueItem,
  updateTicket,
  updateUser,
  createConversation,
  upsertContact,
  findOrCreateContact,
  getContacts,
  getNupNotifications,
  getNupNotificationsByEntity,
} from "./db";
import { sendNupNotification } from "./nup-notification";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  onQrCode,
  onStatusChange,
  sendWhatsAppMessage,
} from "./whatsapp";
import { testImapConnection, testSmtpConnection, sendEmail, fetchEmails } from "./email";
import { getIo } from "./_core/socketio";
import { caiusRouter } from "./routers-caius";
import { customModulesRouter } from "./routers-modules";
import { verificationRouter } from "./routers-verification";
import { orgUnitsRouter, positionsRouter, userAllocationsRouter, orgInvitesRouter } from "./routers-org";
import { omnichannelRouter } from "./routers-omnichannel";
import { workflowRouter } from "./routers-workflow";
import { documentsRouter } from "./routers-documents";
import { publicServicesRouter } from "./routers-public-services";
import { chatbotRouter } from "./routers-chatbot";
import {
  serviceTypesRouter,
  serviceSubjectsRouter,
  formTemplatesRouter,
  attachmentsRouter,
  contextHelpRouter,
  onlineSessionsRouter,
  institutionalConfigRouter,
  globalSearchRouter,
  userRegistrationRouter,
  serviceTypeFieldsRouter,
  serviceTypeDocumentsRouter,
  cidadaoRouter,
} from "./routers-advanced";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  return next({ ctx });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function notifyUser(userId: number, type: any, title: string, body?: string, relatedConversationId?: number) {
  await createNotification({ userId, type, title, body, relatedConversationId });
  const io = getIo();
  if (io) io.to(`user:${userId}`).emit("notification", { type, title, body });
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Users / Agents ────────────────────────────────────────────────────────
  users: router({
    list: adminProcedure.query(() => getAllUsers()),
    agents: protectedProcedure.query(() => getAgents()),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["user", "admin"]).optional(),
        isAgent: z.boolean().optional(),
        isAvailable: z.boolean().optional(),
      }))
      .mutation(({ input: { id, ...data } }) => updateUser(id, data)),
    setAvailability: protectedProcedure
      .input(z.object({ isAvailable: z.boolean() }))
      .mutation(({ ctx, input }) => updateUser(ctx.user.id, { isAvailable: input.isAvailable })),
  }),

  // ── Accounts (WhatsApp / Instagram / Email) ───────────────────────────────
  accounts: router({
    list: protectedProcedure.query(({ ctx }) =>
      ctx.user.role === "admin" ? getAllAccounts() : getAccountsByUser(ctx.user.id)
    ),
    create: protectedProcedure
      .input(z.object({
        channel: z.enum(["whatsapp", "instagram", "email"]),
        name: z.string().min(1),
        identifier: z.string().min(1),
        imapHost: z.string().optional(),
        imapPort: z.number().optional(),
        imapUser: z.string().optional(),
        imapPassword: z.string().optional(),
        smtpHost: z.string().optional(),
        smtpPort: z.number().optional(),
        smtpUser: z.string().optional(),
        smtpPassword: z.string().optional(),
        smtpSecure: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createAccount({ ...input, userId: ctx.user.id });
        return { id };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteAccount(input.id)),

    // WhatsApp QR Code flow
    connectWhatsApp: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .mutation(async ({ input }) => {
        await connectWhatsApp(input.accountId);
        return { started: true };
      }),
    disconnectWhatsApp: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .mutation(async ({ input }) => {
        await disconnectWhatsApp(input.accountId);
        return { disconnected: true };
      }),
    getQrCode: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .query(async ({ input }) => {
        const account = await getAccountById(input.accountId);
        return { qrCode: account?.waQrCode ?? null, status: account?.status ?? "disconnected" };
      }),

    // Email test
    testEmail: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .mutation(async ({ input }) => {
        const account = await getAccountById(input.accountId);
        if (!account) throw new TRPCError({ code: "NOT_FOUND" });
        const [imap, smtp] = await Promise.all([
          testImapConnection(account),
          testSmtpConnection(account),
        ]);
        if (imap.ok && smtp.ok) await updateAccount(input.accountId, { status: "connected" });
        else await updateAccount(input.accountId, { status: "error" });
        return {
          imap: imap.ok,
          smtp: smtp.ok,
          imapError: imap.error,
          smtpError: smtp.error,
        };
      }),
    fetchEmails: protectedProcedure
      .input(z.object({ accountId: z.number() }))
      .mutation(async ({ input }) => {
        const account = await getAccountById(input.accountId);
        if (!account) throw new TRPCError({ code: "NOT_FOUND" });
        await fetchEmails(account);
        return { fetched: true };
      }),
  }),

  // ── Conversations ─────────────────────────────────────────────────────────
  conversations: router({
    list: protectedProcedure
      .input(z.object({
        channel: z.enum(["whatsapp", "instagram", "email"]).optional(),
        status: z.enum(["open", "pending", "resolved", "snoozed"]).optional(),
        assignedAgentId: z.number().optional(),
        search: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional())
      .query(({ input }) => getConversations(input)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getConversationById(input.id)),
    stats: protectedProcedure.query(() => getConversationStats()),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "pending", "resolved", "snoozed"]).optional(),
        assignedAgentId: z.number().nullable().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      }))
      .mutation(async ({ input: { id, ...data }, ctx }) => {
        await updateConversation(id, data as any);
        if (data.assignedAgentId) {
          await notifyUser(
            data.assignedAgentId,
            "ticket_assigned",
            "Nova conversa atribuída",
            `Conversa #${id} foi atribuída a você`,
            id
          );
        }
        return { updated: true };
      }),
    create: protectedProcedure
      .input(z.object({
        accountId: z.number(),
        channel: z.enum(["whatsapp", "instagram", "email"]),
        // Identificadores principais (ao menos um obrigatório)
        contactId: z.number().optional(),      // se já existe o contato
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        contactIgHandle: z.string().optional(),
        // Complementares
        contactName: z.string().optional(),
        contactCpfCnpj: z.string().optional(),
        subject: z.string().optional(),
      }).refine(
        (d) => !!(d.contactId || d.contactEmail || d.contactPhone || d.contactIgHandle),
        { message: "Ao menos um identificador de contato é obrigatório: e-mail, telefone ou Instagram." }
      ))
      .mutation(async ({ input }) => {
        let resolvedContactId = input.contactId;
        if (!resolvedContactId) {
          const contact = await findOrCreateContact({
            email: input.contactEmail,
            phone: input.contactPhone,
            igHandle: input.contactIgHandle,
            cpfCnpj: input.contactCpfCnpj,
            name: input.contactName,
          });
          resolvedContactId = contact.id;
        }
        const id = await createConversation({
          accountId: input.accountId,
          contactId: resolvedContactId,
          channel: input.channel,
          subject: input.subject,
          status: "open",
        });
        return { id };
      }),
    tags: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(({ input }) => getTagsByConversation(input.conversationId)),
  }),

  // ── Messages ──────────────────────────────────────────────────────────────
  messages: router({
    list: protectedProcedure
      .input(z.object({ conversationId: z.number(), limit: z.number().default(50), offset: z.number().default(0) }))
      .query(({ input }) => getMessagesByConversation(input.conversationId, input.limit, input.offset)),
    send: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        content: z.string().min(1),
        type: z.enum(["text", "image", "audio", "video", "document"]).default("text"),
      }))
      .mutation(async ({ input, ctx }) => {
        const conv = await getConversationById(input.conversationId);
        if (!conv) throw new TRPCError({ code: "NOT_FOUND" });

        const msgId = await createMessage({
          conversationId: input.conversationId,
          direction: "outbound",
          type: input.type,
          content: input.content,
          senderAgentId: ctx.user.id,
          senderName: ctx.user.name ?? "Agent",
          deliveryStatus: "pending",
        });
        // Send via channel
        let sendError: string | undefined;
        if (conv.conversation.channel === "whatsapp" && conv.conversation.externalId) {
          try {
            const sent = await sendWhatsAppMessage(
              conv.conversation.accountId,
              conv.conversation.externalId,
              input.content
            );
            // Salvar o externalId da mensagem enviada para possibilitar retry de descriptografia
            const db = await import("./db").then(m => m.getDb());
            if (db && sent?.key?.id) {
              const { messages: messagesTable } = await import("../drizzle/schema");
              const { eq: eqFn } = await import("drizzle-orm");
              await db.update(messagesTable).set({ externalId: sent.key.id }).where(eqFn(messagesTable.id, msgId));
            }
            await updateMessageDeliveryStatus(msgId, "sent");
          } catch (e) {
            sendError = String(e);
            console.error("[WhatsApp] Send error:", e);
            await updateMessageDeliveryStatus(msgId, "failed", sendError);
          }
        } else if (conv.conversation.channel === "email" && conv.contact?.email) {
          const account = await import("./db").then(m => m.getAccountById(conv.conversation.accountId));
          if (account) {
            try {
              await sendEmail(account, conv.contact.email, conv.conversation.subject ?? "Re:", input.content);
              await updateMessageDeliveryStatus(msgId, "sent");
            } catch (e) {
              sendError = String(e);
              console.error("[Email] Send error:", e);
              await updateMessageDeliveryStatus(msgId, "failed", sendError);
            }
          } else {
            sendError = "Conta de e-mail não encontrada";
            await updateMessageDeliveryStatus(msgId, "failed", sendError);
          }
        } else {
          // Canal sem conector ativo — marcar como enviado (mensagem interna)
          await updateMessageDeliveryStatus(msgId, "sent");
        }

        await updateConversation(input.conversationId, { lastMessageAt: new Date() });

        const io = getIo();
        if (io) io.to(`conv:${input.conversationId}`).emit("new_message", { msgId });

        return { msgId };
      }),
    markRead: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(({ input }) => markMessagesAsRead(input.conversationId)),
  }),

  // ── Tickets ───────────────────────────────────────────────────────────────
  tickets: router({
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
        assignedAgentId: z.number().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      }).optional())
      .query(({ input }) => getTickets(input)),
    create: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        assignedAgentId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await createTicket({ ...input, createdById: ctx.user.id });
        if (input.assignedAgentId) {
          await notifyUser(
            input.assignedAgentId,
            "ticket_assigned",
            `Ticket atribuído: ${input.title}`,
            input.description,
            input.conversationId
          );
        }
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
        assignedAgentId: z.number().nullable().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        resolvedAt: z.date().optional(),
      }))
      .mutation(async ({ input: { id, ...data } }) => {
        await updateTicket(id, data as any);
        return { updated: true };
      }),
  }),

  // ── Queue ─────────────────────────────────────────────────────────────────
  queue: router({
    list: protectedProcedure.query(() => getQueue()),
    add: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input }) => {
        const position = await getNextQueuePosition();
        const id = await addToQueue({ conversationId: input.conversationId, position });
        return { id, position };
      }),
    assign: protectedProcedure
      .input(z.object({ queueId: z.number(), agentId: z.number() }))
      .mutation(async ({ input }) => {
        await updateQueueItem(input.queueId, {
          assignedAgentId: input.agentId,
          status: "assigned",
          assignedAt: new Date(),
        });
        await notifyUser(input.agentId, "queue_assigned", "Atendimento atribuído da fila");
        return { assigned: true };
      }),
    autoAssign: protectedProcedure.mutation(async () => {
      const queueItems = await getQueue();
      const agents = await getAgents();
      const availableAgents = agents.filter((a) => a.isAvailable);
      let assigned = 0;
      for (const item of queueItems) {
        if (availableAgents.length === 0) break;
        const agent = availableAgents[assigned % availableAgents.length];
        await updateQueueItem(item.queue.id, {
          assignedAgentId: agent.id,
          status: "assigned",
          assignedAt: new Date(),
        });
        await updateConversation(item.queue.conversationId, { assignedAgentId: agent.id });
        await notifyUser(agent.id, "queue_assigned", "Atendimento atribuído automaticamente");
        assigned++;
      }
      return { assigned };
    }),
  }),

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(30) }).optional())
      .query(({ ctx, input }) => getNotificationsByUser(ctx.user.id, input?.limit)),
    markRead: protectedProcedure.mutation(({ ctx }) => markNotificationsAsRead(ctx.user.id)),
  }),

  // ── Tags ──────────────────────────────────────────────────────────────────
  tags: router({
    list: protectedProcedure.query(() => getTags()),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), color: z.string().default('#6366f1') }))
      .mutation(({ input }) => createTag(input.name, input.color)),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteTag(input.id)),
  }),

  // ── CAIUS Modules ──────────────────────────────────────────────────────────
  caius: caiusRouter,
  customModules: customModulesRouter,
  verification: verificationRouter,
  // ── Advanced Modules ──────────────────────────────────────────────────────
  serviceTypes: serviceTypesRouter,
  serviceSubjects: serviceSubjectsRouter,
  formTemplates: formTemplatesRouter,
  attachments: attachmentsRouter,
  contextHelp: contextHelpRouter,
  onlineSessions: onlineSessionsRouter,
  institutionalConfig: institutionalConfigRouter,
  globalSearch: globalSearchRouter,
   userRegistration: userRegistrationRouter,
  serviceTypeFields: serviceTypeFieldsRouter,
  serviceTypeDocuments: serviceTypeDocumentsRouter,
  cidadao: cidadaoRouter,
  // ── Org Structure ──────────────────────────────────────────────────────────
  orgUnits: orgUnitsRouter,
  positions: positionsRouter,
  userAllocations: userAllocationsRouter,
  orgInvites: orgInvitesRouter,
  // ── Omnichannel ───────────────────────────────────────────────────────────
  omnichannel: omnichannelRouter,
  workflow: workflowRouter,
  docs: documentsRouter,
  publicServices: publicServicesRouter,
  chatbot: chatbotRouter,
  // ── Analytics ─────────────────────────────────────────────────────────────
   analytics: router({
    overview: protectedProcedure
      .input(z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }).optional())
      .query(({ input }) => getAnalytics(input?.dateFrom, input?.dateTo)),
    stats: protectedProcedure.query(() => getConversationStats()),
  }),

  // ── Contacts ──────────────────────────────────────────────────────────────
  contacts: router({
    // Busca ou cria contato — exige ao menos um identificador principal
    findOrCreate: protectedProcedure
      .input(z.object({
        email: z.string().email().optional(),
        phone: z.string().min(8).max(20).optional(),
        igHandle: z.string().min(1).max(128).optional(),
        cpfCnpj: z.string().optional(),
        name: z.string().optional(),
      }).refine(
        (d) => !!(d.email || d.phone || d.igHandle),
        { message: "Ao menos um identificador principal é obrigatório: e-mail, telefone ou conta do Instagram." }
      ))
      .mutation(async ({ input }) => {
        return findOrCreateContact(input);
      }),
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return getContacts(input?.search);
      }),
  }),
  // ── NUP Notifications ──────────────────────────────────────────────────────
  nup: router({
    // Envia notificação automática ao gerar NUP
    sendNotification: protectedProcedure
      .input(z.object({
        nup: z.string(),
        entityType: z.enum(["protocol", "conversation", "ombudsman", "process"]),
        entityId: z.number(),
        contactId: z.number().optional(),
        channel: z.enum(["email", "whatsapp", "instagram", "sms", "system"]),
        recipientAddress: z.string().optional(),
        subject: z.string().optional(),
        serviceTypeName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return sendNupNotification(input);
      }),
    // Busca notificações por NUP
    getByNup: protectedProcedure
      .input(z.object({ nup: z.string() }))
      .query(async ({ input }) => {
        return getNupNotifications(input.nup);
      }),
    // Busca notificações por entidade
    getByEntity: protectedProcedure
      .input(z.object({
        entityType: z.enum(["protocol", "conversation", "ombudsman", "process"]),
        entityId: z.number(),
      }))
      .query(async ({ input }) => {
        return getNupNotificationsByEntity(input.entityType, input.entityId);
      }),
  }),
  voice: router({
    // Upload audio and transcribe via Whisper API
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language ?? "pt",
        });
        if ("error" in result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error ?? "Falha na transcrição de áudio",
          });
        }
        return { text: result.text, language: result.language ?? "pt" };
      }),

    // Upload audio file (base64) to S3 and return URL for transcription
    uploadAudio: protectedProcedure
      .input(z.object({
        base64: z.string(),
        mimeType: z.enum(["audio/webm", "audio/mp3", "audio/wav", "audio/ogg", "audio/m4a"]),
        filename: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ext = input.mimeType.split("/")[1] ?? "webm";
        const key = `voice/${ctx.user.id}/${Date.now()}.${ext}`;
        const buffer = Buffer.from(input.base64, "base64");
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url, key };
      }),
  }),
});
export type AppRouter = typeof appRouter;
