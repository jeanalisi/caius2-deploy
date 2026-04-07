import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

const sql = readFileSync("drizzle/0009_harsh_valeria_richards.sql", "utf-8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

const conn = await createConnection(process.env.DATABASE_URL);
for (const stmt of statements) {
  console.log("Executing:", stmt.substring(0, 80) + "...");
  await conn.execute(stmt);
  console.log("✓ Done");
}
await conn.end();
console.log("Migration applied successfully!");
