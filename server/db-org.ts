/**
 * Database helpers — Módulo de Estrutura Organizacional
 * Lei Complementar nº 010/2025 — Itabaiana/PB
 */

import { and, asc, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  orgUnits, positions, userAllocations, allocationHistory, orgInvites, publicServants,
  InsertOrgUnit, InsertPosition, InsertUserAllocation, InsertAllocationHistory, InsertOrgInvite,
} from "../drizzle/schema";

// ─── Org Units ────────────────────────────────────────────────────────────────

export async function getOrgUnits(filters?: {
  parentId?: number | null;
  type?: string;
  level?: number;
  isActive?: boolean;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(orgUnits);
  const conditions = [];

  if (filters?.parentId !== undefined) {
    conditions.push(filters.parentId === null ? isNull(orgUnits.parentId) : eq(orgUnits.parentId, filters.parentId));
  }
  if (filters?.type) conditions.push(eq(orgUnits.type, filters.type as any));
  if (filters?.level !== undefined) conditions.push(eq(orgUnits.level, filters.level));
  if (filters?.isActive !== undefined) conditions.push(eq(orgUnits.isActive, filters.isActive));
  if (filters?.search) conditions.push(like(orgUnits.name, `%${filters.search}%`));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(asc(orgUnits.sortOrder), asc(orgUnits.name));
}

export async function getOrgUnitById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orgUnits).where(eq(orgUnits.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getOrgUnitTree(parentId: number | null = null): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const condition = parentId === null ? isNull(orgUnits.parentId) : eq(orgUnits.parentId, parentId);
  const units = await db.select().from(orgUnits)
    .where(and(condition, eq(orgUnits.isActive, true)))
    .orderBy(asc(orgUnits.sortOrder), asc(orgUnits.name));

  const result = [];
  for (const unit of units) {
    const children = await getOrgUnitTree(unit.id);
    result.push({ ...unit, children });
  }
  return result;
}

export async function getOrgUnitWithBreadcrumb(id: number): Promise<{ unit: any; breadcrumb: any[] }> {
  const db = await getDb();
  if (!db) return { unit: null, breadcrumb: [] };

  const unit = await getOrgUnitById(id);
  if (!unit) return { unit: null, breadcrumb: [] };

  const breadcrumb: any[] = [unit];
  let current = unit;

  while (current.parentId) {
    const parent = await getOrgUnitById(current.parentId);
    if (!parent) break;
    breadcrumb.unshift(parent);
    current = parent;
  }

  return { unit, breadcrumb };
}

export async function createOrgUnit(data: Omit<InsertOrgUnit, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(orgUnits).values({ ...data, isSeeded: false });
  const id = (result as any).insertId as number;
  return getOrgUnitById(id);
}

export async function updateOrgUnit(id: number, data: Partial<InsertOrgUnit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orgUnits).set(data).where(eq(orgUnits.id, id));
  return getOrgUnitById(id);
}

export async function deleteOrgUnit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete
  await db.update(orgUnits).set({ isActive: false }).where(eq(orgUnits.id, id));
  return true;
}

export async function getOrgUnitStats(id: number) {
  const db = await getDb();
  if (!db) return { userCount: 0, childCount: 0, positionCount: 0 };

  const [userCount] = await db.select({ count: sql<number>`count(*)` })
    .from(userAllocations).where(and(eq(userAllocations.orgUnitId, id), eq(userAllocations.isActive, true)));
  const [childCount] = await db.select({ count: sql<number>`count(*)` })
    .from(orgUnits).where(and(eq(orgUnits.parentId, id), eq(orgUnits.isActive, true)));
  const [positionCount] = await db.select({ count: sql<number>`count(*)` })
    .from(positions).where(and(eq(positions.orgUnitId, id), eq(positions.isActive, true)));

  return {
    userCount: Number(userCount?.count ?? 0),
    childCount: Number(childCount?.count ?? 0),
    positionCount: Number(positionCount?.count ?? 0),
  };
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function getPositions(filters?: { orgUnitId?: number; level?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(positions);
  const conditions = [];

  if (filters?.orgUnitId !== undefined) conditions.push(eq(positions.orgUnitId, filters.orgUnitId));
  if (filters?.level) conditions.push(eq(positions.level, filters.level as any));
  if (filters?.isActive !== undefined) conditions.push(eq(positions.isActive, filters.isActive));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(asc(positions.name));
}

export async function getPositionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(positions).where(eq(positions.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createPosition(data: Omit<InsertPosition, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(positions).values({ ...data, isSeeded: false });
  const id = (result as any).insertId as number;
  return getPositionById(id);
}

export async function updatePosition(id: number, data: Partial<InsertPosition>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(positions).set(data).where(eq(positions.id, id));
  return getPositionById(id);
}

export async function deletePosition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(positions).set({ isActive: false }).where(eq(positions.id, id));
  return true;
}

// ─── User Allocations ─────────────────────────────────────────────────────────

export async function getUserAllocations(filters?: {
  userId?: number;
  orgUnitId?: number;
  isActive?: boolean;
  isPrimary?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(userAllocations);
  const conditions = [];

  if (filters?.userId !== undefined) conditions.push(eq(userAllocations.userId, filters.userId));
  if (filters?.orgUnitId !== undefined) conditions.push(eq(userAllocations.orgUnitId, filters.orgUnitId));
  if (filters?.isActive !== undefined) conditions.push(eq(userAllocations.isActive, filters.isActive));
  if (filters?.isPrimary !== undefined) conditions.push(eq(userAllocations.isPrimary, filters.isPrimary));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(userAllocations.startDate));
}

export async function getAllocationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userAllocations).where(eq(userAllocations.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createUserAllocation(
  data: Omit<InsertUserAllocation, "id" | "createdAt" | "updatedAt">,
  changedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // If isPrimary, deactivate other primary allocations for this user
  if (data.isPrimary) {
    await db.update(userAllocations)
      .set({ isPrimary: false })
      .where(and(eq(userAllocations.userId, data.userId), eq(userAllocations.isPrimary, true)));
  }

  const [result] = await db.insert(userAllocations).values(data);
  const id = (result as any).insertId as number;

  // Record history
  await db.insert(allocationHistory).values({
    userId: data.userId,
    toOrgUnitId: data.orgUnitId,
    toPositionId: data.positionId ?? null,
    changeType: "allocation",
    changedBy,
    notes: data.notes ?? null,
  });

  return getAllocationById(id);
}

export async function updateUserAllocation(id: number, data: Partial<InsertUserAllocation>, changedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getAllocationById(id);
  if (!existing) throw new Error("Allocation not found");

  await db.update(userAllocations).set(data).where(eq(userAllocations.id, id));

  // Record history if org unit changed
  if (data.orgUnitId && data.orgUnitId !== existing.orgUnitId) {
    await db.insert(allocationHistory).values({
      userId: existing.userId,
      fromOrgUnitId: existing.orgUnitId,
      toOrgUnitId: data.orgUnitId,
      fromPositionId: existing.positionId ?? null,
      toPositionId: data.positionId ?? existing.positionId ?? null,
      changeType: "transfer",
      changedBy,
    });
  }

  return getAllocationById(id);
}

export async function deactivateUserAllocation(id: number, changedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getAllocationById(id);
  if (!existing) throw new Error("Allocation not found");

  await db.update(userAllocations)
    .set({ isActive: false, endDate: new Date() })
    .where(eq(userAllocations.id, id));

  await db.insert(allocationHistory).values({
    userId: existing.userId,
    fromOrgUnitId: existing.orgUnitId,
    changeType: "removal",
    changedBy,
  });

  return true;
}

export async function getAllocationHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(allocationHistory)
    .where(eq(allocationHistory.userId, userId))
    .orderBy(desc(allocationHistory.createdAt));
}

// ─── Org Invites ──────────────────────────────────────────────────────────────

export async function getOrgInvites(filters?: {
  orgUnitId?: number;
  status?: string;
  email?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(orgInvites);
  const conditions = [];

  if (filters?.orgUnitId !== undefined) conditions.push(eq(orgInvites.orgUnitId, filters.orgUnitId));
  if (filters?.status) conditions.push(eq(orgInvites.status, filters.status as any));
  if (filters?.email) conditions.push(eq(orgInvites.email, filters.email));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(orgInvites.createdAt));
}

export async function getOrgInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orgInvites).where(eq(orgInvites.token, token)).limit(1);
  return result[0] ?? null;
}

export async function getOrgInviteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orgInvites).where(eq(orgInvites.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createOrgInvite(data: Omit<InsertOrgInvite, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check for existing pending invite for same email + unit
  const existing = await db.select().from(orgInvites)
    .where(and(
      eq(orgInvites.email, data.email),
      eq(orgInvites.orgUnitId, data.orgUnitId),
      eq(orgInvites.status, "pending")
    )).limit(1);

  if (existing.length > 0) {
    throw new Error("Já existe um convite pendente para este e-mail nesta unidade.");
  }

  const [result] = await db.insert(orgInvites).values(data);
  const id = (result as any).insertId as number;
  return getOrgInviteById(id);
}

export async function updateOrgInviteStatus(
  id: number,
  status: "pending" | "accepted" | "expired" | "cancelled",
  extra?: { acceptedBy?: number; acceptedIp?: string; acceptedAt?: Date }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(orgInvites).set({
    status,
    ...(extra?.acceptedBy ? { acceptedBy: extra.acceptedBy } : {}),
    ...(extra?.acceptedIp ? { acceptedIp: extra.acceptedIp } : {}),
    ...(extra?.acceptedAt ? { acceptedAt: extra.acceptedAt } : {}),
  }).where(eq(orgInvites.id, id));

  return getOrgInviteById(id);
}

export async function expireOldInvites() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.update(orgInvites)
    .set({ status: "expired" })
    .where(and(
      eq(orgInvites.status, "pending"),
      sql`${orgInvites.expiresAt} < NOW()`
    ));

  return (result as any).affectedRows ?? 0;
}

// ─── Public Servants (servidores externos sem login) ─────────────────────────

export async function getPublicServants(filters?: {
  orgUnitId?: number;
  positionId?: number;
  isActive?: boolean;
  isPublic?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const conds: any[] = [];
  if (filters?.orgUnitId !== undefined) conds.push(eq(publicServants.orgUnitId, filters.orgUnitId));
  if (filters?.positionId !== undefined) conds.push(eq(publicServants.positionId, filters.positionId));
  if (filters?.isActive !== undefined) conds.push(eq(publicServants.isActive, filters.isActive));
  if (filters?.isPublic !== undefined) conds.push(eq(publicServants.isPublic, filters.isPublic));

  return db
    .select()
    .from(publicServants)
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(asc(publicServants.name));
}

export async function getPublicServantById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(publicServants).where(eq(publicServants.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createPublicServant(data: {
  name: string;
  matricula?: string | null;
  orgUnitId: number;
  positionId?: number | null;
  photoUrl?: string | null;
  isPublic?: boolean;
  legalBasis?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(publicServants).values({
    name: data.name,
    matricula: data.matricula ?? null,
    orgUnitId: data.orgUnitId,
    positionId: data.positionId ?? null,
    photoUrl: data.photoUrl ?? null,
    isPublic: data.isPublic !== false,
    isActive: true,
    legalBasis: data.legalBasis ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    address: data.address ?? null,
    bio: data.bio ?? null,
  });
  return getPublicServantById((result as any).insertId);
}

export async function updatePublicServant(id: number, data: {
  name?: string;
  matricula?: string | null;
  orgUnitId?: number;
  positionId?: number | null;
  photoUrl?: string | null;
  isPublic?: boolean;
  isActive?: boolean;
  legalBasis?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.matricula !== undefined) updateData.matricula = data.matricula;
  if (data.orgUnitId !== undefined) updateData.orgUnitId = data.orgUnitId;
  if (data.positionId !== undefined) updateData.positionId = data.positionId;
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
  if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.legalBasis !== undefined) updateData.legalBasis = data.legalBasis;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.bio !== undefined) updateData.bio = data.bio;

  if (Object.keys(updateData).length === 0) return getPublicServantById(id);

  await db.update(publicServants).set(updateData).where(eq(publicServants.id, id));
  return getPublicServantById(id);
}

export async function deletePublicServant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(publicServants).set({ isActive: false }).where(eq(publicServants.id, id));
  return true;
}

// ─── Service Type Org Units (vinculação serviços ↔ unidades) ─────────────────

export async function getServicesByOrgUnit(orgUnitId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.execute(
      sql`SELECT st.id, st.name, st.description, st.category, st.slaResponseHours, st.slaResolutionHours, st.published
       FROM serviceTypeOrgUnits stu
       JOIN serviceTypes st ON stu.serviceTypeId = st.id
       WHERE stu.orgUnitId = ${orgUnitId} AND st.published = 1
       ORDER BY st.category, st.name`
    );
    return (rows as any).rows ?? rows ?? [];
  } catch {
    return [];
  }
}

export async function linkServiceToOrgUnit(serviceTypeId: number, orgUnitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.execute(
    sql`INSERT IGNORE INTO serviceTypeOrgUnits (serviceTypeId, orgUnitId) VALUES (${serviceTypeId}, ${orgUnitId})`
  );
  return true;
}

export async function unlinkServiceFromOrgUnit(serviceTypeId: number, orgUnitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.execute(
    sql`DELETE FROM serviceTypeOrgUnits WHERE serviceTypeId = ${serviceTypeId} AND orgUnitId = ${orgUnitId}`
  );
  return true;
}

export async function getOrgUnitsByService(serviceTypeId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.execute(
      sql`SELECT o.id, o.name, o.type, o.acronym
       FROM serviceTypeOrgUnits stu
       JOIN orgUnits o ON stu.orgUnitId = o.id
       WHERE stu.serviceTypeId = ${serviceTypeId}`
    );
    return (rows as any).rows ?? rows ?? [];
  } catch {
    return [];
  }
}
