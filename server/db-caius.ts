import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  adminProcesses,
  processDeadlineHistory,
  InsertProcessDeadlineHistory,
  aiProviders,
  aiUsageLogs,
  auditLogs,
  documentTemplates,
  electronicSignatures,
  InsertAdminProcess,
  InsertAiProvider,
  InsertAiUsageLog,
  InsertAuditLog,
  InsertDocumentTemplate,
  InsertElectronicSignature,
  InsertOfficialDocument,
  InsertOmbudsmanManifestation,
  InsertProtocol,
  InsertSector,
  InsertTramitation,
  nupCounter,
  officialDocuments,
  ombudsmanManifestations,
  protocols,
  sectors,
  tramitations,
  users,
} from "../drizzle/schema";

// ─── NUP Generation ───────────────────────────────────────────────────────────
// Format: PMI-YYYY-NNNNNN (e.g. PMI-2026-000001)
export async function generateNup(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const year = new Date().getFullYear();

  // Upsert counter for this year
  const existing = await db
    .select()
    .from(nupCounter)
    .where(eq(nupCounter.year, year))
    .limit(1);

  let sequence: number;
  if (existing.length === 0) {
    await db.insert(nupCounter).values({ year, sequence: 1 });
    sequence = 1;
  } else {
    sequence = (existing[0]!.sequence ?? 0) + 1;
    await db
      .update(nupCounter)
      .set({ sequence })
      .where(eq(nupCounter.year, year));
  }

  const padded = String(sequence).padStart(6, "0");
  return `PMI-${year}-${padded}`;
}

export async function isNupUnique(nup: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [p, o, ap, om] = await Promise.all([
    db.select({ id: protocols.id }).from(protocols).where(eq(protocols.nup, nup)).limit(1),
    db.select({ id: officialDocuments.id }).from(officialDocuments).where(eq(officialDocuments.nup, nup)).limit(1),
    db.select({ id: adminProcesses.id }).from(adminProcesses).where(eq(adminProcesses.nup, nup)).limit(1),
    db.select({ id: ombudsmanManifestations.id }).from(ombudsmanManifestations).where(eq(ombudsmanManifestations.nup, nup)).limit(1),
  ]);
  return p.length === 0 && o.length === 0 && ap.length === 0 && om.length === 0;
}

// ─── Sectors ──────────────────────────────────────────────────────────────────
export async function getSectors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sectors).orderBy(sectors.name);
}

export async function getSectorById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(sectors).where(eq(sectors.id, id)).limit(1);
  return r[0] ?? null;
}

export async function createSector(data: InsertSector) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(sectors).values(data);
}

export async function updateSector(id: number, data: Partial<InsertSector>) {
  const db = await getDb();
  if (!db) return;
  await db.update(sectors).set(data).where(eq(sectors.id, id));
}

export async function deleteSector(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(sectors).where(eq(sectors.id, id));
}

// ─── Protocols ────────────────────────────────────────────────────────────────
export async function getProtocols(filters?: {
  status?: string;
  type?: string;
  sectorId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(protocols.status, filters.status as any));
  if (filters?.type) conditions.push(eq(protocols.type, filters.type as any));
  if (filters?.sectorId) conditions.push(eq(protocols.responsibleSectorId, filters.sectorId));
  if (filters?.search) {
    conditions.push(
      or(
        like(protocols.nup, `%${filters.search}%`),
        like(protocols.subject, `%${filters.search}%`),
        like(protocols.requesterName, `%${filters.search}%`),
        like(protocols.requesterEmail, `%${filters.search}%`),
        like(protocols.requesterCpfCnpj, `%${filters.search}%`)
      )
    );
  }
  const query = db
    .select({
      protocol: protocols,
      sector: sectors,
      responsible: users,
    })
    .from(protocols)
    .leftJoin(sectors, eq(protocols.responsibleSectorId, sectors.id))
    .leftJoin(users, eq(protocols.responsibleUserId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(protocols.createdAt))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);
  return query;
}

export async function getProtocolByNup(nup: string) {
  const db = await getDb();
  if (!db) return null;
  const r = await db
    .select({ protocol: protocols, sector: sectors, responsible: users })
    .from(protocols)
    .leftJoin(sectors, eq(protocols.responsibleSectorId, sectors.id))
    .leftJoin(users, eq(protocols.responsibleUserId, users.id))
    .where(eq(protocols.nup, nup))
    .limit(1);
  return r[0] ?? null;
}

export async function getProtocolById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db
    .select({ protocol: protocols, sector: sectors, responsible: users })
    .from(protocols)
    .leftJoin(sectors, eq(protocols.responsibleSectorId, sectors.id))
    .leftJoin(users, eq(protocols.responsibleUserId, users.id))
    .where(eq(protocols.id, id))
    .limit(1);
  return r[0] ?? null;
}

export async function createProtocol(data: Omit<InsertProtocol, "nup">) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const nup = await generateNup();
  const result = await db.insert(protocols).values({ ...data, nup });
  return { nup, protocolId: Number(result[0].insertId) };
}

export async function updateProtocol(id: number, data: Partial<InsertProtocol>) {
  const db = await getDb();
  if (!db) return;
  await db.update(protocols).set(data).where(eq(protocols.id, id));
}

export async function getProtocolStats() {
  const db = await getDb();
  if (!db) return { open: 0, in_analysis: 0, in_progress: 0, concluded: 0, total: 0 };
  const rows = await db
    .select({ status: protocols.status, count: sql<number>`count(*)` })
    .from(protocols)
    .groupBy(protocols.status);
  const map: Record<string, number> = {};
  for (const r of rows) map[r.status] = Number(r.count);
  return {
    open: map["open"] ?? 0,
    in_analysis: map["in_analysis"] ?? 0,
    pending_docs: map["pending_docs"] ?? 0,
    in_progress: map["in_progress"] ?? 0,
    concluded: map["concluded"] ?? 0,
    archived: map["archived"] ?? 0,
    total: Object.values(map).reduce((a, b) => a + b, 0),
  };
}

// ─── Tramitations ─────────────────────────────────────────────────────────────
export async function getTramitationsByProtocol(protocolId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ tramitation: tramitations, fromUser: users, toUser: users })
    .from(tramitations)
    .leftJoin(users, eq(tramitations.fromUserId, users.id))
    .where(eq(tramitations.protocolId, protocolId))
    .orderBy(desc(tramitations.createdAt));
}

export async function createTramitation(data: InsertTramitation) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(tramitations).values(data);
  return { tramitationId: Number(result[0].insertId) };
}

// ─── Official Documents ───────────────────────────────────────────────────────
export async function getOfficialDocuments(filters?: {
  type?: string;
  status?: string;
  sectorId?: number;
  protocolId?: number;
  search?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.type) conditions.push(eq(officialDocuments.type, filters.type as any));
  if (filters?.status) conditions.push(eq(officialDocuments.status, filters.status as any));
  if (filters?.sectorId) conditions.push(eq(officialDocuments.sectorId, filters.sectorId));
  if (filters?.protocolId) conditions.push(eq(officialDocuments.protocolId, filters.protocolId));
  if (filters?.search) {
    conditions.push(
      or(
        like(officialDocuments.title, `%${filters.search}%`),
        like(officialDocuments.number, `%${filters.search}%`),
        like(officialDocuments.nup, `%${filters.search}%`)
      )
    );
  }
  return db
    .select({ document: officialDocuments, author: users, sector: sectors })
    .from(officialDocuments)
    .leftJoin(users, eq(officialDocuments.authorId, users.id))
    .leftJoin(sectors, eq(officialDocuments.sectorId, sectors.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(officialDocuments.createdAt))
    .limit(filters?.limit ?? 50);
}

export async function getOfficialDocumentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db
    .select({ document: officialDocuments, author: users, sector: sectors })
    .from(officialDocuments)
    .leftJoin(users, eq(officialDocuments.authorId, users.id))
    .leftJoin(sectors, eq(officialDocuments.sectorId, sectors.id))
    .where(eq(officialDocuments.id, id))
    .limit(1);
  return r[0] ?? null;
}

export async function createOfficialDocument(data: Omit<InsertOfficialDocument, "nup" | "number">) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Generate document number: TYPE-YYYY-NNNN
  const year = new Date().getFullYear();
  const count = await db.select({ c: sql<number>`count(*)` }).from(officialDocuments);
  const seq = (Number(count[0]?.c ?? 0) + 1).toString().padStart(4, "0");
  const typeCode = (data.type ?? "DOC").toUpperCase().slice(0, 3);
  const number = `${typeCode}-${year}-${seq}`;
  const nup = await generateNup();
  await db.insert(officialDocuments).values({ ...data, nup, number });
  return { nup, number };
}

export async function updateOfficialDocument(id: number, data: Partial<InsertOfficialDocument>) {
  const db = await getDb();
  if (!db) return;
  await db.update(officialDocuments).set(data).where(eq(officialDocuments.id, id));
}

// ─── Admin Processes ──────────────────────────────────────────────────────────
export async function getAdminProcesses(filters?: {
  status?: string;
  type?: string;
  sectorId?: number;
  search?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(adminProcesses.status, filters.status as any));
  if (filters?.sectorId) conditions.push(eq(adminProcesses.responsibleSectorId, filters.sectorId));
  if (filters?.search) {
    conditions.push(
      or(
        like(adminProcesses.nup, `%${filters.search}%`),
        like(adminProcesses.title, `%${filters.search}%`)
      )
    );
  }
  return db
    .select({ process: adminProcesses, sector: sectors, responsible: users })
    .from(adminProcesses)
    .leftJoin(sectors, eq(adminProcesses.responsibleSectorId, sectors.id))
    .leftJoin(users, eq(adminProcesses.responsibleUserId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(adminProcesses.createdAt))
    .limit(filters?.limit ?? 50);
}

export async function getAdminProcessById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db
    .select({ process: adminProcesses, sector: sectors, responsible: users })
    .from(adminProcesses)
    .leftJoin(sectors, eq(adminProcesses.responsibleSectorId, sectors.id))
    .leftJoin(users, eq(adminProcesses.responsibleUserId, users.id))
    .where(eq(adminProcesses.id, id))
    .limit(1);
  return r[0] ?? null;
}

export async function createAdminProcess(data: Omit<InsertAdminProcess, "nup">) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const nup = await generateNup();
  await db.insert(adminProcesses).values({ ...data, nup });
  return nup;
}

export async function updateAdminProcess(id: number, data: Partial<InsertAdminProcess>) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminProcesses).set(data).where(eq(adminProcesses.id, id));
}

// ─── Process Deadline History ─────────────────────────────────────────────────
export async function getProcessDeadlineHistory(processId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(processDeadlineHistory)
    .where(eq(processDeadlineHistory.processId, processId))
    .orderBy(desc(processDeadlineHistory.createdAt));
}

export async function addProcessDeadlineHistory(data: InsertProcessDeadlineHistory) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(processDeadlineHistory).values(data);
}

// ─── Ombudsman ────────────────────────────────────────────────────────────────
export async function getOmbudsmanManifestations(filters?: {
  type?: string;
  status?: string;
  search?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.type) conditions.push(eq(ombudsmanManifestations.type, filters.type as any));
  if (filters?.status) conditions.push(eq(ombudsmanManifestations.status, filters.status as any));
  if (filters?.search) {
    conditions.push(
      or(
        like(ombudsmanManifestations.nup, `%${filters.search}%`),
        like(ombudsmanManifestations.subject, `%${filters.search}%`),
        like(ombudsmanManifestations.requesterName, `%${filters.search}%`)
      )
    );
  }
  return db
    .select({ manifestation: ombudsmanManifestations, sector: sectors, responsible: users })
    .from(ombudsmanManifestations)
    .leftJoin(sectors, eq(ombudsmanManifestations.responsibleSectorId, sectors.id))
    .leftJoin(users, eq(ombudsmanManifestations.responsibleUserId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ombudsmanManifestations.createdAt))
    .limit(filters?.limit ?? 50);
}

export async function createOmbudsmanManifestation(data: Omit<InsertOmbudsmanManifestation, "nup">) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const nup = await generateNup();
  await db.insert(ombudsmanManifestations).values({ ...data, nup });
  return nup;
}

export async function updateOmbudsmanManifestation(id: number, data: Partial<InsertOmbudsmanManifestation>) {
  const db = await getDb();
  if (!db) return;
  await db.update(ombudsmanManifestations).set(data).where(eq(ombudsmanManifestations.id, id));
}

// ─── Document Templates ───────────────────────────────────────────────────────
export async function getDocumentTemplates(type?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(documentTemplates.isActive, true)];
  if (type) conditions.push(eq(documentTemplates.type, type as any));
  return db
    .select()
    .from(documentTemplates)
    .where(and(...conditions))
    .orderBy(documentTemplates.name);
}

export async function createDocumentTemplate(data: InsertDocumentTemplate) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(documentTemplates).values(data);
}

export async function updateDocumentTemplate(id: number, data: Partial<InsertDocumentTemplate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(documentTemplates).set(data).where(eq(documentTemplates.id, id));
}

export async function deleteDocumentTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(documentTemplates).set({ isActive: false }).where(eq(documentTemplates.id, id));
}

// ─── Electronic Signatures ────────────────────────────────────────────────────
export async function getSignaturesByDocument(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ signature: electronicSignatures, signer: users })
    .from(electronicSignatures)
    .leftJoin(users, eq(electronicSignatures.signerId, users.id))
    .where(eq(electronicSignatures.documentId, documentId))
    .orderBy(electronicSignatures.signedAt);
}

export async function createElectronicSignature(data: InsertElectronicSignature) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Generate document hash (simple hash of documentId + signerId + timestamp)
  const hash = Buffer.from(`${data.documentId}-${data.signerId}-${Date.now()}`).toString("base64");
  await db.insert(electronicSignatures).values({ ...data, documentHash: hash });
  // Update document status to signed
  await db
    .update(officialDocuments)
    .set({ status: "signed" })
    .where(eq(officialDocuments.id, data.documentId));
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(data);
}

export async function getAuditLogs(filters?: {
  nup?: string;
  userId?: number;
  entity?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.nup) conditions.push(eq(auditLogs.nup, filters.nup));
  if (filters?.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters?.entity) conditions.push(eq(auditLogs.entity, filters.entity));
  return db
    .select({ log: auditLogs, user: users })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(filters?.limit ?? 100)
    .offset(filters?.offset ?? 0);
}

// ─── AI Providers ─────────────────────────────────────────────────────────────
export async function getAiProvidersByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(aiProviders)
    .where(and(eq(aiProviders.userId, userId), eq(aiProviders.isActive, true)));
}

export async function createAiProvider(data: InsertAiProvider) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(aiProviders).values(data);
}

export async function updateAiProvider(id: number, data: Partial<InsertAiProvider>) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiProviders).set(data).where(eq(aiProviders.id, id));
}

export async function deleteAiProvider(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiProviders).set({ isActive: false }).where(eq(aiProviders.id, id));
}

export async function getAiProviderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const r = await db.select().from(aiProviders).where(eq(aiProviders.id, id)).limit(1);
  return r[0] ?? null;
}

export async function createAiUsageLog(data: InsertAiUsageLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiUsageLogs).values(data);
}

export async function getAiUsageLogs(userId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions = userId ? [eq(aiUsageLogs.userId, userId)] : [];
  return db
    .select()
    .from(aiUsageLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiUsageLogs.createdAt))
    .limit(limit);
}

// ─── Public NUP Lookup (sem autenticação) ─────────────────────────────────────
export async function publicLookupByNup(nup: string) {
  const db = await getDb();
  if (!db) return null;

  // Search across all NUP-bearing tables
  const [proto, doc, proc, ombu] = await Promise.all([
    db.select({ id: protocols.id, nup: protocols.nup, subject: protocols.subject, status: protocols.status, type: protocols.type, createdAt: protocols.createdAt, updatedAt: protocols.updatedAt, isConfidential: protocols.isConfidential })
      .from(protocols).where(eq(protocols.nup, nup)).limit(1),
    db.select({ id: officialDocuments.id, nup: officialDocuments.nup, title: officialDocuments.title, status: officialDocuments.status, type: officialDocuments.type, createdAt: officialDocuments.createdAt, updatedAt: officialDocuments.updatedAt, isConfidential: officialDocuments.isConfidential })
      .from(officialDocuments).where(eq(officialDocuments.nup, nup)).limit(1),
    db.select({ id: adminProcesses.id, nup: adminProcesses.nup, title: adminProcesses.title, status: adminProcesses.status, type: adminProcesses.type, createdAt: adminProcesses.createdAt, updatedAt: adminProcesses.updatedAt, isConfidential: adminProcesses.isConfidential })
      .from(adminProcesses).where(eq(adminProcesses.nup, nup)).limit(1),
    db.select({ id: ombudsmanManifestations.id, nup: ombudsmanManifestations.nup, subject: ombudsmanManifestations.subject, status: ombudsmanManifestations.status, type: ombudsmanManifestations.type, createdAt: ombudsmanManifestations.createdAt, updatedAt: ombudsmanManifestations.updatedAt, isConfidential: ombudsmanManifestations.isConfidential })
      .from(ombudsmanManifestations).where(eq(ombudsmanManifestations.nup, nup)).limit(1),
  ]);

  if (proto[0]) return { entity: "protocol" as const, data: proto[0] };
  if (doc[0]) return { entity: "document" as const, data: doc[0] };
  if (proc[0]) return { entity: "process" as const, data: proc[0] };
  if (ombu[0]) return { entity: "ombudsman" as const, data: ombu[0] };
  return null;
}

// ─── Public Tramitations Lookup (sem autenticação) ───────────────────────────
export async function getPublicTramitationsByNup(nup: string) {
  const db = await getDb();
  if (!db) return [];

  // Busca o protocolo pelo NUP para obter o protocolId
  const proto = await db
    .select({ id: protocols.id, isConfidential: protocols.isConfidential })
    .from(protocols)
    .where(eq(protocols.nup, nup))
    .limit(1);

  if (!proto[0]) return [];
  if (proto[0].isConfidential) return [];

  // Busca tramitações com nomes dos setores
  const rows = await db
    .select({
      id: tramitations.id,
      action: tramitations.action,
      dispatch: tramitations.dispatch,
      createdAt: tramitations.createdAt,
      fromSectorId: tramitations.fromSectorId,
      toSectorId: tramitations.toSectorId,
    })
    .from(tramitations)
    .where(eq(tramitations.protocolId, proto[0].id))
    .orderBy(tramitations.createdAt);

  // Busca nomes dos setores envolvidos
  const sectorIds = Array.from(new Set([
    ...rows.map(r => r.fromSectorId).filter((x): x is number => x != null),
    ...rows.map(r => r.toSectorId).filter((x): x is number => x != null),
  ]));

  const sectorMap: Record<number, string> = {};
  if (sectorIds.length > 0) {
    const sectorRows = await db
      .select({ id: sectors.id, name: sectors.name })
      .from(sectors)
      .where(sql`${sectors.id} IN (${sql.join(sectorIds.map(id => sql`${id}`), sql`, `)})`);
    for (const s of sectorRows) sectorMap[s.id] = s.name;
  }

  const ACTION_LABELS: Record<string, string> = {
    forward: "Encaminhado",
    return: "Devolvido",
    assign: "Atribuído",
    conclude: "Concluído",
    archive: "Arquivado",
    reopen: "Reaberto",
    comment: "Observação",
  };

  return rows.map(r => ({
    id: r.id,
    action: r.action,
    actionLabel: ACTION_LABELS[r.action] ?? r.action,
    dispatch: r.dispatch ?? null,
    createdAt: r.createdAt,
    fromSector: r.fromSectorId ? (sectorMap[r.fromSectorId] ?? "Setor desconhecido") : null,
    toSector: r.toSectorId ? (sectorMap[r.toSectorId] ?? "Setor desconhecido") : null,
  }));
}

// ─── Public CPF/CNPJ Lookup (sem autenticação) ────────────────────────────────
export async function publicLookupByCpfCnpj(cpfCnpj: string) {
  const db = await getDb();
  if (!db) return [];
  const clean = cpfCnpj.replace(/\D/g, "");
  const formatted = cpfCnpj.trim();
  const [protos, ombus] = await Promise.all([
    db.select({
      id: protocols.id, nup: protocols.nup, subject: protocols.subject,
      status: protocols.status, type: protocols.type,
      createdAt: protocols.createdAt, updatedAt: protocols.updatedAt,
      isConfidential: protocols.isConfidential,
    }).from(protocols)
      .where(or(like(protocols.requesterCpfCnpj, `%${clean}%`), like(protocols.requesterCpfCnpj, `%${formatted}%`)))
      .orderBy(desc(protocols.createdAt)).limit(20),
    db.select({
      id: ombudsmanManifestations.id, nup: ombudsmanManifestations.nup, subject: ombudsmanManifestations.subject,
      status: ombudsmanManifestations.status, type: ombudsmanManifestations.type,
      createdAt: ombudsmanManifestations.createdAt, updatedAt: ombudsmanManifestations.updatedAt,
      isConfidential: ombudsmanManifestations.isConfidential,
    }).from(ombudsmanManifestations)
      .where(or(like(ombudsmanManifestations.requesterCpfCnpj, `%${clean}%`), like(ombudsmanManifestations.requesterCpfCnpj, `%${formatted}%`)))
      .orderBy(desc(ombudsmanManifestations.createdAt)).limit(20),
  ]);
  return [
    ...protos.map((p) => ({ entity: "protocol" as const, data: p })),
    ...ombus.map((o) => ({ entity: "ombudsman" as const, data: o })),
  ];
}
