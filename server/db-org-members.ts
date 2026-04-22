/**
 * db-org-members.ts — Funções de banco de dados para membros públicos da estrutura administrativa
 * Lei Complementar nº 010/2025 — Itabaiana/PB
 */
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { orgMembers, type InsertOrgMember } from "../drizzle/schema";

// ─── Listar membros ───────────────────────────────────────────────────────────
export async function getOrgMembers(filters?: {
  orgUnitId?: number;
  isPublic?: boolean;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.orgUnitId !== undefined) conditions.push(eq(orgMembers.orgUnitId, filters.orgUnitId));
  if (filters?.isPublic !== undefined) conditions.push(eq(orgMembers.isPublic, filters.isPublic));
  if (filters?.isActive !== undefined) conditions.push(eq(orgMembers.isActive, filters.isActive));
  return db
    .select()
    .from(orgMembers)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(orgMembers.sortOrder), asc(orgMembers.name));
}

// ─── Buscar por ID ────────────────────────────────────────────────────────────
export async function getOrgMemberById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(orgMembers).where(eq(orgMembers.id, id)).limit(1);
  return rows[0] ?? null;
}

// ─── Buscar por ID (público) ──────────────────────────────────────────────────
export async function getOrgMemberPublicById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: orgMembers.id,
      orgUnitId: orgMembers.orgUnitId,
      positionId: orgMembers.positionId,
      name: orgMembers.name,
      matricula: orgMembers.matricula,
      cargo: orgMembers.cargo,
      cargoLei: orgMembers.cargoLei,
      photoUrl: orgMembers.photoUrl,
      email: orgMembers.email,
      phone: orgMembers.phone,
      bio: orgMembers.bio,
      externalLink: orgMembers.externalLink,
      sortOrder: orgMembers.sortOrder,
    })
    .from(orgMembers)
    .where(and(eq(orgMembers.id, id), eq(orgMembers.isPublic, true), eq(orgMembers.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Criar membro ─────────────────────────────────────────────────────────────
export async function createOrgMember(data: Omit<InsertOrgMember, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(orgMembers).values(data);
  const id = (result as any).insertId as number;
  return getOrgMemberById(id);
}

// ─── Atualizar membro ─────────────────────────────────────────────────────────
export async function updateOrgMember(id: number, data: Partial<InsertOrgMember>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orgMembers).set(data).where(eq(orgMembers.id, id));
  return getOrgMemberById(id);
}

// ─── Remover membro (soft delete) ─────────────────────────────────────────────
export async function deleteOrgMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orgMembers).set({ isActive: false }).where(eq(orgMembers.id, id));
  return { success: true };
}

// ─── Listar membros públicos por unidade (para portal cidadão) ────────────────
export async function getPublicOrgMembers(orgUnitId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [
    eq(orgMembers.isPublic, true),
    eq(orgMembers.isActive, true),
  ];
  if (orgUnitId !== undefined) conditions.push(eq(orgMembers.orgUnitId, orgUnitId));
  return db
    .select({
      id: orgMembers.id,
      orgUnitId: orgMembers.orgUnitId,
      positionId: orgMembers.positionId,
      name: orgMembers.name,
      cargo: orgMembers.cargo,
      cargoLei: orgMembers.cargoLei,
      photoUrl: orgMembers.photoUrl,
      email: orgMembers.email,
      phone: orgMembers.phone,
      bio: orgMembers.bio,
      externalLink: orgMembers.externalLink,
      sortOrder: orgMembers.sortOrder,
    })
    .from(orgMembers)
    .where(and(...conditions))
    .orderBy(asc(orgMembers.sortOrder), asc(orgMembers.name));
}
