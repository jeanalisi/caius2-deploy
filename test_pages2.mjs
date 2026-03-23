import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

async function test(name, sql, params = []) {
  try {
    const [rows] = await conn.execute(sql, params);
    console.log(`  ✓ ${name} (${rows.length} rows)`);
    return true;
  } catch(e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    return false;
  }
}

console.log('=== TESTANDO QUERIES DAS PÁGINAS COM ERRO ===\n');

// /documents — getOfficialDocuments com JOIN
await test('OfficialDocuments - list with joins',
  `SELECT od.id, od.nup, od.type, od.number, od.title, od.status, od.isConfidential, od.aiGenerated, od.fileUrl, od.issuedAt, od.createdAt, od.updatedAt,
   u.id as userId, u.name as userName, u.email as userEmail,
   s.id as sectorId, s.name as sectorName
   FROM officialDocuments od
   LEFT JOIN users u ON od.authorId = u.id
   LEFT JOIN sectors s ON od.sectorId = s.id
   ORDER BY od.createdAt DESC LIMIT 50`
);

// /processes — getAdminProcesses com JOIN
await test('AdminProcesses - list with joins',
  `SELECT ap.id, ap.nup, ap.title, ap.type, ap.status, ap.priority, ap.isConfidential, ap.deadline, ap.concludedAt, ap.createdAt,
   s.id as sectorId, s.name as sectorName,
   u.id as userId, u.name as userName
   FROM adminProcesses ap
   LEFT JOIN sectors s ON ap.responsibleSectorId = s.id
   LEFT JOIN users u ON ap.responsibleUserId = u.id
   ORDER BY ap.createdAt DESC LIMIT 50`
);

// processDeadlineHistory
await test('ProcessDeadlineHistory - list',
  `SELECT id, processId, processNup, previousDeadline, newDeadline, reason, action, changedById, changedByName, createdAt FROM processDeadlineHistory LIMIT 10`
);

// electronicSignatures
await test('ElectronicSignatures - list',
  `SELECT id, documentId, nup, signerId, signerName, signerEmail, signerRole, ipAddress, documentHash, signedAt, createdAt FROM electronicSignatures LIMIT 10`
);

// documentTemplates
await test('DocumentTemplates - list',
  `SELECT id, name, type, content, variables, sectorId, createdById, isActive, createdAt, updatedAt FROM documentTemplates LIMIT 10`
);

// auditLogs
await test('AuditLogs - list',
  `SELECT id, userId, userName, nup, action, entity, entityId, details, ipAddress, aiAssisted, createdAt FROM auditLogs LIMIT 10`
);

// knowledgeArticles
await test('KnowledgeArticles - list',
  `SELECT id, title, slug, content, summary, isPublic, isActive, viewCount, sectorId, authorId, createdAt FROM knowledgeArticles LIMIT 10`
);

// serviceTypes com todas as colunas novas
await test('ServiceTypes - full columns',
  `SELECT id, name, serviceMode, externalUrl, isPublic, publicationStatus, purpose, whoCanRequest, cost, formOfService, responseChannel, importantNotes, faq, formTemplateId, isActive FROM serviceTypes LIMIT 10`
);

// serviceSubjects
await test('ServiceSubjects - list',
  `SELECT id, serviceTypeId, name, description, estimatedTime, documents, isActive FROM serviceSubjects LIMIT 10`
);

// protocols com join
await test('Protocols - list with joins',
  `SELECT p.id, p.nup, p.subject, p.status, p.priority, p.requesterName, p.requesterEmail, p.createdAt,
   u.name as agentName, s.name as sectorName
   FROM protocols p
   LEFT JOIN users u ON p.assignedAgentId = u.id
   LEFT JOIN sectors s ON p.assignedSectorId = s.id
   ORDER BY p.createdAt DESC LIMIT 50`
);

// ombudsmanManifestations
await test('OmbudsmanManifestations - list',
  `SELECT id, nup, type, subject, status, isAnonymous, requesterName, requesterEmail, createdAt FROM ombudsmanManifestations ORDER BY createdAt DESC LIMIT 50`
);

// tickets
await test('Tickets - list',
  `SELECT id, nup, title, status, priority, type, conversationId, createdById, assignedAgentId, assignedSectorId, dueDate, resolvedAt, createdAt FROM tickets ORDER BY createdAt DESC LIMIT 50`
);

// customModules
await test('CustomModules - list',
  `SELECT id, name, slug, description, icon, color, fields, isActive, createdAt FROM customModules LIMIT 10`
);

// customModuleRecords
await test('CustomModuleRecords - list',
  `SELECT id, moduleId, data, status, nup, createdById, assignedToId, createdAt FROM customModuleRecords LIMIT 10`
);

// workflowDefinitions
await test('WorkflowDefinitions - list',
  `SELECT id, name, description, serviceTypeId, isActive, createdAt FROM workflowDefinitions LIMIT 10`
);

// workflowInstances
await test('WorkflowInstances - list',
  `SELECT id, workflowId, entityType, entityId, nup, status, currentStepId, startedAt, completedAt, createdAt FROM workflowInstances LIMIT 10`
);

// verifiableDocuments
await test('VerifiableDocuments - list',
  `SELECT id, title, documentType, status, nup, issuerId, verificationCode, issuedAt, expiresAt, createdAt FROM verifiableDocuments LIMIT 10`
);

// documentSignatures
await test('DocumentSignatures - list',
  `SELECT id, verifiableDocumentId, nup, signerName, signerCpfMasked, status, signedAt, createdAt FROM documentSignatures LIMIT 10`
);

// institutionalConfig
await test('InstitutionalConfig - get',
  `SELECT * FROM institutionalConfig LIMIT 1`
);

// nupCounter
await test('NupCounter - get',
  `SELECT * FROM nupCounter LIMIT 1`
);

await conn.end();

console.log('\n=== FIM DOS TESTES ===');
