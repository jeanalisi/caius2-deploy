/**
 * Teste: Criação de controle de numeração com unitId de orgUnits
 * Valida que o schema Drizzle está alinhado com as colunas reais do banco,
 * e que nextNumber personalizado é persistido corretamente.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { requireDb } from "./db";
import { documentControls, orgUnits } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createControl } from "./db-controle";

const createdIds: number[] = [];
let validUnitId: number | null = null;

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
    const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
    expect(typeof insertId === "number" || typeof insertId === "bigint").toBe(true);
    expect(Number(insertId)).toBeGreaterThan(0);
    createdIds.push(Number(insertId));
  });

  it("deve listar controles com join em orgUnits retornando unitName", async () => {
    expect(createdIds.length).toBeGreaterThan(0);
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
      .where(eq(documentControls.id, createdIds[0]));
    expect(rows.length).toBe(1);
    expect(rows[0].documentType).toBe("oficio");
    expect(rows[0].numberFormat).toBe("ano_sequencial");
    expect(rows[0].unitName).toBeTruthy();
  });

  it("deve criar controle com nextNumber personalizado e persistir no banco", async () => {
    expect(validUnitId).not.toBeNull();
    const result = await createControl({
      name: "Controle Teste Número Inicial",
      documentType: "memorando",
      unitId: validUnitId!,
      numberFormat: "ano_sequencial",
      digits: 4,
      referenceYear: 2097,
      resetAnnually: true,
      createdBy: 1,
      nextNumber: 48,
    });
    const insertId = Number((result as any)[0]?.insertId ?? (result as any).insertId);
    expect(insertId).toBeGreaterThan(0);
    createdIds.push(insertId);

    // Verificar que o nextNumber foi persistido como 48
    const db = await requireDb();
    const rows = await db
      .select({ nextNumber: documentControls.nextNumber })
      .from(documentControls)
      .where(eq(documentControls.id, insertId))
      .limit(1);
    expect(rows[0]?.nextNumber).toBe(48);
  });

  it("deve criar controle com nextNumber padrão (1) quando não informado", async () => {
    expect(validUnitId).not.toBeNull();
    const result = await createControl({
      name: "Controle Teste Número Padrão",
      documentType: "decreto",
      unitId: validUnitId!,
      numberFormat: "sequencial",
      digits: 4,
      referenceYear: 2096,
      resetAnnually: false,
      createdBy: 1,
      // nextNumber omitido — deve usar padrão 1
    });
    const insertId = Number((result as any)[0]?.insertId ?? (result as any).insertId);
    expect(insertId).toBeGreaterThan(0);
    createdIds.push(insertId);

    const db = await requireDb();
    const rows = await db
      .select({ nextNumber: documentControls.nextNumber })
      .from(documentControls)
      .where(eq(documentControls.id, insertId))
      .limit(1);
    expect(rows[0]?.nextNumber).toBe(1);
  });
});
