import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const conn = await createConnection(url);

const sqls = [
  // organizational_units (pode já existir como orgUnits no CAIUS — criamos com nome diferente para evitar conflito)
  `CREATE TABLE IF NOT EXISTS \`doc_organizational_units\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`acronym\` varchar(50),
    \`type\` enum('secretaria','setor','gabinete','departamento','coordenacao','outro') NOT NULL,
    \`parentId\` int,
    \`active\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`doc_organizational_units_id\` PRIMARY KEY(\`id\`)
  )`,

  // document_controls
  `CREATE TABLE IF NOT EXISTS \`document_controls\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`documentType\` enum('oficio','memorando','decreto','lei','diario_oficial','contrato','portaria') NOT NULL,
    \`unitId\` int NOT NULL,
    \`prefix\` varchar(50),
    \`numberFormat\` enum('sequencial','ano_sequencial','sequencial_ano') NOT NULL DEFAULT 'sequencial',
    \`digits\` int NOT NULL DEFAULT 4,
    \`referenceYear\` int NOT NULL,
    \`resetAnnually\` boolean NOT NULL DEFAULT true,
    \`nextNumber\` int NOT NULL DEFAULT 1,
    \`active\` boolean NOT NULL DEFAULT true,
    \`createdBy\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`document_controls_id\` PRIMARY KEY(\`id\`)
  )`,

  // number_usages
  `CREATE TABLE IF NOT EXISTS \`number_usages\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`controlId\` int NOT NULL,
    \`number\` int NOT NULL,
    \`formattedNumber\` varchar(100) NOT NULL,
    \`documentDescription\` text,
    \`usedBy\` int NOT NULL,
    \`usedAt\` timestamp NOT NULL DEFAULT (now()),
    \`year\` int NOT NULL,
    CONSTRAINT \`number_usages_id\` PRIMARY KEY(\`id\`)
  )`,

  // audit_logs_controle (evitar conflito com audit_logs existente no CAIUS)
  `CREATE TABLE IF NOT EXISTS \`doc_audit_logs\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`controlId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`action\` enum('manual_number_change','control_created','control_updated','control_activated','control_deactivated','number_used') NOT NULL,
    \`previousValue\` text,
    \`newValue\` text,
    \`justification\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`doc_audit_logs_id\` PRIMARY KEY(\`id\`)
  )`,

  // doc_user_permissions (evitar conflito com userMenuPermissions do CAIUS)
  `CREATE TABLE IF NOT EXISTS \`doc_user_permissions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`canAccessOficios\` boolean NOT NULL DEFAULT false,
    \`canAccessMemorandos\` boolean NOT NULL DEFAULT false,
    \`canAccessDecretos\` boolean NOT NULL DEFAULT false,
    \`canAccessLeis\` boolean NOT NULL DEFAULT false,
    \`canAccessDiarioOficial\` boolean NOT NULL DEFAULT false,
    \`canAccessContratos\` boolean NOT NULL DEFAULT false,
    \`canAccessPortarias\` boolean NOT NULL DEFAULT false,
    \`grantedBy\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`doc_user_permissions_id\` PRIMARY KEY(\`id\`)
  )`,

  // doc_user_units
  `CREATE TABLE IF NOT EXISTS \`doc_user_units\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`unitId\` int NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`doc_user_units_id\` PRIMARY KEY(\`id\`)
  )`,
];

for (const sql of sqls) {
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/)?.[1];
  try {
    await conn.execute(sql);
    console.log(`✅ Tabela ${tableName} criada/verificada`);
  } catch (err) {
    console.error(`❌ Erro em ${tableName}:`, err.message);
  }
}

await conn.end();
console.log("Migration do módulo Controle concluída.");
