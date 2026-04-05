/**
 * Teste: Validação de unicidade ao criar controles de numeração
 * Garante que não é possível criar dois controles com mesmo tipo documental,
 * unidade organizacional e ano de referência.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { requireDb } from "./db";
import { documentControls, orgUnits } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { checkDuplicateControl, createControl } from "./db-controle";

let validUnitId: number | null = null;
const createdIds: number[] = [];

beforeAll(async () => {
  const db = await requireDb();
  const units = await db
    .select({ id: orgUnits.id })
    .from(orgUnits)
    .where(eq(orgUnits.isActive, true))
    .limit(1);
  if (units.length > 0) validUnitId = units[0].id;
});

afterAll(async () => {
  if (createdIds.length > 0) {
    const db = await requireDb();
    for (const id of createdIds) {
      await db.delete(documentControls).where(eq(documentControls.id, id));
    }
  }
});

describe("Controle — Validação de Unicidade", () => {
  it("checkDuplicateControl deve retornar isDuplicate=false quando não existe controle", async () => {
    expect(validUnitId).not.toBeNull();
    const result = await checkDuplicateControl({
      documentType: "portaria",
      unitId: validUnitId!,
      referenceYear: 2099, // ano improvável de existir
    });
    expect(result.isDuplicate).toBe(false);
    expect(result.existing).toBeUndefined();
  });

  it("deve criar o primeiro controle sem erro", async () => {
    expect(validUnitId).not.toBeNull();
    const db = await requireDb();
    const result = await createControl({
      name: "Teste Unicidade — Portarias 2099",
      documentType: "portaria",
      unitId: validUnitId!,
      numberFormat: "ano_sequencial",
      digits: 4,
      referenceYear: 2099,
      resetAnnually: true,
      createdBy: 1,
    });
    const insertId = Number((result as any)[0]?.insertId ?? (result as any).insertId);
    expect(insertId).toBeGreaterThan(0);
    createdIds.push(insertId);
  });

  it("checkDuplicateControl deve retornar isDuplicate=true após criar o primeiro controle", async () => {
    expect(validUnitId).not.toBeNull();
    const result = await checkDuplicateControl({
      documentType: "portaria",
      unitId: validUnitId!,
      referenceYear: 2099,
    });
    expect(result.isDuplicate).toBe(true);
    expect(result.existing).toBeDefined();
    expect(result.existing!.id).toBeGreaterThan(0);
    expect(result.existing!.name).toBe("Teste Unicidade — Portarias 2099");
  });

  it("checkDuplicateControl deve retornar isDuplicate=false quando excludeId exclui o próprio registro", async () => {
    expect(validUnitId).not.toBeNull();
    expect(createdIds.length).toBeGreaterThan(0);
    const result = await checkDuplicateControl({
      documentType: "portaria",
      unitId: validUnitId!,
      referenceYear: 2099,
      excludeId: createdIds[0], // excluindo o próprio registro (edição)
    });
    expect(result.isDuplicate).toBe(false);
  });

  it("checkDuplicateControl deve permitir mesmo tipo em unidade diferente", async () => {
    const db = await requireDb();
    const otherUnits = await db
      .select({ id: orgUnits.id })
      .from(orgUnits)
      .where(and(eq(orgUnits.isActive, true)))
      .limit(5);
    // Pegar uma unidade diferente da usada nos testes anteriores
    const otherUnit = otherUnits.find((u) => u.id !== validUnitId);
    if (!otherUnit) {
      // Só uma unidade no banco — pular
      return;
    }
    const result = await checkDuplicateControl({
      documentType: "portaria",
      unitId: otherUnit.id,
      referenceYear: 2099,
    });
    expect(result.isDuplicate).toBe(false);
  });

  it("checkDuplicateControl deve permitir mesmo tipo e unidade em ano diferente", async () => {
    expect(validUnitId).not.toBeNull();
    const result = await checkDuplicateControl({
      documentType: "portaria",
      unitId: validUnitId!,
      referenceYear: 2098, // ano diferente
    });
    expect(result.isDuplicate).toBe(false);
  });
});
