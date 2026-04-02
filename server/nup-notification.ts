/**
 * Helper de Notificação Automática ao Gerar NUP
 *
 * Regras de negócio:
 * - Toda geração de NUP dispara notificação pelo canal de origem do contato
 * - Canal da notificação = canal de origem do atendimento
 * - Mensagem contém: confirmação, NUP, assunto/tipo, link de acompanhamento, próximos passos
 * - Envio registrado em log (nupNotifications)
 */

import crypto from "crypto";
import { sendEmail } from "./email";
import { getAllAccounts, createNupNotification, updateNupNotificationStatus } from "./db";
import { getSystemEmailAccount } from "./system-email";

const APP_URL = process.env.VITE_APP_URL || "https://cac.itabaiana.pb.gov.br";

/**
 * Gera um token seguro de rastreamento para o link de acompanhamento
 */
export function generateTrackingToken(nup: string, contactId?: number): string {
  const payload = `${nup}:${contactId ?? "anon"}:${Date.now()}`;
  return crypto.createHash("sha256").update(payload).digest("hex").substring(0, 32);
}

/**
 * Gera o link de acompanhamento do atendimento
 */
export function generateTrackingLink(nup: string, token: string): string {
  return `${APP_URL}/consulta?nup=${encodeURIComponent(nup)}&token=${token}`;
}

/**
 * Monta a mensagem de notificação
 */
function buildNotificationMessage(params: {
  nup: string;
  subject?: string;
  serviceTypeName?: string;
  trackingLink: string;
  channel: "email" | "whatsapp" | "instagram" | "sms" | "system";
}): { subject: string; text: string; html: string } {
  const { nup, subject, serviceTypeName, trackingLink, channel } = params;
  const typeLabel = serviceTypeName ?? "Atendimento";
  const subjectLabel = subject ? ` — ${subject}` : "";

  const emailSubject = `Atendimento registrado com sucesso — NUP: ${nup}`;

  const text = `Seu atendimento foi registrado com sucesso.

NUP: ${nup}
Tipo: ${typeLabel}${subjectLabel}

Para acompanhar o andamento ou consultar o histórico, acesse:
${trackingLink}

Próximos passos:
- Guarde o número do protocolo (NUP) para consultas futuras.
- Você será notificado sobre atualizações pelo mesmo canal.
- Em caso de dúvidas, acesse o link acima ou entre em contato com a unidade responsável.`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Protocolo Registrado</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #1e3a5f; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 20px;">✅ Atendimento Registrado</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
    <p style="color: #374151; font-size: 16px;">Seu atendimento foi registrado com sucesso.</p>
    <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-size: 14px; color: #0369a1; font-weight: bold;">Número do Protocolo (NUP)</p>
      <p style="margin: 8px 0 0; font-size: 24px; font-weight: bold; color: #0c4a6e; letter-spacing: 2px;">${nup}</p>
    </div>
    <p style="color: #6b7280; font-size: 14px;"><strong>Tipo:</strong> ${typeLabel}${subjectLabel}</p>
    <div style="margin: 24px 0; text-align: center;">
      <a href="${trackingLink}" style="background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: bold;">
        Acompanhar Atendimento
      </a>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 13px;"><strong>Próximos passos:</strong></p>
    <ul style="color: #6b7280; font-size: 13px; padding-left: 20px;">
      <li>Guarde o número do protocolo (NUP) para consultas futuras.</li>
      <li>Você será notificado sobre atualizações pelo mesmo canal.</li>
      <li>Em caso de dúvidas, acesse o link acima ou entre em contato com a unidade responsável.</li>
    </ul>
  </div>
  <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
    Este é um e-mail automático. Não responda a esta mensagem.
  </p>
</body>
</html>`;

  return { subject: emailSubject, text, html };
}

/**
 * Envia notificação automática ao gerar NUP
 * Registra o envio na tabela nupNotifications
 */
export async function sendNupNotification(params: {
  nup: string;
  entityType: "protocol" | "conversation" | "ombudsman" | "process";
  entityId: number;
  contactId?: number;
  channel: "email" | "whatsapp" | "instagram" | "sms" | "system";
  recipientAddress?: string;  // email, phone, igHandle
  subject?: string;
  serviceTypeName?: string;
  orgId?: number;
}): Promise<{ success: boolean; notificationId: number; trackingLink: string }> {
  const { nup, entityType, entityId, contactId, channel, recipientAddress, subject, serviceTypeName } = params;

  // Gerar token e link de rastreamento
  const token = generateTrackingToken(nup, contactId);
  const trackingLink = generateTrackingLink(nup, token);

  // Montar mensagem
  const message = buildNotificationMessage({ nup, subject, serviceTypeName, trackingLink, channel });

  // Criar registro de notificação (status: pending)
  const notificationId = await createNupNotification({
    nup,
    entityType,
    entityId,
    contactId,
    channel,
    recipientAddress,
    content: message.text,
    trackingLink,
    trackingToken: token,
    status: "pending",
  });

  // Tentar enviar pelo canal
  try {
    if (channel === "email" && recipientAddress) {
      const accounts = await getAllAccounts();
      const dbEmailAccount = accounts.find((a: any) => a.type === "email" && a.isActive);
      const emailAccount = dbEmailAccount ?? getSystemEmailAccount();

      if (!emailAccount) {
        await updateNupNotificationStatus(notificationId, "skipped", "Nenhuma conta de e-mail configurada");
        return { success: false, notificationId, trackingLink };
      }

      await sendEmail(emailAccount, recipientAddress, message.subject, message.text, message.html);

      await updateNupNotificationStatus(notificationId, "sent");
      return { success: true, notificationId, trackingLink };
    }

    if (channel === "whatsapp" && recipientAddress) {
      // WhatsApp: envia via API da conta conectada (implementação futura via webhook)
      // Por ora, registra como "skipped" com instrução
      await updateNupNotificationStatus(notificationId, "skipped", "Envio WhatsApp via API pendente de implementação");
      return { success: false, notificationId, trackingLink };
    }

    if (channel === "instagram" && recipientAddress) {
      // Instagram: envia via DM (implementação futura)
      await updateNupNotificationStatus(notificationId, "skipped", "Envio Instagram via API pendente de implementação");
      return { success: false, notificationId, trackingLink };
    }

    // Canal não suportado ou sem endereço
    await updateNupNotificationStatus(notificationId, "skipped", `Canal ${channel} não suportado ou endereço não informado`);
    return { success: false, notificationId, trackingLink };

  } catch (error: any) {
    await updateNupNotificationStatus(notificationId, "failed", error?.message ?? "Erro desconhecido");
    return { success: false, notificationId, trackingLink };
  }
}
