/**
 * Router de Gestão Documental Avançada — versões, numeração, PDF, assinatura, verificação pública
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  verifiableDocuments,
  documentSignatures,
  documentVerificationLogs,
  documentVersions,
  documentNumberSequences,
  documentReadLogs,
} from "../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import crypto from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  return db;
}

function generateVerificationKey(): string {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

function generateAccessCode(): string {
  return crypto.randomBytes(12).toString("hex").toUpperCase();
}

// ─── DocumentNumberService ────────────────────────────────────────────────────
async function getNextDocumentNumber(documentType: string, orgUnitId?: number): Promise<string> {
  const db = await requireDb();
  const year = new Date().getFullYear();

  const [existing] = await db
    .select()
    .from(documentNumberSequences)
    .where(
      and(
        eq(documentNumberSequences.documentType, documentType),
        eq(documentNumberSequences.year, year)
      )
    );

  if (existing) {
    const nextNumber = (existing.lastNumber ?? 0) + 1;
    await db
      .update(documentNumberSequences)
      .set({ lastNumber: nextNumber })
      .where(eq(documentNumberSequences.id, existing.id));
    const prefix = existing.prefix ?? documentType.substring(0, 3).toUpperCase();
    return `${prefix}-${year}-${String(nextNumber).padStart(4, "0")}`;
  } else {
    await db.insert(documentNumberSequences).values({
      documentType,
      orgUnitId,
      year,
      lastNumber: 1,
      prefix: documentType.substring(0, 3).toUpperCase(),
    });
    return `${documentType.substring(0, 3).toUpperCase()}-${year}-0001`;
  }
}

// ─── Router ────────────────────────────────────────────────────────────────────
export const documentsRouter = router({
  // ── Versioning ────────────────────────────────────────────────────────────────
  versions: router({
    list: protectedProcedure
      .input(z.object({ documentId: z.number(), documentType: z.string() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        return db
          .select()
          .from(documentVersions)
          .where(
            and(
              eq(documentVersions.documentId, input.documentId),
              eq(documentVersions.documentType, input.documentType)
            )
          )
          .orderBy(desc(documentVersions.version));
      }),

    create: protectedProcedure
      .input(
        z.object({
          documentId: z.number(),
          documentType: z.string(),
          content: z.string().optional(),
          htmlContent: z.string().optional(),
          pdfUrl: z.string().optional(),
          changeDescription: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();

        // Get current max version
        const existing = await db
          .select()
          .from(documentVersions)
          .where(
            and(
              eq(documentVersions.documentId, input.documentId),
              eq(documentVersions.documentType, input.documentType)
            )
          )
          .orderBy(desc(documentVersions.version))
          .limit(1);

        const nextVersion = existing.length > 0 ? (existing[0].version + 1) : 1;

        const [result] = await db.insert(documentVersions).values({
          documentId: input.documentId,
          documentType: input.documentType,
          version: nextVersion,
          content: input.content,
          htmlContent: input.htmlContent,
          pdfUrl: input.pdfUrl,
          changeDescription: input.changeDescription,
          createdById: ctx.user.id,
        });

        return { id: (result as { insertId: number }).insertId, version: nextVersion };
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const [version] = await db
          .select()
          .from(documentVersions)
          .where(eq(documentVersions.id, input.id));
        if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Versão não encontrada" });
        return version;
      }),
  }),

  // ── Numbering ─────────────────────────────────────────────────────────────────
  numbering: router({
    getNext: protectedProcedure
      .input(z.object({ documentType: z.string(), orgUnitId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const number = await getNextDocumentNumber(input.documentType, input.orgUnitId);
        return { number };
      }),
  }),

  // ── Verifiable Documents ──────────────────────────────────────────────────────
  verifiable: router({
    list: protectedProcedure
      .input(
        z.object({
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await requireDb();
        return db
          .select()
          .from(verifiableDocuments)
          .orderBy(desc(verifiableDocuments.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await requireDb();
        const [doc] = await db
          .select()
          .from(verifiableDocuments)
          .where(eq(verifiableDocuments.id, input.id));
        if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Documento não encontrado" });

        // Log read access
        await db.insert(documentReadLogs).values({
          documentId: input.id,
          documentType: "verifiable",
          readById: ctx.user.id,
          isPublicAccess: false,
        });

        return doc;
      }),

    create: protectedProcedure
      .input(
        z.object({
          entityType: z.enum(["protocol", "process", "document", "ombudsman", "template", "receipt", "report", "custom"]),
          entityId: z.number(),
          nup: z.string().optional(),
          title: z.string(),
          documentType: z.string(),
          documentNumber: z.string().optional(),
          issuingUnit: z.string().optional(),
          isPublic: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const verificationKey = generateVerificationKey();

        const [result] = await db.insert(verifiableDocuments).values({
          entityType: input.entityType,
          entityId: input.entityId,
          nup: input.nup,
          verificationKey,
          title: input.title,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          issuingUnit: input.issuingUnit,
          issuingUserId: ctx.user.id,
          issuingUserName: ctx.user.name ?? "Usuário",
          isPublic: input.isPublic ?? true,
          status: "authentic",
        });

        return { id: (result as { insertId: number }).insertId, verificationKey };
      }),
  }),

  // ── Signatures ────────────────────────────────────────────────────────────────
  signatures: router({
    list: protectedProcedure
      .input(z.object({ verifiableDocumentId: z.number() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        return db
          .select()
          .from(documentSignatures)
          .where(eq(documentSignatures.verifiableDocumentId, input.verifiableDocumentId))
          .orderBy(asc(documentSignatures.signedAt));
      }),

    sign: protectedProcedure
      .input(
        z.object({
          verifiableDocumentId: z.number(),
          nup: z.string().optional(),
          signatureType: z.enum(["institutional", "advanced", "qualified"]).optional(),
          signerRole: z.string().optional(),
          signerUnit: z.string().optional(),
          ipAddress: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();

        // Check if document exists
        const [doc] = await db
          .select()
          .from(verifiableDocuments)
          .where(eq(verifiableDocuments.id, input.verifiableDocumentId));

        if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Documento não encontrado" });
        if (doc.status === "cancelled" || doc.status === "revoked") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Documento não pode ser assinado" });
        }

        // Get current signature order
        const existingSigs = await db
          .select()
          .from(documentSignatures)
          .where(eq(documentSignatures.verifiableDocumentId, input.verifiableDocumentId));

        const accessCode = generateAccessCode();

        const [result] = await db.insert(documentSignatures).values({
          verifiableDocumentId: input.verifiableDocumentId,
          nup: input.nup,
          signerId: ctx.user.id,
          signerName: ctx.user.name ?? "Usuário",
          signerRole: input.signerRole,
          signerUnit: input.signerUnit,
          signatureType: input.signatureType ?? "institutional",
          accessCode,
          ipAddress: input.ipAddress,
          status: "valid",
          signatureOrder: existingSigs.length + 1,
        });

        return { id: (result as { insertId: number }).insertId, accessCode };
      }),
  }),

  // ── Public Verification ───────────────────────────────────────────────────────
  publicVerify: publicProcedure
    .input(z.object({ verificationKey: z.string(), ip: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await requireDb();

      const [doc] = await db
        .select()
        .from(verifiableDocuments)
        .where(eq(verifiableDocuments.verificationKey, input.verificationKey));

      if (!doc) {
        // Log failed verification
        await db.insert(documentVerificationLogs).values({
          verificationKey: input.verificationKey,
          queryType: "key",
          ipAddress: input.ip ?? "unknown",
          result: "not_found",
        });
        return { valid: false, document: null };
      }

      // Log successful verification
      await db.insert(documentVerificationLogs).values({
        verifiableDocumentId: doc.id,
        verificationKey: input.verificationKey,
        queryType: "key",
        ipAddress: input.ip ?? "unknown",
        result: "found",
      });

      await db.insert(documentReadLogs).values({
        documentId: doc.id,
        documentType: "verifiable",
        readByIp: input.ip ?? "unknown",
        isPublicAccess: true,
      });

      const signatures = await db
        .select()
        .from(documentSignatures)
        .where(eq(documentSignatures.verifiableDocumentId, doc.id))
        .orderBy(asc(documentSignatures.signedAt));

      return {
        valid: true,
        document: {
          id: doc.id,
          title: doc.title,
          documentNumber: doc.documentNumber,
          documentType: doc.documentType,
          issuedAt: doc.issuedAt,
          status: doc.status,
          nup: doc.nup,
          issuingUnit: doc.issuingUnit,
          issuingUserName: doc.issuingUserName,
          signatures: signatures.map((s) => ({
            signerName: s.signerName,
            signerRole: s.signerRole,
            signedAt: s.signedAt,
            signatureType: s.signatureType,
            status: s.status,
            signatureOrder: s.signatureOrder,
          })),
        },
      };
    }),

  // ── Read Logs ─────────────────────────────────────────────────────────────────
  readLogs: router({
    list: protectedProcedure
      .input(z.object({ documentId: z.number(), documentType: z.string() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        return db
          .select()
          .from(documentReadLogs)
          .where(
            and(
              eq(documentReadLogs.documentId, input.documentId),
              eq(documentReadLogs.documentType, input.documentType)
            )
          )
          .orderBy(desc(documentReadLogs.createdAt))
          .limit(100);
      }),
  }),
});
