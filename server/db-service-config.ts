import { and, asc, eq } from "drizzle-orm";
import { getDb } from "./db";
import {
  serviceTypeDocuments,
  serviceTypeFields,
  serviceTypes,
  serviceSubjects,
  InsertServiceTypeField,
  InsertServiceTypeDocument,
  InsertServiceSubject,
} from "../drizzle/schema";

// ─── Service Type Fields ───────────────────────────────────────────────────────

export async function getServiceTypeFields(serviceTypeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(serviceTypeFields)
    .where(and(eq(serviceTypeFields.serviceTypeId, serviceTypeId), eq(serviceTypeFields.isActive, true)))
    .orderBy(asc(serviceTypeFields.sortOrder));
}

export async function createServiceTypeField(data: Omit<InsertServiceTypeField, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(serviceTypeFields).values(data);
  const rows = await db
    .select()
    .from(serviceTypeFields)
    .where(and(eq(serviceTypeFields.serviceTypeId, data.serviceTypeId), eq(serviceTypeFields.name, data.name)))
    .limit(1);
  return rows[0];
}

export async function updateServiceTypeField(id: number, data: Partial<InsertServiceTypeField>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(serviceTypeFields).set(data).where(eq(serviceTypeFields.id, id));
  const rows = await db.select().from(serviceTypeFields).where(eq(serviceTypeFields.id, id)).limit(1);
  return rows[0];
}

export async function deleteServiceTypeField(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(serviceTypeFields).set({ isActive: false }).where(eq(serviceTypeFields.id, id));
  return { success: true };
}

export async function reorderServiceTypeFields(items: { id: number; sortOrder: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (const item of items) {
    await db.update(serviceTypeFields).set({ sortOrder: item.sortOrder }).where(eq(serviceTypeFields.id, item.id));
  }
  return { success: true };
}

// ─── Service Type Documents ────────────────────────────────────────────────────

export async function getServiceTypeDocuments(serviceTypeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(serviceTypeDocuments)
    .where(and(eq(serviceTypeDocuments.serviceTypeId, serviceTypeId), eq(serviceTypeDocuments.isActive, true)))
    .orderBy(asc(serviceTypeDocuments.sortOrder));
}

export async function createServiceTypeDocument(data: Omit<InsertServiceTypeDocument, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(serviceTypeDocuments).values(data);
  const rows = await db
    .select()
    .from(serviceTypeDocuments)
    .where(and(eq(serviceTypeDocuments.serviceTypeId, data.serviceTypeId), eq(serviceTypeDocuments.name, data.name)))
    .limit(1);
  return rows[0];
}

export async function updateServiceTypeDocument(id: number, data: Partial<InsertServiceTypeDocument>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(serviceTypeDocuments).set(data).where(eq(serviceTypeDocuments.id, id));
  const rows = await db.select().from(serviceTypeDocuments).where(eq(serviceTypeDocuments.id, id)).limit(1);
  return rows[0];
}

export async function deleteServiceTypeDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(serviceTypeDocuments).set({ isActive: false }).where(eq(serviceTypeDocuments.id, id));
  return { success: true };
}

// ─── Service Subjects ─────────────────────────────────────────────────────────

export async function getServiceSubjects(serviceTypeId: number, onlyPublic = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [
    eq(serviceSubjects.serviceTypeId, serviceTypeId),
    eq(serviceSubjects.isActive, true),
  ];
  if (onlyPublic) conditions.push(eq(serviceSubjects.isPublic, true));
  return db
    .select()
    .from(serviceSubjects)
    .where(and(...conditions))
    .orderBy(asc(serviceSubjects.sortOrder), asc(serviceSubjects.name));
}

export async function getServiceSubjectById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(serviceSubjects).where(eq(serviceSubjects.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createServiceSubject(data: Omit<InsertServiceSubject, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(serviceSubjects).values(data);
  const id = (result as any).insertId as number;
  return getServiceSubjectById(id);
}

export async function updateServiceSubject(id: number, data: Partial<InsertServiceSubject>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(serviceSubjects).set(data).where(eq(serviceSubjects.id, id));
  return getServiceSubjectById(id);
}

export async function deleteServiceSubject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(serviceSubjects).set({ isActive: false }).where(eq(serviceSubjects.id, id));
  return { success: true };
}

export async function publishServiceType(id: number, isPublic: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(serviceTypes).set({
    isPublic,
    publicationStatus: isPublic ? "published" : "inactive",
  }).where(eq(serviceTypes.id, id));
  return { success: true };
}

// ─── Cidadão Portal ────────────────────────────────────────────────────────────

export async function getCidadaoServices(input?: { search?: string; category?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [
    eq(serviceTypes.isActive, true),
    eq(serviceTypes.isPublic, true),
    eq(serviceTypes.publicationStatus, "published"),
  ];

  if (input?.category) {
    conditions.push(eq(serviceTypes.category, input.category));
  }

  let rows = await db
    .select({
      id: serviceTypes.id,
      name: serviceTypes.name,
      description: serviceTypes.description,
      category: serviceTypes.category,
      code: serviceTypes.code,
      slaResponseHours: serviceTypes.slaResponseHours,
      slaConclusionHours: serviceTypes.slaConclusionHours,
      secrecyLevel: serviceTypes.secrecyLevel,
      requiresApproval: serviceTypes.requiresApproval,
      requiresSelfie: serviceTypes.requiresSelfie,
      requiresGeolocation: serviceTypes.requiresGeolocation,
      purpose: serviceTypes.purpose,
      whoCanRequest: serviceTypes.whoCanRequest,
      cost: serviceTypes.cost,
      formOfService: serviceTypes.formOfService,
      responseChannel: serviceTypes.responseChannel,
      importantNotes: serviceTypes.importantNotes,
      isPublic: serviceTypes.isPublic,
      publicationStatus: serviceTypes.publicationStatus,
      serviceMode: serviceTypes.serviceMode,
      externalUrl: serviceTypes.externalUrl,
      orgUnitId: serviceTypes.orgUnitId,
    })
    .from(serviceTypes)
    .where(and(...conditions))
    .orderBy(asc(serviceTypes.name));

  if (input?.search) {
    const q = input.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.category ?? "").toLowerCase().includes(q) ||
        (r.code ?? "").toLowerCase().includes(q)
    );
  }

  return rows;
}

export async function getCidadaoServiceDetail(id: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(serviceTypes)
    .where(and(
      eq(serviceTypes.id, id),
      eq(serviceTypes.isActive, true),
      eq(serviceTypes.isPublic, true),
      eq(serviceTypes.publicationStatus, "published"),
    ))
    .limit(1);

  if (!rows[0]) return null;

  const fields = await getServiceTypeFields(id);
  const documents = await getServiceTypeDocuments(id);
  const subjects = await getServiceSubjects(id, true); // only public subjects

  return {
    ...rows[0],
    fields,
    documents,
    subjects,
  };
}
