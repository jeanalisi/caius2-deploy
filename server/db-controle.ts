import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { requireDb } from "./db";
import {
  orgUnits,
  documentControls,
  numberUsages,
  docAuditLogs,
  docUserPermissions,
  docUserUnits,
  users,
} from "../drizzle/schema";

// ─── Unidades Organizacionais (usa orgUnits — mesma base do /org-structure) ───

export async function getAllUnits() {
  const db = await requireDb();
  return db
    .select({
      id: orgUnits.id,
      name: orgUnits.name,
      acronym: orgUnits.acronym,
      type: orgUnits.type,
      level: orgUnits.level,
      parentId: orgUnits.parentId,
      isActive: orgUnits.isActive,
    })
    .from(orgUnits)
    .where(eq(orgUnits.isActive, true))
    .orderBy(orgUnits.level, orgUnits.name);
}

export async function getUnitById(id: number) {
  const db = await requireDb();
  const rows = await db
    .select({
      id: orgUnits.id,
      name: orgUnits.name,
      acronym: orgUnits.acronym,
      type: orgUnits.type,
      level: orgUnits.level,
      parentId: orgUnits.parentId,
      isActive: orgUnits.isActive,
    })
    .from(orgUnits)
    .where(eq(orgUnits.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Controles de Numeração ───────────────────────────────────────────────────

export function formatNumber(
  num: number,
  format: "sequencial" | "ano_sequencial" | "sequencial_ano",
  digits: number,
  year: number,
  prefix?: string | null
): string {
  const padded = String(num).padStart(digits, "0");
  let formatted: string;
  if (format === "ano_sequencial") {
    formatted = `${year}/${padded}`;
  } else if (format === "sequencial_ano") {
    formatted = `${padded}/${year}`;
  } else {
    formatted = padded;
  }
  return prefix ? `${prefix}-${formatted}` : formatted;
}

export async function getAllControls() {
  const db = await requireDb();
  return db
    .select({
      id: documentControls.id,
      name: documentControls.name,
      documentType: documentControls.documentType,
      unitId: documentControls.unitId,
      unitName: orgUnits.name,
      unitAcronym: orgUnits.acronym,
      prefix: documentControls.prefix,
      numberFormat: documentControls.numberFormat,
      digits: documentControls.digits,
      referenceYear: documentControls.referenceYear,
      resetAnnually: documentControls.resetAnnually,
      nextNumber: documentControls.nextNumber,
      active: documentControls.active,
      createdBy: documentControls.createdBy,
      createdAt: documentControls.createdAt,
      updatedAt: documentControls.updatedAt,
    })
    .from(documentControls)
    .leftJoin(orgUnits, eq(documentControls.unitId, orgUnits.id))
    .orderBy(desc(documentControls.createdAt));
}

export async function getControlById(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(documentControls).where(eq(documentControls.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function checkDuplicateControl({
  documentType,
  unitId,
  referenceYear,
  excludeId,
}: {
  documentType: string;
  unitId: number;
  referenceYear: number;
  excludeId?: number;
}): Promise<{ isDuplicate: boolean; existing?: { id: number; name: string; active: boolean } }> {
  const db = await requireDb();
  const { ne } = await import("drizzle-orm");
  const conditions: any[] = [
    eq(documentControls.documentType, documentType as any),
    eq(documentControls.unitId, unitId),
    eq(documentControls.referenceYear, referenceYear),
  ];
  if (excludeId !== undefined) {
    conditions.push(ne(documentControls.id, excludeId));
  }
  const rows = await db
    .select({ id: documentControls.id, name: documentControls.name, active: documentControls.active })
    .from(documentControls)
    .where(and(...conditions))
    .limit(1);
  if (rows.length === 0) return { isDuplicate: false };
  return { isDuplicate: true, existing: rows[0] };
}

export async function createControl(data: {
  name: string;
  documentType: "oficio" | "memorando" | "decreto" | "lei" | "diario_oficial" | "contrato" | "portaria";
  unitId: number;
  prefix?: string;
  numberFormat: "sequencial" | "ano_sequencial" | "sequencial_ano";
  digits: number;
  referenceYear: number;
  resetAnnually: boolean;
  createdBy: number;
}) {
  const db = await requireDb();
  const result = await db.insert(documentControls).values({ ...data, nextNumber: 1, active: true });
  return result;
}

export async function updateControl(id: number, data: Partial<{
  name: string;
  prefix: string;
  numberFormat: "sequencial" | "ano_sequencial" | "sequencial_ano";
  digits: number;
  referenceYear: number;
  resetAnnually: boolean;
  active: boolean;
}>) {
  const db = await requireDb();
  await db.update(documentControls).set(data).where(eq(documentControls.id, id));
}

export async function setControlActive(id: number, active: boolean) {
  const db = await requireDb();
  await db.update(documentControls).set({ active }).where(eq(documentControls.id, id));
}

export async function manualSetNextNumber(id: number, nextNumber: number) {
  const db = await requireDb();
  await db.update(documentControls).set({ nextNumber }).where(eq(documentControls.id, id));
}

export async function reserveAndUseNumber(
  controlId: number,
  documentDescription: string,
  usedBy: number
): Promise<{ formattedNumber: string; number: number }> {
  const db = await requireDb();
  const control = await getControlById(controlId);
  if (!control) throw new Error("Controle não encontrado");
  if (!control.active) throw new Error("Controle inativo");

  const num = control.nextNumber;
  const formatted = formatNumber(num, control.numberFormat, control.digits, control.referenceYear, control.prefix);
  const year = control.referenceYear;

  // Insert usage
  await db.insert(numberUsages).values({
    controlId,
    number: num,
    formattedNumber: formatted,
    documentDescription,
    usedBy,
    year,
  });

  // Increment next number
  await db.update(documentControls).set({ nextNumber: num + 1 }).where(eq(documentControls.id, controlId));

  // Audit log
  await db.insert(docAuditLogs).values({
    controlId,
    userId: usedBy,
    action: "number_used",
    newValue: formatted,
  });

  return { formattedNumber: formatted, number: num };
}

// ─── Histórico de Utilização ──────────────────────────────────────────────────

export async function getUsageHistory(
  opts: { controlId?: number; unitId?: number; unitIds?: number[]; limit?: number } = {}
) {
  const { controlId, unitId, unitIds, limit = 100 } = opts;
  const db = await requireDb();

  const conditions: any[] = [];
  if (controlId) conditions.push(eq(numberUsages.controlId, controlId));
  if (unitId) conditions.push(eq(documentControls.unitId, unitId));
  if (unitIds && unitIds.length > 0) conditions.push(inArray(documentControls.unitId, unitIds));

  const baseSelect = {
    id: numberUsages.id,
    controlId: numberUsages.controlId,
    controlName: documentControls.name,
    documentType: documentControls.documentType,
    unitId: documentControls.unitId,
    unitName: orgUnits.name,
    unitAcronym: orgUnits.acronym,
    number: numberUsages.number,
    formattedNumber: numberUsages.formattedNumber,
    documentDescription: numberUsages.documentDescription,
    usedBy: numberUsages.usedBy,
    userName: users.name,
    usedAt: numberUsages.usedAt,
    year: numberUsages.year,
  };

  const query = db
    .select(baseSelect)
    .from(numberUsages)
    .leftJoin(documentControls, eq(numberUsages.controlId, documentControls.id))
    .leftJoin(orgUnits, eq(documentControls.unitId, orgUnits.id))
    .leftJoin(users, eq(numberUsages.usedBy, users.id));

  if (conditions.length === 1) {
    return query.where(conditions[0]).orderBy(desc(numberUsages.usedAt)).limit(limit);
  } else if (conditions.length > 1) {
    return query.where(and(...conditions)).orderBy(desc(numberUsages.usedAt)).limit(limit);
  }
  return query.orderBy(desc(numberUsages.usedAt)).limit(limit);
}

// ─── Auditoria ────────────────────────────────────────────────────────────────

export async function addDocAuditLog(data: {
  controlId: number;
  userId: number;
  action: "manual_number_change" | "control_created" | "control_updated" | "control_activated" | "control_deactivated" | "number_used";
  previousValue?: string;
  newValue?: string;
  justification?: string;
}) {
  const db = await requireDb();
  await db.insert(docAuditLogs).values(data);
}

export async function getDocAuditLogs(controlId?: number, limit = 200) {
  const db = await requireDb();
  const base = db
    .select({
      id: docAuditLogs.id,
      controlId: docAuditLogs.controlId,
      controlName: documentControls.name,
      userId: docAuditLogs.userId,
      userName: users.name,
      action: docAuditLogs.action,
      previousValue: docAuditLogs.previousValue,
      newValue: docAuditLogs.newValue,
      justification: docAuditLogs.justification,
      createdAt: docAuditLogs.createdAt,
    })
    .from(docAuditLogs)
    .leftJoin(documentControls, eq(docAuditLogs.controlId, documentControls.id))
    .leftJoin(users, eq(docAuditLogs.userId, users.id))
    .orderBy(desc(docAuditLogs.createdAt))
    .limit(limit);

  if (controlId) {
    return db
      .select({
        id: docAuditLogs.id,
        controlId: docAuditLogs.controlId,
        controlName: documentControls.name,
        userId: docAuditLogs.userId,
        userName: users.name,
        action: docAuditLogs.action,
        previousValue: docAuditLogs.previousValue,
        newValue: docAuditLogs.newValue,
        justification: docAuditLogs.justification,
        createdAt: docAuditLogs.createdAt,
      })
      .from(docAuditLogs)
      .leftJoin(documentControls, eq(docAuditLogs.controlId, documentControls.id))
      .leftJoin(users, eq(docAuditLogs.userId, users.id))
      .where(eq(docAuditLogs.controlId, controlId))
      .orderBy(desc(docAuditLogs.createdAt))
      .limit(limit);
  }

  return base;
}

// ─── Permissões de Usuário ────────────────────────────────────────────────────

export async function getDocUserPermissions(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(docUserPermissions).where(eq(docUserPermissions.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getAllDocUserPermissions() {
  const db = await requireDb();
  return db
    .select({
      id: docUserPermissions.id,
      userId: docUserPermissions.userId,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      canAccessOficios: docUserPermissions.canAccessOficios,
      canAccessMemorandos: docUserPermissions.canAccessMemorandos,
      canAccessDecretos: docUserPermissions.canAccessDecretos,
      canAccessLeis: docUserPermissions.canAccessLeis,
      canAccessDiarioOficial: docUserPermissions.canAccessDiarioOficial,
      canAccessContratos: docUserPermissions.canAccessContratos,
      canAccessPortarias: docUserPermissions.canAccessPortarias,
      updatedAt: docUserPermissions.updatedAt,
    })
    .from(docUserPermissions)
    .leftJoin(users, eq(docUserPermissions.userId, users.id))
    .orderBy(users.name);
}

export async function upsertDocUserPermissions(
  userId: number,
  permissions: {
    canAccessOficios: boolean;
    canAccessMemorandos: boolean;
    canAccessDecretos: boolean;
    canAccessLeis: boolean;
    canAccessDiarioOficial: boolean;
    canAccessContratos: boolean;
    canAccessPortarias: boolean;
  },
  grantedBy: number
) {
  const db = await requireDb();
  const existing = await getDocUserPermissions(userId);
  if (existing) {
    await db.update(docUserPermissions).set(permissions).where(eq(docUserPermissions.userId, userId));
  } else {
    await db.insert(docUserPermissions).values({ userId, ...permissions, grantedBy });
  }
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDocDashboardStats() {
  const db = await requireDb();

  const [totalControls] = await db.select({ count: sql<number>`count(*)` }).from(documentControls);
  const [activeControls] = await db.select({ count: sql<number>`count(*)` }).from(documentControls).where(eq(documentControls.active, true));
  const [totalUsages] = await db.select({ count: sql<number>`count(*)` }).from(numberUsages);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [usagesToday] = await db.select({ count: sql<number>`count(*)` }).from(numberUsages).where(sql`${numberUsages.usedAt} >= ${today}`);

  const usagesByType = await db
    .select({
      documentType: documentControls.documentType,
      count: sql<number>`count(${numberUsages.id})`,
    })
    .from(numberUsages)
    .leftJoin(documentControls, eq(numberUsages.controlId, documentControls.id))
    .groupBy(documentControls.documentType);

  return {
    totalControls: Number(totalControls?.count ?? 0),
    activeControls: Number(activeControls?.count ?? 0),
    totalUsages: Number(totalUsages?.count ?? 0),
    usagesToday: Number(usagesToday?.count ?? 0),
    usagesByType,
  };
}

// ─── Vínculo Usuário-Unidades (usa orgUnits) ──────────────────────────────────

export async function getDocUserUnits(userId: number) {
  const db = await requireDb();
  return db
    .select({
      id: orgUnits.id,
      name: orgUnits.name,
      acronym: orgUnits.acronym,
      type: orgUnits.type,
      level: orgUnits.level,
    })
    .from(docUserUnits)
    .innerJoin(orgUnits, eq(docUserUnits.unitId, orgUnits.id))
    .where(eq(docUserUnits.userId, userId))
    .orderBy(orgUnits.name);
}

export async function setDocUserUnits(userId: number, unitIds: number[]) {
  const db = await requireDb();
  await db.delete(docUserUnits).where(eq(docUserUnits.userId, userId));
  if (unitIds.length > 0) {
    await db.insert(docUserUnits).values(unitIds.map((unitId) => ({ userId, unitId })));
  }
}
