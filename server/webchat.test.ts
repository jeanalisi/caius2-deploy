/**
 * Testes do módulo de Webchat — CAIUS
 *
 * Testa as funções principais do gateway de webchat usando mocks do banco.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockInsertResult = [{ insertId: 1 }];

const mockDb = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue(mockInsertResult),
  }),
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      }),
      orderBy: vi.fn().mockResolvedValue([]),
    }),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
  upsertContact: vi.fn().mockResolvedValue(42),
  createMessage: vi.fn().mockResolvedValue(1),
}));

vi.mock("./db-caius", () => ({
  generateNup: vi.fn().mockResolvedValue("2026/00001"),
  createProtocol: vi.fn().mockResolvedValue(1),
}));

vi.mock("./bot-engine", () => ({
  processBotMessage: vi.fn().mockResolvedValue(false),
}));

vi.mock("./_core/socketio", () => ({
  getIo: vi.fn().mockReturnValue(null),
}));

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("webchat — startWebchatSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetar o mock do insert para retornar insertId = 1
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(mockInsertResult),
    });
  });

  it("deve criar uma sessão e retornar token de 64 caracteres", async () => {
    const { startWebchatSession } = await import("./webchat");

    const result = await startWebchatSession({
      visitorName: "João Silva",
      visitorEmail: "joao@example.com",
    });

    expect(result).toHaveProperty("sessionToken");
    expect(result).toHaveProperty("sessionId");
    expect(result.sessionToken).toHaveLength(64);
    expect(result.sessionId).toBe(1);
  });

  it("deve gerar tokens únicos para sessões diferentes", async () => {
    const { startWebchatSession } = await import("./webchat");

    const r1 = await startWebchatSession({ visitorName: "Alice" });
    const r2 = await startWebchatSession({ visitorName: "Bob" });

    expect(r1.sessionToken).not.toBe(r2.sessionToken);
  });

  it("deve aceitar payload vazio e usar defaults", async () => {
    const { startWebchatSession } = await import("./webchat");

    const result = await startWebchatSession({});

    expect(result.sessionToken).toHaveLength(64);
    expect(result.sessionId).toBe(1);
  });
});

describe("webchat — processWebchatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve lançar erro quando sessão não é encontrada", async () => {
    // Sessão não encontrada (array vazio)
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { processWebchatMessage } = await import("./webchat");

    await expect(
      processWebchatMessage({
        sessionToken: "a".repeat(64),
        content: "Olá",
      })
    ).rejects.toThrow("Sessão não encontrada");
  });

  it("deve lançar erro quando sessão está encerrada", async () => {
    const closedSession = {
      id: 1,
      sessionToken: "a".repeat(64),
      status: "closed",
      visitorName: "João",
      visitorPhone: null,
      visitorEmail: null,
      visitorCpf: null,
      contactId: 42,
      accountId: 1,
      conversationId: null,
      nup: null,
      lastActivityAt: new Date(),
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([closedSession]),
        }),
      }),
    });

    const { processWebchatMessage } = await import("./webchat");

    await expect(
      processWebchatMessage({
        sessionToken: "a".repeat(64),
        content: "Olá",
      })
    ).rejects.toThrow("Sessão encerrada");
  });
});

describe("webchat — getWebchatMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar array vazio quando sessão não tem conversationId", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ conversationId: null }]),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { getWebchatMessages } = await import("./webchat");

    const result = await getWebchatMessages("a".repeat(64));
    expect(result).toEqual([]);
  });

  it("deve retornar array vazio quando sessão não é encontrada", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { getWebchatMessages } = await import("./webchat");

    const result = await getWebchatMessages("a".repeat(64));
    expect(result).toEqual([]);
  });
});

describe("webchat — closeWebchatSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });
  });

  it("deve encerrar a sessão sem erros", async () => {
    const { closeWebchatSession } = await import("./webchat");

    await expect(closeWebchatSession("a".repeat(64))).resolves.toBeUndefined();
    expect(mockDb.update).toHaveBeenCalled();
  });
});

describe("webchat — sendWebchatAgentMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar sem erros quando sessão não é encontrada", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { sendWebchatAgentMessage } = await import("./webchat");

    await expect(
      sendWebchatAgentMessage(1, "Olá cidadão!", "Atendente")
    ).resolves.toBeUndefined();
  });

  it("deve retornar sem erros quando sessão está encerrada", async () => {
    const closedSession = {
      id: 1,
      sessionToken: "a".repeat(64),
      status: "closed",
      conversationId: 1,
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([closedSession]),
        }),
      }),
    });

    const { sendWebchatAgentMessage } = await import("./webchat");

    await expect(
      sendWebchatAgentMessage(1, "Olá cidadão!", "Atendente")
    ).resolves.toBeUndefined();
  });
});
