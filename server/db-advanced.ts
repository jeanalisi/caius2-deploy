import { and, desc, eq, ilike, like, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  attachmentConfigs,
  attachments,
  contextHelp,
  formFields,
  formTemplates,
  institutionalConfig,
  onlineSessions,
  searchIndex,
  serviceTypes,
  userRegistrations,
  type InsertAttachment,
  type InsertAttachmentConfig,
  type InsertContextHelp,
  type InsertFormField,
  type InsertFormTemplate,
  type InsertInstitutionalConfig,
  type InsertOnlineSession,
  type InsertServiceType,
  type InsertUserRegistration,
} from "../drizzle/schema";

// ─── Service Types ─────────────────────────────────────────────────────────────
export async function createServiceType(data: InsertServiceType) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(serviceTypes).values(data);
  const rows = await db.select().from(serviceTypes).orderBy(desc(serviceTypes.createdAt)).limit(1);
  return rows[0];
}

export async function getServiceTypes(filters?: { isActive?: boolean; category?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.isActive !== undefined) conditions.push(eq(serviceTypes.isActive, filters.isActive));
  if (filters?.category) conditions.push(eq(serviceTypes.category, filters.category));
  return db.select().from(serviceTypes)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(serviceTypes.name);
}

export async function getServiceTypeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(serviceTypes).where(eq(serviceTypes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateServiceType(id: number, data: Partial<InsertServiceType>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(serviceTypes).set(data).where(eq(serviceTypes.id, id));
  return getServiceTypeById(id);
}

export async function deleteServiceType(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(serviceTypes).set({ isActive: false }).where(eq(serviceTypes.id, id));
}

// ─── Form Templates ────────────────────────────────────────────────────────────
export async function createFormTemplate(data: InsertFormTemplate) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(formTemplates).values(data);
  const rows = await db.select().from(formTemplates).orderBy(desc(formTemplates.createdAt)).limit(1);
  return rows[0];
}

export async function getFormTemplates(serviceTypeId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(formTemplates)
    .where(serviceTypeId ? eq(formTemplates.serviceTypeId, serviceTypeId) : undefined)
    .orderBy(formTemplates.name);
}

export async function getFormTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(formTemplates).where(eq(formTemplates.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateFormTemplate(id: number, data: Partial<InsertFormTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(formTemplates).set(data).where(eq(formTemplates.id, id));
  return getFormTemplateById(id);
}

export async function deleteFormTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(formTemplates).where(eq(formTemplates.id, id));
}

// ─── Form Fields ───────────────────────────────────────────────────────────────
export async function createFormField(data: InsertFormField) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(formFields).values(data);
  const rows = await db.select().from(formFields).orderBy(desc(formFields.createdAt)).limit(1);
  return rows[0];
}

export async function getFormFields(formTemplateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(formFields)
    .where(eq(formFields.formTemplateId, formTemplateId))
    .orderBy(formFields.displayOrder, formFields.id);
}

export async function updateFormField(id: number, data: Partial<InsertFormField>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(formFields).set(data).where(eq(formFields.id, id));
  const rows = await db.select().from(formFields).where(eq(formFields.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteFormField(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(formFields).where(eq(formFields.id, id));
}

export async function reorderFormFields(fields: { id: number; displayOrder: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  for (const f of fields) {
    await db.update(formFields).set({ displayOrder: f.displayOrder }).where(eq(formFields.id, f.id));
  }
}

// ─── Attachment Configs ────────────────────────────────────────────────────────
export async function createAttachmentConfig(data: InsertAttachmentConfig) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(attachmentConfigs).values(data);
  const rows = await db.select().from(attachmentConfigs).orderBy(desc(attachmentConfigs.createdAt)).limit(1);
  return rows[0];
}

export async function getAttachmentConfigs(serviceTypeId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attachmentConfigs)
    .where(serviceTypeId ? eq(attachmentConfigs.serviceTypeId, serviceTypeId) : undefined)
    .orderBy(attachmentConfigs.name);
}

export async function deleteAttachmentConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(attachmentConfigs).where(eq(attachmentConfigs.id, id));
}

// ─── Attachments ───────────────────────────────────────────────────────────────
export async function createAttachment(data: InsertAttachment) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(attachments).values(data);
  const rows = await db.select().from(attachments).orderBy(desc(attachments.createdAt)).limit(1);
  return rows[0];
}

export async function getAttachments(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attachments)
    .where(and(
      eq(attachments.entityType, entityType),
      eq(attachments.entityId, entityId),
      eq(attachments.isDeleted, false)
    ))
    .orderBy(desc(attachments.createdAt));
}

export async function getAttachmentsByNup(nup: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(attachments)
    .where(and(eq(attachments.nup, nup), eq(attachments.isDeleted, false)))
    .orderBy(desc(attachments.createdAt));
}

export async function softDeleteAttachment(id: number, deletedById: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(attachments).set({
    isDeleted: true,
    deletedAt: new Date(),
    deletedById,
  }).where(eq(attachments.id, id));
}

// ─── Context Help ──────────────────────────────────────────────────────────────
export async function upsertContextHelp(featureKey: string, data: Partial<InsertContextHelp>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(contextHelp).where(eq(contextHelp.featureKey, featureKey)).limit(1);
  if (existing.length > 0) {
    await db.update(contextHelp).set(data).where(eq(contextHelp.featureKey, featureKey));
  } else {
    await db.insert(contextHelp).values({ featureKey, title: data.title ?? featureKey, ...data });
  }
  const rows = await db.select().from(contextHelp).where(eq(contextHelp.featureKey, featureKey)).limit(1);
  return rows[0] ?? null;
}

export async function getContextHelp(featureKey: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(contextHelp)
    .where(and(eq(contextHelp.featureKey, featureKey), eq(contextHelp.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listContextHelp() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contextHelp).orderBy(contextHelp.featureKey);
}

export async function deleteContextHelp(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(contextHelp).where(eq(contextHelp.id, id));
}

// ─── Online Sessions ───────────────────────────────────────────────────────────
export async function createOnlineSession(data: InsertOnlineSession) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(onlineSessions).values(data);
  return data;
}

export async function getActiveSessions(filters?: { profile?: string; sectorId?: number }) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(onlineSessions)
    .where(eq(onlineSessions.isActive, true))
    .orderBy(desc(onlineSessions.lastActivity));
}

export async function updateSessionActivity(sessionToken: string, currentPage?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(onlineSessions).set({
    lastActivity: new Date(),
    ...(currentPage ? { currentPage } : {}),
  }).where(and(eq(onlineSessions.sessionToken, sessionToken), eq(onlineSessions.isActive, true)));
}

export async function terminateSession(sessionToken: string, terminatedById?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(onlineSessions).set({
    isActive: false,
    terminatedAt: new Date(),
    ...(terminatedById ? { terminatedById } : {}),
  }).where(eq(onlineSessions.sessionToken, sessionToken));
}

export async function terminateSessionById(id: number, terminatedById: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(onlineSessions).set({
    isActive: false,
    terminatedAt: new Date(),
    terminatedById,
  }).where(eq(onlineSessions.id, id));
}

// ─── Institutional Config ──────────────────────────────────────────────────────
export async function getInstitutionalConfig() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(institutionalConfig).orderBy(institutionalConfig.key);
}

export async function setInstitutionalConfig(key: string, value: string, updatedById: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(institutionalConfig).where(eq(institutionalConfig.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(institutionalConfig).set({ value, updatedById }).where(eq(institutionalConfig.key, key));
  } else {
    await db.insert(institutionalConfig).values({ key, value, updatedById });
  }
  const rows = await db.select().from(institutionalConfig).where(eq(institutionalConfig.key, key)).limit(1);
  return rows[0] ?? null;
}

export async function setInstitutionalConfigs(configs: { key: string; value: string; label?: string; type?: string; description?: string }[], updatedById: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  for (const config of configs) {
    const existing = await db.select().from(institutionalConfig).where(eq(institutionalConfig.key, config.key)).limit(1);
    if (existing.length > 0) {
      await db.update(institutionalConfig).set({ value: config.value, updatedById }).where(eq(institutionalConfig.key, config.key));
    } else {
      await db.insert(institutionalConfig).values({
        key: config.key,
        value: config.value,
        label: config.label,
        type: (config.type as any) ?? "text",
        description: config.description,
        updatedById,
      });
    }
  }
  return getInstitutionalConfig();
}

// ─── Global Search ─────────────────────────────────────────────────────────────
export async function globalSearch(query: string, isPublic: boolean = false, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  const searchTerm = `%${query}%`;
  return db.select().from(searchIndex)
    .where(and(
      isPublic ? eq(searchIndex.isPublic, true) : undefined,
      or(
        like(searchIndex.title, searchTerm),
        like(searchIndex.content, searchTerm),
        like(searchIndex.nup, searchTerm),
      )
    ))
    .orderBy(desc(searchIndex.updatedAt))
    .limit(limit);
}

export async function upsertSearchIndex(entityType: string, entityId: number, data: {
  nup?: string;
  title: string;
  content?: string;
  tags?: string[];
  isPublic?: boolean;
  visibleToProfiles?: string[];
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(searchIndex)
    .where(and(eq(searchIndex.entityType, entityType), eq(searchIndex.entityId, entityId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(searchIndex).set({
      title: data.title,
      content: data.content,
      tags: data.tags,
      isPublic: data.isPublic ?? false,
      visibleToProfiles: data.visibleToProfiles,
      updatedAt: new Date(),
    }).where(and(eq(searchIndex.entityType, entityType), eq(searchIndex.entityId, entityId)));
  } else {
    await db.insert(searchIndex).values({
      entityType,
      entityId,
      nup: data.nup,
      title: data.title,
      content: data.content,
      tags: data.tags,
      isPublic: data.isPublic ?? false,
      visibleToProfiles: data.visibleToProfiles,
    });
  }
}

// ─── User Registrations ────────────────────────────────────────────────────────
export async function createUserRegistration(data: InsertUserRegistration) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(userRegistrations).values(data);
  const rows = await db.select().from(userRegistrations).where(eq(userRegistrations.email, data.email)).limit(1);
  return rows[0];
}

export async function getUserRegistrationByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userRegistrations).where(eq(userRegistrations.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function getUserRegistrationByGoogleId(googleId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userRegistrations).where(eq(userRegistrations.googleId, googleId)).limit(1);
  return rows[0] ?? null;
}

export async function updateUserRegistration(id: number, data: Partial<InsertUserRegistration>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(userRegistrations).set(data).where(eq(userRegistrations.id, id));
}

export async function verifyEmail(token: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(userRegistrations)
    .where(eq(userRegistrations.emailVerifyToken, token)).limit(1);
  if (!rows[0]) return false;
  await db.update(userRegistrations).set({
    emailVerified: true,
    emailVerifyToken: null,
  }).where(eq(userRegistrations.id, rows[0].id));
  return true;
}
