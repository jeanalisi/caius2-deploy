import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// Verificar cargos existentes
const [positions] = await conn.execute("SELECT COUNT(*) as total FROM positions");
console.log("Cargos no banco:", positions[0].total);

// Verificar estrutura da tabela
const [cols] = await conn.execute("DESCRIBE positions");
console.log("Colunas:", cols.map(c => c.Field).join(", "));

// Verificar unidades organizacionais
const [units] = await conn.execute("SELECT id, name, acronym FROM org_units LIMIT 20");
console.log("Unidades org:", JSON.stringify(units));

await conn.end();
