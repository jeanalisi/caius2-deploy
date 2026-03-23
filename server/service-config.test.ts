import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock all db modules
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./db-caius", () => ({
  getProtocols: vi.fn().mockResolvedValue([]),
  getProtocolById: vi.fn().mockResolvedValue(null),
  createProtocol: vi.fn().mockResolvedValue({ id: 1 }),
  updateProtocol: vi.fn().mockResolvedValue(undefined),
  deleteProtocol: vi.fn().mockResolvedValue(undefined),
  getSectors: vi.fn().mockResolvedValue([]),
  getSectorById: vi.fn().mockResolvedValue(null),
  createSector: vi.fn().mockResolvedValue({ id: 1 }),
  updateSector: vi.fn().mockResolvedValue(undefined),
  deleteSector: vi.fn().mockResolvedValue(undefined),
  getTramitations: vi.fn().mockResolvedValue([]),
  createTramitation: vi.fn().mockResolvedValue({ id: 1 }),
  getDocuments: vi.fn().mockResolvedValue([]),
  getDocumentById: vi.fn().mockResolvedValue(null),
  createDocument: vi.fn().mockResolvedValue({ id: 1 }),
  updateDocument: vi.fn().mockResolvedValue(undefined),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
  getAdminProcesses: vi.fn().mockResolvedValue([]),
  getAdminProcessById: vi.fn().mockResolvedValue(null),
  createAdminProcess: vi.fn().mockResolvedValue({ id: 1 }),
  updateAdminProcess: vi.fn().mockResolvedValue(undefined),
  deleteAdminProcess: vi.fn().mockResolvedValue(undefined),
  getManifestations: vi.fn().mockResolvedValue([]),
  getManifestationById: vi.fn().mockResolvedValue(null),
  createManifestation: vi.fn().mockResolvedValue({ id: 1 }),
  updateManifestation: vi.fn().mockResolvedValue(undefined),
  deleteManifestation: vi.fn().mockResolvedValue(undefined),
  getDocumentTemplates: vi.fn().mockResolvedValue([]),
  getDocumentTemplateById: vi.fn().mockResolvedValue(null),
  createDocumentTemplate: vi.fn().mockResolvedValue({ id: 1 }),
  updateDocumentTemplate: vi.fn().mockResolvedValue(undefined),
  deleteDocumentTemplate: vi.fn().mockResolvedValue(undefined),
  getAuditLogs: vi.fn().mockResolvedValue([]),
  createAuditLog: vi.fn().mockResolvedValue({ id: 1 }),
  getAiProviders: vi.fn().mockResolvedValue([]),
  getAiProviderById: vi.fn().mockResolvedValue(null),
  createAiProvider: vi.fn().mockResolvedValue({ id: 1 }),
  updateAiProvider: vi.fn().mockResolvedValue(undefined),
  deleteAiProvider: vi.fn().mockResolvedValue(undefined),
  createTag: vi.fn().mockResolvedValue({ id: 1 }),
  deleteTag: vi.fn().mockResolvedValue(undefined),
  getTags: vi.fn().mockResolvedValue([]),
  getTagById: vi.fn().mockResolvedValue(null),
  generateNUP: vi.fn().mockResolvedValue("NUP-2025-000001"),
}));

vi.mock("./db-advanced", () => ({
  getServiceTypes: vi.fn().mockResolvedValue([
    { id: 1, name: "Certidão de Residência", category: "Documentação", secrecyLevel: "public", allowPublicConsult: true, isActive: true, fieldsCount: 2, documentsCount: 1 },
    { id: 2, name: "Alvará de Funcionamento", category: "Licença", secrecyLevel: "public", allowPublicConsult: true, isActive: true, fieldsCount: 3, documentsCount: 2 },
  ]),
  getServiceTypeById: vi.fn().mockResolvedValue({ id: 1, name: "Certidão de Residência", secrecyLevel: "public", isActive: true }),
  createServiceType: vi.fn().mockResolvedValue({ id: 3 }),
  updateServiceType: vi.fn().mockResolvedValue(undefined),
  deleteServiceType: vi.fn().mockResolvedValue(undefined),
  getFormTemplates: vi.fn().mockResolvedValue([]),
  getFormTemplateById: vi.fn().mockResolvedValue(null),
  createFormTemplate: vi.fn().mockResolvedValue({ id: 1 }),
  updateFormTemplate: vi.fn().mockResolvedValue(undefined),
  deleteFormTemplate: vi.fn().mockResolvedValue(undefined),
  getFormFields: vi.fn().mockResolvedValue([]),
  createFormField: vi.fn().mockResolvedValue({ id: 1 }),
  updateFormField: vi.fn().mockResolvedValue(undefined),
  deleteFormField: vi.fn().mockResolvedValue(undefined),
  getAttachmentConfigs: vi.fn().mockResolvedValue([]),
  createAttachmentConfig: vi.fn().mockResolvedValue({ id: 1 }),
  updateAttachmentConfig: vi.fn().mockResolvedValue(undefined),
  deleteAttachmentConfig: vi.fn().mockResolvedValue(undefined),
  getContextHelp: vi.fn().mockResolvedValue(null),
  upsertContextHelp: vi.fn().mockResolvedValue({ id: 1 }),
  getActiveSessions: vi.fn().mockResolvedValue([]),
  terminateSession: vi.fn().mockResolvedValue(undefined),
  getInstitutionalConfigs: vi.fn().mockResolvedValue([]),
  setInstitutionalConfigs: vi.fn().mockResolvedValue(undefined),
  getUserRegistrationByEmail: vi.fn().mockResolvedValue(null),
  createUserRegistration: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock("./db-service-config", () => ({
  getServiceTypeFields: vi.fn().mockResolvedValue([
    { id: 1, serviceTypeId: 1, name: "nome_completo", label: "Nome Completo", fieldType: "text", requirement: "required", sortOrder: 0 },
    { id: 2, serviceTypeId: 1, name: "cpf", label: "CPF", fieldType: "cpf", requirement: "required", sortOrder: 1 },
  ]),
  createServiceTypeField: vi.fn().mockResolvedValue({ id: 3 }),
  updateServiceTypeField: vi.fn().mockResolvedValue(undefined),
  deleteServiceTypeField: vi.fn().mockResolvedValue(undefined),
  getServiceTypeDocuments: vi.fn().mockResolvedValue([
    { id: 1, serviceTypeId: 1, name: "RG ou CNH", requirement: "required", acceptedFormats: "pdf,jpg,png", maxSizeMb: 10, sortOrder: 0 },
  ]),
  createServiceTypeDocument: vi.fn().mockResolvedValue({ id: 2 }),
  updateServiceTypeDocument: vi.fn().mockResolvedValue(undefined),
  deleteServiceTypeDocument: vi.fn().mockResolvedValue(undefined),
  getCidadaoServices: vi.fn().mockResolvedValue([
    { id: 1, name: "Certidão de Residência", category: "Documentação", secrecyLevel: "public", allowPublicConsult: true, isActive: true, fieldsCount: 2, documentsCount: 1 },
    { id: 2, name: "Alvará de Funcionamento", category: "Licença", secrecyLevel: "public", allowPublicConsult: true, isActive: true, fieldsCount: 3, documentsCount: 2 },
  ]),
  getCidadaoServiceDetail: vi.fn().mockResolvedValue({
    id: 1,
    name: "Certidão de Residência",
    category: "Documentação",
    secrecyLevel: "public",
    fields: [
      { id: 1, label: "Nome Completo", fieldType: "text", requirement: "required" },
      { id: 2, label: "CPF", fieldType: "cpf", requirement: "required" },
    ],
    documents: [
      { id: 1, name: "RG ou CNH", requirement: "required", acceptedFormats: "pdf,jpg,png", maxSizeMb: 10 },
    ],
  }),
}));

vi.mock("./db-org", () => ({
  getOrgUnits: vi.fn().mockResolvedValue([]),
  getOrgUnitById: vi.fn().mockResolvedValue(null),
  createOrgUnit: vi.fn().mockResolvedValue({ id: 1 }),
  updateOrgUnit: vi.fn().mockResolvedValue(undefined),
  deleteOrgUnit: vi.fn().mockResolvedValue(undefined),
  getOrgUnitTree: vi.fn().mockResolvedValue([]),
  getPositions: vi.fn().mockResolvedValue([]),
  getPositionById: vi.fn().mockResolvedValue(null),
  createPosition: vi.fn().mockResolvedValue({ id: 1 }),
  updatePosition: vi.fn().mockResolvedValue(undefined),
  deletePosition: vi.fn().mockResolvedValue(undefined),
  getUserAllocations: vi.fn().mockResolvedValue([]),
  createUserAllocation: vi.fn().mockResolvedValue({ id: 1 }),
  updateUserAllocation: vi.fn().mockResolvedValue(undefined),
  deleteUserAllocation: vi.fn().mockResolvedValue(undefined),
  getOrgInvites: vi.fn().mockResolvedValue([]),
  getOrgInviteByToken: vi.fn().mockResolvedValue(null),
  createOrgInvite: vi.fn().mockResolvedValue({ id: 1 }),
  updateOrgInvite: vi.fn().mockResolvedValue(undefined),
  deleteOrgInvite: vi.fn().mockResolvedValue(undefined),
  seedOrgStructure: vi.fn().mockResolvedValue({ units: 17, positions: 15 }),
}));

vi.mock("./seed-org", () => ({
  seedOrgStructure: vi.fn().mockResolvedValue({ units: 17, positions: 15 }),
}));

vi.mock("./whatsapp", () => ({ whatsappService: { getStatus: vi.fn().mockReturnValue([]) } }));
vi.mock("./email", () => ({ emailService: { getStatus: vi.fn().mockReturnValue([]) } }));
vi.mock("./_core/socketio", () => ({ getIO: vi.fn().mockReturnValue(null), initSocketIO: vi.fn() }));

function makeAdminCtx(): TrpcContext {
  return {
    user: { id: 1, openId: "admin-1", name: "Admin", email: "admin@test.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("serviceTypeFields router", () => {
  it("list: returns fields for a service type", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.serviceTypeFields.list({ serviceTypeId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].label).toBe("Nome Completo");
    expect(result[0].requirement).toBe("required");
  });

  it("create: creates a new field with requirement", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.serviceTypeFields.create({
      serviceTypeId: 1,
      name: "endereco",
      label: "Endereço",
      fieldType: "text",
      requirement: "complementary",
    });
    expect(result).toEqual({ id: 3 });
  });

  it("update: updates an existing field", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    // update returns void (undefined) from db helper
    await expect(caller.serviceTypeFields.update({ id: 1, label: "Nome Completo Atualizado", requirement: "required" })).resolves.not.toThrow();
  });

  it("delete: removes a field", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    // delete returns void (undefined) from db helper
    await expect(caller.serviceTypeFields.delete({ id: 1 })).resolves.not.toThrow();
  });
});

describe("serviceTypeDocuments router", () => {
  it("list: returns documents for a service type", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.serviceTypeDocuments.list({ serviceTypeId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("RG ou CNH");
    expect(result[0].requirement).toBe("required");
  });

  it("create: creates a document requirement", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.serviceTypeDocuments.create({
      serviceTypeId: 1,
      name: "Comprovante de Residência",
      requirement: "required",
      acceptedFormats: "pdf,jpg",
      maxSizeMb: 5,
    });
    expect(result).toEqual({ id: 2 });
  });

  it("update: updates document requirement", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    // update returns void (undefined) from db helper
    await expect(caller.serviceTypeDocuments.update({ id: 1, requirement: "complementary" })).resolves.not.toThrow();
  });

  it("delete: removes a document requirement", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    // delete returns void (undefined) from db helper
    await expect(caller.serviceTypeDocuments.delete({ id: 1 })).resolves.not.toThrow();
  });
});

describe("cidadao router (public)", () => {
  it("listServices: returns public services without authentication", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.cidadao.listServices({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe("Certidão de Residência");
  });

  it("listServices: filters by search term", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.cidadao.listServices({ search: "certidão" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("listServices: filters by category", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.cidadao.listServices({ category: "Documentação" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("getService: returns service detail with fields and documents", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.cidadao.getService({ id: 1 });
    expect(result.name).toBe("Certidão de Residência");
    expect(Array.isArray(result.fields)).toBe(true);
    expect(result.fields.length).toBe(2);
    expect(Array.isArray(result.documents)).toBe(true);
    expect(result.documents.length).toBe(1);
  });

  it("getService: throws NOT_FOUND for invalid id", async () => {
    const { getCidadaoServiceDetail } = await import("./db-service-config");
    vi.mocked(getCidadaoServiceDetail).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.cidadao.getService({ id: 9999 })).rejects.toThrow();
  });
});
