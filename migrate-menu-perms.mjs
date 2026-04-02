import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

await conn.execute(`CREATE TABLE IF NOT EXISTS \`userMenuPermissions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`menuKey\` varchar(128) NOT NULL,
  \`enabled\` boolean NOT NULL DEFAULT true,
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`userMenuPermissions_id\` PRIMARY KEY(\`id\`)
)`);

// Índices (ignorar erro se já existirem)
try { await conn.execute(`CREATE INDEX \`ump_user_menu_idx\` ON \`userMenuPermissions\` (\`userId\`,\`menuKey\`)`); } catch {}
try { await conn.execute(`CREATE INDEX \`ump_user_idx\` ON \`userMenuPermissions\` (\`userId\`)`); } catch {}

console.log("✅ Tabela userMenuPermissions criada com sucesso");
await conn.end();
process.exit(0);
