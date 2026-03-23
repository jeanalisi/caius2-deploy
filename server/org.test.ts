import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock db-org ──────────────────────────────────────────────────────────────
vi.mock("./seed-org", () => ({
  seedOrgStructure: vi.fn().mockResolvedValue({ units: 130, positions: 15 }),
}));

vi.mock("./db-org", () => ({
  getOrgUnits: vi.fn().mockResolvedValue([
    {
      id: 1, name: "Prefeitura Municipal de Itabaiana", acronym: "PMI",
      type: "prefeitura", level: 1, parentId: null, isActive: true,
      description: null, legalBasis: "Lei Complementar nº 010/2025",
      sortOrder: 0, isSeeded: true, createdAt: new Date(), updatedAt: new Date(),
    },
  ]),
  getOrgUnitTree: vi.fn().mockResolvedValue([
    {
      id: 1, name: "Prefeitura Municipal de Itabaiana", acronym: "PMI",
      type: "prefeitura", level: 1, parentId: null, isActive: true,
      description: null, legalBasis: "Lei Complementar nº 010/2025",
      sortOrder: 0, isSeeded: true, createdAt: new Date(), updatedAt: new Date(),
      children: [],
    },
  ]),
  getOrgUnitById: vi.fn().mockResolvedValue({
    id: 1, name: "Prefeitura Municipal de Itabaiana", acronym: "PMI",
    type: "prefeitura", level: 1, parentId: null, isActive: true,
    description: null, legalBasis: "Lei Complementar nº 010/2025",
    sortOrder: 0, isSeeded: true, createdAt: new Date(), updatedAt: new Date(),
  }),
  getOrgUnitWithBreadcrumb: vi.fn().mockResolvedValue({
    unit: { id: 1, name: "Prefeitura Municipal de Itabaiana", acronym: "PMI" },
    breadcrumb: [{ id: 1, name: "Prefeitura Municipal de Itabaiana", acronym: "PMI" }],
  }),
  getOrgUnitStats: vi.fn().mockResolvedValue({ userCount: 0, childCount: 0, positionCount: 0 }),
  createOrgUnit: vi.fn().mockResolvedValue({
    id: 2, name: "Secretaria de Finanças", acronym: "SEFIN",
    type: "secretaria", level: 2, parentId: 1, isActive: true,
    description: null, legalBasis: null, sortOrder: 0, isSeeded: false,
    createdAt: new Date(), updatedAt: new Date(),
  }),
  updateOrgUnit: vi.fn().mockResolvedValue({
    id: 2, name: "Secretaria de Finanças Atualizada", acronym: "SEFIN",
    type: "secretaria", level: 2, parentId: 1, isActive: true,
    description: null, legalBasis: null, sortOrder: 0, isSeeded: false,
    createdAt: new Date(), updatedAt: new Date(),
  }),
  deleteOrgUnit: vi.fn().mockResolvedValue(undefined),
  getPositions: vi.fn().mockResolvedValue([
    {
      id: 1, name: "Secretário Municipal", code: "SEC", level: "secretario",
      provisionType: "comissao", canSign: true, canApprove: true,
      isActive: true, isSeeded: true, createdAt: new Date(), updatedAt: new Date(),
    },
  ]),
  getPositionById: vi.fn().mockResolvedValue({
    id: 1, name: "Secretário Municipal", code: "SEC", level: "secretario",
    provisionType: "comissao", canSign: true, canApprove: true,
    isActive: true, isSeeded: true, createdAt: new Date(), updatedAt: new Date(),
  }),
  createPosition: vi.fn().mockResolvedValue({
    id: 2, name: "Diretor de Obras", code: "DIR", level: "diretor",
    provisionType: "comissao", canSign: false, canApprove: false,
    isActive: true, isSeeded: false, createdAt: new Date(), updatedAt: new Date(),
  }),
  updatePosition: vi.fn().mockResolvedValue({
    id: 2, name: "Diretor de Obras Atualizado", code: "DIR", level: "diretor",
    provisionType: "comissao", canSign: true, canApprove: false,
    isActive: true, isSeeded: false, createdAt: new Date(), updatedAt: new Date(),
  }),
  deactivatePosition: vi.fn().mockResolvedValue(undefined),
  getUserAllocations: vi.fn().mockResolvedValue([]),
  getMyAllocations: vi.fn().mockResolvedValue([]),
  createUserAllocation: vi.fn().mockResolvedValue({
    id: 1, userId: 1, orgUnitId: 1, positionId: null, systemProfile: "attendant",
    isPrimary: true, startDate: new Date(), endDate: null, notes: null,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  }),
  deactivateUserAllocation: vi.fn().mockResolvedValue(undefined),
  getOrgInvites: vi.fn().mockResolvedValue([]),
  createOrgInvite: vi.fn().mockResolvedValue({
    id: 1, email: "test@example.com", name: "Test User",
    orgUnitId: 1, positionId: null, systemProfile: "attendant",
    token: "abc123token", status: "pending", notes: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    invitedById: 1, acceptedById: null, acceptedAt: null,
    createdAt: new Date(), updatedAt: new Date(),
    inviteUrl: "/convite/abc123token",
  }),
  cancelOrgInvite: vi.fn().mockResolvedValue(undefined),
  expireOldInvites: vi.fn().mockResolvedValue(3),
  getOrgInviteByToken: vi.fn().mockResolvedValue(null),
  acceptOrgInvite: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock other dependencies ──────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(), getUserByOpenId: vi.fn(),
  getConversations: vi.fn().mockResolvedValue([]),
  getMessagesByConversation: vi.fn().mockResolvedValue([]),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  markNotificationsAsRead: vi.fn(),
  getAccounts: vi.fn().mockResolvedValue([]),
  getAccountsByUser: vi.fn().mockResolvedValue([]),
  getAllAccounts: vi.fn().mockResolvedValue([]),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getAgents: vi.fn().mockResolvedValue([]),
  getTickets: vi.fn().mockResolvedValue([]),
  getQueue: vi.fn().mockResolvedValue([]),
  getTags: vi.fn().mockResolvedValue([]),
  getTagsByConversation: vi.fn().mockResolvedValue([]),
  getConversationById: vi.fn().mockResolvedValue(null),
  getAccountById: vi.fn().mockResolvedValue(null),
  getAnalytics: vi.fn().mockResolvedValue({}),
  getConversationStats: vi.fn().mockResolvedValue({}),
  createMessage: vi.fn(),
  createNotification: vi.fn(),
  createTicket: vi.fn(),
  updateTicket: vi.fn(),
  updateConversation: vi.fn(),
  updateQueueItem: vi.fn(),
  updateUser: vi.fn(),
  addToQueue: vi.fn(),
  getNextQueuePosition: vi.fn().mockResolvedValue(1),
  markMessagesAsRead: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  createConversation: vi.fn(),
  upsertContact: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
}));
vi.mock("./db-caius", () => ({
  createProtocol: vi.fn(), getProtocols: vi.fn().mockResolvedValue([]),
  getProtocolByNup: vi.fn().mockResolvedValue(null),
  getProtocolById: vi.fn().mockResolvedValue(null),
  updateProtocol: vi.fn(), deleteProtocol: vi.fn(),
  createTramitation: vi.fn(), getTramitationsByProtocol: vi.fn().mockResolvedValue([]),
  createOfficialDocument: vi.fn(), getOfficialDocuments: vi.fn().mockResolvedValue([]),
  getOfficialDocumentById: vi.fn().mockResolvedValue(null),
  updateOfficialDocument: vi.fn(), deleteOfficialDocument: vi.fn(),
  createAdminProcess: vi.fn(), getAdminProcesses: vi.fn().mockResolvedValue([]),
  getAdminProcessById: vi.fn().mockResolvedValue(null),
  updateAdminProcess: vi.fn(), deleteAdminProcess: vi.fn(),
  createManifestation: vi.fn(), getManifestations: vi.fn().mockResolvedValue([]),
  getManifestationById: vi.fn().mockResolvedValue(null),
  updateManifestation: vi.fn(),
  createDocumentTemplate: vi.fn(), getDocumentTemplates: vi.fn().mockResolvedValue([]),
  getDocumentTemplateById: vi.fn().mockResolvedValue(null),
  updateDocumentTemplate: vi.fn(), deleteDocumentTemplate: vi.fn(),
  createAuditLog: vi.fn(), getAuditLogs: vi.fn().mockResolvedValue([]),
  getAiProviders: vi.fn().mockResolvedValue([]),
  getAiProviderById: vi.fn().mockResolvedValue(null),
  createAiProvider: vi.fn(), updateAiProvider: vi.fn(), deleteAiProvider: vi.fn(),
  createAiUsageLog: vi.fn(), getAiUsageLogs: vi.fn().mockResolvedValue([]),
  getSectors: vi.fn().mockResolvedValue([]),
  createSector: vi.fn(), updateSector: vi.fn(), deleteSector: vi.fn(),
  createElectronicSignature: vi.fn(),
  getElectronicSignaturesByDocument: vi.fn().mockResolvedValue([]),
  generateNup: vi.fn().mockResolvedValue("2025.001.000001"),
}));
vi.mock("./db-advanced", () => ({
  getServiceTypes: vi.fn().mockResolvedValue([]),
  getServiceTypeById: vi.fn().mockResolvedValue(null),
  createServiceType: vi.fn(), updateServiceType: vi.fn(), deleteServiceType: vi.fn(),
  getFormTemplates: vi.fn().mockResolvedValue([]),
  getFormTemplateById: vi.fn().mockResolvedValue(null),
  createFormTemplate: vi.fn(), updateFormTemplate: vi.fn(), deleteFormTemplate: vi.fn(),
  getFormFields: vi.fn().mockResolvedValue([]),
  createFormField: vi.fn(), updateFormField: vi.fn(), deleteFormField: vi.fn(),
  reorderFormFields: vi.fn(),
  getAttachmentConfigs: vi.fn().mockResolvedValue([]),
  createAttachmentConfig: vi.fn(), updateAttachmentConfig: vi.fn(), deleteAttachmentConfig: vi.fn(),
  getAttachments: vi.fn().mockResolvedValue([]),
  createAttachment: vi.fn(), deleteAttachment: vi.fn(),
  getContextHelp: vi.fn().mockResolvedValue([]),
  upsertContextHelp: vi.fn(),
  getActiveSessions: vi.fn().mockResolvedValue([]),
  upsertSession: vi.fn(), terminateSession: vi.fn(),
  getInstitutionalConfigs: vi.fn().mockResolvedValue([]),
  setInstitutionalConfigs: vi.fn(),
  globalSearch: vi.fn().mockResolvedValue({ protocols: [], documents: [], processes: [], manifestations: [], conversations: [] }),
  getUserRegistrationByEmail: vi.fn().mockResolvedValue(null),
  createUserRegistration: vi.fn(), updateUserRegistration: vi.fn(),
}));
vi.mock("./whatsapp", () => ({
  connectWhatsApp: vi.fn(), disconnectWhatsApp: vi.fn(),
  onQrCode: vi.fn(), onStatusChange: vi.fn(), sendWhatsAppMessage: vi.fn(),
}));
vi.mock("./email", () => ({
  testImapConnection: vi.fn(), testSmtpConnection: vi.fn(),
  sendEmail: vi.fn(), fetchEmails: vi.fn(),
}));
vi.mock("./_core/socketio", () => ({ getIo: vi.fn().mockReturnValue(null) }));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-1", email: "admin@caius.gov.br", name: "Admin",
      loginMethod: "manus", role: "admin", createdAt: new Date(),
      updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function makeUserCtx(): TrpcContext {
  return {
    user: {
      id: 2, openId: "user-1", email: "user@caius.gov.br", name: "Usuário",
      loginMethod: "manus", role: "user", createdAt: new Date(),
      updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("orgUnits router", () => {
  it("tree — returns hierarchical structure", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.orgUnits.tree({ parentId: null });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("name");
  });

  it("list — returns flat list of units", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.orgUnits.list({ isActive: true });
    expect(Array.isArray(result)).toBe(true);
  });

  it("stats — returns counts for a unit", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.orgUnits.stats({ id: 1 });
    expect(result).toHaveProperty("userCount");
    expect(result).toHaveProperty("childCount");
    expect(result).toHaveProperty("positionCount");
  });

  it("create — admin can create a new unit", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.orgUnits.create({
      name: "Secretaria de Finanças", acronym: "SEFIN",
      type: "secretaria", level: 2, parentId: 1,
      sortOrder: 0,
    });
    expect(result.name).toBe("Secretaria de Finanças");
    expect(result.acronym).toBe("SEFIN");
  });

  it("seed — admin can import org structure", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.orgUnits.seed();
    expect(result).toHaveProperty("units");
    expect(result).toHaveProperty("positions");
    expect(result.units).toBeGreaterThan(0);
  });
});

describe("positions router", () => {
  it("list — returns positions", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.positions.list({ isActive: true });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("level");
  });

  it("create — admin can create a position", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.positions.create({
      name: "Diretor de Obras", code: "DIR", level: "diretor",
      provisionType: "comissao", canSign: false, canApprove: false,
    });
    expect(result.name).toBe("Diretor de Obras");
    expect(result.level).toBe("diretor");
  });
});

describe("userAllocations router", () => {
  it("list — returns active allocations", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.userAllocations.list({ isActive: true });
    expect(Array.isArray(result)).toBe(true);
  });

  it("myAllocations — returns current user allocations", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.userAllocations.myAllocations();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allocate — admin can allocate a user", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.userAllocations.allocate({
      userId: 2, orgUnitId: 1, systemProfile: "attendant", isPrimary: true,
    });
    expect(result).toHaveProperty("id");
    expect(result.systemProfile).toBe("attendant");
  });
});

describe("orgInvites router", () => {
  it("list — returns invites", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.orgInvites.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create — admin can create an invite", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.orgInvites.create({
      email: "test@example.com", orgUnitId: 1,
      systemProfile: "attendant", expiresInDays: 7,
    });
    expect(result.email).toBe("test@example.com");
    expect(result.status).toBe("pending");
    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("inviteUrl");
  });

  it("expireOld — admin can expire old invites", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const count = await caller.orgInvites.expireOld();
    expect(typeof count).toBe("number");
  });
});
