import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const typeToPosition = {
  gabinete: { name: 'Secretário(a)', level: 'secretario' },
  controladoria: { name: 'Controlador(a) Geral', level: 'secretario' },
  secretaria_executiva: { name: 'Secretário(a) Executivo(a)', level: 'secretario_executivo' },
  diretoria: { name: 'Diretor(a)', level: 'diretor' },
  departamento: { name: 'Chefe de Departamento', level: 'chefe' },
  coordenacao: { name: 'Coordenador(a)', level: 'coordenador' },
  gerencia: { name: 'Gerente', level: 'gerente' },
  supervisao: { name: 'Supervisor(a)', level: 'supervisor' },
  assessoria: { name: 'Assessor(a)', level: 'assessor_tecnico' },
  ouvidoria: { name: 'Ouvidor(a)', level: 'outro' },
  junta: { name: 'Presidente da Junta', level: 'outro' },
  secao: { name: 'Chefe de Seção', level: 'chefe' },
  nucleo: { name: 'Coordenador(a) de Núcleo', level: 'coordenador' },
  tesouraria: { name: 'Tesoureiro(a)', level: 'outro' },
  unidade: { name: 'Chefe de Unidade', level: 'chefe' },
};

const conn = await createConnection(process.env.DATABASE_URL);

const [unitsWithoutPositions] = await conn.execute(`
  SELECT o.id, o.name, o.type
  FROM orgUnits o
  LEFT JOIN positions p ON p.orgUnitId = o.id AND p.isActive = 1
  WHERE o.isActive = 1 AND p.id IS NULL
  ORDER BY o.type, o.name
`);

console.log(`Unidades sem cargo: ${unitsWithoutPositions.length}`);

let created = 0;
let skipped = 0;
for (const unit of unitsWithoutPositions) {
  const posConfig = typeToPosition[unit.type];
  if (!posConfig) {
    console.log(`Sem mapeamento para tipo: ${unit.type} - ${unit.name}`);
    skipped++;
    continue;
  }
  await conn.execute(
    'INSERT INTO positions (name, level, orgUnitId, isActive, isSeeded, canSign, canApprove) VALUES (?, ?, ?, 1, 1, 0, 0)',
    [posConfig.name, posConfig.level, unit.id]
  );
  console.log(`  ✓ [${unit.type}] ${unit.name} → ${posConfig.name}`);
  created++;
}

console.log(`\nCargos criados: ${created} | Ignorados: ${skipped}`);

const [total] = await conn.execute('SELECT COUNT(*) as c FROM positions WHERE isActive=1');
console.log(`Total de cargos ativos: ${total[0].c}`);

await conn.end();
