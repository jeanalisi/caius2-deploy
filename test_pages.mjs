// Testa todas as procedures tRPC principais para verificar erros de banco
import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/caius2-deploy/.env' });

let conn;
const results = [];
let passed = 0, failed = 0;

async function test(name, query) {
  try {
    await conn.execute(query);
    console.log(`  ✓ ${name}`);
    results.push({ name, ok: true });
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    results.push({ name, ok: false, error: err.message });
    failed++;
  }
}

async function main() {
  conn = await createConnection(process.env.DATABASE_URL);
  
  console.log('\n=== TESTANDO QUERIES DAS PÁGINAS PRINCIPAIS ===\n');

  // Dashboard
  await test('Dashboard - conversations.stats', `SELECT status, COUNT(*) FROM conversations GROUP BY status`);
  await test('Dashboard - accounts.list', `SELECT id, channel, name, status FROM accounts LIMIT 10`);
  await test('Dashboard - users.agents', `SELECT id, name, isAgent, isAvailable FROM users WHERE isAgent = 1`);

  // Inbox / Conversas
  await test('Inbox - conversations.list com joins', `
    SELECT c.id, c.nup, c.status, c.channel, c.subject, c.assignedAgentId, c.assignedSectorId,
           ct.name as contactName, ct.phone, a.name as accountName
    FROM conversations c
    LEFT JOIN contacts ct ON c.contactId = ct.id
    LEFT JOIN accounts a ON c.accountId = a.id
    LIMIT 10
  `);
  await test('Inbox - messages.list', `SELECT id, conversationId, direction, type, content, deliveryStatus FROM messages LIMIT 10`);

  // Tickets
  await test('Tickets - list', `SELECT id, title, status, priority, conversationId, createdById, nup FROM tickets LIMIT 10`);

  // Protocolos
  await test('Protocols - list', `SELECT id, nup, type, status, subject, requesterName, channel FROM protocols LIMIT 10`);
  await test('Protocols - stats', `SELECT status, COUNT(*) FROM protocols GROUP BY status`);

  // Ouvidoria
  await test('Ombudsman - manifestations list', `SELECT id, nup, type, status, subject, requesterName, isAnonymous FROM ombudsmanManifestations LIMIT 10`);
  await test('Ombudsman - stats', `SELECT status, COUNT(*) FROM ombudsmanManifestations GROUP BY status`);

  // Gestão Pública - Tipos de Atendimento
  await test('ServiceTypes - list', `SELECT id, name, serviceMode, externalUrl, isPublic, publicationStatus, isActive FROM serviceTypes LIMIT 10`);
  await test('ServiceTypes - categories', `SELECT id, name, slug, isActive FROM serviceCategories LIMIT 10`);
  await test('ServiceTypes - subjects', `SELECT id, serviceTypeId, name, isActive FROM serviceSubjects LIMIT 10`);

  // Gestão Pública - Módulos Customizados (fields é JSON na tabela customModules, não tabela separada)
  await test('CustomModules - list', `SELECT id, name, slug, isActive, fields FROM customModules LIMIT 10`);
  await test('CustomModuleRecords - list', `SELECT id, moduleId, data, status FROM customModuleRecords LIMIT 10`);

  // Estrutura Organizacional
  await test('OrgUnits - list', `SELECT id, name, acronym, isActive FROM orgUnits LIMIT 10`);
  await test('Sectors - list', `SELECT id, name, code, isActive FROM sectors LIMIT 10`);
  await test('Positions - list', `SELECT id, name, code, isActive FROM positions LIMIT 10`);

  // Documentos (tabela é officialDocuments, não documents)
  await test('OfficialDocuments - list', `SELECT id, title, type, status, nup FROM officialDocuments LIMIT 10`);
  await test('DocumentTemplates - list', `SELECT id, name, type, content, isActive FROM documentTemplates LIMIT 10`);
  await test('VerifiableDocuments - list', `SELECT id, title, documentType, status FROM verifiableDocuments LIMIT 10`);
  await test('DocumentSignatures - list', `SELECT id, verifiableDocumentId, nup, signerName, signerCpfMasked, status FROM documentSignatures LIMIT 10`);

  // Workflow (colunas corretas do banco)
  await test('WorkflowDefinitions - list', `SELECT id, name, description, serviceTypeId, isActive FROM workflowDefinitions LIMIT 10`);
  await test('WorkflowInstances - list', `SELECT id, workflowId, entityType, entityId, nup, status FROM workflowInstances LIMIT 10`);

  // Base de Conhecimento
  await test('KnowledgeArticles - list', `SELECT id, title, slug, isPublic, isActive FROM knowledgeArticles LIMIT 10`);
  await test('KnowledgeCategories - list', `SELECT id, name, slug FROM knowledgeCategories LIMIT 10`);

  // Canais
  await test('Accounts - list com todos campos', `SELECT id, userId, channel, name, identifier, status, waQrCode, igUserId, imapHost, smtpHost, smtpSecure FROM accounts LIMIT 10`);
  await test('Tags - list', `SELECT id, name, color FROM tags LIMIT 10`);

  // Administração
  await test('Users - list', `SELECT id, name, email, role, profile, isAgent, isAvailable, sectorId FROM users LIMIT 10`);
  await test('Agents - list', `SELECT id, name, isAgent, isAvailable, sectorId FROM users WHERE isAgent = 1 LIMIT 10`);
  await test('AuditLogs - list', `SELECT id, userId, action, entity, entityId FROM auditLogs LIMIT 10`);

  // Configurações
  await test('InstitutionalConfig - get', `SELECT * FROM institutionalConfig LIMIT 1`);
  await test('DocumentTemplates (Templates page) - list', `SELECT id, name, type, content FROM documentTemplates LIMIT 10`);
  await test('NupCounter - get', `SELECT * FROM nupCounter LIMIT 1`);

  // Notificações
  await test('Notifications - list', `SELECT id, userId, type, title, body, relatedProtocolId, nup, isRead FROM notifications LIMIT 10`);

  // Chatbot
  await test('BotFlows - list', `SELECT id, accountId, name, isActive FROM botFlows LIMIT 10`);
  await test('BotNodes - list', `SELECT id, flowId, nodeType, title, message, sortOrder FROM botNodes LIMIT 10`);
  await test('BotSessions - list', `SELECT id, accountId, jid, flowId, currentNodeId, status FROM botSessions LIMIT 10`);

  // Relatórios
  await test('Reports - protocols by month', `SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) FROM protocols GROUP BY month LIMIT 12`);
  await test('Reports - conversations by channel', `SELECT channel, COUNT(*) FROM conversations GROUP BY channel`);

  // Central do Cidadão (público)
  await test('CentralCidadao - serviceTypes published', `SELECT id, name, serviceMode, externalUrl FROM serviceTypes WHERE publicationStatus = 'published' AND isActive = 1 LIMIT 10`);

  // Processos Administrativos
  await test('AdminProcesses - list', `SELECT id, nup, title, type, status FROM adminProcesses LIMIT 10`);
  // Formulários
  await test('FormTemplates - list', `SELECT id, name, isActive FROM formTemplates LIMIT 10`);
  // Assinaturas eletrônicas
  await test('ElectronicSignatures - list', `SELECT id, documentId, nup, signerName, signerEmail, signerRole, signedAt FROM electronicSignatures LIMIT 10`);

  await conn.end();

  console.log(`\n=== RESULTADO FINAL ===`);
  console.log(`✓ Passou: ${passed}`);
  console.log(`✗ Falhou: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed > 0) {
    console.log('\nFALHAS:');
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  } else {
    console.log('\n✅ Todas as queries das páginas estão funcionando!');
  }
}

main().catch(err => { console.error('ERRO FATAL:', err.message); process.exit(1); });
