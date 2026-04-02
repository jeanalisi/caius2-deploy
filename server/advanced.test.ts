import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock all db modules ───────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./db-caius", () => ({
  getSectors: vi.fn().mockResolvedValue([]),
  getSectorById: vi.fn().mockResolvedValue(null),
  createSector: vi.fn().mockResolvedValue({ id: 1, name: "TI", code: "TI001" }),
  updateSector: vi.fn().mockResolvedValue({ id: 1, name: "TI Atualizado" }),
  deleteSector: vi.fn().mockResolvedValue(true),
  getProtocols: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getProtocolById: vi.fn().mockResolvedValue(null),
  createProtocol: vi.fn().mockResolvedValue({ id: 1, nup: "2026.001.000001/01" }),
  updateProtocol: vi.fn().mockResolvedValue({ id: 1 }),
  getTramitations: vi.fn().mockResolvedValue([]),
  addTramitation: vi.fn().mockResolvedValue({ id: 1 }),
  getDocuments: vi.fn().mockResolvedValue([]),
  createDocument: vi.fn().mockResolvedValue({ id: 1 }),
  updateDocument: vi.fn().mockResolvedValue({ id: 1 }),
  getProcesses: vi.fn().mockResolvedValue([]),
  createProcess: vi.fn().mockResolvedValue({ id: 1 }),
  updateProcess: vi.fn().mockResolvedValue({ id: 1 }),
  getManifestations: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  createManifestation: vi.fn().mockResolvedValue({ id: 1, protocolNumber: "OUV-2026-001" }),
  updateManifestation: vi.fn().mockResolvedValue({ id: 1 }),
  getTemplates: vi.fn().mockResolvedValue([]),
  createTemplate: vi.fn().mockResolvedValue({ id: 1 }),
  updateTemplate: vi.fn().mockResolvedValue({ id: 1 }),
  deleteTemplate: vi.fn().mockResolvedValue(true),
  getAuditLogs: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  createAuditLog: vi.fn().mockResolvedValue({ id: 1 }),
  getAiProviders: vi.fn().mockResolvedValue([]),
  createAiProvider: vi.fn().mockResolvedValue({ id: 1 }),
  updateAiProvider: vi.fn().mockResolvedValue({ id: 1 }),
  deleteAiProvider: vi.fn().mockResolvedValue(true),
  getPublicProtocolByNup: vi.fn().mockResolvedValue(null),
  generateNup: vi.fn().mockResolvedValue("2026.001.000001/01"),
}));

vi.mock("./db-advanced", () => ({
  getServiceTypes: vi.fn().mockResolvedValue([]),
  getServiceTypeById: vi.fn().mockResolvedValue(null),
  createServiceType: vi.fn().mockResolvedValue({ id: 1, name: "Solicitação", code: "SOL" }),
  updateServiceType: vi.fn().mockResolvedValue({ id: 1 }),
  deleteServiceType: vi.fn().mockResolvedValue(true),
  getFormTemplates: vi.fn().mockResolvedValue([]),
  getFormTemplateById: vi.fn().mockResolvedValue(null),
  createFormTemplate: vi.fn().mockResolvedValue({ id: 1, name: "Formulário Padrão" }),
  updateFormTemplate: vi.fn().mockResolvedValue({ id: 1 }),
  deleteFormTemplate: vi.fn().mockResolvedValue(true),
  getFormFields: vi.fn().mockResolvedValue([]),
  createFormField: vi.fn().mockResolvedValue({ id: 1 }),
  updateFormField: vi.fn().mockResolvedValue({ id: 1 }),
  deleteFormField: vi.fn().mockResolvedValue(true),
  reorderFormFields: vi.fn().mockResolvedValue(true),
  getAttachments: vi.fn().mockResolvedValue([]),
  getAttachmentsByNup: vi.fn().mockResolvedValue([]),
  createAttachment: vi.fn().mockResolvedValue({ id: 1, s3Url: "https://s3.example.com/file.pdf" }),
  softDeleteAttachment: vi.fn().mockResolvedValue(true),
  getAttachmentConfigs: vi.fn().mockResolvedValue([]),
  createAttachmentConfig: vi.fn().mockResolvedValue({ id: 1, name: "Documentos de Identificação" }),
  deleteAttachmentConfig: vi.fn().mockResolvedValue(true),
  getContextHelp: vi.fn().mockResolvedValue(null),
  listContextHelp: vi.fn().mockResolvedValue([]),
  upsertContextHelp: vi.fn().mockResolvedValue({ id: 1, featureKey: "dashboard" }),
  deleteContextHelp: vi.fn().mockResolvedValue(true),
  getActiveSessions: vi.fn().mockResolvedValue([]),
  terminateSessionById: vi.fn().mockResolvedValue(true),
  getInstitutionalConfig: vi.fn().mockResolvedValue(null),
  upsertInstitutionalConfig: vi.fn().mockResolvedValue({ id: 1, orgName: "Prefeitura Municipal" }),
  setInstitutionalConfigs: vi.fn().mockResolvedValue([{ id: 1, key: "orgName", value: "Prefeitura Municipal" }]),
  getUserRegistrationByEmail: vi.fn().mockResolvedValue(null),
  globalSearch: vi.fn().mockResolvedValue([]),
  upsertSearchIndex: vi.fn().mockResolvedValue({ id: 1 }),
  getUserRegistrations: vi.fn().mockResolvedValue([]),
  createUserRegistration: vi.fn().mockResolvedValue({ id: 1 }),
  approveUserRegistration: vi.fn().mockResolvedValue({ id: 1, status: "approved" }),
  rejectUserRegistration: vi.fn().mockResolvedValue({ id: 1, status: "rejected" }),
}));

vi.mock("./whatsapp", () => ({
  getWhatsAppSessions: vi.fn().mockReturnValue([]),
  createWhatsAppSession: vi.fn(),
  getQrCode: vi.fn().mockReturnValue(null),
  disconnectWhatsApp: vi.fn(),
  sendWhatsAppMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock("./email", () => ({
  testImapConnection: vi.fn().mockResolvedValue({ success: true }),
  testSmtpConnection: vi.fn().mockResolvedValue({ success: true }),
  sendEmail: vi.fn().mockResolvedValue(true),
  fetchEmails: vi.fn().mockResolvedValue([]),
}));

vi.mock("./_core/socketio", () => ({
  getIo: vi.fn().mockReturnValue(null),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "https://s3.example.com/test.pdf" }),
  storageGet: vi.fn().mockResolvedValue({ key: "test-key", url: "https://s3.example.com/test.pdf" }),
}));

// ─── Test context helpers ──────────────────────────────────────────────────────
function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function createAgentCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "agent-user",
      email: "agent@example.com",
      name: "Agent User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

// ─── Service Types Tests ───────────────────────────────────────────────────────
describe("serviceTypes router", () => {
  it("list returns empty array", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.serviceTypes.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns new service type", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.serviceTypes.create({
      name: "Solicitação",
      code: "SOL",
      description: "Solicitação geral",
      category: "atendimento",
      slaHours: 48,
      isPublic: true,
      requiresLogin: false,
      isActive: true,
    });
    expect(result).toMatchObject({ id: 1, name: "Solicitação" });
  });
});

// ─── Form Templates Tests ─────────────────────────────────────────────────────
describe("formTemplates router", () => {
  it("list returns empty array", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.formTemplates.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns new form template", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.formTemplates.create({
      name: "Formulário Padrão",
      description: "Formulário de atendimento padrão",
      isActive: true,
    });
    expect(result).toMatchObject({ id: 1, name: "Formulário Padrão" });
  });
});

// ─── Attachment Configs Tests ─────────────────────────────────────────────────
describe("attachments router", () => {
  it("listConfigs returns empty array", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.attachments.listConfigs({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("createConfig returns new config", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.attachments.createConfig({
      name: "Documentos de Identificação",
      maxFileSizeMb: 10,
      maxTotalSizeMb: 50,
      minCount: 1,
      maxCount: 5,
      isRequired: true,
    });
    expect(result).toMatchObject({ id: 1, name: "Documentos de Identificação" });
  });
});

// ─── Context Help Tests ───────────────────────────────────────────────────────
describe("contextHelp router", () => {
  it("list returns empty array", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.contextHelp.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("upsert creates help entry", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.contextHelp.upsert({
      featureKey: "dashboard",
      title: "Como usar o Dashboard",
      description: "Visão geral das métricas",
      displayMode: "modal",
      isActive: true,
    });
    expect(result).toMatchObject({ id: 1, featureKey: "dashboard" });
  });
});

// ─── Online Sessions Tests ────────────────────────────────────────────────────
describe("onlineSessions router", () => {
  it("getActive returns empty array", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.onlineSessions.getActive();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Institutional Config Tests ───────────────────────────────────────────────
describe("institutionalConfig router", () => {
  it("get returns null when not configured", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.institutionalConfig.get();
    expect(result).toBeNull();
  });

  it("save stores institutional config", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.institutionalConfig.save([
      { key: "orgName", value: "Prefeitura Municipal", label: "Nome da Organização" },
      { key: "primaryColor", value: "#1a56db", label: "Cor Primária" },
    ]);
    // save returns whatever the mock returns
    expect(result).toBeDefined();
  });
});

// ─── Global Search Tests ──────────────────────────────────────────────────────
describe("globalSearch router", () => {
  it("search returns empty array for no results", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.globalSearch.search({ query: "teste", limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── User Registration Tests ──────────────────────────────────────────────────
describe("userRegistration router", () => {
  it("checkEmail returns exists false for unknown email", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.userRegistration.checkEmail({ email: "unknown@example.com" });
    expect(result).toMatchObject({ exists: false, verified: false });
  });
});
