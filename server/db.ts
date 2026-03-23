import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Account,
  Contact,
  Conversation,
  InsertAccount,
  InsertContact,
  InsertConversation,
  InsertMessage,
  InsertNotification,
  InsertQueue,
  InsertTicket,
  InsertUser,
  Message,
  Notification,
  NupNotification,
  Queue,
  Ticket,
  accounts,
  contacts,
  conversationTags,
  conversations,
  messages,
  notifications,
  nupNotifications,
  queue,
  tags,
  tickets,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function getAgents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.isAgent, true));
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export async function createAccount(data: InsertAccount): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(accounts).values(data);
  return (result[0] as any).insertId;
}

export async function getAccountsByUser(userId: number): Promise<Account[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(desc(accounts.createdAt));
}

export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accounts).orderBy(desc(accounts.createdAt));
}

export async function getAccountById(id: number): Promise<Account | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return result[0];
}

export async function updateAccount(id: number, data: Partial<InsertAccount>) {
  const db = await getDb();
  if (!db) return;
  await db.update(accounts).set(data).where(eq(accounts.id, id));
}

export async function deleteAccount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(accounts).where(eq(accounts.id, id));
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
export async function upsertContact(data: InsertContact): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(contacts).values(data);
  return (result[0] as any).insertId;
}

export async function getContacts(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(contacts).where(
      or(
        like(contacts.name, `%${search}%`),
        like(contacts.email, `%${search}%`),
        like(contacts.phone, `%${search}%`)
      )
    ).limit(50);
  }
  return db.select().from(contacts).limit(100);
}

// ─── Conversations ─────────────────────────────────────────────────────────────
export async function createConversation(data: InsertConversation): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(conversations).values(data);
  return (result[0] as any).insertId;
}

export async function getConversations(filters?: {
  channel?: "whatsapp" | "instagram" | "email";
  status?: "open" | "pending" | "resolved" | "snoozed";
  assignedAgentId?: number;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.channel) conditions.push(eq(conversations.channel, filters.channel));
  if (filters?.status) conditions.push(eq(conversations.status, filters.status));
  if (filters?.assignedAgentId) conditions.push(eq(conversations.assignedAgentId, filters.assignedAgentId));
  if (filters?.dateFrom) conditions.push(gte(conversations.createdAt, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(conversations.createdAt, filters.dateTo));

  const query = db
    .select({
      conversation: conversations,
      contact: contacts,
      account: accounts,
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .leftJoin(accounts, eq(conversations.accountId, accounts.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(conversations.lastMessageAt))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);

  return query;
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      conversation: conversations,
      contact: contacts,
      account: accounts,
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .leftJoin(accounts, eq(conversations.accountId, accounts.id))
    .where(eq(conversations.id, id))
    .limit(1);
  return result[0];
}

export async function updateConversation(id: number, data: Partial<InsertConversation>) {
  const db = await getDb();
  if (!db) return;
  await db.update(conversations).set(data).where(eq(conversations.id, id));
}

export async function getConversationStats() {
  const db = await getDb();
  if (!db) return { open: 0, pending: 0, resolved: 0, total: 0 };
  const result = await db
    .select({
      status: conversations.status,
      count: sql<number>`count(*)`,
    })
    .from(conversations)
    .groupBy(conversations.status);

  const stats = { open: 0, pending: 0, resolved: 0, snoozed: 0, total: 0 };
  for (const row of result) {
    stats[row.status as keyof typeof stats] = Number(row.count);
    stats.total += Number(row.count);
  }
  return stats;
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export async function createMessage(data: InsertMessage): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(messages).values(data);
  return (result[0] as any).insertId;
}
export async function updateMessageDeliveryStatus(
  messageId: number,
  status: "pending" | "sent" | "delivered" | "failed",
  error?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({
    deliveryStatus: status,
    deliveryError: error ?? null,
  }).where(eq(messages.id, messageId));
}

export async function getMessagesByConversation(conversationId: number, limit = 50, offset = 0): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.sentAt))
    .limit(limit)
    .offset(offset);
}

export async function markMessagesAsRead(conversationId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages).set({ isRead: true }).where(
    and(eq(messages.conversationId, conversationId), eq(messages.isRead, false))
  );
  await db.update(conversations).set({ unreadCount: 0 }).where(eq(conversations.id, conversationId));
}

// ─── Tickets ──────────────────────────────────────────────────────────────────
export async function createTicket(data: InsertTicket): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tickets).values(data);
  return (result[0] as any).insertId;
}

export async function getTickets(filters?: {
  status?: "open" | "in_progress" | "resolved" | "closed";
  assignedAgentId?: number;
  priority?: "low" | "normal" | "high" | "urgent";
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(tickets.status, filters.status));
  if (filters?.assignedAgentId) conditions.push(eq(tickets.assignedAgentId, filters.assignedAgentId));
  if (filters?.priority) conditions.push(eq(tickets.priority, filters.priority));

  return db
    .select({
      ticket: tickets,
      conversation: conversations,
    })
    .from(tickets)
    .leftJoin(conversations, eq(tickets.conversationId, conversations.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tickets.createdAt));
}

export async function updateTicket(id: number, data: Partial<InsertTicket>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tickets).set(data).where(eq(tickets.id, id));
}

// ─── Queue ────────────────────────────────────────────────────────────────────
export async function addToQueue(data: InsertQueue): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(queue).values(data);
  return (result[0] as any).insertId;
}

export async function getQueue() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      queue: queue,
      conversation: conversations,
    })
    .from(queue)
    .leftJoin(conversations, eq(queue.conversationId, conversations.id))
    .where(eq(queue.status, "waiting"))
    .orderBy(queue.position);
}

export async function getNextQueuePosition(): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const result = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(position), 0)` })
    .from(queue)
    .where(eq(queue.status, "waiting"));
  return (Number(result[0]?.maxPos) || 0) + 1;
}

export async function updateQueueItem(id: number, data: Partial<InsertQueue>) {
  const db = await getDb();
  if (!db) return;
  await db.update(queue).set(data).where(eq(queue.id, id));
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function createNotification(data: InsertNotification): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(notifications).values(data);
  return (result[0] as any).insertId;
}

export async function getNotificationsByUser(userId: number, limit = 30): Promise<Notification[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(
    and(eq(notifications.userId, userId), eq(notifications.isRead, false))
  );
}

// ─── Tags ─────────────────────────────────────────────────────────────────────
export async function getTags() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tags);
}

export async function createTag(name: string, color: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(tags).values({ name, color });
}

export async function getTagsByConversation(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ tag: tags })
    .from(conversationTags)
    .leftJoin(tags, eq(conversationTags.tagId, tags.id))
    .where(eq(conversationTags.conversationId, conversationId));
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalytics(dateFrom?: Date, dateTo?: Date) {
  const db = await getDb();
  if (!db) return null;

  const conditions = [];
  if (dateFrom) conditions.push(gte(conversations.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(conversations.createdAt, dateTo));

  const [byChannel, byStatus, totalMessages, byAgent] = await Promise.all([
    db.select({
      channel: conversations.channel,
      count: sql<number>`count(*)`,
    }).from(conversations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(conversations.channel),

    db.select({
      status: conversations.status,
      count: sql<number>`count(*)`,
    }).from(conversations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(conversations.status),

    db.select({ count: sql<number>`count(*)` }).from(messages),

    db.select({
      agentId: conversations.assignedAgentId,
      agentName: users.name,
      count: sql<number>`count(*)`,
    }).from(conversations)
      .leftJoin(users, eq(conversations.assignedAgentId, users.id))
      .where(and(
        ...(conditions.length > 0 ? conditions : [sql`1=1`]),
        sql`conversations.assignedAgentId IS NOT NULL`
      ))
      .groupBy(conversations.assignedAgentId, users.name),
  ]);

  return { byChannel, byStatus, totalMessages: Number(totalMessages[0]?.count ?? 0), byAgent };
}

export async function deleteTag(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tags).where(eq(tags.id, id));
}

// ─── Contacts: findOrCreate ───────────────────────────────────────────────────
/**
 * Busca um contato por identificador principal (email, phone ou igHandle).
 * Se não encontrar, cria um novo.
 * CPF/CNPJ são opcionais e complementares — nunca são usados como identificador principal.
 */
export async function findOrCreateContact(params: {
  email?: string;
  phone?: string;
  igHandle?: string;
  cpfCnpj?: string;
  name?: string;
}): Promise<Contact> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Validação: ao menos um identificador principal obrigatório
  if (!params.email && !params.phone && !params.igHandle) {
    throw new Error("Ao menos um identificador principal é obrigatório: e-mail, telefone ou conta do Instagram.");
  }

  // Busca por identificador principal (prioridade: email > phone > igHandle)
  const conditions = [];
  if (params.email) conditions.push(eq(contacts.email, params.email));
  if (params.phone) conditions.push(eq(contacts.phone, params.phone));
  if (params.igHandle) conditions.push(eq(contacts.igHandle, params.igHandle));

  const existing = await db.select().from(contacts)
    .where(or(...conditions))
    .limit(1);

  if (existing.length > 0) {
    // Atualiza dados complementares se fornecidos
    const updates: Partial<InsertContact> = {};
    if (params.name && !existing[0].name) updates.name = params.name;
    if (params.cpfCnpj && !existing[0].cpfCnpj) updates.cpfCnpj = params.cpfCnpj;
    if (params.email && !existing[0].email) updates.email = params.email;
    if (params.phone && !existing[0].phone) updates.phone = params.phone;
    if (params.igHandle && !existing[0].igHandle) updates.igHandle = params.igHandle;
    if (Object.keys(updates).length > 0) {
      await db.update(contacts).set(updates).where(eq(contacts.id, existing[0].id));
    }
    return { ...existing[0], ...updates };
  }

  // Cria novo contato
  const result = await db.insert(contacts).values({
    email: params.email,
    phone: params.phone,
    igHandle: params.igHandle,
    cpfCnpj: params.cpfCnpj,
    name: params.name,
  });
  const newId = (result[0] as any).insertId;
  const newContact = await db.select().from(contacts).where(eq(contacts.id, newId)).limit(1);
  return newContact[0];
}

// ─── NUP Notifications ────────────────────────────────────────────────────────
export async function createNupNotification(data: {
  nup: string;
  entityType: "protocol" | "conversation" | "ombudsman" | "process";
  entityId: number;
  contactId?: number;
  channel: "email" | "whatsapp" | "instagram" | "sms" | "system";
  recipientAddress?: string;
  content?: string;
  trackingLink?: string;
  trackingToken?: string;
  status?: "pending" | "sent" | "failed" | "skipped";
  sentAt?: Date;
  errorMessage?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(nupNotifications).values({
    ...data,
    status: data.status ?? "pending",
  });
  return (result[0] as any).insertId;
}

export async function updateNupNotificationStatus(id: number, status: "sent" | "failed" | "skipped", errorMessage?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(nupNotifications).set({
    status,
    sentAt: status === "sent" ? new Date() : undefined,
    errorMessage: errorMessage ?? null,
  }).where(eq(nupNotifications.id, id));
}

export async function getNupNotifications(nup: string): Promise<NupNotification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(nupNotifications)
    .where(eq(nupNotifications.nup, nup))
    .orderBy(desc(nupNotifications.createdAt));
}

export async function getNupNotificationsByEntity(entityType: string, entityId: number): Promise<NupNotification[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(nupNotifications)
    .where(and(
      eq(nupNotifications.entityType, entityType as any),
      eq(nupNotifications.entityId, entityId)
    ))
    .orderBy(desc(nupNotifications.createdAt));
}
