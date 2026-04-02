import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  verifiableDocuments, documentSignatures, documentVerificationLogs,
  attachments,
  VerifiableDocument, DocumentSignature,
} from "../drizzle/schema";
import { eq, and, or, desc } from "drizzle-orm";
import crypto from "crypto";
import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { storageGet } from "./storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateVerificationKey(nup: string | null | undefined): string {
  const base = nup ? nup.replace(/-/g, "") : crypto.randomBytes(6).toString("hex").toUpperCase();
  const token = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${base}-${token}`;
}

function generateAccessCode(): string {
  // Formato: XXXX-XXXX-XXXX (alfanumérico legível)
  const part = () => crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${part()}-${part()}-${part()}`;
}

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

async function generateQRCodeSVG(url: string): Promise<string> {
  try {
    return await QRCode.toString(url, { type: "svg", width: 120, margin: 1 });
  } catch {
    return "";
  }
}

function getVerificationUrl(key: string, origin = ""): string {
  const base = origin || "https://cac.itabaiana.pb.gov.br";
  return `${base}/verificar/${key}`;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const verificationRouter = router({
  // ── Emitir documento verificável ──────────────────────────────────────────
  issue: protectedProcedure
    .input(z.object({
      entityType: z.enum(["protocol", "process", "document", "ombudsman", "template", "receipt", "report", "custom"]),
      entityId: z.number(),
      nup: z.string().optional(),
      title: z.string(),
      documentType: z.string(),
      documentNumber: z.string().optional(),
      content: z.string().optional(),  // Conteúdo para gerar hash
      issuingUnit: z.string().optional(),
      isPublic: z.boolean().default(true),
      origin: z.string().optional(),   // window.location.origin do frontend
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      // Verificar se já existe documento verificável para esta entidade
      const existing = await db.select().from(verifiableDocuments)
        .where(and(
          eq(verifiableDocuments.entityType, input.entityType),
          eq(verifiableDocuments.entityId, input.entityId),
        ))
        .limit(1);

      if (existing.length > 0) {
        // Retornar o existente
        const doc = existing[0];
        return { success: true, verifiableDocument: doc, isNew: false };
      }

      const verificationKey = generateVerificationKey(input.nup);
      const verificationUrl = getVerificationUrl(verificationKey, input.origin);
      const documentHash = input.content ? hashContent(input.content) : undefined;
      const qrCodeData = await generateQRCodeSVG(verificationUrl);

      const [result] = await db.insert(verifiableDocuments).values({
        entityType: input.entityType,
        entityId: input.entityId,
        nup: input.nup,
        verificationKey,
        documentHash,
        title: input.title,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        issuingUnit: input.issuingUnit,
        issuingUserId: ctx.user.id,
        issuingUserName: ctx.user.name,
        verificationUrl,
        qrCodeData,
        isPublic: input.isPublic,
        status: "authentic",
        version: 1,
      });

      const newDoc = await db.select().from(verifiableDocuments)
        .where(eq(verifiableDocuments.verificationKey, verificationKey))
        .limit(1);

      return { success: true, verifiableDocument: newDoc[0], isNew: true };
    }),

  // ── Buscar documento verificável por entidade ─────────────────────────────
  getByEntity: protectedProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const docs = await db.select().from(verifiableDocuments)
        .where(and(
          eq(verifiableDocuments.entityType, input.entityType as any),
          eq(verifiableDocuments.entityId, input.entityId),
        ))
        .orderBy(desc(verifiableDocuments.version))
        .limit(1);

      if (docs.length === 0) return null;
      const doc = docs[0];

      // Buscar assinaturas
      const sigs = await db.select().from(documentSignatures)
        .where(eq(documentSignatures.verifiableDocumentId, doc.id))
        .orderBy(documentSignatures.signatureOrder);

      return { ...doc, signatures: sigs };
    }),

  // ── Verificação pública por chave ou NUP (sem autenticação) ───────────────
  verify: publicProcedure
    .input(z.object({
      key: z.string().optional(),
      nup: z.string().optional(),
      accessCode: z.string().optional(),
      queryType: z.enum(["nup", "key", "qrcode", "link"]).default("key"),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      let doc: VerifiableDocument | undefined;

      if (input.key) {
        const rows = await db.select().from(verifiableDocuments)
          .where(eq(verifiableDocuments.verificationKey, input.key))
          .limit(1);
        doc = rows[0];
      } else if (input.nup) {
        const rows = await db.select().from(verifiableDocuments)
          .where(eq(verifiableDocuments.nup, input.nup))
          .orderBy(desc(verifiableDocuments.version))
          .limit(1);
        doc = rows[0];
      } else if (input.accessCode) {
        // Buscar pela assinatura
        const sigRows = await db.select().from(documentSignatures)
          .where(eq(documentSignatures.accessCode, input.accessCode))
          .limit(1);
        if (sigRows.length > 0) {
          const docRows = await db.select().from(verifiableDocuments)
            .where(eq(verifiableDocuments.id, sigRows[0].verifiableDocumentId))
            .limit(1);
          doc = docRows[0];
        }
      }

      // Registrar log de acesso
      await db.insert(documentVerificationLogs).values({
        verifiableDocumentId: doc?.id,
        verificationKey: input.key,
        accessCode: input.accessCode,
        queryType: input.queryType,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        result: doc ? "found" : "not_found",
      });

      if (!doc) {
        return { found: false, message: "Documento não encontrado." };
      }

      // Buscar assinaturas
      const sigs = await db.select().from(documentSignatures)
        .where(eq(documentSignatures.verifiableDocumentId, doc.id))
        .orderBy(documentSignatures.signatureOrder);

      return {
        found: true,
        document: {
          id: doc.id,
          nup: doc.nup,
          title: doc.title,
          documentType: doc.documentType,
          documentNumber: doc.documentNumber,
          issuingUnit: doc.issuingUnit,
          issuingUserName: doc.issuingUserName,
          status: doc.status,
          version: doc.version,
          verificationKey: doc.verificationKey,
          verificationUrl: doc.verificationUrl,
          qrCodeData: doc.qrCodeData,
          issuedAt: doc.issuedAt,
          invalidatedAt: doc.invalidatedAt,
          invalidationReason: doc.invalidationReason,
        },
        signatures: sigs.map((s: DocumentSignature) => ({
          id: s.id,
          signerName: s.signerName,
          signerCpfMasked: s.signerCpfMasked,
          signerRole: s.signerRole,
          signerUnit: s.signerUnit,
          signatureType: s.signatureType,
          signatureMethod: s.signatureMethod,
          status: s.status,
          signedAt: s.signedAt,
          accessCode: s.accessCode,
          signatureOrder: s.signatureOrder,
        })),
        isAuthentic: doc.status === "authentic",
      };
    }),

  // ── Invalidar documento ───────────────────────────────────────────────────
  invalidate: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["invalid", "cancelled", "replaced", "revoked", "unavailable"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(verifiableDocuments)
        .set({
          status: input.status,
          invalidatedAt: new Date(),
          invalidationReason: input.reason,
        })
        .where(eq(verifiableDocuments.id, input.id));
      return { success: true };
    }),

  // ── Assinar documento ─────────────────────────────────────────────────────
  sign: protectedProcedure
    .input(z.object({
      verifiableDocumentId: z.number(),
      nup: z.string().optional(),
      signatureType: z.enum(["institutional", "advanced", "qualified"]).default("institutional"),
      content: z.string().optional(),  // Conteúdo do documento para gerar hash
      cpfMasked: z.string().optional(),
      role: z.string().optional(),
      unit: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
      origin: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verificar se já assinou
      const existing = await db.select().from(documentSignatures)
        .where(and(
          eq(documentSignatures.verifiableDocumentId, input.verifiableDocumentId),
          eq(documentSignatures.signerId, ctx.user.id),
        ))
        .limit(1);

      if (existing.length > 0) {
        return { success: false, message: "Você já assinou este documento." };
      }

      // Contar assinaturas existentes para definir a ordem
      const existingSigs = await db.select().from(documentSignatures)
        .where(eq(documentSignatures.verifiableDocumentId, input.verifiableDocumentId));
      const signatureOrder = existingSigs.length + 1;

      const accessCode = generateAccessCode();
      const verificationUrl = getVerificationUrl(accessCode, input.origin);
      const documentHash = input.content ? hashContent(input.content) : undefined;

      // Hash da assinatura: hash(documentHash + userId + timestamp)
      const sigData = `${documentHash || ""}:${ctx.user.id}:${Date.now()}`;
      const signatureHash = hashContent(sigData);

      await db.insert(documentSignatures).values({
        verifiableDocumentId: input.verifiableDocumentId,
        nup: input.nup ?? undefined,
        signerId: ctx.user.id,
        signerName: ctx.user.name ?? "Usuário",
        signerCpfMasked: input.cpfMasked ?? undefined,
        signerRole: (input.role || ctx.user.role) ?? undefined,
        signerUnit: input.unit ?? undefined,
        signatureType: input.signatureType,
        signatureMethod: input.signatureType === "institutional"
          ? "CAIUS-INSTITUTIONAL"
          : input.signatureType === "advanced"
          ? "CAIUS-ADVANCED"
          : "ICP-BRASIL",
        documentHash: documentHash ?? undefined,
        signatureHash,
        algorithm: "SHA-256",
        ipAddress: input.ipAddress ?? undefined,
        userAgent: input.userAgent ?? undefined,
        accessCode,
        verificationUrl: verificationUrl ?? undefined,
        status: "valid",
        signatureOrder,
      });

      return { success: true, accessCode, verificationUrl };
    }),

  // ── Revogar assinatura ────────────────────────────────────────────────────
  revokeSignature: protectedProcedure
    .input(z.object({
      signatureId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const sigs = await db.select().from(documentSignatures)
        .where(eq(documentSignatures.id, input.signatureId))
        .limit(1);

      if (!sigs.length) return { success: false, message: "Assinatura não encontrada." };
      if (sigs[0].signerId !== ctx.user.id && ctx.user.role !== "admin") {
        return { success: false, message: "Sem permissão para revogar esta assinatura." };
      }

      await db.update(documentSignatures)
        .set({ status: "revoked", revokedAt: new Date(), revocationReason: input.reason })
        .where(eq(documentSignatures.id, input.signatureId));

      return { success: true };
    }),

  // ── Listar assinaturas de um documento ────────────────────────────────────
  getSignatures: protectedProcedure
    .input(z.object({ verifiableDocumentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      return db.select().from(documentSignatures)
        .where(eq(documentSignatures.verifiableDocumentId, input.verifiableDocumentId))
        .orderBy(documentSignatures.signatureOrder);
    }),

  // ── Listar documentos verificáveis do usuário/admin ────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      entityType: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const query = db.select().from(verifiableDocuments)
        .orderBy(desc(verifiableDocuments.issuedAt))
        .limit(input.limit);

      return query;
    }),

  // ── Download PDF consolidado (documento original + página de assinatura) ─────
  downloadSignedPdf: protectedProcedure
    .input(z.object({
      verifiableDocumentId: z.number(),
      // Para PDF externo: s3Key ou s3Url do arquivo original
      originalPdfS3Key: z.string().optional(),
      originalPdfUrl: z.string().optional(),
      // Para documento interno: conteúdo HTML/texto a ser incluído
      documentContent: z.string().optional(),
      origin: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Buscar documento verificável
      const docs = await db.select().from(verifiableDocuments)
        .where(eq(verifiableDocuments.id, input.verifiableDocumentId))
        .limit(1);
      if (!docs.length) throw new Error("Documento não encontrado");
      const doc = docs[0];

      // Buscar assinaturas
      const sigs = await db.select().from(documentSignatures)
        .where(eq(documentSignatures.verifiableDocumentId, doc.id))
        .orderBy(documentSignatures.signatureOrder);

      // Tentar buscar o PDF original do S3
      let originalPdfBytes: Uint8Array | null = null;
      try {
        let pdfUrl = input.originalPdfUrl;

        // 1. Se passou s3Key diretamente, buscar URL presigned
        if (!pdfUrl && input.originalPdfS3Key) {
          const { url } = await storageGet(input.originalPdfS3Key);
          pdfUrl = url;
        }

        // 2. Para entityType "custom": o entityId É o ID do attachment (PDF externo)
        if (!pdfUrl && doc.entityType === "custom" && doc.entityId > 0) {
          const att = await db.select().from(attachments)
            .where(eq(attachments.id, doc.entityId))
            .limit(1);
          if (att.length > 0 && att[0].s3Url) {
            // Usar s3Url diretamente (URL pública do S3)
            pdfUrl = att[0].s3Url;
          } else if (att.length > 0 && att[0].s3Key) {
            // Fallback: gerar URL presigned
            const { url } = await storageGet(att[0].s3Key);
            pdfUrl = url;
          }
        }

        // 3. Para outros entityTypes: buscar attachment pelo entityType+entityId
        if (!pdfUrl && doc.entityType !== "custom") {
          const att = await db.select().from(attachments)
            .where(and(
              eq(attachments.entityId, doc.entityId),
              eq(attachments.entityType, doc.entityType),
            ))
            .orderBy(desc(attachments.createdAt))
            .limit(1);
          if (att.length > 0 && att[0].s3Url) {
            pdfUrl = att[0].s3Url;
          } else if (att.length > 0 && att[0].s3Key) {
            const { url } = await storageGet(att[0].s3Key);
            pdfUrl = url;
          }
        }

        if (pdfUrl) {
          console.log("[downloadSignedPdf] Buscando PDF original:", pdfUrl.substring(0, 80) + "...");
          const res = await fetch(pdfUrl, {
            headers: { "Accept": "application/pdf,*/*" },
          });
          console.log("[downloadSignedPdf] Resposta:", res.status, res.headers.get("content-type"));
          if (res.ok) {
            const buf = await res.arrayBuffer();
            console.log("[downloadSignedPdf] Bytes recebidos:", buf.byteLength);
            if (buf.byteLength > 0) {
              originalPdfBytes = new Uint8Array(buf);
            }
          } else {
            console.warn("[downloadSignedPdf] Fetch falhou:", res.status, res.statusText);
          }
        } else {
          console.warn("[downloadSignedPdf] Nenhuma URL de PDF encontrada. entityType:", doc.entityType, "entityId:", doc.entityId);
        }
      } catch (err) {
        console.error("[downloadSignedPdf] Erro ao buscar PDF original:", err);
        // Se não conseguir o PDF original, gera apenas a página de assinatura
      }
      console.log("[downloadSignedPdf] originalPdfBytes:", originalPdfBytes ? originalPdfBytes.byteLength + " bytes" : "null");

      // ─── Gerar página(s) de chancela com controle de overflow ───────────────────
      const FOOTER_RESERVED = 80; // espaço reservado para rodapé na última página
      const PAGE_W = 595.28;
      const PAGE_H = 841.89;
      const MARGIN = 50;
      const CONTENT_W = PAGE_W - 2 * MARGIN;

      const signaturePdf = await PDFDocument.create();
      const fontBold = await signaturePdf.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await signaturePdf.embedFont(StandardFonts.Helvetica);
      const fontMono = await signaturePdf.embedFont(StandardFonts.Courier);

      const blue = rgb(0.1, 0.22, 0.42);
      const lightBlue = rgb(0.93, 0.96, 1.0);
      const gray = rgb(0.45, 0.45, 0.45);
      const darkGray = rgb(0.2, 0.2, 0.2);
      const green = rgb(0.13, 0.55, 0.13);
      const white = rgb(1, 1, 1);

      // Helper: adicionar nova página e resetar y
      let currentPage = signaturePdf.addPage([PAGE_W, PAGE_H]);
      let y = PAGE_H - MARGIN;

      const newPage = () => {
        currentPage = signaturePdf.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      };

      // Helper: garantir espaço mínimo (cria nova página se necessário)
      const ensureSpace = (needed: number) => {
        if (y - needed < FOOTER_RESERVED) newPage();
      };

      // Helper: quebrar texto em linhas que cabem na largura
      const wrapText = (text: string, font: typeof fontRegular, size: number, maxW: number): string[] => {
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
      };

      // ── Cabeçalho (fundo azul) ──
      currentPage.drawRectangle({ x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80, color: blue });
      currentPage.drawText("CHANCELA DE AUTENTICIDADE", {
        x: MARGIN, y: PAGE_H - 32, size: 14, font: fontBold, color: white,
      });
      currentPage.drawText("Documento Assinado Eletronicamente - CAIUS", {
        x: MARGIN, y: PAGE_H - 50, size: 9, font: fontRegular, color: rgb(0.8, 0.88, 1.0),
      });
      const orgText = doc.issuingUnit ?? "CAIUS - Plataforma Institucional";
      const orgLines = wrapText(orgText, fontRegular, 7.5, 180);
      orgLines.forEach((line, i) => {
        const lw = fontRegular.widthOfTextAtSize(line, 7.5);
        currentPage.drawText(line, {
          x: PAGE_W - MARGIN - lw, y: PAGE_H - 38 - i * 12, size: 7.5, font: fontRegular, color: rgb(0.8, 0.88, 1.0),
        });
      });

      y = PAGE_H - 96;

      // ── Título do documento ──
      ensureSpace(50);
      currentPage.drawText("DOCUMENTO", { x: MARGIN, y, size: 7, font: fontBold, color: gray });
      y -= 14;
      // Quebrar título longo em múltiplas linhas
      const titleLines = wrapText(doc.title, fontBold, 12, CONTENT_W);
      for (const tl of titleLines) {
        ensureSpace(18);
        currentPage.drawText(tl, { x: MARGIN, y, size: 12, font: fontBold, color: darkGray });
        y -= 16;
      }
      y -= 6;

      // Linha separadora
      ensureSpace(20);
      currentPage.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      y -= 16;

      // ── Dados do documento (2 colunas) ──
      const col1 = MARGIN;
      const col2 = MARGIN + 260;
      const colW = 230;

      const drawField2 = (label: string, value: string, x: number, colWidth = colW) => {
        ensureSpace(32);
        currentPage.drawText(label.toUpperCase(), { x, y, size: 6.5, font: fontBold, color: gray });
        y -= 12;
        const valLines = wrapText(value || "-", fontRegular, 9, colWidth);
        for (const vl of valLines) {
          ensureSpace(14);
          currentPage.drawText(vl, { x, y, size: 9, font: fontRegular, color: darkGray });
          y -= 12;
        }
      };

      // Linha 1: Tipo + Unidade
      const savedY1 = y;
      drawField2("Tipo de Documento", doc.documentType, col1);
      const afterCol1_1 = y;
      y = savedY1;
      drawField2("Unidade Emissora", doc.issuingUnit ?? "-", col2);
      y = Math.min(afterCol1_1, y) - 6;

      // Linha 2: NUP + Número
      const savedY2 = y;
      drawField2("NUP", doc.nup ?? "-", col1);
      const afterCol1_2 = y;
      y = savedY2;
      drawField2("Numero do Documento", doc.documentNumber ?? "-", col2);
      y = Math.min(afterCol1_2, y) - 6;

      // Linha 3: Data + Status
      const issuedAtStr = doc.issuedAt
        ? new Date(doc.issuedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
        : "-";
      const savedY3 = y;
      drawField2("Data de Emissão", issuedAtStr, col1);
      const afterCol1_3 = y;
      y = savedY3;
      const statusLabel = doc.status === "authentic" ? "AUTENTICO" : (doc.status ?? "Desconhecido");
      drawField2("Status", statusLabel, col2);
      y = Math.min(afterCol1_3, y) - 10;

      // ── Chave de verificação ──
      ensureSpace(40);
      currentPage.drawRectangle({ x: MARGIN, y: y - 6, width: CONTENT_W, height: 32, color: lightBlue });
      currentPage.drawText("CHAVE DE VERIFICAÇÃO", { x: MARGIN + 8, y: y + 16, size: 6.5, font: fontBold, color: blue });
      currentPage.drawText(doc.verificationKey, { x: MARGIN + 8, y: y + 4, size: 10, font: fontMono, color: blue });
      y -= 44;

      // ── Link de verificação ──
      const verifyUrl = doc.verificationUrl ?? `${input.origin ?? "https://cac.itabaiana.pb.gov.br"}/verificar/${doc.verificationKey}`;
      ensureSpace(30);
      currentPage.drawText("LINK DE VERIFICAÇÃO", { x: MARGIN, y, size: 6.5, font: fontBold, color: gray });
      y -= 12;
      const linkLines = wrapText(verifyUrl, fontMono, 8, CONTENT_W - 10);
      for (const ll of linkLines) {
        ensureSpace(14);
        currentPage.drawText(ll, { x: MARGIN, y, size: 8, font: fontMono, color: blue });
        y -= 12;
      }
      y -= 12;

      // Linha separadora
      ensureSpace(20);
      currentPage.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      y -= 16;

      // ── Assinaturas ──
      if (sigs.length > 0) {
        ensureSpace(24);
        currentPage.drawText("ASSINATURAS ELETRÔNICAS", { x: MARGIN, y, size: 8, font: fontBold, color: blue });
        y -= 16;

        for (const sig of sigs) {
          // Calcular altura do bloco de assinatura
          const hasRoleUnit = !!(sig.signerRole || sig.signerUnit);
          const hasCpf = !!sig.signerCpfMasked;
          const hasCode = !!sig.accessCode;
          const blockH = 16 + (hasRoleUnit ? 14 : 0) + 12 + 12 + (hasCode ? 12 : 0) + 8;

          ensureSpace(blockH + 10);

          const blockTop = y + 4;
          currentPage.drawRectangle({ x: MARGIN, y: y - blockH + 8, width: CONTENT_W, height: blockH, color: rgb(0.97, 0.97, 0.97) });
          currentPage.drawRectangle({ x: MARGIN, y: y - blockH + 8, width: 3, height: blockH, color: green });

          const sigX = MARGIN + 10;
          currentPage.drawText(`${sig.signatureOrder}. ${sig.signerName}`, { x: sigX, y, size: 10, font: fontBold, color: darkGray });
          y -= 14;

          if (hasRoleUnit) {
            const roleUnit = [sig.signerRole, sig.signerUnit].filter(Boolean).join(" - ");
            const ruLines = wrapText(roleUnit, fontRegular, 8, CONTENT_W - 20);
            for (const rl of ruLines) {
              currentPage.drawText(rl, { x: sigX, y, size: 8, font: fontRegular, color: gray });
              y -= 12;
            }
          }

          const sigDate = sig.signedAt ? new Date(sig.signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "-";
          currentPage.drawText(`Assinado em: ${sigDate}`, { x: sigX, y, size: 7.5, font: fontRegular, color: gray });
          y -= 12;

          const typeLabel = sig.signatureType === "institutional" ? "Assinatura Institucional"
            : sig.signatureType === "advanced" ? "Assinatura Avançada"
            : "Assinatura Qualificada ICP-Brasil";
          const cpfPart = hasCpf ? `   |   CPF: ${sig.signerCpfMasked}` : "";
          currentPage.drawText(`Tipo: ${typeLabel}${cpfPart}`, { x: sigX, y, size: 7.5, font: fontRegular, color: gray, maxWidth: CONTENT_W - 20 });
          y -= 12;

          if (hasCode) {
            currentPage.drawText(`Código de Acesso: ${sig.accessCode}`, { x: sigX, y, size: 7, font: fontMono, color: blue });
            y -= 12;
          }

          y -= 10; // espaço entre assinaturas
        }
      }

      // ── Rodapé institucional (fixo na última página de chancela) ──
      const footerY = 30;
      currentPage.drawLine({ start: { x: MARGIN, y: footerY + 28 }, end: { x: PAGE_W - MARGIN, y: footerY + 28 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      currentPage.drawText("Este documento foi assinado eletronicamente conforme a Lei nº 14.063/2020 e tem validade jurídica.", {
        x: MARGIN, y: footerY + 16, size: 7, font: fontRegular, color: gray, maxWidth: CONTENT_W,
      });
      const footerLinkLines = wrapText("Autenticidade verificável em: " + verifyUrl, fontMono, 6.5, CONTENT_W);
      footerLinkLines.forEach((fl, i) => {
        currentPage.drawText(fl, { x: MARGIN, y: footerY + 4 - i * 10, size: 6.5, font: fontMono, color: blue });
      });

      // ── Merge com o PDF original ──
      const signatureBytes = await signaturePdf.save();

      let finalPdfBytes: Uint8Array;

      if (originalPdfBytes) {
        try {
          // Validar que os bytes começam com %PDF (header PDF)
          const pdfHeader = Buffer.from(originalPdfBytes.slice(0, 4)).toString("ascii");
          if (!pdfHeader.startsWith("%PDF")) {
            console.warn("[downloadSignedPdf] Bytes não parecem um PDF válido. Header:", pdfHeader);
            throw new Error("Invalid PDF header");
          }

          // Carregar PDF original e inserir rodapé de referência em cada página
          const originalDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
          const refFontBold = await originalDoc.embedFont(StandardFonts.HelveticaBold);
          const refFontReg = await originalDoc.embedFont(StandardFonts.Helvetica);
          const refBlue = rgb(0.1, 0.22, 0.42);
          const refGray = rgb(0.5, 0.5, 0.5);

          const nupShort = doc.nup ?? doc.verificationKey;
          const refText1 = `Documento assinado eletronicamente no CAIUS  |  NUP: ${nupShort}`;
          const refText2 = `Chave: ${doc.verificationKey}  |  Verificar autenticidade na última página ou em: ${verifyUrl}`;

          const pages = originalDoc.getPages();
          for (const pg of pages) {
            const { width: pgW, height: pgH } = pg.getSize();
            const refMargin = 30;
            const refY = 18;

            // Linha separadora acima do rodapé
            pg.drawLine({
              start: { x: refMargin, y: refY + 22 },
              end: { x: pgW - refMargin, y: refY + 22 },
              thickness: 0.4,
              color: refGray,
            });

            // Linha 1: CAIUS + NUP
            pg.drawText(refText1, {
              x: refMargin, y: refY + 10,
              size: 6.5, font: refFontBold, color: refBlue,
              maxWidth: pgW - 2 * refMargin,
            });

            // Linha 2: Chave + link
            pg.drawText(refText2, {
              x: refMargin, y: refY - 1,
              size: 5.5, font: refFontReg, color: refGray,
              maxWidth: pgW - 2 * refMargin,
            });
          }

          // Merge: original (com rodapés) + página(s) de assinatura
          const mergedDoc = await PDFDocument.create();
          const originalPages = await mergedDoc.copyPages(originalDoc, originalDoc.getPageIndices());
          for (const p of originalPages) mergedDoc.addPage(p);
          // Copiar todas as páginas da chancela
          const signatureDoc = await PDFDocument.load(signatureBytes);
          const sigPages = await mergedDoc.copyPages(signatureDoc, signatureDoc.getPageIndices());
          for (const sp of sigPages) mergedDoc.addPage(sp);
          finalPdfBytes = await mergedDoc.save();
          console.log("[downloadSignedPdf] Merge bem-sucedido. Páginas originais:", originalDoc.getPageCount(), "+ chancela:", signatureDoc.getPageCount());
        } catch (mergeErr) {
          console.error("[downloadSignedPdf] Erro no merge:", mergeErr);
          // Se o merge falhar, retornar apenas a página de assinatura
          finalPdfBytes = signatureBytes;
        }
      } else {
        // Sem PDF original: retornar apenas a página de assinatura
        console.warn("[downloadSignedPdf] Sem PDF original — retornando apenas página de assinatura.");
        finalPdfBytes = signatureBytes;
      }

      // Retornar como base64
      const base64 = Buffer.from(finalPdfBytes).toString("base64");
      return {
        success: true,
        base64Pdf: base64,
        fileName: `${doc.title.replace(/[^a-zA-Z0-9\u00C0-\u017E\s]/g, "").trim().replace(/\s+/g, "_")}_assinado.pdf`,
        pageCount: originalPdfBytes ? undefined : 1,
      };
    }),
});