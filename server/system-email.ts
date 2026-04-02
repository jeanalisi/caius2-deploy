/**
 * system-email.ts
 *
 * Helper para obter a conta de e-mail padrão do sistema a partir das
 * variáveis de ambiente SYSTEM_EMAIL_*.
 *
 * Esta conta é usada como fallback para envio de notificações, protocolos
 * e comunicações automáticas quando nenhuma conta de e-mail está cadastrada
 * no banco de dados.
 */

import type { Account } from "../drizzle/schema";

/**
 * Retorna um objeto Account sintético construído a partir das variáveis
 * de ambiente SYSTEM_EMAIL_*. Retorna null se as credenciais essenciais
 * (host, user, password) não estiverem configuradas.
 */
export function getSystemEmailAccount(): Account | null {
  const host = process.env.SYSTEM_EMAIL_HOST;
  const user = process.env.SYSTEM_EMAIL_USER;
  const password = process.env.SYSTEM_EMAIL_PASSWORD;
  const port = parseInt(process.env.SYSTEM_EMAIL_PORT ?? "465", 10);
  const fromName = process.env.SYSTEM_EMAIL_FROM_NAME ?? "CAIUS — Atendimento Digital";

  if (!host || !user || !password) return null;

  // Porta 465 = SSL implícito; 587 = STARTTLS
  const secure = port === 465;

  return {
    id: 0,
    name: fromName,
    channel: "email",
    type: "email",
    isActive: true,
    smtpHost: host,
    smtpPort: port,
    smtpUser: user,
    smtpPassword: password,
    smtpSecure: secure ? 1 : 0,
    imapHost: host,
    imapPort: 993,
    imapUser: user,
    imapPassword: password,
    imapSecure: 1,
    imapMailbox: "INBOX",
    status: "connected",
    createdAt: new Date(),
    updatedAt: new Date(),
    // campos opcionais
    phoneNumber: null,
    apiKey: null,
    apiSecret: null,
    webhookUrl: null,
    webhookSecret: null,
    metadata: null,
    lastSyncAt: null,
    syncIntervalMinutes: 2,
    autoReplyEnabled: false,
    autoReplyTemplate: null,
    signature: null,
    description: "Conta de e-mail padrão do sistema (via variáveis de ambiente)",
    orgUnitId: null,
    sectorId: null,
  } as unknown as Account;
}

/**
 * Retorna a conta de e-mail padrão do sistema ou lança erro se não configurada.
 */
export function requireSystemEmailAccount(): Account {
  const account = getSystemEmailAccount();
  if (!account) {
    throw new Error(
      "E-mail padrão do sistema não configurado. " +
      "Defina SYSTEM_EMAIL_HOST, SYSTEM_EMAIL_USER e SYSTEM_EMAIL_PASSWORD nas variáveis de ambiente."
    );
  }
  return account;
}
