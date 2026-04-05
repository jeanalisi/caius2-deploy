import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Verificar cargos existentes
const [existing] = await conn.execute("SELECT COUNT(*) as total FROM positions");
console.log("Cargos existentes:", existing[0].total);

// Verificar unidades organizacionais disponíveis
const [units] = await conn.execute("SELECT id, name, acronym FROM orgUnits WHERE isActive = 1 LIMIT 30");
console.log("Unidades org disponíveis:", units.length);
units.forEach(u => console.log(`  [${u.id}] ${u.acronym || ''} - ${u.name}`));

// Cargos genéricos municipais (sem orgUnitId — disponíveis para qualquer unidade)
const genericPositions = [
  { name: "Secretário Municipal", code: "SEC", level: "DAS-5", provisionType: "comissao", canSign: true, canApprove: true },
  { name: "Secretário Adjunto", code: "SEC-ADJ", level: "DAS-4", provisionType: "comissao", canSign: true, canApprove: true },
  { name: "Diretor de Departamento", code: "DIR-DEP", level: "DAS-3", provisionType: "comissao", canSign: true, canApprove: true },
  { name: "Coordenador", code: "COORD", level: "DAS-2", provisionType: "comissao", canSign: false, canApprove: true },
  { name: "Chefe de Seção", code: "CHF-SEC", level: "DAS-1", provisionType: "comissao", canSign: false, canApprove: false },
  { name: "Assessor Técnico", code: "ASSES-TEC", level: "DAS-2", provisionType: "comissao", canSign: false, canApprove: false },
  { name: "Analista Administrativo", code: "ANA-ADM", level: "efetivo", provisionType: "concurso", canSign: false, canApprove: false },
  { name: "Técnico Administrativo", code: "TEC-ADM", level: "efetivo", provisionType: "concurso", canSign: false, canApprove: false },
  { name: "Auxiliar Administrativo", code: "AUX-ADM", level: "efetivo", provisionType: "concurso", canSign: false, canApprove: false },
  { name: "Atendente de Serviços Públicos", code: "ATEND", level: "efetivo", provisionType: "concurso", canSign: false, canApprove: false },
  { name: "Agente Administrativo", code: "AGT-ADM", level: "efetivo", provisionType: "concurso", canSign: false, canApprove: false },
  { name: "Procurador Municipal", code: "PROC", level: "especial", provisionType: "concurso", canSign: true, canApprove: true },
  { name: "Controlador Interno", code: "CTRL", level: "especial", provisionType: "concurso", canSign: true, canApprove: true },
  { name: "Ouvidor Municipal", code: "OUVI", level: "DAS-3", provisionType: "comissao", canSign: true, canApprove: false },
  { name: "Fiscal Municipal", code: "FISC", level: "efetivo", provisionType: "concurso", canSign: false, canApprove: false },
];

// Verificar se já existem cargos genéricos (sem orgUnitId)
const [genericExisting] = await conn.execute("SELECT COUNT(*) as total FROM positions WHERE orgUnitId IS NULL");
if (genericExisting[0].total > 0) {
  console.log(`\nJá existem ${genericExisting[0].total} cargos genéricos. Pulando seed.`);
} else {
  console.log("\nInserindo cargos genéricos...");
  for (const pos of genericPositions) {
    await conn.execute(
      `INSERT INTO positions (name, code, orgUnitId, level, provisionType, canSign, canApprove, isActive, isSeeded, createdAt, updatedAt)
       VALUES (?, ?, NULL, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
      [pos.name, pos.code, pos.level, pos.provisionType, pos.canSign ? 1 : 0, pos.canApprove ? 1 : 0]
    );
    console.log(`  ✓ ${pos.name}`);
  }
  console.log(`\n${genericPositions.length} cargos inseridos com sucesso!`);
}

await conn.end();
