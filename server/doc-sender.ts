/**
 * Serviço de Envio de Documentos Oficiais
 * Envia documentos por e-mail (com PDF anexo) e/ou WhatsApp.
 * Registra o envio na tabela docRecipients.
 */
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import nodemailer from "nodemailer";
import { getDb, getAllAccounts } from "./db";
import { sendWhatsAppMessage } from "./whatsapp";
import { docRecipients, officialDocuments, users, orgUnits } from "../drizzle/schema";
import type { Account } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";

// ─── PDF constants ────────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BLUE = rgb(0.118, 0.227, 0.373);
const LIGHT_BLUE = rgb(0.937, 0.965, 1.0);
const GRAY = rgb(0.45, 0.45, 0.45);
const DARK = rgb(0.1, 0.1, 0.1);
const WHITE = rgb(1, 1, 1);
const BORDER_GRAY = rgb(0.87, 0.87, 0.87);

const DOC_TYPE_LABELS: Record<string, string> = {
  memo: "Memorando",
  official_letter: "Ofício",
  dispatch: "Despacho",
  opinion: "Parecer",
  notification: "Notificação",
  certificate: "Certidão",
  report: "Relatório",
  other: "Outro",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando Assinatura",
  signed: "Assinado",
  published: "Publicado",
  archived: "Arquivado",
};

function wrapText(text: string, font: any, size: number, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function tlsOptions() {
  return { rejectUnauthorized: false, minVersion: "TLSv1" as const };
}

// ─── PDF Generator ────────────────────────────────────────────────────────────
async function generateDocumentPdf(doc: {
  id: number;
  nup?: string | null;
  number: string;
  title: string;
  content?: string | null;
  type: string;
  status: string;
  issuedAt?: Date | null;
  createdAt: Date;
  authorName?: string;
  sectorName?: string;
  originType: "internal" | "external";
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdf.embedFont(StandardFonts.Helvetica);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const ensureSpace = (needed: number) => {
    if (y - needed < 60) newPage();
  };

  // ── Cabeçalho ──
  page.drawRectangle({ x: 0, y: PAGE_H - 90, width: PAGE_W, height: 90, color: BLUE });
  page.drawText("DOCUMENTO OFICIAL", { x: MARGIN, y: PAGE_H - 30, size: 14, font: fontBold, color: WHITE });
  page.drawText("Prefeitura Municipal de Itabaiana — PB", { x: MARGIN, y: PAGE_H - 50, size: 9, font: fontReg, color: rgb(0.8, 0.88, 1.0) });
  page.drawText("CAIUS — Central de Atendimento Integrado ao Usuário", { x: MARGIN, y: PAGE_H - 66, size: 8, font: fontReg, color: rgb(0.7, 0.8, 0.95) });

  // Tag de origem
  const originLabel = doc.originType === "internal" ? "ORIGEM INTERNA" : "ORIGEM EXTERNA";
  const originColor = doc.originType === "internal" ? rgb(0.2, 0.7, 0.3) : rgb(0.9, 0.5, 0.1);
  const originW = fontBold.widthOfTextAtSize(originLabel, 8);
  page.drawRectangle({ x: PAGE_W - MARGIN - originW - 16, y: PAGE_H - 42, width: originW + 16, height: 18, color: originColor });
  page.drawText(originLabel, { x: PAGE_W - MARGIN - originW - 8, y: PAGE_H - 33, size: 8, font: fontBold, color: WHITE });

  y = PAGE_H - 110;

  // ── Caixa de identificação ──
  page.drawRectangle({ x: MARGIN, y: y - 55, width: CONTENT_W, height: 60, color: LIGHT_BLUE, borderColor: BLUE, borderWidth: 1 });
  page.drawText(DOC_TYPE_LABELS[doc.type] ?? doc.type, { x: MARGIN + 12, y: y - 16, size: 8, font: fontBold, color: BLUE });
  page.drawText(doc.number, { x: MARGIN + 12, y: y - 36, size: 18, font: fontBold, color: BLUE });
  if (doc.nup) {
    page.drawText(`NUP: ${doc.nup}`, { x: MARGIN + 12, y: y - 52, size: 7.5, font: fontReg, color: GRAY });
  }
  const statusLabel = DOC_STATUS_LABELS[doc.status] ?? doc.status;
  const statusW = fontBold.widthOfTextAtSize(statusLabel, 8);
  page.drawText("STATUS", { x: PAGE_W - MARGIN - statusW - 8, y: y - 16, size: 7, font: fontBold, color: GRAY });
  page.drawText(statusLabel, { x: PAGE_W - MARGIN - statusW - 8, y: y - 30, size: 9, font: fontBold, color: DARK });

  y -= 75;

  // ── Título ──
  ensureSpace(50);
  page.drawText("TÍTULO", { x: MARGIN, y, size: 8, font: fontBold, color: GRAY });
  y -= 14;
  for (const line of wrapText(doc.title, fontBold, 13, CONTENT_W)) {
    page.drawText(line, { x: MARGIN, y, size: 13, font: fontBold, color: DARK });
    y -= 17;
  }
  y -= 10;

  // ── Metadados ──
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BORDER_GRAY });
  y -= 16;

  const COL1_X = MARGIN;
  const COL2_X = MARGIN + CONTENT_W / 2 + 10;
  const COL_W = CONTENT_W / 2 - 10;

  const drawField = (label: string, value: string, x: number, currY: number) => {
    page.drawText(label, { x, y: currY, size: 7.5, font: fontBold, color: GRAY });
    const lines = wrapText(value || "—", fontReg, 9.5, COL_W);
    let ly = currY - 13;
    for (const l of lines) {
      page.drawText(l, { x, y: ly, size: 9.5, font: fontReg, color: DARK });
      ly -= 13;
    }
    return currY - 13 - (lines.length - 1) * 13 - 8;
  };

  const metaFields: [string, string][] = [
    ["ELABORADO POR", doc.authorName ?? "—"],
    ["SETOR / UNIDADE", doc.sectorName ?? "—"],
    ["DATA DE EMISSÃO", doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString("pt-BR") : new Date(doc.createdAt).toLocaleDateString("pt-BR")],
    ["ORIGEM", doc.originType === "internal" ? "Interna (CAIUS)" : "Externa"],
  ];

  let c1y = y, c2y = y;
  for (let i = 0; i < metaFields.length; i++) {
    ensureSpace(40);
    if (i % 2 === 0) c1y = drawField(metaFields[i][0], metaFields[i][1], COL1_X, c1y);
    else c2y = drawField(metaFields[i][0], metaFields[i][1], COL2_X, c2y);
  }
  y = Math.min(c1y, c2y) - 8;

  // ── Conteúdo ──
  if (doc.content) {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: BORDER_GRAY });
    y -= 16;
    ensureSpace(30);
    page.drawText("CONTEÚDO DO DOCUMENTO", { x: MARGIN, y, size: 9, font: fontBold, color: BLUE });
    y -= 18;
    for (const line of wrapText(doc.content, fontReg, 9.5, CONTENT_W)) {
      ensureSpace(14);
      page.drawText(line, { x: MARGIN, y, size: 9.5, font: fontReg, color: DARK });
      y -= 14;
    }
  }

  // ── Rodapé ──
  const totalPages = pdf.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = pdf.getPage(i);
    p.drawLine({ start: { x: MARGIN, y: 45 }, end: { x: PAGE_W - MARGIN, y: 45 }, thickness: 0.5, color: BORDER_GRAY });
    p.drawText("Documento gerado pelo CAIUS — Prefeitura Municipal de Itabaiana/PB.", { x: MARGIN, y: 30, size: 7, font: fontReg, color: GRAY });
    const pageLabel = `Página ${i + 1} de ${totalPages}`;
    const pw = fontReg.widthOfTextAtSize(pageLabel, 7);
    p.drawText(pageLabel, { x: PAGE_W - MARGIN - pw, y: 30, size: 7, font: fontReg, color: GRAY });
  }

  return pdf.save();
}

// ─── Main export ──────────────────────────────────────────────────────────────
export interface SendDocumentInput {
  documentId: number;
  originType: "internal" | "external";
  recipientUserId?: number;
  recipientUnitId?: number;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: "email" | "whatsapp" | "both";
  sentById: number;
}

export async function sendOfficialDocument(input: SendDocumentInput): Promise<{
  success: boolean;
  recipientId: number;
  pdfUrl?: string;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, recipientId: 0, error: "Banco de dados indisponível" };

  // Buscar documento
  const [doc] = await db.select().from(officialDocuments).where(eq(officialDocuments.id, input.documentId));
  if (!doc) return { success: false, recipientId: 0, error: "Documento não encontrado" };

  // Resolver destinatário interno
  let resolvedName = input.recipientName;
  let resolvedEmail = input.recipientEmail;
  const resolvedPhone = input.recipientPhone;

  if (input.originType === "internal" && input.recipientUserId) {
    const [u] = await db.select().from(users).where(eq(users.id, input.recipientUserId));
    if (u) {
      resolvedName = u.name ?? u.email ?? `Usuário #${u.id}`;
      resolvedEmail = resolvedEmail ?? (u.email ?? undefined);
    }
  } else if (input.originType === "internal" && input.recipientUnitId) {
    const [unit] = await db.select().from(orgUnits).where(eq(orgUnits.id, input.recipientUnitId));
    if (unit) resolvedName = unit.name;
  }

  // Buscar autor
  let authorName = "Servidor Municipal";
  if (doc.authorId) {
    const [author] = await db.select().from(users).where(eq(users.id, doc.authorId));
    if (author) authorName = author.name ?? author.email ?? authorName;
  }

  // Gerar PDF
  let pdfUrl: string | undefined;
  let pdfBytes: Uint8Array | undefined;
  try {
    pdfBytes = await generateDocumentPdf({
      id: doc.id,
      nup: doc.nup,
      number: doc.number,
      title: doc.title,
      content: doc.content ?? undefined,
      type: doc.type,
      status: doc.status,
      issuedAt: doc.issuedAt ?? undefined,
      createdAt: doc.createdAt,
      authorName,
      originType: input.originType,
    });
    const key = `documents/doc-${doc.id}-${Date.now()}.pdf`;
    const stored = await storagePut(key, Buffer.from(pdfBytes), "application/pdf");
    pdfUrl = stored.url;
  } catch (e: any) {
    console.error("[DocSender] Erro ao gerar PDF:", e?.message);
  }

  // Criar registro
  const [insertResult] = await db.insert(docRecipients).values({
    documentId: input.documentId,
    originType: input.originType,
    recipientUserId: input.recipientUserId,
    recipientUnitId: input.recipientUnitId,
    recipientName: resolvedName,
    recipientEmail: resolvedEmail,
    recipientPhone: resolvedPhone,
    channel: input.channel,
    status: "pending",
    pdfUrl,
    sentById: input.sentById,
  });
  const recipientId = (insertResult as any).insertId as number;

  let emailSent = false;
  let whatsappSent = false;
  let errorMsg: string | undefined;

  const shouldEmail = (input.channel === "email" || input.channel === "both") && resolvedEmail;
  const shouldWhatsApp = (input.channel === "whatsapp" || input.channel === "both") && resolvedPhone;

  // ── Envio por e-mail ──
  if (shouldEmail && resolvedEmail) {
    try {
      const allAccounts = await getAllAccounts();
      const emailAccount = allAccounts.find((a: Account) => a.type === "email" && a.isActive);
      if (!emailAccount?.smtpHost) throw new Error("Nenhuma conta de e-mail SMTP configurada");

      const originLabel = input.originType === "internal" ? "[INTERNO]" : "[EXTERNO]";
      const subject = `${originLabel} ${DOC_TYPE_LABELS[doc.type] ?? "Documento"} Nº ${doc.number} — ${doc.title}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
          <div style="background:#1e3a5f;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
            <h2 style="margin:0;font-size:18px">📄 Documento Oficial</h2>
            <p style="margin:4px 0 0;font-size:12px;opacity:0.8">Prefeitura Municipal de Itabaiana — CAIUS</p>
          </div>
          <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">
            <p>Prezado(a) <strong>${resolvedName ?? "Destinatário"}</strong>,</p>
            <p>Segue em anexo o documento oficial:</p>
            <div style="background:#eef6ff;border:1px solid #1e3a5f;border-radius:6px;padding:16px;margin:16px 0">
              <p style="margin:0 0 4px;font-size:12px;color:#1e3a5f;font-weight:bold">${DOC_TYPE_LABELS[doc.type] ?? doc.type}</p>
              <p style="margin:0;font-size:20px;font-weight:bold;color:#1e3a5f">${doc.number}</p>
              <p style="margin:8px 0 0;font-size:14px;color:#374151">${doc.title}</p>
              ${doc.nup ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280">NUP: ${doc.nup}</p>` : ""}
            </div>
            <p style="font-size:13px;color:#6b7280">
              <strong>Origem:</strong> ${input.originType === "internal" ? "🏛️ Interna (CAIUS)" : "🌐 Externa"}<br>
              <strong>Emitido por:</strong> ${authorName}
            </p>
            ${pdfUrl ? `<div style="text-align:center;margin:20px 0"><a href="${pdfUrl}" style="background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px">📥 Baixar PDF</a></div>` : ""}
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:12px">Este é um e-mail automático. Não responda.</p>
        </div>
      `;

      const transporter = nodemailer.createTransport({
        host: emailAccount.smtpHost,
        port: emailAccount.smtpPort ?? 587,
        secure: (emailAccount.smtpPort ?? 587) === 465,
        auth: { user: emailAccount.smtpUser!, pass: emailAccount.smtpPassword! },
        tls: tlsOptions(),
        connectionTimeout: 20000,
      });
      await transporter.sendMail({
        from: `"${emailAccount.name}" <${emailAccount.smtpUser}>`,
        to: resolvedEmail,
        subject,
        html,
        ...(pdfBytes ? {
          attachments: [{
            filename: `${doc.number.replace(/[^a-zA-Z0-9\-]/g, "_")}.pdf`,
            content: Buffer.from(pdfBytes),
            contentType: "application/pdf",
          }],
        } : {}),
      });
      emailSent = true;
    } catch (e: any) {
      errorMsg = e?.message ?? "Erro ao enviar e-mail";
      console.error("[DocSender] Erro e-mail:", errorMsg);
    }
  }

  // ── Envio por WhatsApp ──
  if (shouldWhatsApp && resolvedPhone) {
    try {
      const allAccounts = await getAllAccounts();
      const waAccount = allAccounts.find((a: Account) => a.type === "whatsapp" && a.isActive);
      if (!waAccount) throw new Error("Nenhuma conta WhatsApp conectada");

      const originLabel = input.originType === "internal" ? "🏛️ *INTERNO*" : "🌐 *EXTERNO*";
      const msg = [
        `${originLabel}`,
        ``,
        `📄 *Documento Oficial*`,
        `*Tipo:* ${DOC_TYPE_LABELS[doc.type] ?? doc.type}`,
        `*Número:* ${doc.number}`,
        `*Título:* ${doc.title}`,
        doc.nup ? `*NUP:* ${doc.nup}` : null,
        `*Emitido por:* ${authorName}`,
        pdfUrl ? `\n📥 *PDF:* ${pdfUrl}` : null,
      ].filter(Boolean).join("\n");

      await sendWhatsAppMessage(waAccount.id, resolvedPhone, msg);
      whatsappSent = true;
    } catch (e: any) {
      const waErr = e?.message ?? "Erro ao enviar WhatsApp";
      errorMsg = errorMsg ? `${errorMsg}; ${waErr}` : waErr;
      console.error("[DocSender] Erro WhatsApp:", waErr);
    }
  }

  // Atualizar status
  const finalStatus = (emailSent || whatsappSent) ? "sent" : (errorMsg ? "failed" : "skipped");
  await db.update(docRecipients).set({
    status: finalStatus,
    sentAt: finalStatus === "sent" ? new Date() : undefined,
    errorMessage: errorMsg,
  }).where(eq(docRecipients.id, recipientId));

  return { success: emailSent || whatsappSent, recipientId, pdfUrl, error: errorMsg };
}

export async function getDocumentRecipients(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(docRecipients).where(eq(docRecipients.documentId, documentId));
}
