import {
  bigint,
  boolean,
  int,
  json,
  longtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // CAIUS extended roles
  profile: mysqlEnum("profile", ["citizen", "attendant", "sector_server", "manager", "admin"]).default("attendant").notNull(),
  isAgent: boolean("isAgent").default(false).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  avatarUrl: text("avatarUrl"),
  sectorId: int("sectorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Sectors (Setores / Unidades Administrativas) ─────────────────────────────
export const sectors = mysqlTable("sectors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  description: text("description"),
  parentId: int("parentId"),
  managerId: int("managerId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sector = typeof sectors.$inferSelect;
export type InsertSector = typeof sectors.$inferInsert;

// ─── Connected Accounts (WhatsApp / Instagram / Email) ───────────────────────
export const accounts = mysqlTable("accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "instagram", "email", "web"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  identifier: varchar("identifier", { length: 320 }),
  status: mysqlEnum("status", ["connecting", "connected", "disconnected", "active", "inactive", "error"]).default("disconnected").notNull(),
  waSessionData: text("waSessionData"),
  waQrCode: text("waQrCode"),
  igAccessToken: text("igAccessToken"),
  igUserId: varchar("igUserId", { length: 64 }),
  imapHost: varchar("imapHost", { length: 255 }),
  imapPort: int("imapPort"),
  imapUser: varchar("imapUser", { length: 320 }),
  imapPassword: text("imapPassword"),
  smtpHost: varchar("smtpHost", { length: 255 }),
  smtpPort: int("smtpPort"),
  smtpUser: varchar("smtpUser", { length: 320 }),
  smtpPassword: text("smtpPassword"),
  smtpSecure: boolean("smtpSecure").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  cpfCnpj: varchar("cpfCnpj", { length: 18 }),
  igHandle: varchar("igHandle", { length: 128 }),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ─── Conversations ─────────────────────────────────────────────────────────────
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  nup: varchar("nup", { length: 32 }).unique(),
  accountId: int("accountId").notNull(),
  contactId: int("contactId"),
  channel: mysqlEnum("channel", ["whatsapp", "instagram", "email", "web"]).notNull(),
  externalId: varchar("externalId", { length: 512 }),
  subject: varchar("subject", { length: 512 }),
  status: mysqlEnum("status", ["open", "pending", "resolved", "snoozed"]).default("open").notNull(),
  assignedAgentId: int("assignedAgentId"),
  assignedSectorId: int("assignedSectorId"),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  unreadCount: int("unreadCount").default(0).notNull(),
  lastMessageAt: timestamp("lastMessageAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  externalId: varchar("externalId", { length: 512 }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  type: mysqlEnum("type", ["text", "image", "audio", "video", "document", "sticker", "location", "template"]).default("text").notNull(),
  content: text("content"),
  mediaUrl: text("mediaUrl"),
  metadata: json("metadata"),
  senderName: varchar("senderName", { length: 255 }),
  senderAgentId: int("senderAgentId"),
  isRead: boolean("isRead").default(false).notNull(),
  aiGenerated: boolean("aiGenerated").default(false).notNull(),
  deliveryStatus: mysqlEnum("deliveryStatus", ["pending", "sent", "delivered", "failed"]).default("sent").notNull(),
  deliveryError: text("deliveryError"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Protocols (Protocolo Digital com NUP) ────────────────────────────────────
export const protocols = mysqlTable("protocols", {
  id: int("id").autoincrement().primaryKey(),
  nup: varchar("nup", { length: 32 }).notNull().unique(),
  conversationId: int("conversationId"),
  contactId: int("contactId"),
  // Requester info (for citizens without account)
  requesterName: varchar("requesterName", { length: 255 }),
  requesterEmail: varchar("requesterEmail", { length: 320 }),
  requesterPhone: varchar("requesterPhone", { length: 64 }),
  requesterCpfCnpj: varchar("requesterCpfCnpj", { length: 18 }),
  // Protocol details
  subject: varchar("subject", { length: 512 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["request", "complaint", "information", "suggestion", "praise", "ombudsman", "esic", "administrative"]).default("request").notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "instagram", "email", "web", "phone", "in_person"]).default("web").notNull(),
  status: mysqlEnum("status", ["open", "in_analysis", "pending_docs", "in_progress", "concluded", "archived"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  isConfidential: boolean("isConfidential").default(false).notNull(),
  responsibleSectorId: int("responsibleSectorId"),
  responsibleUserId: int("responsibleUserId"),
  createdById: int("createdById"),
  // Deadline
  deadline: timestamp("deadline"),
  concludedAt: timestamp("concludedAt"),
  // Parent NUP for linked records
  parentNup: varchar("parentNup", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Protocol = typeof protocols.$inferSelect;
export type InsertProtocol = typeof protocols.$inferInsert;

// ─── Tramitations (Tramitação entre Setores) ──────────────────────────────────
export const tramitations = mysqlTable("tramitations", {
  id: int("id").autoincrement().primaryKey(),
  protocolId: int("protocolId").notNull(),
  nup: varchar("nup", { length: 32 }).notNull(),
  fromSectorId: int("fromSectorId"),
  toSectorId: int("toSectorId"),
  fromUserId: int("fromUserId"),
  toUserId: int("toUserId"),
  action: mysqlEnum("action", ["forward", "return", "assign", "conclude", "archive", "reopen", "comment"]).notNull(),
  dispatch: text("dispatch"),
  attachments: json("attachments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tramitation = typeof tramitations.$inferSelect;
export type InsertTramitation = typeof tramitations.$inferInsert;

// ─── Official Documents (Documentos Oficiais) ─────────────────────────────────
export const officialDocuments = mysqlTable("officialDocuments", {
  id: int("id").autoincrement().primaryKey(),
  nup: varchar("nup", { length: 32 }).unique(),
  protocolId: int("protocolId"),
  processId: int("processId"),
  type: mysqlEnum("type", ["memo", "official_letter", "dispatch", "opinion", "notification", "certificate", "report", "other"]).notNull(),
  number: varchar("number", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  content: text("content"),
  authorId: int("authorId").notNull(),
  sectorId: int("sectorId"),
  status: mysqlEnum("status", ["draft", "pending_signature", "signed", "published", "archived"]).default("draft").notNull(),
  isConfidential: boolean("isConfidential").default(false).notNull(),
  aiGenerated: boolean("aiGenerated").default(false).notNull(),
  fileUrl: text("fileUrl"),
  issuedAt: timestamp("issuedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OfficialDocument = typeof officialDocuments.$inferSelect;
export type InsertOfficialDocument = typeof officialDocuments.$inferInsert;

// ─── Administrative Processes (Processos Administrativos) ─────────────────────
export const adminProcesses = mysqlTable("adminProcesses", {
  id: int("id").autoincrement().primaryKey(),
  nup: varchar("nup", { length: 32 }).notNull().unique(),
  originProtocolNup: varchar("originProtocolNup", { length: 32 }),
  title: varchar("title", { length: 512 }).notNull(),
  type: varchar("type", { length: 128 }).notNull(),
  description: text("description"),
  legalBasis: text("legalBasis"),
  observations: text("observations"),
  decision: text("decision"),
  status: mysqlEnum("status", ["open", "in_analysis", "pending_docs", "in_progress", "concluded", "archived"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  isConfidential: boolean("isConfidential").default(false).notNull(),
  responsibleSectorId: int("responsibleSectorId"),
  responsibleUserId: int("responsibleUserId"),
  createdById: int("createdById").notNull(),
  deadline: timestamp("deadline"),
  concludedAt: timestamp("concludedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminProcess = typeof adminProcesses.$inferSelect;
export type InsertAdminProcess = typeof adminProcesses.$inferInsert;

// ─── Ombudsman Manifestations (Ouvidoria) ─────────────────────────────────────
export const ombudsmanManifestations = mysqlTable("ombudsmanManifestations", {
  id: int("id").autoincrement().primaryKey(),
  nup: varchar("nup", { length: 32 }).notNull().unique(),
  type: mysqlEnum("type", ["complaint", "denounce", "praise", "suggestion", "request", "esic"]).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  description: text("description").notNull(),
  // Requester (can be anonymous)
  isAnonymous: boolean("isAnonymous").default(false).notNull(),
  requesterName: varchar("requesterName", { length: 255 }),
  requesterEmail: varchar("requesterEmail", { length: 320 }),
  requesterPhone: varchar("requesterPhone", { length: 64 }),
  requesterCpfCnpj: varchar("requesterCpfCnpj", { length: 18 }),
  isConfidential: boolean("isConfidential").default(false).notNull(),
  status: mysqlEnum("status", ["received", "in_analysis", "in_progress", "answered", "archived"]).default("received").notNull(),
  responsibleSectorId: int("responsibleSectorId"),
  responsibleUserId: int("responsibleUserId"),
  response: text("response"),
  respondedAt: timestamp("respondedAt"),
  deadline: timestamp("deadline"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OmbudsmanManifestation = typeof ombudsmanManifestations.$inferSelect;
export type InsertOmbudsmanManifestation = typeof ombudsmanManifestations.$inferInsert;

// ─── Document Templates (Modelos de Documentos) ───────────────────────────────
export const documentTemplates = mysqlTable("documentTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["memo", "official_letter", "dispatch", "opinion", "notification", "certificate", "report", "response", "other"]).notNull(),
  content: text("content").notNull(),
  variables: json("variables"),
  sectorId: int("sectorId"),
  createdById: int("createdById").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = typeof documentTemplates.$inferInsert;

// ─── Electronic Signatures (Assinaturas Eletrônicas) ──────────────────────────
export const electronicSignatures = mysqlTable("electronicSignatures", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  nup: varchar("nup", { length: 32 }),
  signerId: int("signerId").notNull(),
  signerName: varchar("signerName", { length: 255 }).notNull(),
  signerEmail: varchar("signerEmail", { length: 320 }),
  signerRole: varchar("signerRole", { length: 128 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  documentHash: varchar("documentHash", { length: 256 }),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ElectronicSignature = typeof electronicSignatures.$inferSelect;
export type InsertElectronicSignature = typeof electronicSignatures.$inferInsert;

// ─── Audit Logs (Trilha de Auditoria) ─────────────────────────────────────────
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  nup: varchar("nup", { length: 32 }),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 128 }).notNull(),
  entity: varchar("entity", { length: 64 }).notNull(),
  entityId: int("entityId"),
  details: json("details"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  aiAssisted: boolean("aiAssisted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── AI Providers (Provedores de IA) ──────────────────────────────────────────
export const aiProviders = mysqlTable("aiProviders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["openai", "gemini", "anthropic", "other"]).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  encryptedApiKey: text("encryptedApiKey").notNull(),
  model: varchar("model", { length: 128 }),
  isActive: boolean("isActive").default(true).notNull(),
  allowedProfiles: json("allowedProfiles"),
  allowedSectors: json("allowedSectors"),
  allowedDocTypes: json("allowedDocTypes"),
  retainHistory: boolean("retainHistory").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiProvider = typeof aiProviders.$inferSelect;
export type InsertAiProvider = typeof aiProviders.$inferInsert;

// ─── AI Usage Logs (Logs de Uso de IA) ────────────────────────────────────────
export const aiUsageLogs = mysqlTable("aiUsageLogs", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull(),
  userId: int("userId").notNull(),
  nup: varchar("nup", { length: 32 }),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  prompt: text("prompt"),
  response: text("response"),
  action: varchar("action", { length: 128 }),
  tokensUsed: int("tokensUsed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type InsertAiUsageLog = typeof aiUsageLogs.$inferInsert;

// ─── Tickets ──────────────────────────────────────────────────────────────────
export const tickets = mysqlTable("tickets", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId"),
  nup: varchar("nup", { length: 32 }),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["open", "in_progress", "pending", "resolved", "closed"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  assignedAgentId: int("assignedAgentId"),
  createdById: int("createdById"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// ─── Queue ────────────────────────────────────────────────────────────────────
export const queue = mysqlTable("queue", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  position: int("position").notNull(),
  assignedAgentId: int("assignedAgentId"),
  status: mysqlEnum("status", ["waiting", "assigned", "completed"]).default("waiting").notNull(),
  waitingSince: timestamp("waitingSince").defaultNow().notNull(),
  assignedAt: timestamp("assignedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Queue = typeof queue.$inferSelect;
export type InsertQueue = typeof queue.$inferInsert;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["new_message", "ticket_assigned", "ticket_resolved", "queue_assigned", "mention", "protocol_update", "tramitation", "signature_request", "document_received"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  isRead: boolean("isRead").default(false).notNull(),
  relatedConversationId: int("relatedConversationId"),
  relatedTicketId: int("relatedTicketId"),
  relatedProtocolId: int("relatedProtocolId"),
  relatedDocumentId: int("relatedDocumentId"),
  nup: varchar("nup", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),
  color: varchar("color", { length: 16 }).default("#6366f1").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversationTags = mysqlTable("conversationTags", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  tagId: int("tagId").notNull(),
});

// ─── NUP Counter (Contador para geração de NUP único) ─────────────────────────
export const nupCounter = mysqlTable("nupCounter", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull(),
  sequence: int("sequence").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Service Types (Tipos de Atendimento Configuráveis) ───────────────────────
export const serviceTypes = mysqlTable("serviceTypes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 128 }),
  code: varchar("code", { length: 64 }).unique(),
  initialSectorId: int("initialSectorId"),
  slaResponseHours: int("slaResponseHours"),
  slaConclusionHours: int("slaConclusionHours"),
  secrecyLevel: mysqlEnum("secrecyLevel", ["public", "restricted", "confidential", "secret"]).default("public").notNull(),
  requiresApproval: boolean("requiresApproval").default(false).notNull(),
  canConvertToProcess: boolean("canConvertToProcess").default(false).notNull(),
  allowPublicConsult: boolean("allowPublicConsult").default(true).notNull(),
  requiresSelfie: boolean("requiresSelfie").default(false).notNull(),
  requiresGeolocation: boolean("requiresGeolocation").default(false).notNull(),
  requiresStrongAuth: boolean("requiresStrongAuth").default(false).notNull(),
  defaultResponseTemplateId: int("defaultResponseTemplateId"),
  allowedProfiles: json("allowedProfiles"),
  flowConfig: json("flowConfig"),
   isActive: boolean("isActive").default(true).notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  publicationStatus: mysqlEnum("publicationStatus", ["draft", "published", "inactive", "restricted"]).default("draft").notNull(),
  purpose: text("purpose"),
  whoCanRequest: text("whoCanRequest"),
  cost: varchar("cost", { length: 255 }),
  formOfService: varchar("formOfService", { length: 255 }),
  responseChannel: varchar("responseChannel", { length: 255 }),
  importantNotes: text("importantNotes"),
  faq: json("faq"),
  formTemplateId: int("formTemplateId"),
  serviceMode: mysqlEnum("serviceMode", ["form", "external"]).default("form").notNull(),
  externalUrl: varchar("externalUrl", { length: 2048 }),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ServiceType = typeof serviceTypes.$inferSelect;
export type InsertServiceType = typeof serviceTypes.$inferInsert;

// ─── Form Templates (Modelos de Formulários Dinâmicos) ────────────────────────
export const formTemplates = mysqlTable("formTemplates", {
  id: int("id").autoincrement().primaryKey(),
  serviceTypeId: int("serviceTypeId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: int("version").default(1).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormTemplate = typeof formTemplates.$inferInsert;

// ─── Form Fields (Campos Configuráveis de Formulários) ────────────────────────
export const formFields = mysqlTable("formFields", {
  id: int("id").autoincrement().primaryKey(),
  formTemplateId: int("formTemplateId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  fieldType: mysqlEnum("fieldType", [
    "text", "textarea", "number", "currency", "cpf", "cnpj", "rg", "matricula",
    "email", "phone", "date", "time", "datetime", "address", "cep", "neighborhood",
    "city", "state", "select", "multiselect", "checkbox", "radio", "dependent_list",
    "file_upload", "image", "selfie", "geolocation", "map", "calculated", "hidden",
    "signature", "acknowledgment"
  ]).notNull(),
  placeholder: varchar("placeholder", { length: 255 }),
  helpText: text("helpText"),
  isRequired: boolean("isRequired").default(false).notNull(),
  defaultValue: text("defaultValue"),
  mask: varchar("mask", { length: 128 }),
  maxLength: int("maxLength"),
  validationRegex: varchar("validationRegex", { length: 512 }),
  options: json("options"),
  conditionalRule: json("conditionalRule"),
  visibleToProfiles: json("visibleToProfiles"),
  editableByProfiles: json("editableByProfiles"),
  isReadOnly: boolean("isReadOnly").default(false).notNull(),
  sectionName: varchar("sectionName", { length: 128 }),
  displayOrder: int("displayOrder").default(0).notNull(),
  dependsOnFieldId: int("dependsOnFieldId"),
  autoFill: varchar("autoFill", { length: 128 }),
  isReusable: boolean("isReusable").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FormField = typeof formFields.$inferSelect;
export type InsertFormField = typeof formFields.$inferInsert;

// ─── Attachment Configs (Configuração de Anexos por Tipo) ─────────────────────
export const attachmentConfigs = mysqlTable("attachmentConfigs", {
  id: int("id").autoincrement().primaryKey(),
  serviceTypeId: int("serviceTypeId"),
  formTemplateId: int("formTemplateId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  acceptedTypes: json("acceptedTypes"),
  maxFileSizeMb: int("maxFileSizeMb").default(10).notNull(),
  maxTotalSizeMb: int("maxTotalSizeMb").default(50).notNull(),
  minCount: int("minCount").default(0).notNull(),
  maxCount: int("maxCount").default(10).notNull(),
  isRequired: boolean("isRequired").default(false).notNull(),
  allowedAtStages: json("allowedAtStages"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AttachmentConfig = typeof attachmentConfigs.$inferSelect;
export type InsertAttachmentConfig = typeof attachmentConfigs.$inferInsert;

// ─── Attachments (Anexos de Protocolos/Processos) ─────────────────────────────
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  nup: varchar("nup", { length: 32 }),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId").notNull(),
  configId: int("configId"),
  uploadedById: int("uploadedById").notNull(),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  originalName: varchar("originalName", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSizeBytes: bigint("fileSizeBytes", { mode: "number" }).notNull(),
  s3Key: varchar("s3Key", { length: 1024 }).notNull(),
  s3Url: text("s3Url").notNull(),
  category: varchar("category", { length: 128 }),
  version: int("version").default(1).notNull(),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  deletedAt: timestamp("deletedAt"),
  deletedById: int("deletedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

// ─── Context Help (Ajuda Contextual por Funcionalidade) ───────────────────────
export const contextHelp = mysqlTable("contextHelp", {
  id: int("id").autoincrement().primaryKey(),
  featureKey: varchar("featureKey", { length: 128 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  detailedInstructions: text("detailedInstructions"),
  examples: text("examples"),
  requiredDocuments: text("requiredDocuments"),
  warnings: text("warnings"),
  usefulLinks: json("usefulLinks"),
  normativeBase: text("normativeBase"),
  targetProfiles: json("targetProfiles"),
  displayMode: mysqlEnum("displayMode", ["tooltip", "modal", "sidebar", "expandable"]).default("modal").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContextHelp = typeof contextHelp.$inferSelect;
export type InsertContextHelp = typeof contextHelp.$inferInsert;

// ─── Online Sessions (Sessões Ativas de Usuários) ─────────────────────────────
export const onlineSessions = mysqlTable("onlineSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionToken: varchar("sessionToken", { length: 256 }).notNull().unique(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  channel: varchar("channel", { length: 64 }).default("web").notNull(),
  currentPage: varchar("currentPage", { length: 512 }),
  lastActivity: timestamp("lastActivity").defaultNow().notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  terminatedById: int("terminatedById"),
  terminatedAt: timestamp("terminatedAt"),
  loginAt: timestamp("loginAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OnlineSession = typeof onlineSessions.$inferSelect;
export type InsertOnlineSession = typeof onlineSessions.$inferInsert;

// ─── Institutional Config (Identidade Visual Institucional) ───────────────────
export const institutionalConfig = mysqlTable("institutionalConfig", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  type: mysqlEnum("type", ["text", "color", "url", "boolean", "json"]).default("text").notNull(),
  label: varchar("label", { length: 255 }),
  description: text("description"),
  updatedById: int("updatedById"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InstitutionalConfig = typeof institutionalConfig.$inferSelect;
export type InsertInstitutionalConfig = typeof institutionalConfig.$inferInsert;

// ─── User Registrations (Cadastro Próprio da Plataforma) ──────────────────────
export const userRegistrations = mysqlTable("userRegistrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  cpf: varchar("cpf", { length: 14 }),
  cnpj: varchar("cnpj", { length: 18 }),
  phone: varchar("phone", { length: 20 }),
  googleId: varchar("googleId", { length: 128 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  emailVerifyToken: varchar("emailVerifyToken", { length: 256 }),
  passwordResetToken: varchar("passwordResetToken", { length: 256 }),
  passwordResetExpiry: timestamp("passwordResetExpiry"),
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  mfaEnabled: boolean("mfaEnabled").default(false).notNull(),
  mfaSecret: varchar("mfaSecret", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserRegistration = typeof userRegistrations.$inferSelect;
export type InsertUserRegistration = typeof userRegistrations.$inferInsert;

// ─── Search Index (Índice de Pesquisa Global) ─────────────────────────────────
export const searchIndex = mysqlTable("searchIndex", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId").notNull(),
  nup: varchar("nup", { length: 32 }),
  title: varchar("title", { length: 512 }).notNull(),
  content: text("content"),
  tags: json("tags"),
  visibleToProfiles: json("visibleToProfiles"),
  isPublic: boolean("isPublic").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  entityIdx: index("entity_idx").on(table.entityType, table.entityId),
  nupIdx: index("nup_idx").on(table.nup),
}));

export type SearchIndex = typeof searchIndex.$inferSelect;
export type InsertSearchIndex = typeof searchIndex.$inferInsert;

// ─── Organizational Units (Estrutura Organizacional — Lei 010/2025) ───────────
export const orgUnits = mysqlTable("orgUnits", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 512 }).notNull(),
  acronym: varchar("acronym", { length: 32 }),
  type: mysqlEnum("type", [
    "prefeitura", "gabinete", "procuradoria", "controladoria", "secretaria",
    "superintendencia", "secretaria_executiva", "diretoria", "departamento",
    "coordenacao", "gerencia", "supervisao", "secao", "setor", "nucleo",
    "assessoria", "unidade", "junta", "tesouraria", "ouvidoria"
  ]).notNull().default("setor"),
  level: int("level").notNull().default(1),
  parentId: int("parentId"),
  managerId: int("managerId"),
  description: text("description"),
  legalBasis: varchar("legalBasis", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  isSeeded: boolean("isSeeded").default(false).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  parentIdx: index("orgUnit_parent_idx").on(table.parentId),
  levelIdx: index("orgUnit_level_idx").on(table.level),
  typeIdx: index("orgUnit_type_idx").on(table.type),
}));

export type OrgUnit = typeof orgUnits.$inferSelect;
export type InsertOrgUnit = typeof orgUnits.$inferInsert;

// ─── Positions (Cargos) ───────────────────────────────────────────────────────
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 64 }),
  orgUnitId: int("orgUnitId"),
  level: mysqlEnum("level", [
    "secretario", "secretario_executivo", "diretor", "coordenador",
    "gerente", "supervisor", "chefe", "assessor_tecnico", "assessor_especial", "outro"
  ]).notNull().default("outro"),
  provisionType: mysqlEnum("provisionType", ["comissao", "efetivo", "designacao", "contrato"]).default("comissao"),
  canSign: boolean("canSign").default(false).notNull(),
  canApprove: boolean("canApprove").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isSeeded: boolean("isSeeded").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

// ─── User Allocations (Lotações) ──────────────────────────────────────────────
export const userAllocations = mysqlTable("userAllocations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orgUnitId: int("orgUnitId").notNull(),
  positionId: int("positionId"),
  isPrimary: boolean("isPrimary").default(true).notNull(),
  systemProfile: mysqlEnum("systemProfile", [
    "citizen", "attendant", "sector_server", "analyst", "manager", "authority", "admin"
  ]).default("attendant").notNull(),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate"),
  notes: text("notes"),
  allocatedBy: int("allocatedBy"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("alloc_user_idx").on(table.userId),
  unitIdx: index("alloc_unit_idx").on(table.orgUnitId),
}));

export type UserAllocation = typeof userAllocations.$inferSelect;
export type InsertUserAllocation = typeof userAllocations.$inferInsert;

// ─── Allocation History (Histórico de Movimentação) ───────────────────────────
export const allocationHistory = mysqlTable("allocationHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromOrgUnitId: int("fromOrgUnitId"),
  toOrgUnitId: int("toOrgUnitId"),
  fromPositionId: int("fromPositionId"),
  toPositionId: int("toPositionId"),
  changeType: mysqlEnum("changeType", ["allocation", "transfer", "promotion", "removal", "invite_accepted"]).notNull(),
  changedBy: int("changedBy"),
  notes: text("notes"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("allocHist_user_idx").on(table.userId),
}));

export type AllocationHistory = typeof allocationHistory.$inferSelect;
export type InsertAllocationHistory = typeof allocationHistory.$inferInsert;

// ─── Org Invites (Convites por E-mail) ────────────────────────────────────────
export const orgInvites = mysqlTable("orgInvites", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  orgUnitId: int("orgUnitId").notNull(),
  positionId: int("positionId"),
  systemProfile: mysqlEnum("systemProfile", [
    "citizen", "attendant", "sector_server", "analyst", "manager", "authority", "admin"
  ]).default("attendant").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "cancelled"]).default("pending").notNull(),
  invitedBy: int("invitedBy").notNull(),
  acceptedBy: int("acceptedBy"),
  notes: text("notes"),
  expiresAt: timestamp("expiresAt"),
  acceptedAt: timestamp("acceptedAt"),
  acceptedIp: varchar("acceptedIp", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex("invite_token_idx").on(table.token),
  emailIdx: index("invite_email_idx").on(table.email),
  unitIdx: index("invite_unit_idx").on(table.orgUnitId),
}));

export type OrgInvite = typeof orgInvites.$inferSelect;
export type InsertOrgInvite = typeof orgInvites.$inferInsert;

// ─── Service Type Fields (Campos por Tipo de Atendimento) ─────────────────────
export const serviceTypeFields = mysqlTable("serviceTypeFields", {
  id: int("id").autoincrement().primaryKey(),
  serviceTypeId: int("serviceTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  fieldType: mysqlEnum("fieldType", [
    "text", "textarea", "number", "email", "phone", "cpf", "cnpj",
    "date", "datetime", "select", "multiselect", "checkbox", "radio",
    "file", "image", "signature", "geolocation"
  ]).default("text").notNull(),
  requirement: mysqlEnum("requirement", ["required", "complementary", "optional"]).default("optional").notNull(),
  placeholder: varchar("placeholder", { length: 255 }),
  helpText: text("helpText"),
  options: text("options"),           // JSON array for select/radio/checkbox options
  mask: varchar("mask", { length: 64 }),
  validation: text("validation"),     // JSON with min, max, pattern, etc.
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  serviceTypeIdx: index("stf_serviceType_idx").on(table.serviceTypeId),
}));
export type ServiceTypeField = typeof serviceTypeFields.$inferSelect;
export type InsertServiceTypeField = typeof serviceTypeFields.$inferInsert;

// ─── Service Type Documents (Documentos por Tipo de Atendimento) ──────────────
export const serviceTypeDocuments = mysqlTable("serviceTypeDocuments", {
  id: int("id").autoincrement().primaryKey(),
  serviceTypeId: int("serviceTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  requirement: mysqlEnum("requirement", ["required", "complementary", "optional"]).default("required").notNull(),
  acceptedFormats: varchar("acceptedFormats", { length: 255 }).default("pdf,jpg,png"),
  maxSizeMb: int("maxSizeMb").default(10),
  example: text("example"),           // URL or description of example document
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  serviceTypeIdx: index("std_serviceType_idx").on(table.serviceTypeId),
}));
export type ServiceTypeDocument = typeof serviceTypeDocuments.$inferSelect;
export type InsertServiceTypeDocument = typeof serviceTypeDocuments.$inferInsert;

// ─── Service Subjects (Assuntos por Tipo de Atendimento) ──────────────────────
export const serviceSubjects = mysqlTable("serviceSubjects", {
  id: int("id").autoincrement().primaryKey(),
  serviceTypeId: int("serviceTypeId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  code: varchar("code", { length: 64 }),
  isPublic: boolean("isPublic").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  formTemplateId: int("formTemplateId"),
  slaResponseHours: int("slaResponseHours"),
  slaConclusionHours: int("slaConclusionHours"),
  responsibleSectorId: int("responsibleSectorId"),
  importantNotes: text("importantNotes"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  serviceTypeIdx: index("ss_serviceType_idx").on(table.serviceTypeId),
}));
export type ServiceSubject = typeof serviceSubjects.$inferSelect;
export type InsertServiceSubject = typeof serviceSubjects.$inferInsert;

// ─── NUP Notifications (Notificações automáticas ao gerar NUP) ────────────────
export const nupNotifications = mysqlTable("nupNotifications", {
  id: int("id").autoincrement().primaryKey(),
  nup: varchar("nup", { length: 32 }).notNull(),
  entityType: mysqlEnum("entityType", ["protocol", "conversation", "ombudsman", "process"]).notNull(),
  entityId: int("entityId").notNull(),
  contactId: int("contactId"),
  channel: mysqlEnum("channel", ["email", "whatsapp", "instagram", "sms", "system"]).notNull(),
  recipientAddress: varchar("recipientAddress", { length: 512 }),  // email, phone, igHandle
  status: mysqlEnum("status", ["pending", "sent", "failed", "skipped"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  content: text("content"),           // mensagem enviada
  trackingLink: text("trackingLink"), // link de acompanhamento gerado
  trackingToken: varchar("trackingToken", { length: 128 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  nupIdx: index("nn_nup_idx").on(table.nup),
  entityIdx: index("nn_entity_idx").on(table.entityType, table.entityId),
  contactIdx: index("nn_contact_idx").on(table.contactId),
}));
export type NupNotification = typeof nupNotifications.$inferSelect;
export type InsertNupNotification = typeof nupNotifications.$inferInsert;

// ─── Custom Modules (Tipos de Processos Dinâmicos na Gestão Pública) ──────────
export const customModules = mysqlTable("customModules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),           // Ex: "Licenças Ambientais"
  slug: varchar("slug", { length: 64 }).notNull().unique(),   // Ex: "licencas-ambientais"
  description: text("description"),
  icon: varchar("icon", { length: 64 }).default("FileText"),  // Lucide icon name
  color: varchar("color", { length: 32 }).default("#6366f1"), // Hex color
  menuSection: varchar("menuSection", { length: 64 }).default("gestao-publica"), // section in sidebar
  menuOrder: int("menuOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  fields: json("fields"),   // JSON array of field definitions (same as FormBuilder)
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomModule = typeof customModules.$inferSelect;
export type InsertCustomModule = typeof customModules.$inferInsert;

// ─── Custom Module Records (Registros dos processos dinâmicos) ────────────────
export const customModuleRecords = mysqlTable("customModuleRecords", {
  id: int("id").autoincrement().primaryKey(),
  moduleId: int("moduleId").notNull(),
  nup: varchar("nup", { length: 32 }),
  title: varchar("title", { length: 256 }).notNull(),
  status: varchar("status", { length: 64 }).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  assignedTo: int("assignedTo"),
  sectorId: int("sectorId"),
  data: json("data"),         // JSON with field values
  content: text("content"),   // Rich text content (HTML)
  isConfidential: boolean("isConfidential").default(false).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  moduleIdx: index("cmr_module_idx").on(table.moduleId),
  nupIdx: index("cmr_nup_idx").on(table.nup),
}));
export type CustomModuleRecord = typeof customModuleRecords.$inferSelect;
export type InsertCustomModuleRecord = typeof customModuleRecords.$inferInsert;

// ─── Verifiable Documents (Documentos com chave de autenticidade) ─────────────
export const verifiableDocuments = mysqlTable("verifiableDocuments", {
  id: int("id").autoincrement().primaryKey(),
  // Vínculo com entidade original
  entityType: mysqlEnum("entityType", ["protocol", "process", "document", "ombudsman", "template", "receipt", "report", "custom"]).notNull(),
  entityId: int("entityId").notNull(),
  nup: varchar("nup", { length: 32 }),
  // Identificação e autenticidade
  verificationKey: varchar("verificationKey", { length: 128 }).notNull().unique(), // Chave única de verificação
  documentHash: varchar("documentHash", { length: 256 }),   // SHA-256 do conteúdo
  // Metadados públicos
  title: varchar("title", { length: 512 }).notNull(),
  documentType: varchar("documentType", { length: 128 }).notNull(), // ofício, memorando, certidão...
  documentNumber: varchar("documentNumber", { length: 64 }),
  issuingUnit: varchar("issuingUnit", { length: 256 }),
  issuingUserId: int("issuingUserId"),
  issuingUserName: varchar("issuingUserName", { length: 255 }),
  // Status e versão
  status: mysqlEnum("status", ["authentic", "invalid", "cancelled", "replaced", "revoked", "unavailable"]).default("authentic").notNull(),
  version: int("version").default(1).notNull(),
  replacedById: int("replacedById"),  // ID do documento que substituiu este
  // QR Code e links
  verificationUrl: varchar("verificationUrl", { length: 1024 }),
  qrCodeData: text("qrCodeData"),     // SVG ou base64 do QR Code
  // Controle
  isPublic: boolean("isPublic").default(true).notNull(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  invalidatedAt: timestamp("invalidatedAt"),
  invalidationReason: text("invalidationReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  keyIdx: index("vd_key_idx").on(table.verificationKey),
  nupIdx: index("vd_nup_idx").on(table.nup),
  entityIdx: index("vd_entity_idx").on(table.entityType, table.entityId),
}));
export type VerifiableDocument = typeof verifiableDocuments.$inferSelect;
export type InsertVerifiableDocument = typeof verifiableDocuments.$inferInsert;

// ─── Document Signatures (Assinaturas eletrônicas por documento) ──────────────
export const documentSignatures = mysqlTable("documentSignatures", {
  id: int("id").autoincrement().primaryKey(),
  verifiableDocumentId: int("verifiableDocumentId").notNull(),
  nup: varchar("nup", { length: 32 }),
  // Signatário
  signerId: int("signerId").notNull(),
  signerName: varchar("signerName", { length: 255 }).notNull(),
  signerCpfMasked: varchar("signerCpfMasked", { length: 20 }),  // Ex: ***.***.456-**
  signerRole: varchar("signerRole", { length: 128 }),
  signerUnit: varchar("signerUnit", { length: 256 }),
  // Tipo e método
  signatureType: mysqlEnum("signatureType", ["institutional", "advanced", "qualified"]).default("institutional").notNull(),
  signatureMethod: varchar("signatureMethod", { length: 128 }).default("CAIUS-INSTITUTIONAL"),
  // Criptografia e integridade
  documentHash: varchar("documentHash", { length: 256 }),
  signatureHash: varchar("signatureHash", { length: 256 }),
  certificate: text("certificate"),        // Certificado ou credencial, quando houver
  certIssuer: varchar("certIssuer", { length: 512 }),
  algorithm: varchar("algorithm", { length: 64 }).default("SHA-256"),
  // Evidências
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  // Código de acesso e verificação
  accessCode: varchar("accessCode", { length: 128 }).notNull().unique(),
  verificationUrl: varchar("verificationUrl", { length: 1024 }),
  // Status e controle
  status: mysqlEnum("status", ["valid", "invalid", "altered", "revoked", "expired", "replaced"]).default("valid").notNull(),
  signedAt: timestamp("signedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  revocationReason: text("revocationReason"),
  // Ordem na cadeia de assinaturas
  signatureOrder: int("signatureOrder").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  docIdx: index("ds_doc_idx").on(table.verifiableDocumentId),
  codeIdx: index("ds_code_idx").on(table.accessCode),
  signerIdx: index("ds_signer_idx").on(table.signerId),
}));
export type DocumentSignature = typeof documentSignatures.$inferSelect;
export type InsertDocumentSignature = typeof documentSignatures.$inferInsert;

// ─── Document Verification Logs (Logs de acesso à verificação pública) ────────
export const documentVerificationLogs = mysqlTable("documentVerificationLogs", {
  id: int("id").autoincrement().primaryKey(),
  verifiableDocumentId: int("verifiableDocumentId"),
  verificationKey: varchar("verificationKey", { length: 128 }),
  accessCode: varchar("accessCode", { length: 128 }),
  queryType: mysqlEnum("queryType", ["nup", "key", "qrcode", "link"]).default("key").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  result: mysqlEnum("result", ["found", "not_found", "invalid"]).default("found").notNull(),
  accessedAt: timestamp("accessedAt").defaultNow().notNull(),
});
export type DocumentVerificationLog = typeof documentVerificationLogs.$inferSelect;
export type InsertDocumentVerificationLog = typeof documentVerificationLogs.$inferInsert;

// ─── Channel Sync State (Estado de sincronização por conta/canal) ─────────────
export const channelSyncState = mysqlTable("channelSyncState", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "instagram", "email"]).notNull(),
  lastCursor: varchar("lastCursor", { length: 512 }),
  lastMessageAt: timestamp("lastMessageAt"),
  lastSyncAt: timestamp("lastSyncAt"),
  status: mysqlEnum("status", ["idle", "syncing", "error", "disconnected"]).default("idle").notNull(),
  errorMessage: text("errorMessage"),
  syncCount: int("syncCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  accountChannelIdx: index("css_account_channel_idx").on(table.accountId, table.channel),
}));
export type ChannelSyncState = typeof channelSyncState.$inferSelect;
export type InsertChannelSyncState = typeof channelSyncState.$inferInsert;

// ─── Delivery Attempts (Tentativas de entrega de notificações) ────────────────
export const deliveryAttempts = mysqlTable("deliveryAttempts", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId"),
  protocolId: int("protocolId"),
  nup: varchar("nup", { length: 64 }),
  channel: mysqlEnum("channel", ["whatsapp", "instagram", "email"]).notNull(),
  accountId: int("accountId").notNull(),
  recipient: varchar("recipient", { length: 512 }).notNull(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  payload: text("payload"),
  status: mysqlEnum("status", ["pending", "sent", "failed", "retrying", "cancelled"]).default("pending").notNull(),
  attemptNumber: int("attemptNumber").default(1).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
  nextRetryAt: timestamp("nextRetryAt"),
}, (table) => ({
  convIdx: index("da_conv_idx").on(table.conversationId),
  statusIdx: index("da_status_idx").on(table.status),
  eventIdx: index("da_event_idx").on(table.eventType),
}));
export type DeliveryAttempt = typeof deliveryAttempts.$inferSelect;
export type InsertDeliveryAttempt = typeof deliveryAttempts.$inferInsert;

// ─── Message Events (Eventos de mensagem por canal) ───────────────────────────
export const messageEvents = mysqlTable("messageEvents", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId"),
  conversationId: int("conversationId"),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "instagram", "email"]).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  msgIdx: index("me_msg_idx").on(table.messageId),
  convIdx: index("me_conv_idx").on(table.conversationId),
  typeIdx: index("me_type_idx").on(table.eventType),
}));
export type MessageEvent = typeof messageEvents.$inferSelect;
export type InsertMessageEvent = typeof messageEvents.$inferInsert;

// ─── Channel Health Logs (Logs de saúde dos conectores) ──────────────────────
export const channelHealthLogs = mysqlTable("channelHealthLogs", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "instagram", "email"]).notNull(),
  status: mysqlEnum("status", ["healthy", "degraded", "unhealthy", "unknown"]).default("unknown").notNull(),
  latencyMs: int("latencyMs"),
  errorMessage: text("errorMessage"),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
}, (table) => ({
  accountIdx: index("chl_account_idx").on(table.accountId),
  checkedIdx: index("chl_checked_idx").on(table.checkedAt),
}));
export type ChannelHealthLog = typeof channelHealthLogs.$inferSelect;
export type InsertChannelHealthLog = typeof channelHealthLogs.$inferInsert;

// ─── Survey Dispatches (Pesquisas de satisfação enviadas) ─────────────────────
export const surveyDispatches = mysqlTable("surveyDispatches", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  protocolId: int("protocolId"),
  nup: varchar("nup", { length: 64 }),
  channel: mysqlEnum("channel", ["whatsapp", "instagram", "email"]).notNull(),
  accountId: int("accountId").notNull(),
  recipient: varchar("recipient", { length: 512 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "responded", "failed", "expired"]).default("pending").notNull(),
  surveyToken: varchar("surveyToken", { length: 128 }).unique(),
  rating: int("rating"),
  feedback: text("feedback"),
  sentAt: timestamp("sentAt"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  convIdx: index("sd_conv_idx").on(table.conversationId),
  statusIdx: index("sd_status_idx").on(table.status),
}));
export type SurveyDispatch = typeof surveyDispatches.$inferSelect;
export type InsertSurveyDispatch = typeof surveyDispatches.$inferInsert;

// ─── Audio Transcriptions (Transcrições de áudio) ────────────────────────────
export const audioTranscriptions = mysqlTable("audioTranscriptions", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId"),
  conversationId: int("conversationId"),
  contactId: int("contactId"),
  protocolId: int("protocolId"),
  nup: varchar("nup", { length: 64 }),
  audioUrl: varchar("audioUrl", { length: 1024 }),
  provider: varchar("provider", { length: 64 }).default("whisper"),
  transcriptionText: text("transcriptionText"),
  language: varchar("language", { length: 16 }),
  confidence: varchar("confidence", { length: 16 }),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  durationSeconds: int("durationSeconds"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  msgIdx: index("at_msg_idx").on(table.messageId),
  convIdx: index("at_conv_idx").on(table.conversationId),
  statusIdx: index("at_status_idx").on(table.status),
}));
export type AudioTranscription = typeof audioTranscriptions.$inferSelect;
export type InsertAudioTranscription = typeof audioTranscriptions.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// FASE 31 — Especificação 40-A: Workflow, Documentos, Ouvidoria, Geo, Knowledge
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Service Categories (Categorias de Serviços) ──────────────────────────────
export const serviceCategories = mysqlTable("serviceCategories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 50 }),
  isActive: boolean("isActive").default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Service Publications (Publicação de Serviços) ────────────────────────────
export const servicePublications = mysqlTable("servicePublications", {
  id: int("id").primaryKey().autoincrement(),
  serviceTypeId: int("serviceTypeId").notNull(),
  categoryId: int("categoryId"),
  orgUnitId: int("orgUnitId"),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  citizenDescription: text("citizenDescription"),
  requirements: text("requirements"),
  estimatedTime: varchar("estimatedTime", { length: 100 }),
  cost: varchar("cost", { length: 100 }),
  isPublic: boolean("isPublic").default(true),
  isActive: boolean("isActive").default(true),
  publishedAt: timestamp("publishedAt"),
  unpublishedAt: timestamp("unpublishedAt"),
  publishedById: int("publishedById"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Service FAQs (Perguntas Frequentes por Serviço) ──────────────────────────
export const serviceFaqs = mysqlTable("serviceFaqs", {
  id: int("id").primaryKey().autoincrement(),
  serviceTypeId: int("serviceTypeId").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Service Checklists (Checklist de Documentos por Serviço) ─────────────────
export const serviceChecklists = mysqlTable("serviceChecklists", {
  id: int("id").primaryKey().autoincrement(),
  serviceTypeId: int("serviceTypeId").notNull(),
  item: varchar("item", { length: 500 }).notNull(),
  description: text("description"),
  isRequired: boolean("isRequired").default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Form Field Options (Opções para campos select/radio/checkbox) ─────────────
export const formFieldOptions = mysqlTable("formFieldOptions", {
  id: int("id").primaryKey().autoincrement(),
  fieldId: int("fieldId").notNull(),
  label: varchar("label", { length: 300 }).notNull(),
  value: varchar("value", { length: 300 }).notNull(),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
});

// ─── Form Submissions (Respostas de Formulários) ──────────────────────────────
export const formSubmissions = mysqlTable("formSubmissions", {
  id: int("id").primaryKey().autoincrement(),
  formTemplateId: int("formTemplateId").notNull(),
  protocolId: int("protocolId"),
  contactId: int("contactId"),
  submittedById: int("submittedById"),
  nup: varchar("nup", { length: 50 }),
  status: mysqlEnum("status", ["draft", "submitted", "processing", "completed", "rejected"]).default("submitted"),
  submittedAt: timestamp("submittedAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Form Submission Values (Valores das Respostas) ───────────────────────────
export const formSubmissionValues = mysqlTable("formSubmissionValues", {
  id: int("id").primaryKey().autoincrement(),
  submissionId: int("submissionId").notNull(),
  fieldId: int("fieldId").notNull(),
  fieldKey: varchar("fieldKey", { length: 200 }).notNull(),
  value: text("value"),
  fileUrl: text("fileUrl"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Workflow Definitions (Definições de Workflow) ────────────────────────────
export const workflowDefinitions = mysqlTable("workflowDefinitions", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  serviceTypeId: int("serviceTypeId"),
  isActive: boolean("isActive").default(true),
  isDefault: boolean("isDefault").default(false),
  version: int("version").default(1),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Workflow Steps (Etapas do Workflow) ──────────────────────────────────────
export const workflowSteps = mysqlTable("workflowSteps", {
  id: int("id").primaryKey().autoincrement(),
  workflowId: int("workflowId").notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  stepOrder: int("stepOrder").notNull(),
  stepType: mysqlEnum("stepType", ["start", "task", "decision", "approval", "notification", "document", "end"]).default("task"),
  responsibleRole: varchar("responsibleRole", { length: 100 }),
  responsibleOrgUnitId: int("responsibleOrgUnitId"),
  slaHours: int("slaHours"),
  isRequired: boolean("isRequired").default(true),
  generateDocument: boolean("generateDocument").default(false),
  documentTemplateId: int("documentTemplateId"),
  requiresSignature: boolean("requiresSignature").default(false),
  sendNotification: boolean("sendNotification").default(false),
  notificationTemplate: text("notificationTemplate"),
  positionX: int("positionX").default(0),
  positionY: int("positionY").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Workflow Step Rules (Regras de Entrada/Saída por Etapa) ──────────────────
export const workflowStepRules = mysqlTable("workflowStepRules", {
  id: int("id").primaryKey().autoincrement(),
  stepId: int("stepId").notNull(),
  ruleType: mysqlEnum("ruleType", ["entry", "exit", "condition"]).default("condition"),
  field: varchar("field", { length: 200 }),
  operator: varchar("operator", { length: 50 }),
  value: varchar("value", { length: 500 }),
  action: varchar("action", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Workflow Transitions (Transições entre Etapas) ──────────────────────────
export const workflowTransitions = mysqlTable("workflowTransitions", {
  id: int("id").primaryKey().autoincrement(),
  workflowId: int("workflowId").notNull(),
  fromStepId: int("fromStepId").notNull(),
  toStepId: int("toStepId").notNull(),
  label: varchar("label", { length: 200 }),
  condition: text("condition"),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Workflow Instances (Execuções de Workflow) ───────────────────────────────
export const workflowInstances = mysqlTable("workflowInstances", {
  id: int("id").primaryKey().autoincrement(),
  workflowId: int("workflowId").notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: int("entityId").notNull(),
  nup: varchar("nup", { length: 50 }),
  currentStepId: int("currentStepId"),
  status: mysqlEnum("status", ["active", "completed", "cancelled", "suspended", "overdue"]).default("active"),
  startedAt: timestamp("startedAt").defaultNow(),
  completedAt: timestamp("completedAt"),
  startedById: int("startedById"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Workflow Instance Steps (Histórico de Etapas Executadas) ─────────────────
export const workflowInstanceSteps = mysqlTable("workflowInstanceSteps", {
  id: int("id").primaryKey().autoincrement(),
  instanceId: int("instanceId").notNull(),
  stepId: int("stepId").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "skipped", "rejected"]).default("pending"),
  assignedToId: int("assignedToId"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  dueAt: timestamp("dueAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Workflow Deadlines (Prazos e SLA) ───────────────────────────────────────
export const workflowDeadlines = mysqlTable("workflowDeadlines", {
  id: int("id").primaryKey().autoincrement(),
  instanceId: int("instanceId").notNull(),
  instanceStepId: int("instanceStepId"),
  dueAt: timestamp("dueAt").notNull(),
  alertSentAt: timestamp("alertSentAt"),
  isOverdue: boolean("isOverdue").default(false),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Workflow Events (Log de Eventos do Workflow) ─────────────────────────────
export const workflowEvents = mysqlTable("workflowEvents", {
  id: int("id").primaryKey().autoincrement(),
  instanceId: int("instanceId").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  fromStepId: int("fromStepId"),
  toStepId: int("toStepId"),
  performedById: int("performedById"),
  notes: text("notes"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Document Versions (Versões de Documentos) ───────────────────────────────
export const documentVersions = mysqlTable("documentVersions", {
  id: int("id").primaryKey().autoincrement(),
  documentId: int("documentId").notNull(),
  documentType: varchar("documentType", { length: 100 }).notNull(),
  version: int("version").notNull(),
  content: text("content"),
  htmlContent: text("htmlContent"),
  pdfUrl: text("pdfUrl"),
  changeDescription: varchar("changeDescription", { length: 500 }),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Document Number Sequences (Numeração Automática) ────────────────────────
export const documentNumberSequences = mysqlTable("documentNumberSequences", {
  id: int("id").primaryKey().autoincrement(),
  documentType: varchar("documentType", { length: 100 }).notNull(),
  orgUnitId: int("orgUnitId"),
  year: int("year").notNull(),
  lastNumber: int("lastNumber").default(0),
  prefix: varchar("prefix", { length: 50 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Document Read Logs (Logs de Leitura de Documentos) ──────────────────────
export const documentReadLogs = mysqlTable("documentReadLogs", {
  id: int("id").primaryKey().autoincrement(),
  documentId: int("documentId").notNull(),
  documentType: varchar("documentType", { length: 100 }).notNull(),
  readById: int("readById"),
  readByIp: varchar("readByIp", { length: 50 }),
  isPublicAccess: boolean("isPublicAccess").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Manifestation Types (Tipos de Manifestação de Ouvidoria) ─────────────────
export const manifestationTypes = mysqlTable("manifestationTypes", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 200 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  deadlineDays: int("deadlineDays").default(30),
  allowAnonymous: boolean("allowAnonymous").default(true),
  requiresSecrecy: boolean("requiresSecrecy").default(false),
  isEsic: boolean("isEsic").default(false),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Manifestation Status History (Histórico de Status) ──────────────────────
export const manifestationStatusHistory = mysqlTable("manifestationStatusHistory", {
  id: int("id").primaryKey().autoincrement(),
  manifestationId: int("manifestationId").notNull(),
  fromStatus: varchar("fromStatus", { length: 100 }),
  toStatus: varchar("toStatus", { length: 100 }).notNull(),
  notes: text("notes"),
  changedById: int("changedById"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Manifestation Deadlines (Prazos de Manifestação) ────────────────────────
export const manifestationDeadlines = mysqlTable("manifestationDeadlines", {
  id: int("id").primaryKey().autoincrement(),
  manifestationId: int("manifestationId").notNull(),
  dueAt: timestamp("dueAt").notNull(),
  extensionDays: int("extensionDays").default(0),
  extensionReason: text("extensionReason"),
  isOverdue: boolean("isOverdue").default(false),
  alertSentAt: timestamp("alertSentAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Manifestation Responses (Respostas às Manifestações) ────────────────────
export const manifestationResponses = mysqlTable("manifestationResponses", {
  id: int("id").primaryKey().autoincrement(),
  manifestationId: int("manifestationId").notNull(),
  responseType: mysqlEnum("responseType", ["internal", "citizen", "forward", "archive"]).default("internal"),
  content: text("content").notNull(),
  attachmentUrl: text("attachmentUrl"),
  respondedById: int("respondedById"),
  forwardedToOrgUnitId: int("forwardedToOrgUnitId"),
  isPublic: boolean("isPublic").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Geo Points (Pontos Georreferenciados) ────────────────────────────────────
export const geoPoints = mysqlTable("geoPoints", {
  id: int("id").primaryKey().autoincrement(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  nup: varchar("nup", { length: 50 }),
  latitude: varchar("latitude", { length: 30 }).notNull(),
  longitude: varchar("longitude", { length: 30 }).notNull(),
  address: text("address"),
  neighborhood: varchar("neighborhood", { length: 200 }),
  zone: varchar("zone", { length: 200 }),
  city: varchar("city", { length: 200 }),
  state: varchar("state", { length: 50 }),
  accuracy: varchar("accuracy", { length: 50 }),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Geo Events (Ocorrências Georreferenciadas) ───────────────────────────────
export const geoEvents = mysqlTable("geoEvents", {
  id: int("id").primaryKey().autoincrement(),
  geoPointId: int("geoPointId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  eventType: varchar("eventType", { length: 100 }),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium"),
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open"),
  orgUnitId: int("orgUnitId"),
  nup: varchar("nup", { length: 50 }),
  reportedById: int("reportedById"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Geo Attachments (Imagens e Evidências Georreferenciadas) ─────────────────
export const geoAttachments = mysqlTable("geoAttachments", {
  id: int("id").primaryKey().autoincrement(),
  geoEventId: int("geoEventId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  mimeType: varchar("mimeType", { length: 100 }),
  description: varchar("description", { length: 500 }),
  uploadedById: int("uploadedById"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Knowledge Categories (Categorias da Base de Conhecimento) ────────────────
export const knowledgeCategories = mysqlTable("knowledgeCategories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  description: text("description"),
  parentId: int("parentId"),
  icon: varchar("icon", { length: 100 }),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Knowledge Articles (Artigos da Base de Conhecimento) ─────────────────────
export const knowledgeArticles = mysqlTable("knowledgeArticles", {
  id: int("id").primaryKey().autoincrement(),
  categoryId: int("categoryId"),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull(),
  summary: text("summary"),
  content: text("content").notNull(),
  tags: json("tags"),
  isPublic: boolean("isPublic").default(false),
  isActive: boolean("isActive").default(true),
  viewCount: int("viewCount").default(0),
  helpfulCount: int("helpfulCount").default(0),
  notHelpfulCount: int("notHelpfulCount").default(0),
  createdById: int("createdById"),
  updatedById: int("updatedById"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Knowledge Tags (Tags da Base de Conhecimento) ────────────────────────────
export const knowledgeTags = mysqlTable("knowledgeTags", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Agent Status (Disponibilidade dos Agentes) ───────────────────────────────
export const agentStatus = mysqlTable("agentStatus", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["online", "away", "busy", "offline"]).default("offline"),
  statusMessage: varchar("statusMessage", { length: 300 }),
  maxConcurrentChats: int("maxConcurrentChats").default(5),
  currentChats: int("currentChats").default(0),
  lastSeenAt: timestamp("lastSeenAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Conversation Transfers (Transferências entre Agentes) ────────────────────
export const conversationTransfers = mysqlTable("conversationTransfers", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversationId").notNull(),
  fromAgentId: int("fromAgentId"),
  toAgentId: int("toAgentId"),
  toOrgUnitId: int("toOrgUnitId"),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending"),
  transferredAt: timestamp("transferredAt").defaultNow(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Quick Replies (Respostas Rápidas) ───────────────────────────────────────
export const quickReplies = mysqlTable("quickReplies", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  shortcut: varchar("shortcut", { length: 50 }),
  channel: varchar("channel", { length: 50 }),
  orgUnitId: int("orgUnitId"),
  createdById: int("createdById"),
  isGlobal: boolean("isGlobal").default(false),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Attendance Metrics Snapshots (Snapshots de Métricas de Atendimento) ──────
export const attendanceMetricsSnapshots = mysqlTable("attendanceMetricsSnapshots", {
  id: int("id").primaryKey().autoincrement(),
  agentId: int("agentId"),
  orgUnitId: int("orgUnitId"),
  snapshotDate: timestamp("snapshotDate").notNull(),
  totalConversations: int("totalConversations").default(0),
  resolvedConversations: int("resolvedConversations").default(0),
  avgResponseTimeMs: int("avgResponseTimeMs").default(0),
  avgHandleTimeMs: int("avgHandleTimeMs").default(0),
  firstResponseTimeMs: int("firstResponseTimeMs").default(0),
  satisfactionScore: int("satisfactionScore"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Satisfaction Surveys (Pesquisas de Satisfação) ───────────────────────────
export const satisfactionSurveys = mysqlTable("satisfactionSurveys", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  questions: json("questions"),
  triggerEvent: varchar("triggerEvent", { length: 100 }),
  isActive: boolean("isActive").default(true),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Survey Answers (Respostas de Pesquisas) ─────────────────────────────────
export const surveyAnswers = mysqlTable("surveyAnswers", {
  id: int("id").primaryKey().autoincrement(),
  surveyId: int("surveyId").notNull(),
  dispatchId: int("dispatchId"),
  conversationId: int("conversationId"),
  contactId: int("contactId"),
  answers: json("answers"),
  score: int("score"),
  comment: text("comment"),
  submittedAt: timestamp("submittedAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Sensitive Access Logs (Logs de Acesso a Dados Sensíveis) ─────────────────
export const sensitiveAccessLogs = mysqlTable("sensitiveAccessLogs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: text("userAgent"),
  justification: text("justification"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Compliance Events (Eventos de Conformidade) ─────────────────────────────
export const complianceEvents = mysqlTable("complianceEvents", {
  id: int("id").primaryKey().autoincrement(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  nup: varchar("nup", { length: 50 }),
  description: text("description"),
  severity: mysqlEnum("severity", ["info", "warning", "critical"]).default("info"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Process Deadline History (Histórico de Prazos de Processos) ──────────────
export const processDeadlineHistory = mysqlTable("processDeadlineHistory", {
  id: int("id").primaryKey().autoincrement(),
  processId: int("processId").notNull(),
  processNup: varchar("processNup", { length: 32 }),
  previousDeadline: timestamp("previousDeadline"),
  newDeadline: timestamp("newDeadline"),
  reason: text("reason").notNull(),
  action: mysqlEnum("action", ["set", "extend", "reduce", "remove"]).notNull().default("set"),
  changedById: int("changedById").notNull(),
  changedByName: varchar("changedByName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ProcessDeadlineHistory = typeof processDeadlineHistory.$inferSelect;
export type InsertProcessDeadlineHistory = typeof processDeadlineHistory.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// CHATBOT — Fluxos Configuráveis para WhatsApp
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Bot Flows (Fluxos do Chatbot) ────────────────────────────────────────────
// Cada conta WhatsApp pode ter um fluxo ativo. Um fluxo é uma árvore de nós.
export const botFlows = mysqlTable("botFlows", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Se accountId for null, o fluxo é global (aplicado a todas as contas)
  accountId: int("accountId"),
  isActive: boolean("isActive").default(false).notNull(),
  // Nó raiz do fluxo (primeiro nó exibido ao usuário)
  rootNodeId: int("rootNodeId"),
  // Timeout em minutos para expirar a sessão do bot (padrão 30 min)
  sessionTimeoutMinutes: int("sessionTimeoutMinutes").default(30).notNull(),
  // Mensagem enviada quando a sessão expira
  timeoutMessage: text("timeoutMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BotFlow = typeof botFlows.$inferSelect;
export type InsertBotFlow = typeof botFlows.$inferInsert;

// ─── Bot Nodes (Nós/Etapas do Fluxo) ─────────────────────────────────────────
// Cada nó representa uma etapa do fluxo: pode exibir um menu, coletar dados,
// transferir para atendente ou abrir protocolo automaticamente.
export const botNodes = mysqlTable("botNodes", {
  id: int("id").autoincrement().primaryKey(),
  flowId: int("flowId").notNull(),
  // Tipo do nó:
  //   menu       → exibe lista numerada de opções
  //   message    → envia mensagem e avança automaticamente para nextNodeId
  //   collect    → coleta dado do usuário (nome, CPF, etc.)
  //   transfer   → transfere para atendente (setor ou agente específico)
  //   protocol   → abre protocolo NUP automaticamente e encerra bot
  //   end        → encerra o fluxo sem abrir protocolo
  nodeType: mysqlEnum("nodeType", ["menu", "message", "collect", "transfer", "protocol", "end"]).notNull(),
  // Título interno para identificação no painel
  title: varchar("title", { length: 255 }).notNull(),
  // Texto enviado ao usuário neste nó
  message: text("message").notNull(),
  // Para nó "collect": nome do campo a coletar (ex: "requesterName", "cpf")
  collectField: varchar("collectField", { length: 64 }),
  // Para nó "transfer": setor de destino
  transferSectorId: int("transferSectorId"),
  // Para nó "protocol": tipo do protocolo a abrir
  protocolType: mysqlEnum("protocolType", ["request", "complaint", "information", "suggestion", "praise", "ombudsman", "esic"]),
  // Para nó "protocol": assunto padrão do protocolo (pode usar variáveis como {{requesterName}})
  protocolSubject: varchar("protocolSubject", { length: 512 }),
  // Para nó "protocol": serviceTypeId vinculado ao protocolo
  protocolServiceTypeId: int("protocolServiceTypeId"),
  // Próximo nó padrão (para nós do tipo message/collect que não têm opções)
  nextNodeId: int("nextNodeId"),
  // Opções do menu (JSON): [{ label, nextNodeId }]
  options: json("options"),
  // Ordem de exibição no editor visual
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BotNode = typeof botNodes.$inferSelect;
export type InsertBotNode = typeof botNodes.$inferInsert;

// ─── Bot Sessions (Estado Atual do Usuário no Fluxo) ──────────────────────────
// Rastreia em qual nó do fluxo cada usuário (JID) está no momento.
export const botSessions = mysqlTable("botSessions", {
  id: int("id").autoincrement().primaryKey(),
  // JID do usuário no WhatsApp (ex: 5511999999999@s.whatsapp.net)
  jid: varchar("jid", { length: 128 }).notNull(),
  accountId: int("accountId").notNull(),
  flowId: int("flowId").notNull(),
  currentNodeId: int("currentNodeId").notNull(),
  // Dados coletados durante o fluxo (JSON): { requesterName, cpf, subject, ... }
  collectedData: json("collectedData"),
  // Status da sessão
  status: mysqlEnum("status", ["active", "completed", "expired", "transferred"]).default("active").notNull(),
  // Protocolo gerado ao final (se aplicável)
  generatedNup: varchar("generatedNup", { length: 32 }),
  // Conversa vinculada
  conversationId: int("conversationId"),
  // Última interação (para calcular timeout)
  lastInteractionAt: timestamp("lastInteractionAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BotSession = typeof botSessions.$inferSelect;
export type InsertBotSession = typeof botSessions.$inferInsert;

// ─── Bot Session Logs (Histórico de Interações) ───────────────────────────────
export const botSessionLogs = mysqlTable("botSessionLogs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  nodeId: int("nodeId"),
  // Mensagem enviada pelo bot
  botMessage: text("botMessage"),
  // Resposta do usuário
  userInput: varchar("userInput", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BotSessionLog = typeof botSessionLogs.$inferSelect;
export type InsertBotSessionLog = typeof botSessionLogs.$inferInsert;

// ─── Webchat Sessions (Sessões de chat da Central do Cidadão) ─────────────────
export const webchatSessions = mysqlTable("webchatSessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 128 }).notNull().unique(),
  conversationId: int("conversationId"),
  contactId: int("contactId"),
  accountId: int("accountId"),
  // Dados do visitante (coletados pelo bot ou formulário)
  visitorName: varchar("visitorName", { length: 256 }),
  visitorEmail: varchar("visitorEmail", { length: 320 }),
  visitorPhone: varchar("visitorPhone", { length: 32 }),
  visitorCpf: varchar("visitorCpf", { length: 14 }),
  // Estado da sessão
  status: mysqlEnum("status", ["bot", "waiting", "active", "closed", "abandoned"]).default("bot").notNull(),
  nup: varchar("nup", { length: 64 }),
  // Metadados
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  referrerUrl: varchar("referrerUrl", { length: 1024 }),
  // Timestamps
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  assignedAt: timestamp("assignedAt"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("wcs_token_idx").on(table.sessionToken),
  convIdx: index("wcs_conv_idx").on(table.conversationId),
  statusIdx: index("wcs_status_idx").on(table.status),
  activityIdx: index("wcs_activity_idx").on(table.lastActivityAt),
}));
export type WebchatSession = typeof webchatSessions.$inferSelect;
export type InsertWebchatSession = typeof webchatSessions.$inferInsert;
// ═══════════════════════════════════════════════════════════════════════════════
// ─── MÓDULO: E-MAIL INSTITUCIONAL ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Caixas Postais Institucionais ────────────────────────────────────────────
export const emailMailboxes = mysqlTable("emailMailboxes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 320 }).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  description: text("description"),
  sectorId: int("sectorId"),
  imapHost: varchar("imapHost", { length: 255 }).notNull(),
  imapPort: int("imapPort").default(993).notNull(),
  imapUser: varchar("imapUser", { length: 320 }).notNull(),
  imapPassword: text("imapPassword").notNull(),
  imapSecure: boolean("imapSecure").default(true).notNull(),
  imapMailbox: varchar("imapMailbox", { length: 128 }).default("INBOX").notNull(),
  smtpHost: varchar("smtpHost", { length: 255 }).notNull(),
  smtpPort: int("smtpPort").default(587).notNull(),
  smtpUser: varchar("smtpUser", { length: 320 }).notNull(),
  smtpPassword: text("smtpPassword").notNull(),
  smtpSecure: boolean("smtpSecure").default(false).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "error", "syncing"]).default("inactive").notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  lastSyncError: text("lastSyncError"),
  lastUid: bigint("lastUid", { mode: "number" }).default(0).notNull(),
  syncIntervalMinutes: int("syncIntervalMinutes").default(5).notNull(),
  autoReplyEnabled: boolean("autoReplyEnabled").default(true).notNull(),
  autoReplyTemplate: text("autoReplyTemplate"),
  signature: text("signature"),
  isActive: boolean("isActive").default(true).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  sectorIdx: index("emb_sector_idx").on(table.sectorId),
  statusIdx: index("emb_status_idx").on(table.status),
}));
export type EmailMailbox = typeof emailMailboxes.$inferSelect;
export type InsertEmailMailbox = typeof emailMailboxes.$inferInsert;

// ─── Mensagens de E-mail Institucionais ───────────────────────────────────────
export const emailMessages = mysqlTable("emailMessages", {
  id: int("id").autoincrement().primaryKey(),
  mailboxId: int("mailboxId").notNull(),
  messageId: varchar("messageId", { length: 512 }),
  inReplyTo: varchar("inReplyTo", { length: 512 }),
  references: text("references"),
  imapUid: bigint("imapUid", { mode: "number" }),
  fromAddress: varchar("fromAddress", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  toAddresses: text("toAddresses").notNull(),
  ccAddresses: text("ccAddresses"),
  bccAddresses: text("bccAddresses"),
  replyTo: varchar("replyTo", { length: 320 }),
  subject: varchar("subject", { length: 998 }).notNull(),
  bodyText: text("bodyText"),
  bodyHtml: text("bodyHtml"),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  status: mysqlEnum("status", ["received", "triaged", "in_progress", "replied", "archived", "spam", "bounced", "failed", "sent"]).default("received").notNull(),
  nup: varchar("nup", { length: 32 }),
  conversationId: int("conversationId"),
  contactId: int("contactId"),
  sectorId: int("sectorId"),
  assignedUserId: int("assignedUserId"),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  tags: text("tags"),
  isRead: boolean("isRead").default(false).notNull(),
  isStarred: boolean("isStarred").default(false).notNull(),
  isSpam: boolean("isSpam").default(false).notNull(),
  threadId: varchar("threadId", { length: 512 }),
  receivedAt: timestamp("receivedAt"),
  sentAt: timestamp("sentAt"),
  sizeBytes: int("sizeBytes"),
  hasAttachments: boolean("hasAttachments").default(false).notNull(),
  attachmentCount: int("attachmentCount").default(0).notNull(),
  smtpMessageId: varchar("smtpMessageId", { length: 512 }),
  sendAttempts: int("sendAttempts").default(0).notNull(),
  lastSendError: text("lastSendError"),
  scheduledAt: timestamp("scheduledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mailboxIdx: index("emi_mailbox_idx").on(table.mailboxId),
  nupIdx: index("emi_nup_idx").on(table.nup),
  threadIdx: index("emi_thread_idx").on(table.threadId),
  statusIdx: index("emi_status_idx").on(table.status),
  sectorIdx: index("emi_sector_idx").on(table.sectorId),
  receivedIdx: index("emi_received_idx").on(table.receivedAt),
}));
export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = typeof emailMessages.$inferInsert;

// ─── Anexos de E-mail ─────────────────────────────────────────────────────────
export const emailAttachments = mysqlTable("emailAttachments", {
  id: int("id").autoincrement().primaryKey(),
  emailMessageId: int("emailMessageId").notNull(),
  filename: varchar("filename", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  storageKey: varchar("storageKey", { length: 1024 }),
  storageUrl: text("storageUrl"),
  isInline: boolean("isInline").default(false).notNull(),
  contentId: varchar("contentId", { length: 512 }),
  md5: varchar("md5", { length: 32 }),
  sha256: varchar("sha256", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  messageIdx: index("ema_msg_idx").on(table.emailMessageId),
}));
export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type InsertEmailAttachment = typeof emailAttachments.$inferInsert;

// ─── Vínculos NUP ↔ E-mail ────────────────────────────────────────────────────
export const emailNupLinks = mysqlTable("emailNupLinks", {
  id: int("id").autoincrement().primaryKey(),
  emailMessageId: int("emailMessageId").notNull(),
  nup: varchar("nup", { length: 32 }).notNull(),
  entityType: mysqlEnum("entityType", ["protocol", "process", "ombudsman", "conversation", "document"]).notNull(),
  entityId: int("entityId").notNull(),
  linkMethod: mysqlEnum("linkMethod", ["auto_message_id", "auto_subject", "auto_sender", "manual"]).notNull(),
  linkedById: int("linkedById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  msgIdx: index("enl_msg_idx").on(table.emailMessageId),
  nupIdx: index("enl_nup_idx").on(table.nup),
}));
export type EmailNupLink = typeof emailNupLinks.$inferSelect;
export type InsertEmailNupLink = typeof emailNupLinks.$inferInsert;

// ─── Regras de Roteamento Automático ─────────────────────────────────────────
export const emailRoutingRules = mysqlTable("emailRoutingRules", {
  id: int("id").autoincrement().primaryKey(),
  mailboxId: int("mailboxId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  priority: int("priority").default(100).notNull(),
  conditions: json("conditions").notNull(),
  conditionLogic: mysqlEnum("conditionLogic", ["and", "or"]).default("and").notNull(),
  actions: json("actions").notNull(),
  matchCount: int("matchCount").default(0).notNull(),
  lastMatchAt: timestamp("lastMatchAt"),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  priorityIdx: index("err_priority_idx").on(table.priority),
  activeIdx: index("err_active_idx").on(table.isActive),
}));
export type EmailRoutingRule = typeof emailRoutingRules.$inferSelect;
export type InsertEmailRoutingRule = typeof emailRoutingRules.$inferInsert;

// ─── Fila de Envio ────────────────────────────────────────────────────────────
export const emailSendQueue = mysqlTable("emailSendQueue", {
  id: int("id").autoincrement().primaryKey(),
  mailboxId: int("mailboxId").notNull(),
  emailMessageId: int("emailMessageId"),
  toAddresses: text("toAddresses").notNull(),
  ccAddresses: text("ccAddresses"),
  bccAddresses: text("bccAddresses"),
  replyTo: varchar("replyTo", { length: 320 }),
  subject: varchar("subject", { length: 998 }).notNull(),
  bodyText: text("bodyText"),
  bodyHtml: text("bodyHtml"),
  inReplyTo: varchar("inReplyTo", { length: 512 }),
  references: text("references"),
  nup: varchar("nup", { length: 32 }),
  status: mysqlEnum("status", ["pending", "processing", "sent", "failed", "cancelled"]).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  lastAttemptAt: timestamp("lastAttemptAt"),
  nextAttemptAt: timestamp("nextAttemptAt"),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  scheduledAt: timestamp("scheduledAt"),
  priority: int("priority").default(5).notNull(),
  createdById: int("createdById"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("esq_status_idx").on(table.status),
  mailboxIdx: index("esq_mailbox_idx").on(table.mailboxId),
}));
export type EmailSendQueue = typeof emailSendQueue.$inferSelect;
export type InsertEmailSendQueue = typeof emailSendQueue.$inferInsert;

// ─── Logs Técnicos de Sincronização ──────────────────────────────────────────
export const emailSyncLogs = mysqlTable("emailSyncLogs", {
  id: int("id").autoincrement().primaryKey(),
  mailboxId: int("mailboxId").notNull(),
  operation: mysqlEnum("operation", ["imap_sync", "smtp_send", "rule_apply", "nup_link", "auto_reply"]).notNull(),
  status: mysqlEnum("status", ["success", "partial", "error"]).notNull(),
  messagesProcessed: int("messagesProcessed").default(0),
  messagesNew: int("messagesNew").default(0),
  messagesFailed: int("messagesFailed").default(0),
  durationMs: int("durationMs"),
  errorMessage: text("errorMessage"),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  mailboxIdx: index("esl_mailbox_idx").on(table.mailboxId),
  createdIdx: index("esl_created_idx").on(table.createdAt),
}));
export type EmailSyncLog = typeof emailSyncLogs.$inferSelect;
export type InsertEmailSyncLog = typeof emailSyncLogs.$inferInsert;

// ─── Auditoria de E-mail Institucional ───────────────────────────────────────
export const emailAuditTrail = mysqlTable("emailAuditTrail", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  userIp: varchar("userIp", { length: 64 }),
  action: mysqlEnum("action", [
    "mailbox_created", "mailbox_updated", "mailbox_deleted", "mailbox_synced",
    "message_received", "message_read", "message_replied", "message_forwarded",
    "message_archived", "message_spam", "message_deleted", "message_restored",
    "message_assigned", "message_transferred",
    "nup_linked", "nup_unlinked", "nup_created",
    "rule_created", "rule_updated", "rule_deleted", "rule_matched",
    "attachment_downloaded", "attachment_deleted",
    "queue_sent", "queue_failed", "queue_retried",
  ]).notNull(),
  entityType: mysqlEnum("entityType", ["mailbox", "message", "attachment", "rule", "queue"]).notNull(),
  entityId: int("entityId"),
  mailboxId: int("mailboxId"),
  emailMessageId: int("emailMessageId"),
  nup: varchar("nup", { length: 32 }),
  previousValue: json("previousValue"),
  newValue: json("newValue"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("eat_user_idx").on(table.userId),
  actionIdx: index("eat_action_idx").on(table.action),
  mailboxIdx: index("eat_mailbox_idx").on(table.mailboxId),
  nupIdx: index("eat_nup_idx").on(table.nup),
  createdIdx: index("eat_created_idx").on(table.createdAt),
}));
export type EmailAuditTrail = typeof emailAuditTrail.$inferSelect;
export type InsertEmailAuditTrail = typeof emailAuditTrail.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// cAIus — Agente Institucional de IA
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Agentes cAIus (perfis de instrução) ─────────────────────────────────────
export const caiusAgents = mysqlTable("caiusAgents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  context: mysqlEnum("context", ["external", "internal", "both"]).default("both").notNull(),
  systemPrompt: text("systemPrompt").notNull(),
  description: text("description"),
  model: varchar("model", { length: 128 }).default("gemini-2.5-flash"),
  maxTokens: int("maxTokens").default(2048),
  temperature: varchar("temperature", { length: 8 }).default("0.4"),
  isActive: boolean("isActive").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  allowVoice: boolean("allowVoice").default(true).notNull(),
  allowKnowledgeBase: boolean("allowKnowledgeBase").default(true).notNull(),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  slugIdx: index("ca_slug_idx").on(table.slug),
  contextIdx: index("ca_context_idx").on(table.context),
}));
export type CaiusAgent = typeof caiusAgents.$inferSelect;
export type InsertCaiusAgent = typeof caiusAgents.$inferInsert;

// ─── Sessões de Conversa com o cAIus ─────────────────────────────────────────
export const caiusSessions = mysqlTable("caiusSessions", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  userId: int("userId"),
  citizenId: int("citizenId"),
  context: mysqlEnum("context", ["external", "internal"]).notNull(),
  channel: mysqlEnum("channel", ["chat", "whatsapp", "email", "voice", "internal"]).default("chat").notNull(),
  nup: varchar("nup", { length: 32 }),
  protocolId: int("protocolId"),
  emailMessageId: int("emailMessageId"),
  conversationId: int("conversationId"),
  title: varchar("title", { length: 512 }),
  status: mysqlEnum("status", ["active", "closed", "archived"]).default("active").notNull(),
  summary: text("summary"),
  metadata: json("metadata"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agentIdx: index("cs_agent_idx").on(table.agentId),
  userIdx: index("cs_user_idx").on(table.userId),
  nupIdx: index("cs_nup_idx").on(table.nup),
  statusIdx: index("cs_status_idx").on(table.status),
  channelIdx: index("cs_channel_idx").on(table.channel),
}));
export type CaiusSession = typeof caiusSessions.$inferSelect;
export type InsertCaiusSession = typeof caiusSessions.$inferInsert;

// ─── Mensagens das Sessões cAIus ─────────────────────────────────────────────
export const caiusMessages = mysqlTable("caiusMessages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  contentType: mysqlEnum("contentType", ["text", "audio", "image", "file"]).default("text").notNull(),
  content: text("content").notNull(),
  audioUrl: varchar("audioUrl", { length: 1024 }),
  audioTranscription: text("audioTranscription"),
  audioDurationSeconds: int("audioDurationSeconds"),
  audioConfidence: varchar("audioConfidence", { length: 8 }),
  fileUrl: varchar("fileUrl", { length: 1024 }),
  fileName: varchar("fileName", { length: 512 }),
  tokensUsed: int("tokensUsed"),
  sourcesUsed: json("sourcesUsed"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("cm_session_idx").on(table.sessionId),
  roleIdx: index("cm_role_idx").on(table.role),
  createdIdx: index("cm_created_idx").on(table.createdAt),
}));
export type CaiusMessage = typeof caiusMessages.$inferSelect;
export type InsertCaiusMessage = typeof caiusMessages.$inferInsert;

// ─── Ações Sugeridas pelo cAIus ───────────────────────────────────────────────
export const caiusSuggestedActions = mysqlTable("caiusSuggestedActions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  messageId: int("messageId"),
  actionType: mysqlEnum("actionType", [
    "open_protocol", "link_nup", "assign_sector", "suggest_response",
    "classify_email", "summarize", "identify_service", "set_priority",
    "request_document", "escalate", "close_protocol", "other",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  payload: json("payload"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "edited", "applied"]).default("pending").notNull(),
  reviewedById: int("reviewedById"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  appliedAt: timestamp("appliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("csa_session_idx").on(table.sessionId),
  statusIdx: index("csa_status_idx").on(table.status),
  actionTypeIdx: index("csa_type_idx").on(table.actionType),
}));
export type CaiusSuggestedAction = typeof caiusSuggestedActions.$inferSelect;
export type InsertCaiusSuggestedAction = typeof caiusSuggestedActions.$inferInsert;

// ─── Base de Conhecimento do cAIus ────────────────────────────────────────────
export const caiusKnowledgeItems = mysqlTable("caiusKnowledgeItems", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["document", "text", "link", "faq", "regulation", "manual", "flow", "template"]).notNull(),
  content: longtext("content"),
  summary: text("summary"),
  fileUrl: varchar("fileUrl", { length: 1024 }),
  fileName: varchar("fileName", { length: 512 }),
  fileMimeType: varchar("fileMimeType", { length: 128 }),
  fileSizeBytes: int("fileSizeBytes"),
  linkUrl: varchar("linkUrl", { length: 2048 }),
  linkLastFetchedAt: timestamp("linkLastFetchedAt"),
  linkAutoUpdate: boolean("linkAutoUpdate").default(false),
  category: varchar("category", { length: 128 }),
  sectorId: int("sectorId"),
  serviceId: int("serviceId"),
  tags: json("tags"),
  keywords: text("keywords"),
  status: mysqlEnum("status", ["draft", "active", "archived", "revoked"]).default("draft").notNull(),
  version: int("version").default(1).notNull(),
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  authorId: int("authorId").notNull(),
  reviewedById: int("reviewedById"),
  reviewedAt: timestamp("reviewedAt"),
  approvedById: int("approvedById"),
  approvedAt: timestamp("approvedAt"),
  embedding: json("embedding"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("cki_status_idx").on(table.status),
  sourceTypeIdx: index("cki_source_idx").on(table.sourceType),
  categoryIdx: index("cki_category_idx").on(table.category),
  sectorIdx: index("cki_sector_idx").on(table.sectorId),
}));
export type CaiusKnowledgeItem = typeof caiusKnowledgeItems.$inferSelect;
export type InsertCaiusKnowledgeItem = typeof caiusKnowledgeItems.$inferInsert;

// ─── Versões da Base de Conhecimento ─────────────────────────────────────────
export const caiusKnowledgeVersions = mysqlTable("caiusKnowledgeVersions", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  version: int("version").notNull(),
  content: longtext("content"),
  changedById: int("changedById").notNull(),
  changeNote: text("changeNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  itemIdx: index("ckv_item_idx").on(table.itemId),
}));
export type CaiusKnowledgeVersion = typeof caiusKnowledgeVersions.$inferSelect;
export type InsertCaiusKnowledgeVersion = typeof caiusKnowledgeVersions.$inferInsert;

// ─── Logs de Uso da Base de Conhecimento ─────────────────────────────────────
export const caiusKnowledgeUsageLogs = mysqlTable("caiusKnowledgeUsageLogs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId"),
  messageId: int("messageId"),
  itemId: int("itemId").notNull(),
  relevanceScore: varchar("relevanceScore", { length: 8 }),
  usedInResponse: boolean("usedInResponse").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("ckul_session_idx").on(table.sessionId),
  itemIdx: index("ckul_item_idx").on(table.itemId),
}));
export type CaiusKnowledgeUsageLog = typeof caiusKnowledgeUsageLogs.$inferSelect;
export type InsertCaiusKnowledgeUsageLog = typeof caiusKnowledgeUsageLogs.$inferInsert;

// ─── Interações de Voz do cAIus ───────────────────────────────────────────────
export const caiusVoiceInteractions = mysqlTable("caiusVoiceInteractions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  messageId: int("messageId"),
  direction: mysqlEnum("direction", ["input", "output"]).notNull(),
  audioUrl: varchar("audioUrl", { length: 1024 }),
  audioStorageKey: varchar("audioStorageKey", { length: 1024 }),
  durationSeconds: int("durationSeconds"),
  transcription: text("transcription"),
  transcriptionConfidence: varchar("transcriptionConfidence", { length: 8 }),
  language: varchar("language", { length: 8 }).default("pt-BR"),
  ttsVoice: varchar("ttsVoice", { length: 64 }),
  status: mysqlEnum("status", ["pending", "processing", "done", "error"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  requiresHumanReview: boolean("requiresHumanReview").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("cvi_session_idx").on(table.sessionId),
  directionIdx: index("cvi_direction_idx").on(table.direction),
}));
export type CaiusVoiceInteraction = typeof caiusVoiceInteractions.$inferSelect;
export type InsertCaiusVoiceInteraction = typeof caiusVoiceInteractions.$inferInsert;

// ─── Auditoria do cAIus ───────────────────────────────────────────────────────
export const caiusAuditLogs = mysqlTable("caiusAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId"),
  messageId: int("messageId"),
  actionId: int("actionId"),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  userIp: varchar("userIp", { length: 64 }),
  citizenId: int("citizenId"),
  event: mysqlEnum("event", [
    "session_started", "session_closed",
    "message_sent", "message_received",
    "voice_transcribed", "voice_synthesized",
    "knowledge_queried", "knowledge_used",
    "action_suggested", "action_approved", "action_rejected", "action_applied",
    "email_analyzed", "protocol_linked", "nup_linked",
    "error_occurred",
  ]).notNull(),
  channel: mysqlEnum("channel", ["chat", "whatsapp", "email", "voice", "internal"]),
  nup: varchar("nup", { length: 32 }),
  protocolId: int("protocolId"),
  emailMessageId: int("emailMessageId"),
  inputSummary: text("inputSummary"),
  outputSummary: text("outputSummary"),
  sourcesUsed: json("sourcesUsed"),
  tokensUsed: int("tokensUsed"),
  durationMs: int("durationMs"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("cal_session_idx").on(table.sessionId),
  userIdx: index("cal_user_idx").on(table.userId),
  eventIdx: index("cal_event_idx").on(table.event),
  nupIdx: index("cal_nup_idx").on(table.nup),
  createdIdx: index("cal_created_idx").on(table.createdAt),
}));
export type CaiusAuditLog = typeof caiusAuditLogs.$inferSelect;
export type InsertCaiusAuditLog = typeof caiusAuditLogs.$inferInsert;

// ─── Feedback do Usuário sobre o cAIus ───────────────────────────────────────
export const caiusFeedback = mysqlTable("caiusFeedback", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  messageId: int("messageId"),
  userId: int("userId"),
  citizenId: int("citizenId"),
  rating: mysqlEnum("rating", ["positive", "negative", "neutral"]).notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("cf_session_idx").on(table.sessionId),
  ratingIdx: index("cf_rating_idx").on(table.rating),
}));
export type CaiusFeedback = typeof caiusFeedback.$inferSelect;
export type InsertCaiusFeedback = typeof caiusFeedback.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MÓDULO: ANEXOS DO WEBCHAT ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Anexos enviados pelo cidadão via webchat.
 * Cada registro vincula um arquivo (armazenado no S3) a uma sessão de webchat
 * e opcionalmente a uma mensagem específica e ao NUP do protocolo.
 */
export const webchatAttachments = mysqlTable("webchatAttachments", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 128 }).notNull(),
  conversationId: int("conversationId"),
  messageId: int("messageId"),
  nup: varchar("nup", { length: 64 }),
  // Dados do arquivo
  originalName: varchar("originalName", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSizeBytes: int("fileSizeBytes").notNull(),
  s3Key: varchar("s3Key", { length: 1024 }).notNull(),
  s3Url: text("s3Url").notNull(),
  // Metadados
  uploadedByName: varchar("uploadedByName", { length: 256 }),
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("wca_session_idx").on(table.sessionToken),
  convIdx: index("wca_conv_idx").on(table.conversationId),
  nupIdx: index("wca_nup_idx").on(table.nup),
}));
export type WebchatAttachment = typeof webchatAttachments.$inferSelect;
export type InsertWebchatAttachment = typeof webchatAttachments.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Permissões de Menu por Usuário ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Controle granular de acesso: cada linha habilita ou desabilita um item de menu
 * para um usuário específico. Se não existir registro para um usuário, aplica-se
 * o comportamento padrão baseado no perfil (admin vê tudo; attendant vê apenas
 * atendimento; etc.).
 */
export const userMenuPermissions = mysqlTable("userMenuPermissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  menuKey: varchar("menuKey", { length: 128 }).notNull(), // ex: "/inbox", "/protocols"
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userMenuIdx: index("ump_user_menu_idx").on(table.userId, table.menuKey),
  userIdx: index("ump_user_idx").on(table.userId),
}));
export type UserMenuPermission = typeof userMenuPermissions.$inferSelect;
export type InsertUserMenuPermission = typeof userMenuPermissions.$inferInsert;

// ─── Módulo Controle de Numeração de Documentos ───────────────────────────────

export const docOrganizationalUnits = mysqlTable("doc_organizational_units", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  acronym: varchar("acronym", { length: 50 }),
  type: mysqlEnum("doc_org_unit_type", ["secretaria", "setor", "gabinete", "departamento", "coordenacao", "outro"]).notNull(),
  parentId: int("parentId"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DocOrganizationalUnit = typeof docOrganizationalUnits.$inferSelect;
export type InsertDocOrganizationalUnit = typeof docOrganizationalUnits.$inferInsert;

export const documentControls = mysqlTable("document_controls", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  documentType: mysqlEnum("documentType", ["oficio", "memorando", "decreto", "lei", "diario_oficial", "contrato", "portaria"]).notNull(),
  unitId: int("unitId").notNull(),
  prefix: varchar("prefix", { length: 50 }),
  numberFormat: mysqlEnum("numberFormat", ["sequencial", "ano_sequencial", "sequencial_ano"]).default("sequencial").notNull(),
  digits: int("digits").default(4).notNull(),
  referenceYear: int("referenceYear").notNull(),
  resetAnnually: boolean("resetAnnually").default(true).notNull(),
  nextNumber: int("nextNumber").default(1).notNull(),
  active: boolean("active").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DocumentControl = typeof documentControls.$inferSelect;
export type InsertDocumentControl = typeof documentControls.$inferInsert;

export const numberUsages = mysqlTable("number_usages", {
  id: int("id").autoincrement().primaryKey(),
  controlId: int("controlId").notNull(),
  number: int("number").notNull(),
  formattedNumber: varchar("formattedNumber", { length: 100 }).notNull(),
  documentDescription: text("documentDescription"),
  usedBy: int("usedBy").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
  year: int("year").notNull(),
});
export type NumberUsage = typeof numberUsages.$inferSelect;
export type InsertNumberUsage = typeof numberUsages.$inferInsert;

export const docAuditLogs = mysqlTable("doc_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  controlId: int("controlId").notNull(),
  userId: int("userId").notNull(),
  action: mysqlEnum("doc_audit_action", ["manual_number_change", "control_created", "control_updated", "control_activated", "control_deactivated", "number_used"]).notNull(),
  previousValue: text("previousValue"),
  newValue: text("newValue"),
  justification: text("justification"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DocAuditLog = typeof docAuditLogs.$inferSelect;
export type InsertDocAuditLog = typeof docAuditLogs.$inferInsert;

export const docUserPermissions = mysqlTable("doc_user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  canAccessOficios: boolean("canAccessOficios").default(false).notNull(),
  canAccessMemorandos: boolean("canAccessMemorandos").default(false).notNull(),
  canAccessDecretos: boolean("canAccessDecretos").default(false).notNull(),
  canAccessLeis: boolean("canAccessLeis").default(false).notNull(),
  canAccessDiarioOficial: boolean("canAccessDiarioOficial").default(false).notNull(),
  canAccessContratos: boolean("canAccessContratos").default(false).notNull(),
  canAccessPortarias: boolean("canAccessPortarias").default(false).notNull(),
  grantedBy: int("grantedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DocUserPermission = typeof docUserPermissions.$inferSelect;
export type InsertDocUserPermission = typeof docUserPermissions.$inferInsert;

export const docUserUnits = mysqlTable("doc_user_units", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  unitId: int("unitId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DocUserUnit = typeof docUserUnits.$inferSelect;
export type InsertDocUserUnit = typeof docUserUnits.$inferInsert;

// ─── Document Recipients (Envio de Documentos Oficiais) ──────────────────────
export const docRecipients = mysqlTable("docRecipients", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),  // FK officialDocuments.id
  // Origem: interno (usuário/setor do CAIUS) ou externo (fora do sistema)
  originType: mysqlEnum("originType", ["internal", "external"]).notNull().default("external"),
  // Destinatário interno
  recipientUserId: int("recipientUserId"),   // FK users.id
  recipientUnitId: int("recipientUnitId"),   // FK orgUnits.id
  // Destinatário externo
  recipientName: varchar("recipientName", { length: 255 }),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  recipientPhone: varchar("recipientPhone", { length: 64 }),
  // Canal de envio
  channel: mysqlEnum("channel", ["email", "whatsapp", "both"]).notNull().default("email"),
  // Status do envio
  status: mysqlEnum("status", ["pending", "sent", "failed", "skipped"]).notNull().default("pending"),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt"),
  // PDF gerado
  pdfUrl: text("pdfUrl"),
  // Quem enviou
  sentById: int("sentById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DocRecipient = typeof docRecipients.$inferSelect;
export type InsertDocRecipient = typeof docRecipients.$inferInsert;
