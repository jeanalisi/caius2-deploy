// Testa INSERT nas tabelas principais do sistema
import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';

config({ path: '/home/ubuntu/caius2-deploy/.env' });

let conn;
const results = [];
let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
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
  
  console.log('\n=== TESTANDO INSERTs NAS TABELAS PRINCIPAIS ===\n');

  // serviceTypes — a tabela que estava com erro
  await test('serviceTypes INSERT (form)', async () => {
    const [r] = await conn.execute(`
      INSERT INTO serviceTypes (name, description, serviceMode, isPublic, publicationStatus, purpose, whoCanRequest, cost, formOfService, responseChannel, importantNotes, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['Teste Serviço', 'Descrição teste', 'form', 0, 'draft', 'Propósito', 'Qualquer cidadão', 'Gratuito', 'Online', 'Email', 'Notas', 1]);
    const id = r.insertId;
    await conn.execute('DELETE FROM serviceTypes WHERE id = ?', [id]);
  });

  await test('serviceTypes INSERT (external com URL)', async () => {
    const [r] = await conn.execute(`
      INSERT INTO serviceTypes (name, serviceMode, externalUrl, isActive, publicationStatus)
      VALUES (?, ?, ?, ?, ?)
    `, ['Serviço Externo', 'external', 'https://exemplo.gov.br', 1, 'draft']);
    const id = r.insertId;
    await conn.execute('DELETE FROM serviceTypes WHERE id = ?', [id]);
  });

  // contacts
  await test('contacts INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO contacts (name, phone, email, cpfCnpj) VALUES (?, ?, ?, ?)
    `, ['Contato Teste', '83999990001', 'teste1@teste.com', '111.111.111-11']);
    const id = r.insertId;
    await conn.execute('DELETE FROM contacts WHERE id = ?', [id]);
  });

  // accounts
  await test('accounts INSERT (whatsapp)', async () => {
    const [r] = await conn.execute(`
      INSERT INTO accounts (userId, channel, name, status) VALUES (?, ?, ?, ?)
    `, [1, 'whatsapp', 'Conta Teste', 'disconnected']);
    const id = r.insertId;
    await conn.execute('DELETE FROM accounts WHERE id = ?', [id]);
  });

  // conversations
  await test('conversations INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO conversations (accountId, contactId, channel, externalId, nup, status, subject, lastMessageAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [1, 1, 'whatsapp', '5583999990001@s.whatsapp.net', 'TEST-2026-0001', 'open', 'Teste conversa']);
    const id = r.insertId;
    await conn.execute('DELETE FROM conversations WHERE id = ?', [id]);
  });

  // messages
  await test('messages INSERT (com deliveryStatus)', async () => {
    const [cr] = await conn.execute(`
      INSERT INTO conversations (accountId, contactId, channel, externalId, nup, status, subject, lastMessageAt)
      VALUES (1, 1, 'whatsapp', 'test_msg_jid_2', 'TEST-MSG-0001', 'open', 'Teste', NOW())
    `);
    const convId = cr.insertId;
    const [r] = await conn.execute(`
      INSERT INTO messages (conversationId, direction, type, content, senderName, deliveryStatus)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [convId, 'inbound', 'text', 'Mensagem de teste', 'Usuário Teste', 'delivered']);
    const msgId = r.insertId;
    await conn.execute('DELETE FROM messages WHERE id = ?', [msgId]);
    await conn.execute('DELETE FROM conversations WHERE id = ?', [convId]);
  });

  // protocols
  await test('protocols INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO protocols (nup, contactId, subject, requesterName, type, channel, status, priority, isConfidential)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['TEST-PROT-0001', 1, 'Protocolo Teste', 'Cidadão Teste', 'request', 'web', 'open', 'normal', 0]);
    const id = r.insertId;
    await conn.execute('DELETE FROM protocols WHERE id = ?', [id]);
  });

  // tickets — conversationId agora nullable
  await test('tickets INSERT (sem conversationId)', async () => {
    const [r] = await conn.execute(`
      INSERT INTO tickets (title, description, status, priority, nup)
      VALUES (?, ?, ?, ?, ?)
    `, ['Ticket Teste', 'Descrição do ticket', 'open', 'normal', 'TEST-TKT-0001']);
    const id = r.insertId;
    await conn.execute('DELETE FROM tickets WHERE id = ?', [id]);
  });

  // notifications — coluna é 'body' não 'content'
  await test('notifications INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO notifications (userId, type, title, body)
      VALUES (?, ?, ?, ?)
    `, [1, 'new_message', 'Notificação Teste', 'Conteúdo da notificação']);
    const id = r.insertId;
    await conn.execute('DELETE FROM notifications WHERE id = ?', [id]);
  });

  // ombudsmanManifestations — sem coluna 'channel'
  await test('ombudsmanManifestations INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO ombudsmanManifestations (nup, requesterName, type, subject, description, status, isAnonymous, isConfidential)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['TEST-OMB-0001', 'Cidadão Teste', 'complaint', 'Assunto Teste', 'Descrição', 'received', 0, 0]);
    const id = r.insertId;
    await conn.execute('DELETE FROM ombudsmanManifestations WHERE id = ?', [id]);
  });

  // sectors
  await test('sectors INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO sectors (name, code, isActive) VALUES (?, ?, ?)
    `, ['Setor Teste', 'ST001', 1]);
    const id = r.insertId;
    await conn.execute('DELETE FROM sectors WHERE id = ?', [id]);
  });

  // serviceCategories — precisa de slug
  await test('serviceCategories INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO serviceCategories (name, slug, isActive) VALUES (?, ?, ?)
    `, ['Categoria Teste', 'categoria-teste-' + Date.now(), 1]);
    const id = r.insertId;
    await conn.execute('DELETE FROM serviceCategories WHERE id = ?', [id]);
  });

  // serviceSubjects
  await test('serviceSubjects INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO serviceSubjects (serviceTypeId, name, description, isActive)
      VALUES (?, ?, ?, ?)
    `, [1, 'Assunto Teste', 'Descrição do assunto', 1]);
    const id = r.insertId;
    await conn.execute('DELETE FROM serviceSubjects WHERE id = ?', [id]);
  });

  // users
  await test('users SELECT (verificar estrutura)', async () => {
    await conn.execute('SELECT id, name, email, role, profile, isAgent, isAvailable FROM users LIMIT 1');
  });

  // orgUnits — coluna é 'acronym' não 'code'
  await test('orgUnits INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO orgUnits (name, acronym, isActive) VALUES (?, ?, ?)
    `, ['Unidade Teste', 'UT', 1]);
    const id = r.insertId;
    await conn.execute('DELETE FROM orgUnits WHERE id = ?', [id]);
  });

  // knowledgeArticles — sem coluna 'status', tem 'isActive'
  await test('knowledgeArticles INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO knowledgeArticles (title, slug, content, isPublic, isActive)
      VALUES (?, ?, ?, ?, ?)
    `, ['Artigo Teste', 'artigo-teste-' + Date.now(), 'Conteúdo do artigo', 0, 1]);
    const id = r.insertId;
    await conn.execute('DELETE FROM knowledgeArticles WHERE id = ?', [id]);
  });

  // botFlows — sem coluna 'triggerKeywords'
  await test('botFlows INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO botFlows (accountId, name, isActive)
      VALUES (?, ?, ?)
    `, [1, 'Fluxo Teste', 0]);
    const id = r.insertId;
    await conn.execute('DELETE FROM botFlows WHERE id = ?', [id]);
  });

  // botNodes — usa title (NOT NULL) + sortOrder
  await test('botNodes INSERT', async () => {
    const [fr] = await conn.execute(`INSERT INTO botFlows (accountId, name, isActive) VALUES (1, 'Fluxo Temp', 0)`);
    const flowId = fr.insertId;
    const [r] = await conn.execute(`
      INSERT INTO botNodes (flowId, nodeType, title, message, sortOrder)
      VALUES (?, ?, ?, ?, ?)
    `, [flowId, 'menu', 'Nó Principal', 'Mensagem de boas-vindas', 0]);
    const id = r.insertId;
    await conn.execute('DELETE FROM botNodes WHERE id = ?', [id]);
    await conn.execute('DELETE FROM botFlows WHERE id = ?', [flowId]);
  });

  // botSessions — usa jid, não contactPhone
  await test('botSessions INSERT', async () => {
    const [fr] = await conn.execute(`INSERT INTO botFlows (accountId, name, isActive) VALUES (1, 'Fluxo Temp 2', 0)`);
    const flowId = fr.insertId;
    const [nr] = await conn.execute(`INSERT INTO botNodes (flowId, nodeType, title, message, sortOrder) VALUES (?, 'menu', 'Nó Temp', 'Teste', 0)`, [flowId]);
    const nodeId = nr.insertId;
    const [r] = await conn.execute(`
      INSERT INTO botSessions (accountId, jid, flowId, currentNodeId, status, lastInteractionAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [1, '5583999990002@s.whatsapp.net', flowId, nodeId, 'active']);
    const id = r.insertId;
    await conn.execute('DELETE FROM botSessions WHERE id = ?', [id]);
    await conn.execute('DELETE FROM botNodes WHERE id = ?', [nodeId]);
    await conn.execute('DELETE FROM botFlows WHERE id = ?', [flowId]);
  });

  // waSessions (persistência de sessão WhatsApp)
  await test('waSessions INSERT', async () => {
    const [r] = await conn.execute(`
      INSERT INTO waSessions (accountId, sessionKey, sessionData)
      VALUES (?, ?, ?)
    `, [1, 'test-key-' + Date.now(), JSON.stringify({ test: true })]);
    const id = r.insertId;
    await conn.execute('DELETE FROM waSessions WHERE id = ?', [id]);
  });

  // nupCounter
  await test('nupCounter SELECT', async () => {
    await conn.execute('SELECT * FROM nupCounter LIMIT 1');
  });

  // institutionalConfig
  await test('institutionalConfig SELECT', async () => {
    await conn.execute('SELECT * FROM institutionalConfig LIMIT 1');
  });

  await conn.end();

  console.log(`\n=== RESULTADO FINAL ===`);
  console.log(`✓ Passou: ${passed}`);
  console.log(`✗ Falhou: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed > 0) {
    console.log('\nFALHAS:');
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n✅ Todas as tabelas estão funcionando corretamente!');
  }
}

main().catch(err => { console.error('ERRO FATAL:', err.message); process.exit(1); });
