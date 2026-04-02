import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const tables = [
  { table: 'users', cols: ['name', 'email'] },
  { table: 'contacts', cols: ['name', 'email', 'phone'] },
  { table: 'conversations', cols: ['subject'] },
  { table: 'protocols', cols: ['requesterName', 'requesterEmail'] },
  { table: 'ombudsmanManifestations', cols: ['requesterName', 'requesterEmail'] },
  { table: 'tickets', cols: ['title', 'description'] },
  { table: 'orgUnits', cols: ['name'] },
  { table: 'sectors', cols: ['name'] },
];

let found = false;

for (const { table, cols } of tables) {
  for (const col of cols) {
    try {
      const [rows] = await conn.execute(
        `SELECT id, ${col} FROM ${table} WHERE LOWER(${col}) LIKE ? LIMIT 5`,
        ['%shandoria%']
      );
      if (rows.length > 0) {
        console.log(`ENCONTRADO em ${table}.${col}:`, rows);
        found = true;
      }
    } catch(e) {
      // coluna não existe, ignorar
    }
  }
}

if (!found) {
  console.log('Nome "shandoria" NÃO encontrado em nenhuma tabela do sistema.');
}

await conn.end();
