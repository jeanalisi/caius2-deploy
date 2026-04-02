/**
 * wa-session-store.ts
 * Persistência de sessões Baileys no banco TiDB.
 * Substitui useMultiFileAuthState (disco) por armazenamento em banco,
 * garantindo que a sessão sobreviva a reinicializações do servidor.
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";

// ─── Helpers de banco direto (sem schema Drizzle para evitar dependência circular) ─
async function getSessionData(accountId: number, key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.execute(
      sql`SELECT sessionData FROM waSessions WHERE accountId = ${accountId} AND sessionKey = ${key} LIMIT 1`
    );
    const data = (rows as any)[0];
    if (Array.isArray(data) && data.length > 0) return data[0].sessionData as string;
    return null;
  } catch {
    return null;
  }
}

async function setSessionData(accountId: number, key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(
      sql`INSERT INTO waSessions (accountId, sessionKey, sessionData)
          VALUES (${accountId}, ${key}, ${value})
          ON DUPLICATE KEY UPDATE sessionData = ${value}, updatedAt = CURRENT_TIMESTAMP`
    );
  } catch (err) {
    console.error(`[WASessionStore] Erro ao salvar sessão ${key}:`, err);
  }
}

async function deleteSessionData(accountId: number, key: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(
      sql`DELETE FROM waSessions WHERE accountId = ${accountId} AND sessionKey = ${key}`
    );
  } catch (err) {
    console.error(`[WASessionStore] Erro ao deletar sessão ${key}:`, err);
  }
}

async function getAllSessionKeys(accountId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.execute(
      sql`SELECT sessionKey FROM waSessions WHERE accountId = ${accountId}`
    );
    const data = (rows as any)[0];
    if (Array.isArray(data)) return data.map((r: any) => r.sessionKey as string);
    return [];
  } catch {
    return [];
  }
}

export async function clearAccountSession(accountId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(
      sql`DELETE FROM waSessions WHERE accountId = ${accountId}`
    );
    console.log(`[WASessionStore] Sessão da conta #${accountId} removida do banco.`);
  } catch (err) {
    console.error(`[WASessionStore] Erro ao limpar sessão da conta #${accountId}:`, err);
  }
}

export async function hasAccountSession(accountId: number): Promise<boolean> {
  const keys = await getAllSessionKeys(accountId);
  return keys.length > 0;
}

/**
 * Implementação de useAuthStateDB — equivalente ao useMultiFileAuthState do Baileys,
 * mas persiste no banco TiDB em vez de no disco.
 */
export async function useAuthStateDB(accountId: number) {
  const { initAuthCreds, BufferJSON } = await import("@whiskeysockets/baileys");

  // Carregar credenciais do banco
  const credsRaw = await getSessionData(accountId, "creds");
  const creds = credsRaw ? JSON.parse(credsRaw, BufferJSON.reviver) : initAuthCreds();

  const state = {
    creds,
    keys: {
      get: async (type: string, ids: string[]) => {
        const data: Record<string, any> = {};
        for (const id of ids) {
          const key = `${type}:${id}`;
          const raw = await getSessionData(accountId, key);
          if (raw) {
            // Usar BufferJSON.reviver para restaurar corretamente Buffers e objetos proto
            const value = JSON.parse(raw, BufferJSON.reviver);
            data[id] = value;
          }
        }
        return data;
      },
      set: async (data: Record<string, Record<string, any>>) => {
        for (const [type, entries] of Object.entries(data)) {
          for (const [id, value] of Object.entries(entries)) {
            const key = `${type}:${id}`;
            if (value) {
              await setSessionData(accountId, key, JSON.stringify(value, BufferJSON.replacer));
            } else {
              await deleteSessionData(accountId, key);
            }
          }
        }
      },
    },
  };

  const saveCreds = async () => {
    await setSessionData(accountId, "creds", JSON.stringify(state.creds, BufferJSON.replacer));
  };

  return { state, saveCreds };
}
