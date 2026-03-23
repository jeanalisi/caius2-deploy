import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Mock the database helpers ────────────────────────────────────────────────
vi.mock("./db-caius", () => ({
  generateNup: vi.fn().mockResolvedValue("2026.001.000001"),
  createSector: vi.fn().mockResolvedValue({ id: 1, name: "Secretaria de Comunicação", code: "SECOM", isActive: true }),
  getSectors: vi.fn().mockResolvedValue([{ id: 1, name: "Secretaria de Comunicação", code: "SECOM", isActive: true, description: null, parentId: null, createdAt: new Date(), updatedAt: new Date() }]),
  getSectorById: vi.fn().mockResolvedValue(null),
  updateSector: vi.fn().mockResolvedValue({ id: 1, name: "SECOM Updated", code: "SECOM", isActive: false }),
  deleteSector: vi.fn().mockResolvedValue(undefined),
  createProtocol: vi.fn().mockResolvedValue({ id: 1, nup: "2026.001.000001", subject: "Solicitação de informação", status: "open" }),
  getProtocols: vi.fn().mockResolvedValue([]),
  getProtocolStats: vi.fn().mockResolvedValue({ total: 0, open: 0, inAnalysis: 0, concluded: 0 }),
  getProtocolByNup: vi.fn().mockResolvedValue(null),
  getProtocolById: vi.fn().mockResolvedValue(null),
  updateProtocol: vi.fn().mockResolvedValue({ id: 1, status: "in_analysis" }),
  createTramitation: vi.fn().mockResolvedValue({ id: 1, protocolId: 1, action: "forward" }),
  getTramitationsByProtocol: vi.fn().mockResolvedValue([]),
  createOfficialDocument: vi.fn().mockResolvedValue({ id: 1, nup: "2026.001.000002", title: "Ofício 001/2026", type: "official_letter", status: "draft" }),
  getOfficialDocuments: vi.fn().mockResolvedValue([]),
  getOfficialDocumentById: vi.fn().mockResolvedValue(null),
  updateOfficialDocument: vi.fn().mockResolvedValue({ id: 1, status: "signed" }),
  createElectronicSignature: vi.fn().mockResolvedValue({ id: 1, documentId: 1 }),
  getSignaturesByDocument: vi.fn().mockResolvedValue([]),
  createAdminProcess: vi.fn().mockResolvedValue({ id: 1, nup: "2026.001.000003", title: "Processo de Licitação", type: "Licitação", status: "open" }),
  getAdminProcesses: vi.fn().mockResolvedValue([]),
  getAdminProcessById: vi.fn().mockResolvedValue({ process: { id: 1, nup: "2026.001.000003", title: "Processo de Licitação", type: "Licitação", status: "open", deadline: null }, tramitations: [], documents: [] }),
  updateAdminProcess: vi.fn().mockResolvedValue({ id: 1, status: "in_analysis" }),
  getProcessDeadlineHistory: vi.fn().mockResolvedValue([]),
  addProcessDeadlineHistory: vi.fn().mockResolvedValue(undefined),
  createOmbudsmanManifestation: vi.fn().mockResolvedValue({ id: 1, nup: "2026.001.000004", subject: "Reclamação sobre serviço", type: "complaint", status: "received" }),
  getOmbudsmanManifestations: vi.fn().mockResolvedValue([]),
  updateOmbudsmanManifestation: vi.fn().mockResolvedValue({ id: 1, status: "in_analysis" }),
  createDocumentTemplate: vi.fn().mockResolvedValue({ id: 1, name: "Ofício Padrão", type: "official_letter", content: "Prezado {{nome}}..." }),
  getDocumentTemplates: vi.fn().mockResolvedValue([]),
  updateDocumentTemplate: vi.fn().mockResolvedValue({ id: 1, name: "Ofício Padrão Atualizado" }),
  deleteDocumentTemplate: vi.fn().mockResolvedValue(undefined),
  getAuditLogs: vi.fn().mockResolvedValue([]),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  getAiProvidersByUser: vi.fn().mockResolvedValue([]),
  getAiProviderById: vi.fn().mockResolvedValue(null),
  createAiProvider: vi.fn().mockResolvedValue({ id: 1, name: "GPT-4o", provider: "openai", model: "gpt-4o" }),
  updateAiProvider: vi.fn().mockResolvedValue({ id: 1, name: "GPT-4o Updated" }),
  deleteAiProvider: vi.fn().mockResolvedValue(undefined),
  getAiUsageLogs: vi.fn().mockResolvedValue([]),
  createAiUsageLog: vi.fn().mockResolvedValue(undefined),
  publicLookupByNup: vi.fn().mockResolvedValue(null),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Sugestão gerada pela IA para o documento solicitado." } }],
  }),
}));

vi.mock("./_core/socketio", () => ({
  getIo: vi.fn().mockReturnValue(null),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(role: "admin" | "user" = "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

// ─── Sectors ──────────────────────────────────────────────────────────────────
describe("caius.sectors", () => {
  it("list returns sectors array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.sectors.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns success", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.sectors.create({ name: "SECOM", code: "SECOM" });
    expect(result).toBeDefined();
  });

  it("update returns success", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.sectors.update({ id: 1, isActive: false });
    expect(result).toBeDefined();
  });

  it("delete succeeds without error", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.caius.sectors.delete({ id: 1 })).resolves.not.toThrow();
  });
});

// ─── Protocols ────────────────────────────────────────────────────────────────
describe("caius.protocols", () => {
  it("list returns protocols array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.protocols.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns protocol with nup", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.protocols.create({
      subject: "Solicitação de informação",
      type: "request",
      requesterName: "João Silva",
      requesterEmail: "joao@example.com",
    });
    expect(result).toHaveProperty("nup");
    expect(result.nup).toBeDefined();
  });
});

// ─── Documents ────────────────────────────────────────────────────────────────
describe("caius.documents", () => {
  it("list returns documents array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.documents.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns document with nup", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.documents.create({
      title: "Ofício 001/2026",
      type: "official_letter",
      content: "Prezado senhor...",
    });
    expect(result).toHaveProperty("nup");
  });
});

// ─── Processes ────────────────────────────────────────────────────────────────
describe("caius.processes", () => {
  it("list returns processes array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.processes.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns process with nup", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.processes.create({
      title: "Processo de Licitação",
      type: "Licitação",
    });
    expect(result).toHaveProperty("nup");
  });
});

// ─── Ombudsman ────────────────────────────────────────────────────────────────
describe("caius.ombudsman", () => {
  it("list returns manifestations array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.ombudsman.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns manifestation with nup", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.ombudsman.create({
      type: "complaint",
      subject: "Reclamação sobre serviço",
      description: "O serviço prestado foi inadequado.",
      isAnonymous: false,
    });
    expect(result).toHaveProperty("nup");
  });
});

// ─── Templates ────────────────────────────────────────────────────────────────
describe("caius.templates", () => {
  it("list returns templates array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.templates.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("create returns success", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.templates.create({
      name: "Ofício Padrão",
      type: "official_letter",
      content: "Prezado {{nome}}, ...",
    });
    expect(result).toBeDefined();
  });
});

// ─── Audit ────────────────────────────────────────────────────────────────────
describe("caius.audit", () => {
  it("list returns audit logs array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.audit.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── AI ───────────────────────────────────────────────────────────────────────
describe("caius.ai", () => {
  it("assist returns suggestion string", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.ai.assist({
      action: "draft_document",
      context: "Tipo: Ofício\nTítulo: Ofício de Resposta",
    });
    expect(result).toHaveProperty("suggestion");
    expect(typeof result.suggestion).toBe("string");
    expect(result.suggestion.length).toBeGreaterThan(0);
  });

  it("providers returns providers array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.ai.providers();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Public NUP lookup ────────────────────────────────────────────────────────
describe("caius.public", () => {
  it("lookupNup returns null for unknown NUP", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.public.lookupNup({ nup: "9999.999.999999" });
    expect(result).toBeNull();
  });
});

// ─── Process Deadlines ────────────────────────────────────────────────────────
describe("caius.processes.deadline", () => {
  it("deadlineHistory returns array", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.processes.deadlineHistory({ processId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("setDeadline (set action) returns success", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.processes.setDeadline({
      processId: 1,
      newDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      reason: "Prazo inicial definido",
      action: "set",
    });
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  it("setDeadline (extend action) returns success", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.caius.processes.setDeadline({
      processId: 1,
      newDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      reason: "Prorrogação por complexidade",
      action: "extend",
    });
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });
});
