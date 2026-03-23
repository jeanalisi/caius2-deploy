#!/usr/bin/env node
// Auditoria completa: tabelas faltantes, colunas faltantes, enums incorretos
require('dotenv').config({ path: '/home/ubuntu/caius2-deploy/.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');

const SCHEMA_TABLES = ['accounts','adminProcesses','agentStatus','aiProviders','aiUsageLogs','allocationHistory','attachmentConfigs','attachments','attendanceMetricsSnapshots','audioTranscriptions','auditLogs','botFlows','botNodes','botSessionLogs','botSessions','channelHealthLogs','channelSyncState','complianceEvents','contacts','contextHelp','conversationTags','conversationTransfers','conversations','customModuleRecords','customModules','deliveryAttempts','documentNumberSequences','documentReadLogs','documentSignatures','documentTemplates','documentVerificationLogs','documentVersions','electronicSignatures','formFieldOptions','formFields','formSubmissionValues','formSubmissions','formTemplates','geoAttachments','geoEvents','geoPoints','institutionalConfig','knowledgeArticles','knowledgeCategories','knowledgeTags','manifestationDeadlines','manifestationResponses','manifestationStatusHistory','manifestationTypes','messageEvents','messages','notifications','nupCounter','nupNotifications','officialDocuments','ombudsmanManifestations','onlineSessions','orgInvites','orgUnits','positions','processDeadlineHistory','protocols','queue','quickReplies','satisfactionSurveys','searchIndex','sectors','sensitiveAccessLogs','serviceCategories','serviceChecklists','serviceFaqs','servicePublications','serviceSubjects','serviceTypeDocuments','serviceTypeFields','serviceTypes','surveyAnswers','surveyDispatches','tags','tickets','tramitations','userAllocations','userRegistrations','users','verifiableDocuments','workflowDeadlines','workflowDefinitions','workflowEvents','workflowInstanceSteps','workflowInstances','workflowStepRules','workflowSteps','workflowTransitions'];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // 1. Tabelas existentes no banco
  const [tableRows] = await conn.execute('SHOW TABLES');
  const existing = new Set(tableRows.map(t => Object.values(t)[0]));
  
  // 2. Tabelas faltando
  const missing = SCHEMA_TABLES.filter(t => !existing.has(t));
  console.log('\n=== TABELAS FALTANDO NO BANCO ===');
  if (missing.length === 0) console.log('Nenhuma!');
  else missing.forEach(t => console.log(' FALTA:', t));

  // 3. Para cada tabela existente, pegar colunas do banco
  const bankCols = {};
  for (const t of SCHEMA_TABLES) {
    if (!existing.has(t)) continue;
    const [cols] = await conn.execute(`DESCRIBE \`${t}\``);
    bankCols[t] = {};
    for (const c of cols) {
      bankCols[t][c.Field] = { type: c.Type, nullable: c.Null === 'YES', default: c.Default, extra: c.Extra };
    }
  }

  // 4. Ler schema Drizzle e extrair colunas por tabela
  const schemaText = fs.readFileSync('/home/ubuntu/caius2-deploy/drizzle/schema.ts', 'utf8');
  
  // Extrair blocos de tabela
  const tableBlocks = {};
  const tableRegex = /export const (\w+) = mysqlTable\("(\w+)"/g;
  let m;
  while ((m = tableRegex.exec(schemaText)) !== null) {
    const varName = m[1];
    const tableName = m[2];
    // Encontrar o bloco da tabela
    const start = m.index;
    let depth = 0;
    let i = start;
    let inBlock = false;
    while (i < schemaText.length) {
      if (schemaText[i] === '{') { depth++; inBlock = true; }
      if (schemaText[i] === '}') { depth--; }
      if (inBlock && depth === 0) { tableBlocks[tableName] = schemaText.slice(start, i+1); break; }
      i++;
    }
  }

  // 5. Extrair colunas do schema para cada tabela
  const schemaCols = {};
  for (const [tableName, block] of Object.entries(tableBlocks)) {
    schemaCols[tableName] = [];
    // Extrair nomes de colunas: padrão "colName": tipo(...)
    const colRegex = /(\w+):\s*(int|varchar|text|boolean|tinyint|timestamp|mysqlEnum|json|float|double|bigint|mediumtext|longtext)\s*\(/g;
    let cm;
    while ((cm = colRegex.exec(block)) !== null) {
      const colName = cm[1];
      if (['id','table','primaryKey','unique','index','foreignKey'].includes(colName)) continue;
      schemaCols[tableName].push(colName);
    }
  }

  // 6. Comparar colunas
  console.log('\n=== COLUNAS FALTANDO POR TABELA ===');
  const fixes = [];
  let totalMissing = 0;
  
  for (const tableName of SCHEMA_TABLES) {
    if (!existing.has(tableName)) continue;
    const dbCols = Object.keys(bankCols[tableName] || {});
    const schemaCols_ = schemaCols[tableName] || [];
    const missingCols = schemaCols_.filter(c => !dbCols.includes(c) && c !== 'id');
    if (missingCols.length > 0) {
      console.log(`\n  ${tableName}: faltam ${missingCols.length} colunas: ${missingCols.join(', ')}`);
      totalMissing += missingCols.length;
      fixes.push({ table: tableName, cols: missingCols });
    }
  }
  if (totalMissing === 0) console.log('Nenhuma coluna faltando!');
  else console.log(`\nTotal: ${totalMissing} colunas faltando em ${fixes.length} tabelas`);

  // 7. Verificar enums incorretos nas tabelas principais
  console.log('\n=== VERIFICAÇÃO DE ENUMS ===');
  const enumChecks = [
    { table: 'accounts', col: 'status', expected: "enum('connecting','connected','disconnected','error')" },
    { table: 'messages', col: 'deliveryStatus', expected: "enum('pending','sent','delivered','failed')" },
    { table: 'messages', col: 'direction', expected: "enum('inbound','outbound')" },
    { table: 'messages', col: 'type', expected: "enum('text','image','audio','video','document','location','sticker','template','interactive','reaction')" },
    { table: 'conversations', col: 'status', expected: "enum('open','pending','resolved','snoozed')" },
    { table: 'conversations', col: 'channel', expected: "enum('whatsapp','instagram','email')" },
    { table: 'protocols', col: 'status', expected: "enum('open','in_progress','pending','resolved','closed','cancelled')" },
    { table: 'protocols', col: 'type', expected: "enum('request','complaint','suggestion','compliment','information','ombudsman')" },
    { table: 'notifications', col: 'type', expected: "enum('info','success','warning','error','protocol','message','system')" },
    { table: 'users', col: 'role', expected: "enum('admin','user')" },
  ];
  
  for (const check of enumChecks) {
    if (!existing.has(check.table)) { console.log(`  SKIP ${check.table}.${check.col} (tabela não existe)`); continue; }
    const col = bankCols[check.table]?.[check.col];
    if (!col) { console.log(`  FALTA ${check.table}.${check.col}`); continue; }
    const actual = col.type.toLowerCase().replace(/\s/g, '');
    const exp = check.expected.toLowerCase().replace(/\s/g, '');
    if (actual !== exp) {
      console.log(`  DIVERGE ${check.table}.${check.col}:`);
      console.log(`    banco:   ${col.type}`);
      console.log(`    schema:  ${check.expected}`);
    } else {
      console.log(`  OK ${check.table}.${check.col}`);
    }
  }

  // 8. Salvar relatório
  const report = { missing, fixes, enumChecks };
  fs.writeFileSync('/home/ubuntu/audit_report.json', JSON.stringify(report, null, 2));
  console.log('\nRelatório salvo em /home/ubuntu/audit_report.json');
  
  await conn.end();
}

main().catch(err => { console.error('ERRO:', err.message); process.exit(1); });
