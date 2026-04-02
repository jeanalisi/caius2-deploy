import mysql from 'mysql2/promise';
import fs from 'fs';
import { config } from 'dotenv';
config();

async function runMigration(conn, sqlFile, label) {
  const sql = fs.readFileSync(sqlFile, 'utf8');
  const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 5);
  let ok = 0, fail = 0;
  for (const stmt of stmts) {
    try {
      await conn.execute(stmt);
      ok++;
    } catch(e) {
      const msg = e.message || '';
      if (msg.includes('already exists') || msg.includes('Duplicate') || msg.includes('Multiple primary key')) {
        ok++; // já existe, ok
      } else {
        console.error(`${label} FAIL: ${stmt.substring(0,80)} -> ${msg}`);
        fail++;
      }
    }
  }
  console.log(`${label}: ok=${ok} fail=${fail}`);
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);

await runMigration(conn, '/tmp/migration_0004.sql', '0004_email_institucional');
await runMigration(conn, '/tmp/migration_0005.sql', '0005_caius_agent');

await conn.end();
console.log('Migrações concluídas!');
