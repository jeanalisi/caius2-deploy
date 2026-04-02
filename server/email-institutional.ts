/**
 * email-institutional.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo de E-mail Institucional do CAIUS2
 *
 * Responsabilidades:
 *  - Conector IMAP/IMAPS para captura de mensagens
 *  - Parser MIME completo (texto, HTML, anexos, inline)
 *  - Motor de vinculação automática de NUP
 *  - Motor de roteamento por regras configuráveis
 *  - Fila de envio SMTP com retry
 *  - Polling automático por caixa
 *  - Trilha de auditoria completa
 */

import * as nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail, AddressObject } from "mailparser";
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { requireDb } from "./db";
import { generateNup } from "./db-caius";
import { findOrCreateContact } from "./db";
import {
  emailMailboxes,
  emailMessages,
  emailAttachments,
  emailNupLinks,
  emailRoutingRules,
  emailSendQueue,
  emailSyncLogs,
  emailAuditTrail,
  protocols,
  conversations,
  contacts,
  sectors,
  users,
  EmailMailbox,
  InsertEmailMessage,
  InsertEmailAttachment,
  InsertEmailNupLink,
  InsertEmailSyncLog,
  InsertEmailAuditTrail,
} from "../drizzle/schema";

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

interface ParsedAddress {
  address: string;
  name?: string;
}

interface RoutingCondition {
  field: "subject" | "from" | "to" | "body" | "has_attachment";
  operator: "contains" | "equals" | "starts_with" | "ends_with" | "regex" | "is_true";
  value: string;
}

interface RoutingAction {
  action:
    | "set_sector"
    | "set_agent"
    | "set_priority"
    | "add_tag"
    | "auto_reply"
    | "archive"
    | "mark_spam"
    | "create_protocol";
  value?: string;
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function parseAddressList(obj: AddressObject | AddressObject[] | undefined): ParsedAddress[] {
  if (!obj) return [];
  const list = Array.isArray(obj) ? obj : [obj];
  const result: ParsedAddress[] = [];
  for (const item of list) {
    if (item.value) {
      for (const addr of item.value) {
        if (addr.address) {
          result.push({ address: addr.address.toLowerCase(), name: addr.name ?? undefined });
        }
      }
    }
  }
  return result;
}

function extractNupFromSubject(subject: string): string | null {
  // Padrões: PMI-2026-000001, [PMI-2026-000001], Protocolo PMI-2026-000001
  const patterns = [
    /\bPMI-\d{4}-\d{6}\b/i,
    /\[PMI-\d{4}-\d{6}\]/i,
    /Protocolo\s+PMI-\d{4}-\d{6}/i,
    /NUP[:\s]+PMI-\d{4}-\d{6}/i,
  ];
  for (const pattern of patterns) {
    const match = subject.match(pattern);
    if (match) {
      const nup = match[0].replace(/[\[\]]/g, "").replace(/^(Protocolo|NUP)[:\s]+/i, "").trim();
      return nup.toUpperCase();
    }
  }
  return null;
}

function buildThreadId(messageId: string | null, inReplyTo: string | null, references: string | null): string {
  // O threadId é o Message-ID da mensagem raiz da thread
  if (references) {
    const refs = references.split(/\s+/).filter(Boolean);
    if (refs.length > 0) return refs[0]!;
  }
  if (inReplyTo) return inReplyTo.trim();
  return messageId ?? `thread-${Date.now()}`;
}

function tlsOptions() {
  return process.env.NODE_ENV === "production"
    ? {}
    : { rejectUnauthorized: false };
}

// ─── Auditoria ────────────────────────────────────────────────────────────────

export async function addEmailAudit(data: Omit<InsertEmailAuditTrail, "createdAt">) {
  try {
    const db = await requireDb();
    if (!db) return;
    await db.insert(emailAuditTrail).values(data);
  } catch (err) {
    console.error("[EmailAudit] Erro ao registrar auditoria:", err);
  }
}

// ─── Motor de Vinculação NUP ──────────────────────────────────────────────────

async function resolveNup(params: {
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
  subject: string;
  fromAddress: string;
  mailboxId: number;
}): Promise<{ nup: string | null; isNew: boolean; entityType?: string; entityId?: number; linkMethod?: string }> {
  const db = await requireDb();
  if (!db) return { nup: null, isNew: false };

  // 1. Verificar se há NUP no assunto
  const nupFromSubject = extractNupFromSubject(params.subject);
  if (nupFromSubject) {
    // Buscar entidade vinculada ao NUP
    const proto = await db.select({ id: protocols.id })
      .from(protocols)
      .where(eq(protocols.nup, nupFromSubject))
      .limit(1);
    if (proto.length > 0) {
      return { nup: nupFromSubject, isNew: false, entityType: "protocol", entityId: proto[0]!.id, linkMethod: "auto_subject" };
    }
    // NUP no assunto mas sem entidade — usar mesmo assim
    return { nup: nupFromSubject, isNew: false, linkMethod: "auto_subject" };
  }

  // 2. Verificar In-Reply-To / References — buscar mensagem anterior com NUP
  const refIds = [params.inReplyTo, ...(params.references?.split(/\s+/) ?? [])].filter(Boolean) as string[];
  if (refIds.length > 0) {
    for (const refId of refIds) {
      const prev = await db.select({ nup: emailMessages.nup, id: emailMessages.id })
        .from(emailMessages)
        .where(eq(emailMessages.messageId, refId))
        .limit(1);
      if (prev.length > 0 && prev[0]!.nup) {
        return { nup: prev[0]!.nup, isNew: false, linkMethod: "auto_message_id" };
      }
    }
  }

  // 3. Verificar remetente recorrente — se já tem conversa aberta com este e-mail
  const existingConv = await db.select({ id: conversations.id, nup: conversations.nup })
    .from(conversations)
    .where(and(
      eq(conversations.channel, "email"),
      sql`conversations.status IN ('open', 'pending')`
    ))
    .limit(1);

  if (existingConv.length > 0 && existingConv[0]!.nup) {
    return { nup: existingConv[0]!.nup, isNew: false, linkMethod: "auto_sender" };
  }

  // 4. Gerar novo NUP
  const newNup = await generateNup();
  return { nup: newNup, isNew: true, linkMethod: "auto_message_id" };
}

// ─── Motor de Roteamento ──────────────────────────────────────────────────────

function evaluateCondition(condition: RoutingCondition, msg: {
  subject: string;
  fromAddress: string;
  toAddresses: string;
  bodyText: string;
  hasAttachments: boolean;
}): boolean {
  let fieldValue = "";
  switch (condition.field) {
    case "subject": fieldValue = msg.subject.toLowerCase(); break;
    case "from": fieldValue = msg.fromAddress.toLowerCase(); break;
    case "to": fieldValue = msg.toAddresses.toLowerCase(); break;
    case "body": fieldValue = msg.bodyText.toLowerCase(); break;
    case "has_attachment": return msg.hasAttachments === (condition.value === "true");
  }
  const val = condition.value.toLowerCase();
  switch (condition.operator) {
    case "contains": return fieldValue.includes(val);
    case "equals": return fieldValue === val;
    case "starts_with": return fieldValue.startsWith(val);
    case "ends_with": return fieldValue.endsWith(val);
    case "regex": try { return new RegExp(condition.value, "i").test(fieldValue); } catch { return false; }
    default: return false;
  }
}

async function applyRoutingRules(messageId: number, mailboxId: number, msg: {
  subject: string;
  fromAddress: string;
  toAddresses: string;
  bodyText: string;
  hasAttachments: boolean;
}): Promise<{ sectorId?: number; assignedUserId?: number; priority?: string; tags?: string[]; isSpam?: boolean }> {
  const db = await requireDb();
  if (!db) return {};

  const rules = await db.select()
    .from(emailRoutingRules)
    .where(and(
      eq(emailRoutingRules.isActive, true),
      or(
        eq(emailRoutingRules.mailboxId, mailboxId),
        isNull(emailRoutingRules.mailboxId)
      )
    ))
    .orderBy(emailRoutingRules.priority);

  const result: { sectorId?: number; assignedUserId?: number; priority?: string; tags?: string[]; isSpam?: boolean } = {};
  const tags: string[] = [];

  for (const rule of rules) {
    const conditions = (rule.conditions as RoutingCondition[]) ?? [];
    const logic = rule.conditionLogic;

    let matched = false;
    if (logic === "and") {
      matched = conditions.length > 0 && conditions.every(c => evaluateCondition(c, msg));
    } else {
      matched = conditions.some(c => evaluateCondition(c, msg));
    }

    if (!matched) continue;

    // Aplicar ações
    const actions = (rule.actions as RoutingAction[]) ?? [];
    for (const action of actions) {
      switch (action.action) {
        case "set_sector":
          result.sectorId = parseInt(action.value ?? "0") || undefined;
          break;
        case "set_agent":
          result.assignedUserId = parseInt(action.value ?? "0") || undefined;
          break;
        case "set_priority":
          result.priority = action.value;
          break;
        case "add_tag":
          if (action.value) tags.push(action.value);
          break;
        case "mark_spam":
          result.isSpam = true;
          break;
      }
    }

    // Atualizar estatísticas da regra
    await db.update(emailRoutingRules)
      .set({ matchCount: (rule.matchCount ?? 0) + 1, lastMatchAt: new Date() })
      .where(eq(emailRoutingRules.id, rule.id));

    // Registrar auditoria
    await addEmailAudit({
      action: "rule_matched",
      entityType: "rule",
      entityId: rule.id,
      mailboxId,
      emailMessageId: messageId,
      description: `Regra "${rule.name}" aplicada à mensagem #${messageId}`,
    });
  }

  if (tags.length > 0) result.tags = tags;
  return result;
}

// ─── Conector IMAP ────────────────────────────────────────────────────────────

export async function syncMailbox(mailbox: EmailMailbox): Promise<void> {
  const db = await requireDb();
  if (!db) return;

  const startTime = Date.now();
  let messagesProcessed = 0;
  let messagesNew = 0;
  let messagesFailed = 0;

  console.log(`[EmailInst] Iniciando sync da caixa: ${mailbox.address}`);

  // Marcar como sincronizando
  await db.update(emailMailboxes)
    .set({ status: "syncing" })
    .where(eq(emailMailboxes.id, mailbox.id));

  try {
    // Configurar cliente IMAP via ImapFlow (ESM nativo)
    const client = new ImapFlow({
      host: mailbox.imapHost,
      port: mailbox.imapPort,
      secure: !!mailbox.imapSecure,
      auth: { user: mailbox.imapUser, pass: mailbox.imapPassword },
      tls: { rejectUnauthorized: false, minVersion: "TLSv1" as any },
      logger: false,
      connectionTimeout: 30000,
      greetingTimeout: 15000,
    });

    await client.connect();

    try {
      const lastUid = mailbox.lastUid ?? 0;
      // Buscar mensagens não lidas (e opcionalmente com UID > lastUid)
      const searchQuery = lastUid > 0
        ? { uid: `${lastUid + 1}:*`, seen: false }
        : { seen: false };

      const lock = await client.getMailboxLock(mailbox.imapMailbox);
      try {
        const messages: any[] = [];
        for await (const msg of client.fetch(searchQuery as any, { uid: true, source: true })) {
          messages.push(msg);
          if (messages.length >= 50) break; // limitar a 50 por ciclo
        }

        for (const msg of messages) {
          try {
            const rawEmail = msg.source?.toString("utf8") ?? "";
            const uid = msg.uid ?? 0;
            await processRawEmail(rawEmail, uid, mailbox);
            messagesProcessed++;
            messagesNew++;
            if (uid > (mailbox.lastUid ?? 0)) {
              await db.update(emailMailboxes)
                .set({ lastUid: uid })
                .where(eq(emailMailboxes.id, mailbox.id));
              mailbox.lastUid = uid;
            }
          } catch (err) {
            console.error(`[EmailInst] Erro ao processar mensagem UID ${msg.uid}:`, err);
            messagesFailed++;
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }

    // Sucesso
    await db.update(emailMailboxes)
      .set({ status: "active", lastSyncAt: new Date(), lastSyncError: null })
      .where(eq(emailMailboxes.id, mailbox.id));

    // Log de sincronização
    await db.insert(emailSyncLogs).values({
      mailboxId: mailbox.id,
      operation: "imap_sync",
      status: messagesFailed > 0 ? "partial" : "success",
      messagesProcessed,
      messagesNew,
      messagesFailed,
      durationMs: Date.now() - startTime,
    } as InsertEmailSyncLog);

    await addEmailAudit({
      action: "mailbox_synced",
      entityType: "mailbox",
      entityId: mailbox.id,
      mailboxId: mailbox.id,
      description: `Sync concluído: ${messagesNew} novas mensagens, ${messagesFailed} falhas`,
    });

    console.log(`[EmailInst] Sync concluído para ${mailbox.address}: ${messagesNew} novas, ${messagesFailed} falhas`);
  } catch (err: any) {
    console.error(`[EmailInst] Erro no sync de ${mailbox.address}:`, err);

    await db.update(emailMailboxes)
      .set({ status: "error", lastSyncError: String(err?.message ?? err) })
      .where(eq(emailMailboxes.id, mailbox.id));

    await db.insert(emailSyncLogs).values({
      mailboxId: mailbox.id,
      operation: "imap_sync",
      status: "error",
      messagesProcessed,
      messagesNew,
      messagesFailed,
      durationMs: Date.now() - startTime,
      errorMessage: String(err?.message ?? err),
    } as InsertEmailSyncLog);
  }
}

// ─── Parser MIME e processamento de mensagem ──────────────────────────────────

async function processRawEmail(rawEmail: string, uid: number, mailbox: EmailMailbox): Promise<void> {
  const db = await requireDb();
  if (!db) return;

  // Verificar se já foi processado (por UID)
  if (uid > 0) {
    const existing = await db.select({ id: emailMessages.id })
      .from(emailMessages)
      .where(and(
        eq(emailMessages.mailboxId, mailbox.id),
        eq(emailMessages.imapUid, uid)
      ))
      .limit(1);
    if (existing.length > 0) return; // Já processado
  }

  // Parse MIME completo
  const parsed: ParsedMail = await simpleParser(rawEmail, {
    skipHtmlToText: false,
    skipImageLinks: false,
  });

  const fromAddresses = parseAddressList(parsed.from);
  const toAddresses = parseAddressList(parsed.to as AddressObject | AddressObject[]);
  const ccAddresses = parseAddressList(parsed.cc as AddressObject | AddressObject[]);
  const bccAddresses = parseAddressList(parsed.bcc as AddressObject | AddressObject[]);

  const fromAddress = fromAddresses[0]?.address ?? "";
  const fromName = fromAddresses[0]?.name ?? "";
  const subject = parsed.subject ?? "(sem assunto)";
  const messageId = parsed.messageId ?? null;
  const inReplyTo = parsed.inReplyTo ?? null;
  const references = Array.isArray(parsed.references)
    ? parsed.references.join(" ")
    : (parsed.references ?? null);

  const bodyText = parsed.text ?? "";
  const bodyHtml = parsed.html ?? null;
  const hasAttachments = (parsed.attachments?.length ?? 0) > 0;

  // Verificar se já existe por Message-ID
  if (messageId) {
    const existing = await db.select({ id: emailMessages.id })
      .from(emailMessages)
      .where(eq(emailMessages.messageId, messageId))
      .limit(1);
    if (existing.length > 0) return;
  }

  // Resolver NUP
  const nupResult = await resolveNup({
    messageId,
    inReplyTo,
    references,
    subject,
    fromAddress,
    mailboxId: mailbox.id,
  });

  // Encontrar ou criar contato
  let contactId: number | undefined;
  if (fromAddress) {
    try {
      const contact = await findOrCreateContact({ email: fromAddress, name: fromName || undefined });
      contactId = contact.id;
    } catch { /* ignora */ }
  }

  // ThreadId
  const threadId = buildThreadId(messageId, inReplyTo, references);

  // Criar registro da mensagem
  const msgData: InsertEmailMessage = {
    mailboxId: mailbox.id,
    messageId,
    inReplyTo,
    references,
    imapUid: uid > 0 ? uid : undefined,
    fromAddress,
    fromName: fromName || undefined,
    toAddresses: JSON.stringify(toAddresses),
    ccAddresses: ccAddresses.length > 0 ? JSON.stringify(ccAddresses) : undefined,
    bccAddresses: bccAddresses.length > 0 ? JSON.stringify(bccAddresses) : undefined,
    subject,
    bodyText: bodyText.substring(0, 65535), // Limite TEXT MySQL
    bodyHtml: bodyHtml ? bodyHtml.substring(0, 65535) : undefined,
    direction: "inbound",
    status: "received",
    nup: nupResult.nup ?? undefined,
    contactId,
    priority: "normal",
    isRead: false,
    isStarred: false,
    isSpam: false,
    threadId,
    receivedAt: parsed.date ?? new Date(),
    hasAttachments,
    attachmentCount: parsed.attachments?.length ?? 0,
    sizeBytes: rawEmail.length,
  };

  const result = await db.insert(emailMessages).values(msgData);
  const newMessageId = Number((result[0] as any).insertId);

  // Salvar anexos
  if (parsed.attachments && parsed.attachments.length > 0) {
    for (const att of parsed.attachments) {
      const attData: InsertEmailAttachment = {
        emailMessageId: newMessageId,
        filename: att.filename ?? "anexo",
        mimeType: att.contentType ?? "application/octet-stream",
        sizeBytes: att.size ?? att.content?.length ?? 0,
        isInline: att.contentDisposition === "inline",
        contentId: att.cid ?? undefined,
      };
      await db.insert(emailAttachments).values(attData);
    }
  }

  // Vincular NUP
  if (nupResult.nup) {
    if (nupResult.isNew) {
      // Criar protocolo automático
      try {
        const { createProtocol } = await import("./db-caius");
        const proto = await createProtocol({
          subject,
          requesterName: fromName || fromAddress,
          requesterEmail: fromAddress,
          type: "request",
          channel: "email",
          status: "open",
          priority: "normal",
          isConfidential: false,
          contactId,
        });
        await db.insert(emailNupLinks).values({
          emailMessageId: newMessageId,
          nup: nupResult.nup,
          entityType: "protocol",
          entityId: proto.protocolId,
          linkMethod: "auto_message_id",
        } as InsertEmailNupLink);

        await addEmailAudit({
          action: "nup_created",
          entityType: "message",
          entityId: newMessageId,
          mailboxId: mailbox.id,
          emailMessageId: newMessageId,
          nup: nupResult.nup,
          description: `NUP ${nupResult.nup} gerado automaticamente para mensagem de ${fromAddress}`,
        });
      } catch (err) {
        console.error("[EmailInst] Erro ao criar protocolo:", err);
      }
    } else if (nupResult.entityType && nupResult.entityId) {
      await db.insert(emailNupLinks).values({
        emailMessageId: newMessageId,
        nup: nupResult.nup,
        entityType: nupResult.entityType as any,
        entityId: nupResult.entityId,
        linkMethod: (nupResult.linkMethod ?? "auto_message_id") as any,
      } as InsertEmailNupLink);

      await addEmailAudit({
        action: "nup_linked",
        entityType: "message",
        entityId: newMessageId,
        mailboxId: mailbox.id,
        emailMessageId: newMessageId,
        nup: nupResult.nup,
        description: `Mensagem vinculada ao NUP ${nupResult.nup} via ${nupResult.linkMethod}`,
      });
    }
  }

  // Aplicar regras de roteamento
  const routing = await applyRoutingRules(newMessageId, mailbox.id, {
    subject,
    fromAddress,
    toAddresses: JSON.stringify(toAddresses),
    bodyText,
    hasAttachments,
  });

  // Atualizar mensagem com resultado do roteamento
  const updates: Partial<typeof msgData> = {};
  if (routing.sectorId) updates.sectorId = routing.sectorId;
  if (routing.assignedUserId) updates.assignedUserId = routing.assignedUserId;
  if (routing.priority) updates.priority = routing.priority as any;
  if (routing.isSpam) { updates.isSpam = true; updates.status = "spam"; }
  if (routing.tags && routing.tags.length > 0) updates.tags = JSON.stringify(routing.tags);
  if (Object.keys(updates).length > 0) {
    await db.update(emailMessages).set(updates).where(eq(emailMessages.id, newMessageId));
  }

  // Resposta automática com NUP
  if (mailbox.autoReplyEnabled && nupResult.isNew && fromAddress && !routing.isSpam) {
    try {
      await sendAutoReply(mailbox, fromAddress, fromName, subject, nupResult.nup ?? "");
    } catch (err) {
      console.error("[EmailInst] Erro ao enviar resposta automática:", err);
    }
  }

  // Auditoria de recebimento
  await addEmailAudit({
    action: "message_received",
    entityType: "message",
    entityId: newMessageId,
    mailboxId: mailbox.id,
    emailMessageId: newMessageId,
    nup: nupResult.nup ?? undefined,
    description: `Mensagem recebida de ${fromAddress}: "${subject}"`,
  });
}

// ─── Resposta automática ──────────────────────────────────────────────────────

async function sendAutoReply(
  mailbox: EmailMailbox,
  toAddress: string,
  toName: string,
  originalSubject: string,
  nup: string
): Promise<void> {
  const template = mailbox.autoReplyTemplate ??
    `Olá, {{name}}!\n\nRecebemos sua mensagem com o assunto: "{{subject}}"\n\nSeu número de protocolo é: {{nup}}\n\nEm breve um servidor irá lhe responder. Para acompanhar seu atendimento, acesse nossa Central do Cidadão e informe o número do protocolo.\n\nAtenciosamente,\nEquipe de Atendimento`;

  const body = template
    .replace(/\{\{name\}\}/g, toName || toAddress)
    .replace(/\{\{subject\}\}/g, originalSubject)
    .replace(/\{\{nup\}\}/g, nup)
    .replace(/\{\{mailbox\}\}/g, mailbox.displayName ?? mailbox.name);

  const subject = `Re: ${originalSubject} — Protocolo ${nup}`;

  await queueEmail({
    mailboxId: mailbox.id,
    toAddresses: JSON.stringify([{ address: toAddress, name: toName }]),
    subject,
    bodyText: body,
    nup,
    priority: 3, // Alta prioridade para respostas automáticas
  });
}

// ─── Fila de Envio SMTP ───────────────────────────────────────────────────────

export async function queueEmail(data: {
  mailboxId: number;
  toAddresses: string;
  ccAddresses?: string;
  bccAddresses?: string;
  replyTo?: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string;
  nup?: string;
  priority?: number;
  scheduledAt?: Date;
  createdById?: number;
  emailMessageId?: number;
}): Promise<number> {
  const db = await requireDb();
  if (!db) throw new Error("DB não disponível");

  const result = await db.insert(emailSendQueue).values({
    mailboxId: data.mailboxId,
    emailMessageId: data.emailMessageId,
    toAddresses: data.toAddresses,
    ccAddresses: data.ccAddresses,
    bccAddresses: data.bccAddresses,
    replyTo: data.replyTo,
    subject: data.nup ? `${data.subject} [${data.nup}]` : data.subject,
    bodyText: data.bodyText,
    bodyHtml: data.bodyHtml,
    inReplyTo: data.inReplyTo,
    references: data.references,
    nup: data.nup,
    status: "pending",
    attempts: 0,
    maxAttempts: 3,
    priority: data.priority ?? 5,
    scheduledAt: data.scheduledAt,
    createdById: data.createdById,
    nextAttemptAt: data.scheduledAt ?? new Date(),
  });

  return Number((result[0] as any).insertId);
}

export async function processEmailSendQueue(): Promise<void> {
  const db = await requireDb();
  if (!db) return;

  const now = new Date();
  const pending = await db.select()
    .from(emailSendQueue)
    .where(and(
      eq(emailSendQueue.status, "pending"),
      lte(emailSendQueue.nextAttemptAt, now)
    ))
    .orderBy(emailSendQueue.priority, emailSendQueue.nextAttemptAt)
    .limit(20);

  for (const item of pending) {
    await db.update(emailSendQueue)
      .set({ status: "processing" })
      .where(eq(emailSendQueue.id, item.id));

    try {
      // Buscar caixa postal
      const mailboxes = await db.select()
        .from(emailMailboxes)
        .where(eq(emailMailboxes.id, item.mailboxId))
        .limit(1);

      if (mailboxes.length === 0) throw new Error("Caixa postal não encontrada");
      const mailbox = mailboxes[0]!;

      // Configurar transporter SMTP
      const secure = mailbox.smtpSecure;
      const transporter = nodemailer.createTransport({
        host: mailbox.smtpHost,
        port: mailbox.smtpPort,
        secure,
        auth: { user: mailbox.smtpUser, pass: mailbox.smtpPassword },
        tls: tlsOptions(),
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 20000,
      });

      const toList: ParsedAddress[] = JSON.parse(item.toAddresses ?? "[]");
      const ccList: ParsedAddress[] = item.ccAddresses ? JSON.parse(item.ccAddresses) : [];
      const bccList: ParsedAddress[] = item.bccAddresses ? JSON.parse(item.bccAddresses) : [];

      const info = await transporter.sendMail({
        from: `"${mailbox.displayName ?? mailbox.name}" <${mailbox.smtpUser}>`,
        to: toList.map(a => a.name ? `"${a.name}" <${a.address}>` : a.address).join(", "),
        cc: ccList.length > 0 ? ccList.map(a => a.address).join(", ") : undefined,
        bcc: bccList.length > 0 ? bccList.map(a => a.address).join(", ") : undefined,
        replyTo: item.replyTo ?? undefined,
        subject: item.subject,
        text: item.bodyText ?? undefined,
        html: item.bodyHtml ?? undefined,
        inReplyTo: item.inReplyTo ?? undefined,
        references: item.references ?? undefined,
      });

      // Sucesso
      await db.update(emailSendQueue)
        .set({
          status: "sent",
          sentAt: new Date(),
          attempts: (item.attempts ?? 0) + 1,
          lastAttemptAt: new Date(),
        })
        .where(eq(emailSendQueue.id, item.id));

      // Criar registro da mensagem enviada
      const sentMsgResult = await db.insert(emailMessages).values({
        mailboxId: item.mailboxId,
        messageId: info.messageId ?? undefined,
        inReplyTo: item.inReplyTo ?? undefined,
        references: item.references ?? undefined,
        fromAddress: mailbox.smtpUser,
        fromName: mailbox.displayName ?? mailbox.name,
        toAddresses: item.toAddresses,
        ccAddresses: item.ccAddresses ?? undefined,
        subject: item.subject,
        bodyText: item.bodyText ?? undefined,
        bodyHtml: item.bodyHtml ?? undefined,
        direction: "outbound",
        status: "sent",
        nup: item.nup ?? undefined,
        sentAt: new Date(),
        smtpMessageId: info.messageId ?? undefined,
        threadId: item.inReplyTo ?? info.messageId ?? undefined,
      } as InsertEmailMessage);

      const sentMsgId = Number((sentMsgResult[0] as any).insertId);

      await addEmailAudit({
        action: "queue_sent",
        entityType: "queue",
        entityId: item.id,
        mailboxId: item.mailboxId,
        emailMessageId: sentMsgId,
        nup: item.nup ?? undefined,
        description: `E-mail enviado para ${toList.map(a => a.address).join(", ")}: "${item.subject}"`,
      });

      await db.insert(emailSyncLogs).values({
        mailboxId: item.mailboxId,
        operation: "smtp_send",
        status: "success",
        messagesProcessed: 1,
        messagesNew: 0,
        messagesFailed: 0,
      } as InsertEmailSyncLog);

    } catch (err: any) {
      const attempts = (item.attempts ?? 0) + 1;
      const maxAttempts = item.maxAttempts ?? 3;
      const failed = attempts >= maxAttempts;

      // Backoff exponencial: 5min, 15min, 60min
      const backoffMinutes = [5, 15, 60][Math.min(attempts - 1, 2)] ?? 60;
      const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await db.update(emailSendQueue)
        .set({
          status: failed ? "failed" : "pending",
          attempts,
          lastAttemptAt: new Date(),
          nextAttemptAt: failed ? undefined : nextAttempt,
          errorMessage: String(err?.message ?? err),
        })
        .where(eq(emailSendQueue.id, item.id));

      await addEmailAudit({
        action: failed ? "queue_failed" : "queue_retried",
        entityType: "queue",
        entityId: item.id,
        mailboxId: item.mailboxId,
        nup: item.nup ?? undefined,
        description: `Falha no envio (tentativa ${attempts}/${maxAttempts}): ${err?.message ?? err}`,
      });

      console.error(`[EmailInst] Falha no envio (tentativa ${attempts}/${maxAttempts}):`, err?.message);
    }
  }
}

// ─── Polling automático ───────────────────────────────────────────────────────

const syncTimers = new Map<number, NodeJS.Timeout>();

export async function startEmailPolling(): Promise<void> {
  const db = await requireDb();
  if (!db) return;

  const mailboxes = await db.select()
    .from(emailMailboxes)
    .where(and(
      eq(emailMailboxes.isActive, true),
      or(
        eq(emailMailboxes.status, "active"),
        eq(emailMailboxes.status, "inactive")
      )
    ));

  for (const mailbox of mailboxes) {
    scheduleMailboxSync(mailbox);
  }

  // Processar fila de envio a cada 30 segundos
  setInterval(() => {
    processEmailSendQueue().catch(err => console.error("[EmailInst] Erro na fila de envio:", err));
  }, 30 * 1000);

  console.log(`[EmailInst] Polling iniciado para ${mailboxes.length} caixas postais`);
}

export function scheduleMailboxSync(mailbox: EmailMailbox): void {
  // Cancelar timer anterior se existir
  const existing = syncTimers.get(mailbox.id);
  if (existing) clearInterval(existing);

  const intervalMs = (mailbox.syncIntervalMinutes ?? 5) * 60 * 1000;

  // Sincronização imediata e depois periódica
  syncMailbox(mailbox).catch(err => console.error(`[EmailInst] Sync inicial falhou para ${mailbox.address}:`, err));

  const timer = setInterval(() => {
    syncMailbox(mailbox).catch(err => console.error(`[EmailInst] Sync periódico falhou para ${mailbox.address}:`, err));
  }, intervalMs);

  syncTimers.set(mailbox.id, timer);
}

export function stopMailboxSync(mailboxId: number): void {
  const timer = syncTimers.get(mailboxId);
  if (timer) {
    clearInterval(timer);
    syncTimers.delete(mailboxId);
  }
}

// ─── Funções de consulta ──────────────────────────────────────────────────────

export async function getMailboxes() {
  const db = await requireDb();
  if (!db) return [];
  return db.select().from(emailMailboxes).orderBy(emailMailboxes.name);
}

export async function getMailboxById(id: number) {
  const db = await requireDb();
  if (!db) return undefined;
  const result = await db.select().from(emailMailboxes).where(eq(emailMailboxes.id, id)).limit(1);
  return result[0];
}

export async function getEmailMessages(params: {
  mailboxId?: number;
  status?: string;
  direction?: string;
  sectorId?: number;
  search?: string;
  nup?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  if (!db) return { messages: [], total: 0 };

  const conditions = [];
  if (params.mailboxId) conditions.push(eq(emailMessages.mailboxId, params.mailboxId));
  if (params.status) conditions.push(eq(emailMessages.status, params.status as any));
  if (params.direction) conditions.push(eq(emailMessages.direction, params.direction as any));
  if (params.sectorId) conditions.push(eq(emailMessages.sectorId, params.sectorId));
  if (params.nup) conditions.push(eq(emailMessages.nup, params.nup));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const [msgs, countResult] = await Promise.all([
    db.select().from(emailMessages)
      .where(where)
      .orderBy(desc(emailMessages.receivedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(emailMessages).where(where),
  ]);

  return { messages: msgs, total: Number(countResult[0]?.count ?? 0) };
}

export async function getEmailThread(threadId: string) {
  const db = await requireDb();
  if (!db) return [];
  return db.select().from(emailMessages)
    .where(eq(emailMessages.threadId, threadId))
    .orderBy(emailMessages.receivedAt);
}

export async function getRoutingRules(mailboxId?: number) {
  const db = await requireDb();
  if (!db) return [];
  const conditions = mailboxId
    ? [or(eq(emailRoutingRules.mailboxId, mailboxId), isNull(emailRoutingRules.mailboxId))]
    : [];
  return db.select().from(emailRoutingRules)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(emailRoutingRules.priority);
}

export async function getSyncLogs(mailboxId: number, limit = 50) {
  const db = await requireDb();
  if (!db) return [];
  return db.select().from(emailSyncLogs)
    .where(eq(emailSyncLogs.mailboxId, mailboxId))
    .orderBy(desc(emailSyncLogs.createdAt))
    .limit(limit);
}

export async function getAuditTrail(params: {
  mailboxId?: number;
  emailMessageId?: number;
  nup?: string;
  limit?: number;
}) {
  const db = await requireDb();
  if (!db) return [];
  const conditions = [];
  if (params.mailboxId) conditions.push(eq(emailAuditTrail.mailboxId, params.mailboxId));
  if (params.emailMessageId) conditions.push(eq(emailAuditTrail.emailMessageId, params.emailMessageId));
  if (params.nup) conditions.push(eq(emailAuditTrail.nup, params.nup));
  return db.select().from(emailAuditTrail)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(emailAuditTrail.createdAt))
    .limit(params.limit ?? 100);
}
