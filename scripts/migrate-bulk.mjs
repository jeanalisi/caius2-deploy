import mysql2 from 'mysql2/promise';

const conn = await mysql2.createConnection(process.env.DATABASE_URL);

await conn.execute(`CREATE TABLE IF NOT EXISTS \`bulkCampaigns\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`accountId\` int NOT NULL,
  \`message\` text NOT NULL,
  \`status\` enum('draft','running','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
  \`totalCount\` int NOT NULL DEFAULT 0,
  \`sentCount\` int NOT NULL DEFAULT 0,
  \`failedCount\` int NOT NULL DEFAULT 0,
  \`delaySeconds\` int NOT NULL DEFAULT 3,
  \`scheduledAt\` timestamp NULL,
  \`startedAt\` timestamp NULL,
  \`completedAt\` timestamp NULL,
  \`createdById\` int NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY(\`id\`)
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS \`bulkRecipients\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`campaignId\` int NOT NULL,
  \`phone\` varchar(64) NOT NULL,
  \`name\` varchar(255),
  \`customMessage\` text,
  \`status\` enum('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  \`errorMessage\` text,
  \`sentAt\` timestamp NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY(\`id\`)
)`);

console.log('✅ Tables bulkCampaigns and bulkRecipients created');
await conn.end();
