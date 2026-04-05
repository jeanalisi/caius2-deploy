/**
 * Teste: Criação de controle de numeração com unitId de orgUnits
 * Valida que o schema Drizzle está alinhado com as colunas reais do banco.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { requireDb } from "./db";
import {
  documentControls,
  orgUnits,
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

let createdId: number | null = null;
let validUnitId: number | null = null;

beforeAll(async () => {
  const db = await requireDb();
  // Pegar uma unidade válida de orgUnits
  const units = await db
    .select({ id: orgUnits.id })
    .from(orgUnits)
    .where(eq(orgUnits.isActive, true))
    .limit(1);
  if (units.length > 0) {
    validUnitId = units[0].id;
  }
});

afterAll(async () => {
  if (createdId !== null) {
    const db = await requireDb();
    await db.delete(documentControls).where(eq(documentControls.id, createdId));
  }
});

describe("Controle — createControl", () => {
  it("deve criar um controle com unitId de orgUnits sem erro de coluna", async () => {
    expect(validUnitId).not.toBeNull();

    const db = await requireDb();
    const result = await db.insert(documentControls).values({
      name: "Teste Vitest — Ofícios",
      documentType: "oficio",
      unitId: validUnitId!,
      numberFormat: "ano_sequencial",
      digits: 4,
      referenceYear: 2026,
      resetAnnually: true,
      nextNumber: 1,
      active: true,
      createdBy: 1,
    });

    // insertId deve ser um número positivo
    const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
    expect(typeof insertId === "number" || typeof insertId === "bigint").toBe(true);
    expect(Number(insertId)).toBeGreaterThan(0);
    createdId = Number(insertId);
  });

  it("deve listar controles com join em orgUnits retornando unitName", async () => {
    expect(createdId).not.toBeNull();

    const db = await requireDb();
    const rows = await db
      .select({
        id: documentControls.id,
        name: documentControls.name,
        documentType: documentControls.documentType,
        unitId: documentControls.unitId,
        unitName: orgUnits.name,
        numberFormat: documentControls.numberFormat,
      })
      .from(documentControls)
      .leftJoin(orgUnits, eq(documentControls.unitId, orgUnits.id))
      .where(eq(documentControls.id, createdId!));

    expect(rows.length).toBe(1);
    expect(rows[0].documentType).toBe("oficio");
    expect(rows[0].numberFormat).toBe("ano_sequencial");
    expect(rows[0].unitName).toBeTruthy();
  });
});
