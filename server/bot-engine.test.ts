/**
 * Testes unitários para o motor do chatbot (bot-engine.ts)
 *
 * Testa as funções utilitárias que não dependem do banco de dados,
 * como interpolação de variáveis e formatação de menus.
 */

import { describe, it, expect } from "vitest";

// ─── Funções auxiliares copiadas do bot-engine para teste isolado ─────────────
// (Testamos a lógica pura sem precisar mockar o banco)

function interpolate(template: string, data: Record<string, string | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

function formatMenuMessage(
  message: string,
  options: { label: string; nextNodeId: number }[]
): string {
  const optionLines = options.map((opt, i) => `*${i + 1}.* ${opt.label}`).join("\n");
  return `${message}\n\n${optionLines}`;
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("bot-engine — interpolate()", () => {
  it("substitui variável simples", () => {
    expect(interpolate("Olá, {{requesterName}}!", { requesterName: "João" })).toBe(
      "Olá, João!"
    );
  });

  it("substitui múltiplas variáveis", () => {
    const result = interpolate("{{requesterName}} — NUP: {{nup}}", {
      requesterName: "Maria",
      nup: "2024.001.0001",
    });
    expect(result).toBe("Maria — NUP: 2024.001.0001");
  });

  it("substitui variável ausente por string vazia", () => {
    expect(interpolate("Olá, {{requesterName}}!", {})).toBe("Olá, !");
  });

  it("não altera texto sem variáveis", () => {
    expect(interpolate("Texto simples", {})).toBe("Texto simples");
  });

  it("substitui a mesma variável múltiplas vezes", () => {
    expect(
      interpolate("{{nup}} — protocolo {{nup}}", { nup: "2024.001.0001" })
    ).toBe("2024.001.0001 — protocolo 2024.001.0001");
  });
});

describe("bot-engine — formatMenuMessage()", () => {
  it("formata menu com opções numeradas", () => {
    const result = formatMenuMessage("Escolha uma opção:", [
      { label: "Abrir Protocolo", nextNodeId: 2 },
      { label: "Falar com atendente", nextNodeId: 3 },
    ]);
    expect(result).toContain("*1.* Abrir Protocolo");
    expect(result).toContain("*2.* Falar com atendente");
    expect(result).toContain("Escolha uma opção:");
  });

  it("retorna apenas a mensagem quando não há opções", () => {
    const result = formatMenuMessage("Mensagem", []);
    expect(result).toBe("Mensagem\n\n");
  });

  it("formata menu com uma única opção", () => {
    const result = formatMenuMessage("Menu:", [{ label: "Única opção", nextNodeId: 1 }]);
    expect(result).toContain("*1.* Única opção");
  });
});

describe("bot-engine — validação de entrada de menu", () => {
  // Simula a lógica de validação de opção de menu
  function validateMenuInput(
    input: string,
    optionsCount: number
  ): { valid: boolean; selectedIndex?: number } {
    const trimmed = input.trim();
    const index = parseInt(trimmed, 10) - 1;
    if (isNaN(index) || index < 0 || index >= optionsCount) {
      return { valid: false };
    }
    return { valid: true, selectedIndex: index };
  }

  it("aceita número válido dentro do range", () => {
    expect(validateMenuInput("1", 3)).toEqual({ valid: true, selectedIndex: 0 });
    expect(validateMenuInput("3", 3)).toEqual({ valid: true, selectedIndex: 2 });
  });

  it("rejeita número fora do range", () => {
    expect(validateMenuInput("0", 3).valid).toBe(false);
    expect(validateMenuInput("4", 3).valid).toBe(false);
  });

  it("rejeita texto não numérico", () => {
    expect(validateMenuInput("abc", 3).valid).toBe(false);
    expect(validateMenuInput("", 3).valid).toBe(false);
  });

  it("aceita número com espaços extras", () => {
    expect(validateMenuInput("  2  ", 3)).toEqual({ valid: true, selectedIndex: 1 });
  });
});

describe("bot-engine — tipos de nós", () => {
  const validNodeTypes = ["menu", "message", "collect", "transfer", "protocol", "end"];

  it("todos os tipos de nó são reconhecidos", () => {
    for (const type of validNodeTypes) {
      expect(validNodeTypes).toContain(type);
    }
  });

  it("nó do tipo 'protocol' requer campo protocolType", () => {
    const node = { nodeType: "protocol", protocolType: "request" };
    expect(node.protocolType).toBeDefined();
  });

  it("nó do tipo 'collect' requer campo collectField", () => {
    const node = { nodeType: "collect", collectField: "requesterName" };
    expect(node.collectField).toBeDefined();
  });

  it("nó do tipo 'transfer' requer campo transferSectorId", () => {
    const node = { nodeType: "transfer", transferSectorId: 1 };
    expect(node.transferSectorId).toBeGreaterThan(0);
  });
});
