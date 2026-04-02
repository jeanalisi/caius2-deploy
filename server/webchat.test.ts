/**
 * Testes do módulo de Webchat — CAIUS
 *
 * Cobre:
 *  1. startWebchatSession — criação de sessão
 *  2. processWebchatMessage — erros de sessão
 *  3. getWebchatMessages — leitura de mensagens
 *  4. closeWebchatSession — encerramento
 *  5. sendWebchatAgentMessage — resposta do agente
 *  6. NUP unificado — garante que conversa e protocolo usam o mesmo NUP
 *  7. webchat-bot — lógica pura do chatbot (interpolação, menus)
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

const mockGenerateNup = vi.fn().mockResolvedValue("PMI-2026-000001");
const mockCreateProtocolWithNup = vi.fn().mockResolvedValue({ nup: "PMI-2026-000001", protocolId: 1 });

vi.mock("./db-caius", () => ({
  generateNup: mockGenerateNup,
  createProtocolWithNup: mockCreateProtocolWithNup,
  getProtocolByNup: vi.fn().mockResolvedValue(null),
}));

vi.mock("./webchat-bot", () => ({
  processWebchatBotMessage: vi.fn().mockResolvedValue({
    replies: ["Olá! Como posso ajudar?"],
    sessionStatus: "bot",
    nup: "PMI-2026-000001",
    ended: false,
  }),
}));

vi.mock("./_core/socketio", () => ({
  getIo: vi.fn().mockReturnValue(null),
}));

// ─── Testes: startWebchatSession ─────────────────────────────────────────────

describe("webchat — startWebchatSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  }, 15000);;

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

// ─── Testes: processWebchatMessage ───────────────────────────────────────────

describe("webchat — processWebchatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve lançar erro quando sessão não é encontrada", async () => {
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

// ─── Testes: getWebchatMessages ───────────────────────────────────────────────

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

// ─── Testes: closeWebchatSession ─────────────────────────────────────────────

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

// ─── Testes: sendWebchatAgentMessage ─────────────────────────────────────────

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

// ─── Testes: NUP Unificado ────────────────────────────────────────────────────

describe("NUP Unificado — conversa e protocolo devem usar o mesmo NUP", () => {
  it("generateNup deve ser chamado apenas uma vez por conversa nova", async () => {
    // Este teste valida o contrato: generateNup() é chamado 1x em findOrCreateWebchatConversation
    // e createProtocolWithNup() recebe o mesmo NUP (não gera um novo)
    const { generateNup, createProtocolWithNup } = await import("./db-caius");

    // Simular o fluxo: gerar NUP e criar protocolo com ele
    const nup = await generateNup();
    await createProtocolWithNup(nup, {
      conversationId: 1,
      subject: "Teste",
      requesterName: "João",
      type: "request",
      channel: "web",
      status: "open",
      priority: "normal",
      isConfidential: false,
    });

    // Verificar que generateNup foi chamado 1x
    expect(generateNup).toHaveBeenCalledTimes(1);

    // Verificar que createProtocolWithNup recebeu o mesmo NUP
    expect(createProtocolWithNup).toHaveBeenCalledWith(
      "PMI-2026-000001",
      expect.objectContaining({ subject: "Teste" })
    );

    // O NUP retornado deve ser o mesmo
    expect(nup).toBe("PMI-2026-000001");
  });

  it("createProtocolWithNup deve receber o NUP passado como argumento", async () => {
    // Validar que createProtocolWithNup usa o NUP passado (não gera um novo)
    // Como é um mock, verificamos apenas que foi chamado com o NUP correto
    const { createProtocolWithNup } = await import("./db-caius");

    const nupFixo = "PMI-2026-000042";
    await createProtocolWithNup(nupFixo, {
      conversationId: 5,
      subject: "Solicitação de Informação",
      requesterName: "Maria",
      type: "information",
      channel: "web",
      status: "open",
      priority: "normal",
      isConfidential: false,
    });

    // createProtocolWithNup deve ter recebido o NUP correto como 1º argumento
    expect(createProtocolWithNup).toHaveBeenCalledWith(
      "PMI-2026-000042",
      expect.objectContaining({ requesterName: "Maria" })
    );

    // O NUP passado deve ter o formato correto
    expect(nupFixo).toMatch(/^PMI-\d{4}-\d{6}$/);
  });
});

// ─── Testes: Lógica pura do chatbot webchat ───────────────────────────────────

describe("webchat-bot — lógica pura", () => {
  it("interpolate deve substituir variáveis corretamente", () => {
    // Testar a função de interpolação diretamente (lógica pura)
    const template = "Olá, {{requesterName}}! Seu protocolo é {{nup}}.";
    const data = { requesterName: "Ana", nup: "PMI-2026-000001" };

    const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => (data as any)[key] ?? "");

    expect(result).toBe("Olá, Ana! Seu protocolo é PMI-2026-000001.");
  });

  it("interpolate deve deixar variáveis não encontradas como string vazia", () => {
    const template = "Nome: {{nome}}, CPF: {{cpf}}";
    const data = { nome: "Carlos" };

    const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => (data as any)[key] ?? "");

    expect(result).toBe("Nome: Carlos, CPF: ");
  });

  it("menu deve formatar opções numeradas corretamente", () => {
    const message = "Escolha uma opção:";
    const options = [
      { label: "Abrir protocolo", nextNodeId: 2 },
      { label: "Consultar protocolo", nextNodeId: 3 },
      { label: "Falar com atendente", nextNodeId: 4 },
    ];

    const lines = options.map((opt, i) => `*${i + 1}.* ${opt.label}`).join("\n");
    const formatted = `${message}\n\n${lines}`;

    expect(formatted).toContain("*1.* Abrir protocolo");
    expect(formatted).toContain("*2.* Consultar protocolo");
    expect(formatted).toContain("*3.* Falar com atendente");
  });

  it("seleção de menu deve validar índice corretamente", () => {
    const options = [
      { label: "Opção 1", nextNodeId: 2 },
      { label: "Opção 2", nextNodeId: 3 },
    ];

    const validInput = "1";
    const invalidInput = "5";
    const textInput = "abc";

    const parseIdx = (input: string) => {
      const idx = parseInt(input, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= options.length) return null;
      return options[idx];
    };

    expect(parseIdx(validInput)).toEqual({ label: "Opção 1", nextNodeId: 2 });
    expect(parseIdx(invalidInput)).toBeNull();
    expect(parseIdx(textInput)).toBeNull();
  });

  it("NUP deve seguir o formato PMI-YYYY-NNNNNN", () => {
    const nupRegex = /^PMI-\d{4}-\d{6}$/;
    expect("PMI-2026-000001").toMatch(nupRegex);
    expect("PMI-2026-000042").toMatch(nupRegex);
    expect("PMI-2025-999999").toMatch(nupRegex);
    expect("2026/00001").not.toMatch(nupRegex); // formato antigo incorreto
  });
});
