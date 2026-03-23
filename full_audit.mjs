// Auditoria completa: tabelas faltantes, colunas faltantes, enums incorretos
import { createConnection } from 'mysql2/promise';
import { readFileSync, writeFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '/home/ubuntu/caius2-deploy/.env' });

const SCHEMA_TABLES = ['accounts','adminProcesses','agentStatus','aiProviders','aiUsageLogs','allocationHistory','attachmentConfigs','attachments','attendanceMetricsSnapshots','audioTranscriptions','auditLogs','botFlows','botNodes','botSessionLogs','botSessions','channelHealthLogs','channelSyncState','complianceEvents','contacts','contextHelp','conversationTags','conversationTransfers','conversations','customModuleRecords','customModules','deliveryAttempts','documentNumberSequences','documentReadLogs','documentSignatures','documentTemplates','documentVerificationLogs','documentVersions','electronicSignatures','formFieldOptions','formFields','formSubmissionValues','formSubmissions','formTemplates','geoAttachments','geoEvents','geoPoints','institutionalConfig','knowledgeArticles','knowledgeCategories','knowledgeTags','manifestationDeadlines','manifestationResponses','manifestationStatusHistory','manifestationTypes','messageEvents','messages','notifications','nupCounter','nupNotifications','officialDocuments','ombudsmanManifestations','onlineSessions','orgInvites','orgUnits','positions','processDeadlineHistory','protocols','queue','quickReplies','satisfactionSurveys','searchIndex','sectors','sensitiveAccessLogs','serviceCategories','serviceChecklists','serviceFaqs','servicePublications','serviceSubjects','serviceTypeDocuments','serviceTypeFields','serviceTypes','surveyAnswers','surveyDispatches','tags','tickets','tramitations','userAllocations','userRegistrations','users','verifiableDocuments','workflowDeadlines','workflowDefinitions','workflowEvents','workflowInstanceSteps','workflowInstances','workflowStepRules','workflowSteps','workflowTransitions'];

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  
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
  const schemaText = readFileSync('/home/ubuntu/caius2-deploy/drizzle/schema.ts', 'utf8');
  
  // Extrair blocos de tabela
  const tableBlocks = {};
  const tableRegex = /export const (\w+) = mysqlTable\("(\w+)"/g;
  let m;
  while ((m = tableRegex.exec(schemaText)) !== null) {
    const tableName = m[2];
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
    const colRegex = /^\s+(\w+):\s*(int|varchar|text|boolean|tinyint|timestamp|mysqlEnum|json|float|double|bigint|mediumtext|longtext)\s*\(/gm;
    let cm;
    while ((cm = colRegex.exec(block)) !== null) {
      const colName = cm[1];
      if (['table','primaryKey','unique','index','foreignKey'].includes(colName)) continue;
      schemaCols[tableName].push(colName);
    }
  }

  // 6. Comparar colunas
  console.log('\n=== COLUNAS FALTANDO POR TABELA ===');
  const fixes = [];
  let totalMissing = 0;
  
  for (const tableName of SCHEMA_TABLES) {
    if (!existing.has(tableName)) continue;
    const dbColNames = Object.keys(bankCols[tableName] || {});
    const schemaColNames = schemaCols[tableName] || [];
    const missingCols = schemaColNames.filter(c => !dbColNames.includes(c) && c !== 'id');
    if (missingCols.length > 0) {
      console.log(`\n  ${tableName}: faltam ${missingCols.length} colunas: ${missingCols.join(', ')}`);
      totalMissing += missingCols.length;
      fixes.push({ table: tableName, cols: missingCols });
    }
  }
  if (totalMissing === 0) console.log('Nenhuma coluna faltando!');
  else console.log(`\nTotal: ${totalMissing} colunas faltando em ${fixes.length} tabelas`);

  // 7. Verificar enums nas tabelas principais
  console.log('\n=== VERIFICAÇÃO DE ENUMS ===');
  const enumChecks = [
    { table: 'accounts', col: 'status', expected: ['connecting','connected','disconnected','error'] },
    { table: 'messages', col: 'deliveryStatus', expected: ['pending','sent','delivered','failed'] },
    { table: 'messages', col: 'direction', expected: ['inbound','outbound'] },
    { table: 'messages', col: 'type', expected: ['text','image','audio','video','document','location','sticker','template','interactive','reaction'] },
    { table: 'conversations', col: 'status', expected: ['open','pending','resolved','snoozed'] },
    { table: 'conversations', col: 'channel', expected: ['whatsapp','instagram','email'] },
    { table: 'conversations', col: 'priority', expected: ['low','normal','high','urgent'] },
    { table: 'protocols', col: 'status', expected: ['open','in_progress','pending','resolved','closed','cancelled'] },
    { table: 'protocols', col: 'type', expected: ['request','complaint','suggestion','compliment','information','ombudsman'] },
    { table: 'protocols', col: 'priority', expected: ['low','normal','high','urgent'] },
    { table: 'notifications', col: 'type', expected: ['info','success','warning','error','protocol','message','system'] },
    { table: 'users', col: 'role', expected: ['admin','user'] },
    { table: 'users', col: 'profile', expected: ['attendant','supervisor','manager','admin'] },
    { table: 'ombudsmanManifestations', col: 'status', expected: ['received','in_analysis','in_progress','pending_requester','resolved','closed','cancelled'] },
    { table: 'ombudsmanManifestations', col: 'type', expected: ['complaint','suggestion','compliment','information','request','denunciation'] },
    { table: 'serviceTypes', col: 'serviceMode', expected: ['form','external','info'] },
    { table: 'tickets', col: 'status', expected: ['open','in_progress','pending','resolved','closed'] },
    { table: 'tickets', col: 'priority', expected: ['low','normal','high','urgent'] },
  ];
  
  const enumIssues = [];
  for (const check of enumChecks) {
    if (!existing.has(check.table)) { console.log(`  SKIP ${check.table}.${check.col} (tabela não existe)`); continue; }
    const col = bankCols[check.table]?.[check.col];
    if (!col) { 
      console.log(`  FALTA ${check.table}.${check.col}`); 
      enumIssues.push(check);
      continue; 
    }
    // Extrair valores do enum do banco
    const bankVals = col.type.replace(/^enum\(/, '').replace(/\)$/, '').split(',').map(v => v.replace(/'/g, '').trim());
    const missing_vals = check.expected.filter(v => !bankVals.includes(v));
    const extra_vals = bankVals.filter(v => !check.expected.includes(v));
    if (missing_vals.length > 0 || extra_vals.length > 0) {
      console.log(`  DIVERGE ${check.table}.${check.col}:`);
      if (missing_vals.length > 0) console.log(`    faltam valores: ${missing_vals.join(', ')}`);
      if (extra_vals.length > 0) console.log(`    valores extras: ${extra_vals.join(', ')}`);
      enumIssues.push({ ...check, missing_vals, extra_vals, bankVals });
    } else {
      console.log(`  OK ${check.table}.${check.col}`);
    }
  }

  // 8. Verificar AUTO_INCREMENT nas tabelas principais
  console.log('\n=== VERIFICAÇÃO AUTO_INCREMENT ===');
  const autoIncIssues = [];
  for (const t of SCHEMA_TABLES) {
    if (!existing.has(t)) continue;
    const idCol = bankCols[t]?.['id'];
    if (!idCol) continue;
    if (!idCol.extra.includes('auto_increment')) {
      console.log(`  SEM AUTO_INCREMENT: ${t}`);
      autoIncIssues.push(t);
    }
  }
  if (autoIncIssues.length === 0) console.log('Todas as tabelas têm AUTO_INCREMENT!');

  // 9. Salvar relatório
  const report = { missing, fixes, enumIssues, autoIncIssues };
  writeFileSync('/home/ubuntu/audit_report.json', JSON.stringify(report, null, 2));
  console.log('\nRelatório salvo em /home/ubuntu/audit_report.json');
  console.log('\n=== RESUMO ===');
  console.log(`Tabelas faltando: ${missing.length}`);
  console.log(`Tabelas com colunas faltando: ${fixes.length}`);
  console.log(`Enums com divergências: ${enumIssues.length}`);
  console.log(`Tabelas sem AUTO_INCREMENT: ${autoIncIssues.length}`);
  
  await conn.end();
}

main().catch(err => { console.error('ERRO:', err.message); process.exit(1); });
