import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(
    "ALTER TABLE `accounts` MODIFY COLUMN `channel` enum('whatsapp','instagram','email','web') NOT NULL"
  );
  console.log("✅ Migration aplicada: 'web' adicionado ao enum channel de accounts");
} catch (e) {
  if (e.code === "ER_DUP_ENTRY" || String(e.message).includes("Duplicate")) {
    console.log("⚠️  Já aplicada anteriormente, ignorando.");
  } else {
    throw e;
  }
} finally {
  await conn.end();
}
