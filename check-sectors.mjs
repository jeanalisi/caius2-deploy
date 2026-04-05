import { requireDb } from "./server/db.ts";
import { sectors, users, protocols, orgUnits } from "./drizzle/schema.ts";
import { count, isNotNull } from "drizzle-orm";

const db = await requireDb();

const [sectorCount] = await db.select({ cnt: count() }).from(sectors);
console.log("sectors count:", sectorCount.cnt);

const [usersWithSector] = await db.select({ cnt: count() }).from(users).where(isNotNull(users.sectorId));
console.log("users with sectorId:", usersWithSector.cnt);

const [orgCount] = await db.select({ cnt: count() }).from(orgUnits);
console.log("orgUnits count:", orgCount.cnt);

// Mostrar alguns setores se existirem
if (sectorCount.cnt > 0) {
  const sample = await db.select().from(sectors).limit(5);
  console.log("Sample sectors:", JSON.stringify(sample, null, 2));
}

process.exit(0);
