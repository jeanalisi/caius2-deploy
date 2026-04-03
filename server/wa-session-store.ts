/**
 * wa-session-store.ts
 * Persistência de sessões Baileys no banco TiDB/MySQL.
 *
 * A tabela `waSessions` é criada automaticamente na primeira execução
 * (CREATE TABLE IF NOT EXISTS), eliminando a dependência de migrações manuais.
 *
 * Usa BufferJSON.replacer/reviver para serialização correta de Buffers e
 * makeCacheableSignalKeyStore para evitar race conditions nas chaves Signal.
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";

// ─── Garantir que a tabela existe ────────────────────────────────────────────
let tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS waSessions (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        accountId   INT NOT NULL,
        sessionKey  VARCHAR(255) NOT NULL,
        sessionData LONGTEXT NOT NULL,
        createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_account_key (accountId, sessionKey),
        INDEX idx_accountId (accountId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    tableEnsured = true;
    console.log("[WASessionStore] Tabela waSessions verificada/criada.");
  } catch (err) {
    console.error("[WASessionStore] Erro ao criar tabela waSessions:", err);
  }
}

// ─── Helpers de acesso ao banco ───────────────────────────────────────────────
async function getSessionData(accountId: number, key: string): Promise<string | null> {
  await ensureTable();
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.execute(
      sql`SELECT sessionData FROM waSessions WHERE accountId = ${accountId} AND sessionKey = ${key} LIMIT 1`
    );
    const data = (rows as any)[0];
    if (Array.isArray(data) && data.length > 0) return data[0].sessionData as string;
    return null;
  } catch (err) {
    console.error(`[WASessionStore] Erro ao ler sessão "${key}":`, err);
    return null;
  }
}

async function setSessionData(accountId: number, key: string, value: string): Promise<void> {
  await ensureTable();
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(
      sql`INSERT INTO waSessions (accountId, sessionKey, sessionData)
          VALUES (${accountId}, ${key}, ${value})
          ON DUPLICATE KEY UPDATE sessionData = ${value}, updatedAt = CURRENT_TIMESTAMP`
    );
  } catch (err) {
    console.error(`[WASessionStore] Erro ao salvar sessão "${key}":`, err);
  }
}

async function deleteSessionData(accountId: number, key: string): Promise<void> {
  await ensureTable();
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(
      sql`DELETE FROM waSessions WHERE accountId = ${accountId} AND sessionKey = ${key}`
    );
  } catch (err) {
    console.error(`[WASessionStore] Erro ao deletar sessão "${key}":`, err);
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────
export async function clearAccountSession(accountId: number): Promise<void> {
  await ensureTable();
  const db = await getDb();
  if (!db) return;
  try {
    await db.execute(
      sql`DELETE FROM waSessions WHERE accountId = ${accountId}`
    );
    console.log(`[WASessionStore] Sessão da conta #${accountId} removida.`);
  } catch (err) {
    console.error(`[WASessionStore] Erro ao limpar sessão da conta #${accountId}:`, err);
  }
}

export async function hasAccountSession(accountId: number): Promise<boolean> {
  await ensureTable();
  const db = await getDb();
  if (!db) return false;
  try {
    const rows = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM waSessions WHERE accountId = ${accountId} AND sessionKey = 'creds'`
    );
    const data = (rows as any)[0];
    if (Array.isArray(data) && data.length > 0) {
      return Number(data[0].cnt) > 0;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * useAuthStateDB — equivalente ao useMultiFileAuthState do Baileys,
 * mas persiste no banco MySQL/TiDB em vez de no disco.
 *
 * Usa makeCacheableSignalKeyStore para cache em memória das chaves Signal,
 * evitando race conditions e melhorando a performance de mensagens.
 */
export async function useAuthStateDB(accountId: number) {
  const {
    initAuthCreds,
    BufferJSON,
    makeCacheableSignalKeyStore,
  } = await import("@whiskeysockets/baileys");

  // Carregar credenciais persistidas (ou inicializar novas)
  const credsRaw = await getSessionData(accountId, "creds");
  const creds = credsRaw
    ? JSON.parse(credsRaw, BufferJSON.reviver)
    : initAuthCreds();

  // Store de chaves Signal com acesso ao banco
  const rawKeyStore = {
    get: async (type: string, ids: string[]) => {
      const data: Record<string, any> = {};
      await Promise.all(
        ids.map(async (id) => {
          const raw = await getSessionData(accountId, `${type}:${id}`);
          if (raw) {
            data[id] = JSON.parse(raw, BufferJSON.reviver);
          }
        })
      );
      return data;
    },
    set: async (data: Record<string, Record<string, any>>) => {
      await Promise.all(
        Object.entries(data).flatMap(([type, entries]) =>
          Object.entries(entries).map(async ([id, value]) => {
            const key = `${type}:${id}`;
            if (value != null) {
              await setSessionData(accountId, key, JSON.stringify(value, BufferJSON.replacer));
            } else {
              await deleteSessionData(accountId, key);
            }
          })
        )
      );
    },
  };

  // Envolver com cache em memória para evitar race conditions Signal
  const keys = makeCacheableSignalKeyStore(rawKeyStore as any);

  const state = { creds, keys };

  const saveCreds = async () => {
    await setSessionData(
      accountId,
      "creds",
      JSON.stringify(state.creds, BufferJSON.replacer)
    );
  };

  return { state, saveCreds };
}
