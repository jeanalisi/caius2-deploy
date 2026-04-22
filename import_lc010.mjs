/**
 * Script de importação — Lei Complementar 010/2025
 * Cria cargos vinculados às unidades organizacionais e importa servidores da planilha
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';

const db = await mysql.createConnection(process.env.DATABASE_URL);

// ─── 1. Buscar todas as unidades organizacionais ───────────────────────────────
const [orgUnits] = await db.execute('SELECT id, name, acronym, type FROM orgUnits WHERE isActive = 1 ORDER BY level, name');
console.log(`\n📋 ${orgUnits.length} unidades organizacionais encontradas`);

// Mapa nome → id para lookup rápido
const orgByName = {};
const orgByAcronym = {};
for (const u of orgUnits) {
  orgByName[u.name.toLowerCase().trim()] = u.id;
  if (u.acronym) orgByAcronym[u.acronym.toLowerCase().trim()] = u.id;
}

// ─── 2. Buscar positions existentes ───────────────────────────────────────────
const [existingPositions] = await db.execute('SELECT id, name, orgUnitId FROM positions');
const positionKey = (name, orgUnitId) => `${name.toLowerCase().trim()}::${orgUnitId ?? 'null'}`;
const positionMap = {};
for (const p of existingPositions) {
  positionMap[positionKey(p.name, p.orgUnitId)] = p.id;
}

// ─── 3. Definição dos cargos por unidade (LC 010/2025) ────────────────────────
// Mapeamento: nome do cargo → { orgUnitName, level, provisionType, legalRef, vacancies }
const cargosLC010 = [
  // Gabinete do Prefeito
  { name: 'Chefe de Gabinete do Prefeito', orgUnit: 'Gabinete do Prefeito', level: 'chefe', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Secretário Pessoal do Prefeito', orgUnit: 'Gabinete do Prefeito', level: 'assessor_especial', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Assessor de Comunicação', orgUnit: 'Gabinete do Prefeito', level: 'assessor_tecnico', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Telefonista', orgUnit: 'Gabinete do Prefeito', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Vigilante', orgUnit: 'Gabinete do Prefeito', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },

  // Gabinete do Vice-Prefeito
  { name: 'Secretário Pessoal do Vice-Prefeito', orgUnit: 'Gabinete do Vice-Prefeito', level: 'assessor_especial', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },

  // Procuradoria Geral do Município
  { name: 'Procurador Geral do Município', orgUnit: 'Procuradoria Geral do Município', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Subprocurador-Geral Jurídico-Administrativo', orgUnit: 'Procuradoria Geral do Município', level: 'secretario_executivo', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Subprocurador-Geral de Termos, Licitações e Contratos', orgUnit: 'Procuradoria Geral do Município', level: 'secretario_executivo', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Procurador Municipal', orgUnit: 'Procuradoria Geral do Município', level: 'assessor_tecnico', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },

  // Controladoria Geral
  { name: 'Controlador Geral do Município', orgUnit: 'Controladoria Geral do Município', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Auditor de Controle Interno', orgUnit: 'Controladoria Geral do Município', level: 'assessor_tecnico', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 3 },

  // Secretaria de Planejamento e Gestão Estratégica
  { name: 'Secretário Municipal de Planejamento e Gestão Estratégica', orgUnit: 'Secretaria de Planejamento e Gestão Estratégica', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Secretário Executivo do Orçamento Democrático Municipal', orgUnit: 'Secretaria de Planejamento e Gestão Estratégica', level: 'secretario_executivo', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Supervisor de Controle', orgUnit: 'Secretaria de Planejamento e Gestão Estratégica', level: 'supervisor', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Supervisor de Suprimentos', orgUnit: 'Secretaria de Planejamento e Gestão Estratégica', level: 'supervisor', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Técnico em Contabilidade', orgUnit: 'Secretaria de Planejamento e Gestão Estratégica', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 3 },

  // Secretaria de Finanças
  { name: 'Secretário Municipal de Finanças, Arrecadação e Tributos', orgUnit: 'Secretaria Municipal de Finanças, Arrecadação e Tributos', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Tesoureiro Geral', orgUnit: 'Secretaria Municipal de Finanças, Arrecadação e Tributos', level: 'diretor', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Técnico em Contabilidade', orgUnit: 'Secretaria Municipal de Finanças, Arrecadação e Tributos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Fiscal Tributário', orgUnit: 'Secretaria Municipal de Finanças, Arrecadação e Tributos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 10 },

  // Secretaria de Saúde
  { name: 'Secretário Municipal de Saúde', orgUnit: 'Secretaria Municipal de Saúde', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Médico', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 30 },
  { name: 'Enfermeiro', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 30 },
  { name: 'Técnico de Enfermagem', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 50 },
  { name: 'Agente Comunitário de Saúde', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 100 },
  { name: 'Agente de Combate às Endemias', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 30 },
  { name: 'Dentista', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 15 },
  { name: 'Fisioterapeuta', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Farmacêutico', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Psicólogo', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Nutricionista', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Assistente Social', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Técnico em Radiologia', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Terapeuta Ocupacional', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 3 },
  { name: 'Veterinário', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 2 },
  { name: 'Vigilante', orgUnit: 'Secretaria Municipal de Saúde', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 10 },

  // Secretaria de Educação
  { name: 'Secretário Municipal de Educação', orgUnit: 'Secretaria Municipal de Educação', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Professor', orgUnit: 'Secretaria Municipal de Educação', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 200 },
  { name: 'Diretor de Escola', orgUnit: 'Secretaria Municipal de Educação', level: 'diretor', prov: 'designacao', ref: 'LC 010/2025', vacancies: 30 },
  { name: 'Supervisor Escolar', orgUnit: 'Secretaria Municipal de Educação', level: 'supervisor', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 10 },
  { name: 'Merendeira', orgUnit: 'Secretaria Municipal de Educação', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 50 },
  { name: 'Auxiliar de Serviços Gerais', orgUnit: 'Secretaria Municipal de Educação', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 50 },
  { name: 'Supervisor de Almoxarifado', orgUnit: 'Secretaria Municipal de Educação', level: 'supervisor', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Motorista', orgUnit: 'Secretaria Municipal de Educação', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 20 },
  { name: 'Vigilante', orgUnit: 'Secretaria Municipal de Educação', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 20 },

  // Secretaria de Assistência Social
  { name: 'Secretário Municipal de Assistência Social', orgUnit: 'Secretaria Municipal de Assistência Social', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Assistente Social', orgUnit: 'Secretaria Municipal de Assistência Social', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 15 },
  { name: 'Psicólogo', orgUnit: 'Secretaria Municipal de Assistência Social', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Visitador', orgUnit: 'Secretaria Municipal de Assistência Social', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 10 },
  { name: 'Cuidador Social', orgUnit: 'Secretaria Municipal de Assistência Social', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 10 },
  { name: 'Educador Social', orgUnit: 'Secretaria Municipal de Assistência Social', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 10 },
  { name: 'Vigilante', orgUnit: 'Secretaria Municipal de Assistência Social', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },

  // Secretaria de Infraestrutura
  { name: 'Secretário Municipal de Infraestrutura e Serviços Públicos', orgUnit: 'Secretaria Municipal de Infraestrutura e Serviços Públicos', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Engenheiro Civil', orgUnit: 'Secretaria Municipal de Infraestrutura e Serviços Públicos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Arquiteto', orgUnit: 'Secretaria Municipal de Infraestrutura e Serviços Públicos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 3 },
  { name: 'Servente de Pedreiro', orgUnit: 'Secretaria Municipal de Infraestrutura e Serviços Públicos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 20 },
  { name: 'Operador de Máquinas', orgUnit: 'Secretaria Municipal de Infraestrutura e Serviços Públicos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 10 },
  { name: 'Motorista', orgUnit: 'Secretaria Municipal de Infraestrutura e Serviços Públicos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 15 },
  { name: 'Tratorista', orgUnit: 'Secretaria Municipal de Infraestrutura e Serviços Públicos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Vigilante', orgUnit: 'Secretaria Municipal de Infraestrutura e Serviços Públicos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Zelador', orgUnit: 'Secretaria Municipal de Infraestrutura e Serviços Públicos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 3 },

  // Secretaria de Agricultura
  { name: 'Secretário Municipal de Agricultura e Desenvolvimento Rural', orgUnit: 'Secretaria Municipal de Agricultura e Desenvolvimento Rural', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Agrônomo', orgUnit: 'Secretaria Municipal de Agricultura e Desenvolvimento Rural', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 3 },
  { name: 'Técnico Agrícola', orgUnit: 'Secretaria Municipal de Agricultura e Desenvolvimento Rural', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Tratorista', orgUnit: 'Secretaria Municipal de Agricultura e Desenvolvimento Rural', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Supervisor do Serviço de Inspeção Municipal', orgUnit: 'Secretaria Municipal de Agricultura e Desenvolvimento Rural', level: 'supervisor', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },

  // Secretaria de Transportes
  { name: 'Secretário Municipal de Transportes, Estradas e Rodagens', orgUnit: 'Secretaria Municipal de Transportes, Estradas e Rodagens', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Motorista', orgUnit: 'Secretaria Municipal de Transportes, Estradas e Rodagens', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 20 },
  { name: 'Tratorista', orgUnit: 'Secretaria Municipal de Transportes, Estradas e Rodagens', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Vigilante', orgUnit: 'Secretaria Municipal de Transportes, Estradas e Rodagens', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },

  // Secretaria de Desenvolvimento Econômico
  { name: 'Secretário Municipal de Desenvolvimento Econômico, Inovação e Turismo', orgUnit: 'Secretaria Municipal de Desenvolvimento Econômico, Inovação e Turismo', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },

  // Secretaria de Cultura
  { name: 'Secretário Municipal de Cultura', orgUnit: 'Secretaria Municipal de Cultura', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },

  // Secretaria de Meio Ambiente
  { name: 'Secretário Municipal de Meio Ambiente, Sustentabilidade e Recursos Hídricos', orgUnit: 'Secretaria Municipal de Meio Ambiente, Sustentabilidade e Recursos Hídricos', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },

  // Superintendência de Mobilidade Urbana
  { name: 'Superintendente Executivo de Mobilidade Urbana', orgUnit: 'Superintendência Executiva de Mobilidade Urbana', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },

  // Casa Civil
  { name: 'Secretário da Casa Civil', orgUnit: 'Casa Civil', level: 'secretario', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },

  // Departamento de Recursos Humanos (RH)
  { name: 'Diretor de Recursos Humanos', orgUnit: 'Departamento de Recursos Humanos', level: 'diretor', prov: 'comissao', ref: 'LC 010/2025', vacancies: 1 },
  { name: 'Analista de Recursos Humanos', orgUnit: 'Departamento de Recursos Humanos', level: 'assessor_tecnico', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
  { name: 'Auxiliar Administrativo', orgUnit: 'Departamento de Recursos Humanos', level: 'outro', prov: 'efetivo', ref: 'LC 010/2025', vacancies: 5 },
];

// ─── 4. Inserir cargos ────────────────────────────────────────────────────────
console.log('\n📝 Criando cargos da LC 010/2025...');
let cargosCreated = 0;
let cargosSkipped = 0;
const newPositionMap = {};

for (const cargo of cargosLC010) {
  // Encontrar a unidade organizacional
  let orgUnitId = null;
  const orgNameLower = cargo.orgUnit.toLowerCase().trim();
  
  // Busca exata
  if (orgByName[orgNameLower]) {
    orgUnitId = orgByName[orgNameLower];
  } else {
    // Busca parcial
    for (const [name, id] of Object.entries(orgByName)) {
      if (name.includes(orgNameLower.substring(0, 20)) || orgNameLower.includes(name.substring(0, 20))) {
        orgUnitId = id;
        break;
      }
    }
  }

  const key = positionKey(cargo.name, orgUnitId);
  if (positionMap[key]) {
    cargosSkipped++;
    newPositionMap[`${cargo.name}::${cargo.orgUnit}`] = positionMap[key];
    continue;
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO positions (name, orgUnitId, level, provisionType, legalRef, vacancies, canSign, canApprove, isActive, isSeeded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        cargo.name,
        orgUnitId,
        cargo.level,
        cargo.prov,
        cargo.ref,
        cargo.vacancies,
        ['secretario', 'secretario_executivo', 'diretor', 'coordenador'].includes(cargo.level) ? 1 : 0,
        ['secretario', 'secretario_executivo', 'diretor'].includes(cargo.level) ? 1 : 0,
      ]
    );
    const newId = result.insertId;
    newPositionMap[`${cargo.name}::${cargo.orgUnit}`] = newId;
    cargosCreated++;
    if (orgUnitId) {
      console.log(`  ✅ ${cargo.name} → ${cargo.orgUnit} (id=${newId})`);
    } else {
      console.log(`  ⚠️  ${cargo.name} → unidade não encontrada: "${cargo.orgUnit}" (id=${newId})`);
    }
  } catch (e) {
    console.log(`  ❌ Erro ao criar "${cargo.name}": ${e.message}`);
  }
}

console.log(`\n✅ Cargos criados: ${cargosCreated} | Já existiam: ${cargosSkipped}`);

// ─── 5. Importar servidores da planilha ───────────────────────────────────────
console.log('\n👥 Importando servidores da planilha...');

const content = readFileSync('/home/ubuntu/upload/FolhadePagamento.xls', 'utf-8');
const lines = content.split('\n').filter(l => l.trim());
const headers = lines[0].split('\t');

// Mapeamento de cargos da planilha → cargos da LC 010/2025
const cargoMapping = {
  'VIGILANTE TEMP': 'Vigilante',
  'VIGILANTE': 'Vigilante',
  'AGENTE COMUNIT DE SAUDE(EF)': 'Agente Comunitário de Saúde',
  'AGENTE COMUNIT DE SAUDE(TMP)': 'Agente Comunitário de Saúde',
  'AGENTE DE COMBATE AS ENDEMIAS': 'Agente de Combate às Endemias',
  'AGENTE DE COMBATE AS ENDEMIAS(TMP)': 'Agente de Combate às Endemias',
  'PROFESSOR(A)': 'Professor',
  'PROFESSOR(A) TEMP': 'Professor',
  'PROFESSOR': 'Professor',
  'MERENDEIRA': 'Merendeira',
  'MERENDEIRA TEMP': 'Merendeira',
  'AUXILIAR DE SERVIÇOS GERAIS': 'Auxiliar de Serviços Gerais',
  'AUXILIAR DE SERV GERAIS': 'Auxiliar de Serviços Gerais',
  'AUXILIAR DE SERV GERAIS TEMP': 'Auxiliar de Serviços Gerais',
  'MOTORISTA': 'Motorista',
  'MOTORISTA TEMP': 'Motorista',
  'SERVENTE DE PEDREIRO': 'Servente de Pedreiro',
  'OPERADOR DE MAQUINAS': 'Operador de Máquinas',
  'OPERADOR DE MAQUINAS TEMP': 'Operador de Máquinas',
  'TRATORISTA': 'Tratorista',
  'TECNICO DE ENFERMAGEM': 'Técnico de Enfermagem',
  'TECNICO DE ENFERMAGEM(TMP)': 'Técnico de Enfermagem',
  'TECNICO EM ENFERMAGEM': 'Técnico de Enfermagem',
  'ENFERMEIRO(A)': 'Enfermeiro',
  'ENFERMEIRO(A) TEMP': 'Enfermeiro',
  'ENFERMEIRO': 'Enfermeiro',
  'MEDICO(A)': 'Médico',
  'MEDICO(A) TEMP': 'Médico',
  'MEDICO': 'Médico',
  'DENTISTA': 'Dentista',
  'DENTISTA TEMP': 'Dentista',
  'FISIOTERAPEUTA': 'Fisioterapeuta',
  'FISIOTERAPEUTA-TEMP': 'Fisioterapeuta',
  'FARMACEUTICO(A)': 'Farmacêutico',
  'PSICOLOGO(A)': 'Psicólogo',
  'PSICOLOGO(A) TEMP': 'Psicólogo',
  'NUTRICIONISTA': 'Nutricionista',
  'ASSISTENTE SOCIAL': 'Assistente Social',
  'ASSISTENTE SOCIAL TEMP': 'Assistente Social',
  'TECNICO EM RADIOLOGIA-TMP': 'Técnico em Radiologia',
  'TERAPEUTA OCUPACIONAL': 'Terapeuta Ocupacional',
  'VETERINARIO': 'Veterinário',
  'VISITADOR': 'Visitador',
  'CUIDADOR SOCIAL': 'Cuidador Social',
  'EDUCADOR SOCIAL': 'Educador Social',
  'TECNICO EM CONTABILIDADE': 'Técnico em Contabilidade',
  'FISCAL TRIBUTARIO': 'Fiscal Tributário',
  'FISCAL TRIBUTÁRIO': 'Fiscal Tributário',
  'TESOUREIRO GERAL': 'Tesoureiro Geral',
  'SUPERVISOR DE ALMOXARIFADO': 'Supervisor de Almoxarifado',
  'SUPERVISOR ESCOLAR': 'Supervisor Escolar',
  'SUPERVISOR(A) ESCOLAR TEMP': 'Supervisor Escolar',
  'SUPERVISOR(A)': 'Supervisor Escolar',
  'TECNICO AGRICOLA': 'Técnico Agrícola',
  'AGRONOMO': 'Agrônomo',
  'PROCURADOR MUNICIPAL': 'Procurador Municipal',
  'TELEFONISTA': 'Telefonista',
  'ZELADOR': 'Zelador',
  'SECRETÁRIO-CHEFE DE GABINETE': 'Chefe de Gabinete do Prefeito',
  'SECRETÁRIO PESSOAL DO VICE-PREFEITO': 'Secretário Pessoal do Vice-Prefeito',
  'VICE-PREFEITO': null, // cargo eletivo, não importar
  'PREFEITO': null,
};

// Mapeamento de secretarias da planilha → nomes das unidades organizacionais
const secretariaMapping = {
  'GABINETE DO PREFEITO': 'Gabinete do Prefeito',
  'GABINETE DO VICE PREFEITO': 'Gabinete do Vice-Prefeito',
  'PROCURADORIA GERAL DO MUNICIPIO': 'Procuradoria Geral do Município',
  'CONTROLAD GERAL DO MUNICIPIO': 'Controladoria Geral do Município',
  'SECR CHEFE DE GABINETE': 'Gabinete do Prefeito',
  'SECR MUN DE ASSISTENCIA SOCIAL-SEMAS': 'Secretaria Municipal de Assistência Social',
  'SECR MUN DE DESENV ECONOMICO, INOV E TUR-SEDEC': 'Secretaria Municipal de Desenvolvimento Econômico, Inovação e Turismo',
  'SECR MUN DE EDUCAÇÃO-SEDUC': 'Secretaria Municipal de Educação',
  'SECR MUN DE FINANCAS ARREC. E TRIBUTOS-SEFAT': 'Secretaria Municipal de Finanças, Arrecadação e Tributos',
  'SECR MUN DE INFRA ESTRUTURA E SERV PUBLICOS': 'Secretaria Municipal de Infraestrutura e Serviços Públicos',
  'SECR MUN DE SAUDE-SMS': 'Secretaria Municipal de Saúde',
  'SECRETARIA DA CASA CIVIL - SCC': 'Casa Civil',
  'SECRETARIA DE AGRICULTURA E DESENV RURAL-SEMAGRI': 'Secretaria Municipal de Agricultura e Desenvolvimento Rural',
  'SECRETARIA DE INFRAESTRUTURA E SERVIÇOS PÚBLICOS - SEINFRA': 'Secretaria Municipal de Infraestrutura e Serviços Públicos',
  'SECRETARIA DE MEIO AMBIENTE, SUSTENTABILIDADE E RECURSOS HÍDRICOS-SEMAM': 'Secretaria Municipal de Meio Ambiente, Sustentabilidade e Recursos Hídricos',
  'SECRETARIA DE PLANEJ. E GESTÃO ESTRAT. SEPLAN': 'Secretaria de Planejamento e Gestão Estratégica',
  'SECRETARIA DE TRANSP EST E ROD.-SETRANS': 'Secretaria Municipal de Transportes, Estradas e Rodagens',
  'SECRETARIA DE TRANSPORTES, ESTRADAS E RODAGENS-SETRANS': 'Secretaria Municipal de Transportes, Estradas e Rodagens',
  'SECRETARIA MUN. DE CULTURA - SECULT': 'Secretaria Municipal de Cultura',
  'SUPERINT EXECUTIVA DA MOB URBANA-SEMOB': 'Superintendência Executiva de Mobilidade Urbana',
};

// Buscar positions recém-criadas
const [allPositions] = await db.execute('SELECT id, name, orgUnitId FROM positions WHERE isActive = 1');
const positionLookup = {};
for (const p of allPositions) {
  const key = p.name.toLowerCase().trim();
  if (!positionLookup[key]) positionLookup[key] = [];
  positionLookup[key].push({ id: p.id, orgUnitId: p.orgUnitId });
}

let servidoresCreated = 0;
let servidoresSkipped = 0;
let servidoresNoMatch = 0;

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t');
  if (cols.length < 4) continue;

  const matricula = cols[1]?.trim();
  const nome = cols[2]?.trim();
  const cargoOriginal = cols[3]?.trim().toUpperCase();
  const secretariaOriginal = cols[4]?.trim();

  if (!nome || !cargoOriginal) continue;

  // Verificar se o cargo está mapeado para a LC 010/2025
  const cargoMapeado = cargoMapping[cargoOriginal];
  if (cargoMapeado === undefined) {
    // Cargo não mapeado — tentar correspondência parcial
    servidoresNoMatch++;
    continue;
  }
  if (cargoMapeado === null) {
    // Cargo eletivo — pular
    continue;
  }

  // Encontrar a unidade organizacional
  const secretariaMapeada = secretariaMapping[secretariaOriginal] ?? secretariaOriginal;
  let orgUnitId = orgByName[secretariaMapeada.toLowerCase().trim()];
  
  if (!orgUnitId) {
    // Busca parcial
    for (const [name, id] of Object.entries(orgByName)) {
      if (secretariaMapeada.toLowerCase().includes(name.substring(0, 15)) || name.includes(secretariaMapeada.toLowerCase().substring(0, 15))) {
        orgUnitId = id;
        break;
      }
    }
  }

  // Encontrar o position ID
  const positionsForCargo = positionLookup[cargoMapeado.toLowerCase().trim()] ?? [];
  let positionId = null;
  
  if (positionsForCargo.length > 0) {
    // Preferir o cargo vinculado à mesma unidade
    const match = positionsForCargo.find(p => p.orgUnitId === orgUnitId);
    positionId = match ? match.id : positionsForCargo[0].id;
  }

  if (!orgUnitId) {
    servidoresNoMatch++;
    continue;
  }

  // Verificar se já existe
  const [existing] = await db.execute(
    'SELECT id FROM publicServants WHERE matricula = ? AND isActive = 1',
    [matricula]
  );
  if (existing.length > 0) {
    servidoresSkipped++;
    continue;
  }

  try {
    await db.execute(
      `INSERT INTO publicServants (name, matricula, orgUnitId, positionId, isPublic, legalBasis, isActive)
       VALUES (?, ?, ?, ?, 1, ?, 1)`,
      [nome, matricula || null, orgUnitId, positionId, `LC 010/2025 — ${cargoMapeado}`]
    );
    servidoresCreated++;
  } catch (e) {
    console.log(`  ❌ Erro ao inserir "${nome}": ${e.message}`);
  }
}

console.log(`\n✅ Servidores importados: ${servidoresCreated}`);
console.log(`⏭️  Já existiam: ${servidoresSkipped}`);
console.log(`⚠️  Sem correspondência na LC: ${servidoresNoMatch}`);

// ─── 6. Vincular serviços RH à unidade de RH ─────────────────────────────────
console.log('\n🔗 Vinculando serviços RH à estrutura organizacional...');

// Buscar unidade de RH
const [rhUnit] = await db.execute("SELECT id FROM orgUnits WHERE name LIKE '%Recursos Humanos%' AND isActive = 1 LIMIT 1");
if (rhUnit.length > 0) {
  const rhOrgUnitId = rhUnit[0].id;
  const [rhServices] = await db.execute("SELECT id, name FROM serviceTypes WHERE name LIKE 'RH -%' AND published = 1");
  
  let linked = 0;
  for (const svc of rhServices) {
    try {
      await db.execute(
        'INSERT IGNORE INTO serviceTypeOrgUnits (serviceTypeId, orgUnitId) VALUES (?, ?)',
        [svc.id, rhOrgUnitId]
      );
      linked++;
    } catch (e) {}
  }
  console.log(`  ✅ ${linked} serviços RH vinculados à unidade ${rhOrgUnitId}`);
} else {
  console.log('  ⚠️  Unidade de RH não encontrada');
}

// ─── 7. Resumo final ──────────────────────────────────────────────────────────
const [totalCargos] = await db.execute("SELECT COUNT(*) as n FROM positions WHERE isActive = 1");
const [totalServants] = await db.execute("SELECT COUNT(*) as n FROM publicServants WHERE isActive = 1");
const [totalLinks] = await db.execute("SELECT COUNT(*) as n FROM serviceTypeOrgUnits");

console.log('\n═══════════════════════════════════════');
console.log('📊 RESUMO FINAL:');
console.log(`  Cargos ativos no banco: ${totalCargos[0].n}`);
console.log(`  Servidores públicos importados: ${totalServants[0].n}`);
console.log(`  Vínculos serviço↔unidade: ${totalLinks[0].n}`);
console.log('═══════════════════════════════════════\n');

await db.end();
