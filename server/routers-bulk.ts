/**
 * CAIUS — Router de Envio em Massa WhatsApp
 * Gerencia campanhas de disparo em massa via planilha importada.
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { bulkCampaigns, bulkRecipients } from "../drizzle/schema";
import { eq, desc, and, count } from "drizzle-orm";
import * as XLSX from "xlsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

function parseSpreadsheet(base64: string): Array<{ phone: string; name?: string; customMessage?: string }> {
  const buffer = Buffer.from(base64, "base64");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) throw new Error("Planilha vazia ou inválida");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const results: Array<{ phone: string; name?: string; customMessage?: string }> = [];

  for (const row of rows) {
    const phoneRaw = String(
      row["telefone"] ?? row["phone"] ?? row["celular"] ?? row["whatsapp"] ??
      row["numero"] ?? row["número"] ?? row["Telefone"] ?? row["Phone"] ??
      row["Celular"] ?? row["WhatsApp"] ?? row["Numero"] ?? row["Número"] ?? ""
    ).trim();

    if (!phoneRaw) continue;
    const phone = normalizePhone(phoneRaw);
    if (phone.length < 10) continue;

    const name = String(
      row["nome"] ?? row["name"] ?? row["Nome"] ?? row["Name"] ?? ""
    ).trim() || undefined;

    const customMessage = String(
      row["mensagem"] ?? row["message"] ?? row["Mensagem"] ?? row["Message"] ?? ""
    ).trim() || undefined;

    results.push({ phone, name, customMessage });
  }

  return results;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const bulkRouter = router({
  // Listar campanhas
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB indisponível");
    return db.select().from(bulkCampaigns).orderBy(desc(bulkCampaigns.createdAt)).limit(100);
  }),

  // Buscar campanha por ID com destinatários
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const [campaign] = await db.select().from(bulkCampaigns).where(eq(bulkCampaigns.id, input.id));
      if (!campaign) throw new Error("Campanha não encontrada");

      const recipients = await db
        .select()
        .from(bulkRecipients)
        .where(eq(bulkRecipients.campaignId, input.id))
        .orderBy(bulkRecipients.id)
        .limit(1000);

      return { campaign, recipients };
    }),

  // Criar campanha com importação de planilha
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      accountId: z.number(),
      message: z.string().min(1),
      delaySeconds: z.number().min(1).max(60).default(3),
      scheduledAt: z.string().optional(),
      fileBase64: z.string().optional(),
      fileMime: z.string().optional(),
      phones: z.array(z.object({
        phone: z.string(),
        name: z.string().optional(),
        customMessage: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let recipients: Array<{ phone: string; name?: string; customMessage?: string }> = [];

      if (input.fileBase64) {
        recipients = parseSpreadsheet(input.fileBase64);
      } else if (input.phones && input.phones.length > 0) {
        recipients = input.phones.map(p => ({
          phone: normalizePhone(p.phone),
          name: p.name,
          customMessage: p.customMessage,
        }));
      }

      if (recipients.length === 0) throw new Error("Nenhum destinatário válido encontrado");

      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const [result] = await db.insert(bulkCampaigns).values({
        name: input.name,
        accountId: input.accountId,
        message: input.message,
        delaySeconds: input.delaySeconds,
        totalCount: recipients.length,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        createdById: ctx.user.id,
        status: "draft",
      });

      const campaignId = (result as any).insertId as number;

      const batchSize = 100;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        await db.insert(bulkRecipients).values(
          batch.map(r => ({
            campaignId,
            phone: r.phone,
            name: r.name,
            customMessage: r.customMessage,
            status: "pending" as const,
          }))
        );
      }

      return { campaignId, totalCount: recipients.length };
    }),

  // Iniciar campanha
  start: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const [campaign] = await db.select().from(bulkCampaigns).where(eq(bulkCampaigns.id, input.id));
      if (!campaign) throw new Error("Campanha não encontrada");
      if (campaign.status !== "draft" && campaign.status !== "paused") {
        throw new Error(`Campanha não pode ser iniciada no status ${campaign.status}`);
      }

      await db.update(bulkCampaigns)
        .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(bulkCampaigns.id, input.id));

      void runCampaign(input.id, campaign.accountId, campaign.message, campaign.delaySeconds);
      return { ok: true };
    }),

  // Pausar campanha
  pause: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.update(bulkCampaigns)
        .set({ status: "paused", updatedAt: new Date() })
        .where(eq(bulkCampaigns.id, input.id));
      return { ok: true };
    }),

  // Cancelar campanha
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.update(bulkCampaigns)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(bulkCampaigns.id, input.id));
      return { ok: true };
    }),

  // Deletar campanha
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const [campaign] = await db.select().from(bulkCampaigns).where(eq(bulkCampaigns.id, input.id));
      if (!campaign) throw new Error("Campanha não encontrada");
      if (campaign.status === "running") throw new Error("Não é possível deletar uma campanha em execução");

      await db.delete(bulkRecipients).where(eq(bulkRecipients.campaignId, input.id));
      await db.delete(bulkCampaigns).where(eq(bulkCampaigns.id, input.id));
      return { ok: true };
    }),

  // Estatísticas
  stats: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const [pending] = await db.select({ c: count() }).from(bulkRecipients)
        .where(and(eq(bulkRecipients.campaignId, input.id), eq(bulkRecipients.status, "pending")));
      const [sent] = await db.select({ c: count() }).from(bulkRecipients)
        .where(and(eq(bulkRecipients.campaignId, input.id), eq(bulkRecipients.status, "sent")));
      const [failed] = await db.select({ c: count() }).from(bulkRecipients)
        .where(and(eq(bulkRecipients.campaignId, input.id), eq(bulkRecipients.status, "failed")));

      return {
        pending: pending?.c ?? 0,
        sent: sent?.c ?? 0,
        failed: failed?.c ?? 0,
      };
    }),
});

// ─── Engine de Disparo ────────────────────────────────────────────────────────

async function runCampaign(campaignId: number, accountId: number, defaultMessage: string, delaySeconds: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("DB indisponível");

    const pending = await db
      .select()
      .from(bulkRecipients)
      .where(and(eq(bulkRecipients.campaignId, campaignId), eq(bulkRecipients.status, "pending")));

    for (const recipient of pending) {
      const [campaign] = await db
        .select({ status: bulkCampaigns.status })
        .from(bulkCampaigns)
        .where(eq(bulkCampaigns.id, campaignId));

      if (!campaign || campaign.status === "paused" || campaign.status === "cancelled") break;

      const message = recipient.customMessage || defaultMessage;
      const personalizedMessage = recipient.name
        ? message.replace(/\{nome\}/gi, recipient.name).replace(/\{name\}/gi, recipient.name)
        : message;

      try {
        const { sendWhatsAppMessage } = await import("./whatsapp");
        await sendWhatsAppMessage(accountId, recipient.phone, personalizedMessage);

        await db.update(bulkRecipients)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(bulkRecipients.id, recipient.id));

        const [sentRow] = await db.select({ c: count() }).from(bulkRecipients)
          .where(and(eq(bulkRecipients.campaignId, campaignId), eq(bulkRecipients.status, "sent")));
        await db.update(bulkCampaigns)
          .set({ sentCount: sentRow?.c ?? 0, updatedAt: new Date() })
          .where(eq(bulkCampaigns.id, campaignId));

      } catch (err: any) {
        await db.update(bulkRecipients)
          .set({ status: "failed", errorMessage: String(err?.message ?? err) })
          .where(eq(bulkRecipients.id, recipient.id));

        const [failedRow] = await db.select({ c: count() }).from(bulkRecipients)
          .where(and(eq(bulkRecipients.campaignId, campaignId), eq(bulkRecipients.status, "failed")));
        await db.update(bulkCampaigns)
          .set({ failedCount: failedRow?.c ?? 0, updatedAt: new Date() })
          .where(eq(bulkCampaigns.id, campaignId));
      }

      await new Promise(r => setTimeout(r, delaySeconds * 1000));
    }

    const db2 = await getDb();
    if (!db2) return;

    const [finalCampaign] = await db2
      .select({ status: bulkCampaigns.status })
      .from(bulkCampaigns)
      .where(eq(bulkCampaigns.id, campaignId));

    if (finalCampaign?.status === "running") {
      await db2.update(bulkCampaigns)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(bulkCampaigns.id, campaignId));
    }
  } catch (err) {
    console.error(`[BulkCampaign] Erro na campanha ${campaignId}:`, err);
    const db = await getDb();
    if (!db) return;
    await db.update(bulkCampaigns)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bulkCampaigns.id, campaignId));
  }
}
