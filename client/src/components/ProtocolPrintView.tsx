/**
 * ProtocolPrintView.tsx
 * Componente de impressão/exportação PDF do protocolo.
 * Inclui: NUP, dados do protocolo, solicitante/contato, histórico de tramitações,
 * transcrição completa da conversa e chancela com QR Code.
 */
import { useRef } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useOrgConfig } from "@/hooks/useOrgConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TramitationItem {
  tramitation: {
    id: number;
    action: string;
    note?: string | null;
    createdAt: Date | string;
  };
  fromUser?: { name: string } | null;
}

interface ConversationMessage {
  id: number;
  direction: string;
  content?: string | null;
  type?: string | null;
  senderName?: string | null;
  createdAt: Date | string;
}

interface ProtocolData {
  protocol: {
    id: number;
    nup: string;
    subject: string;
    description?: string | null;
    type: string;
    channel: string;
    priority: string;
    status: string;
    isConfidential: boolean;
    requesterName?: string | null;
    requesterEmail?: string | null;
    requesterPhone?: string | null;
    requesterCpfCnpj?: string | null;
    createdAt: Date | string;
    deadline?: Date | string | null;
  };
  sector?: { name: string } | null;
  responsible?: { name: string } | null;
  creator?: { name: string } | null;
  contact?: { name?: string | null; phone?: string | null; email?: string | null; cpf?: string | null } | null;
  conversation?: { id: number; externalId?: string | null; channel?: string | null } | null;
  conversationMessages?: ConversationMessage[];
}

interface VerifiableDoc {
  verificationKey: string;
  verificationUrl?: string | null;
  nup?: string | null;
  title: string;
  documentType: string;
  issuingUnit?: string | null;
  issuedAt: Date | string;
  status: string;
  signatures?: Array<{
    id: number;
    signerName: string;
    signerRole?: string | null;
    signerUnit?: string | null;
    signatureType: string;
    status: string;
    signedAt: Date | string;
    accessCode: string;
  }>;
}

interface ProtocolPrintViewProps {
  protocolData: ProtocolData;
  tramitations: TramitationItem[];
  verifiableDoc?: VerifiableDoc | null;
  appTitle?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_analysis: "Em Análise",
  pending_docs: "Pendente de Documentos",
  in_progress: "Em Andamento",
  concluded: "Concluído",
  archived: "Arquivado",
};

const TYPE_LABELS: Record<string, string> = {
  request: "Solicitação",
  complaint: "Reclamação",
  information: "Informação",
  suggestion: "Sugestão",
  praise: "Elogio",
  ombudsman: "Ouvidoria",
  esic: "e-SIC",
  administrative: "Administrativo",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
  web: "Portal Web",
  phone: "Telefone",
  in_person: "Presencial",
};

const ACTION_LABELS: Record<string, string> = {
  forward: "Encaminhado",
  return: "Devolvido",
  assign: "Atribuído",
  conclude: "Concluído",
  archive: "Arquivado",
  reopen: "Reaberto",
  comment: "Comentário",
  status_change: "Status Alterado",
};

const SIG_TYPE_LABELS: Record<string, string> = {
  institutional: "Assinatura Eletrônica Institucional",
  advanced: "Assinatura Eletrônica Avançada",
  qualified: "Assinatura Qualificada (ICP-Brasil)",
};

function fmt(d: Date | string): string {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("pt-BR");
}

// ─── Print Window ─────────────────────────────────────────────────────────────

function buildPrintHtml(
  protocolData: ProtocolData,
  tramitations: TramitationItem[],
  verifiableDoc: VerifiableDoc | null | undefined,
  appTitle: string,
): string {
  const { protocol, sector, responsible, creator, contact, conversation, conversationMessages } = protocolData;
  const verifyUrl = verifiableDoc?.verificationUrl
    ?? `${window.location.origin}/verificar/${verifiableDoc?.verificationKey ?? ""}`;

  const tramRows = tramitations.map((t) => `
    <tr>
      <td>${fmt(t.tramitation.createdAt)}</td>
      <td>${ACTION_LABELS[t.tramitation.action] ?? t.tramitation.action}</td>
      <td>${t.fromUser?.name ?? "—"}</td>
      <td>${t.tramitation.note ?? "—"}</td>
    </tr>
  `).join("");

  // Transcrição da conversa — filtra mensagens sem conteúdo e localização
  const msgs = (conversationMessages ?? []).filter((m) => m.content && m.type !== "location");
  const msgRows = msgs.map((m) => {
    const dir = m.direction === "outbound" ? "Atendente" : (m.senderName ?? "Cidadão");
    const dirColor = m.direction === "outbound" ? "#1a3a6b" : "#166534";
    const safeContent = (m.content ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `
      <tr>
        <td style="white-space:nowrap;font-size:9px">${fmt(m.createdAt)}</td>
        <td style="font-weight:600;color:${dirColor};white-space:nowrap">${dir}</td>
        <td style="white-space:pre-wrap">${safeContent}</td>
      </tr>`;
  }).join("");

  const sigRows = (verifiableDoc?.signatures ?? []).map((s) => `
    <tr>
      <td>${s.signerName}</td>
      <td>${s.signerRole ?? "—"}</td>
      <td>${s.signerUnit ?? "—"}</td>
      <td>${SIG_TYPE_LABELS[s.signatureType] ?? s.signatureType}</td>
      <td>${fmt(s.signedAt)}</td>
      <td style="font-family:monospace;font-size:10px">${s.accessCode}</td>
    </tr>
  `).join("");

  const qrSvgId = verifiableDoc ? `
    <div id="qr-placeholder" style="width:80px;height:80px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#666;text-align:center;">
      QR Code<br/>${verifiableDoc.verificationKey?.slice(0, 8)}...
    </div>
  ` : "";

  // Dados do solicitante: combina protocolo + contato vinculado
  const reqName = protocol.requesterName ?? contact?.name;
  const reqCpf = protocol.requesterCpfCnpj ?? contact?.cpf;
  const reqEmail = protocol.requesterEmail ?? contact?.email;
  const reqPhone = protocol.requesterPhone ?? contact?.phone;

  const channelLabel = CHANNEL_LABELS[conversation?.channel ?? protocol.channel] ?? (conversation?.channel ?? protocol.channel);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Protocolo ${protocol.nup}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20mm 20mm 15mm 20mm; }
    h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    h2 { font-size: 13px; font-weight: bold; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; color: #333; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; border-bottom: 2px solid #1a3a6b; padding-bottom: 10px; }
    .header-left { flex: 1; }
    .nup-badge { display: inline-block; background: #1a3a6b; color: #fff; font-family: monospace; font-size: 13px; font-weight: bold; padding: 4px 12px; border-radius: 4px; margin-bottom: 6px; }
    .status-badge { display: inline-block; background: #e8f0fe; color: #1a3a6b; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 10px; border: 1px solid #1a3a6b; margin-left: 8px; }
    .subject { font-size: 14px; font-weight: bold; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 8px; }
    .field { display: flex; gap: 4px; }
    .field-label { color: #666; min-width: 90px; }
    .field-value { font-weight: 500; }
    .description-box { background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 8px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px; }
    th { background: #1a3a6b; color: #fff; padding: 5px 6px; text-align: left; font-size: 10px; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .msg-outbound td:nth-child(2) { color: #1a3a6b; }
    .msg-inbound td:nth-child(2) { color: #166534; }
    .chancela { border: 2px solid #1a3a6b; border-radius: 6px; padding: 12px; margin-top: 20px; page-break-inside: avoid; }
    .chancela-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .chancela-title { font-size: 12px; font-weight: bold; color: #1a3a6b; text-transform: uppercase; letter-spacing: 0.5px; }
    .chancela-body { display: flex; gap: 16px; }
    .chancela-info { flex: 1; }
    .chancela-qr { width: 80px; flex-shrink: 0; }
    .key-box { background: #f0f4ff; border: 1px solid #c0d0f0; border-radius: 4px; padding: 4px 8px; font-family: monospace; font-size: 10px; color: #1a3a6b; margin: 4px 0; word-break: break-all; }
    .chancela-text { font-size: 9px; color: #555; line-height: 1.4; margin-top: 6px; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9px; color: #888; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- Cabeçalho institucional -->
  <div class="header">
    <div class="header-left">
      <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${appTitle} — Plataforma Pública Omnichannel</div>
      <div class="nup-badge">${protocol.nup}</div>
      <span class="status-badge">${STATUS_LABELS[protocol.status] ?? protocol.status}</span>
      <div class="subject">${protocol.subject}</div>
    </div>
    <div style="text-align:right;font-size:9px;color:#666;">
      <div>Emitido em: ${fmt(new Date())}</div>
      <div>Abertura: ${fmtDate(protocol.createdAt)}</div>
      ${protocol.deadline ? `<div>Prazo: ${fmtDate(protocol.deadline)}</div>` : ""}
    </div>
  </div>

  <!-- Informações do protocolo -->
  <h2>Informações do Protocolo</h2>
  <div class="grid">
    <div class="field"><span class="field-label">Tipo:</span><span class="field-value">${TYPE_LABELS[protocol.type] ?? protocol.type}</span></div>
    <div class="field"><span class="field-label">Canal:</span><span class="field-value">${channelLabel}</span></div>
    <div class="field"><span class="field-label">Prioridade:</span><span class="field-value">${PRIORITY_LABELS[protocol.priority] ?? protocol.priority}</span></div>
    <div class="field"><span class="field-label">Setor:</span><span class="field-value">${sector?.name ?? "—"}</span></div>
    <div class="field"><span class="field-label">Responsável:</span><span class="field-value">${responsible?.name ?? "—"}</span></div>
    <div class="field"><span class="field-label">Criado por:</span><span class="field-value">${creator?.name ?? "—"}</span></div>
    ${conversation?.externalId ? `<div class="field"><span class="field-label">ID Conversa:</span><span class="field-value" style="font-family:monospace">${conversation.externalId}</span></div>` : ""}
    ${protocol.isConfidential ? `<div class="field"><span class="field-label">Sigilo:</span><span class="field-value" style="color:#b91c1c;font-weight:bold">SIGILOSO</span></div>` : ""}
  </div>

  ${protocol.description ? `
  <h2>Descrição</h2>
  <div class="description-box">${protocol.description.replace(/<[^>]+>/g, " ").trim()}</div>
  ` : ""}

  ${(reqName || reqEmail) ? `
  <h2>Dados do Solicitante</h2>
  <div class="grid">
    ${reqName ? `<div class="field"><span class="field-label">Nome:</span><span class="field-value">${reqName}</span></div>` : ""}
    ${reqCpf ? `<div class="field"><span class="field-label">CPF/CNPJ:</span><span class="field-value">${reqCpf}</span></div>` : ""}
    ${reqEmail ? `<div class="field"><span class="field-label">E-mail:</span><span class="field-value">${reqEmail}</span></div>` : ""}
    ${reqPhone ? `<div class="field"><span class="field-label">Telefone:</span><span class="field-value">${reqPhone}</span></div>` : ""}
  </div>
  ` : ""}

  <!-- Histórico de tramitações -->
  <h2>Histórico de Tramitações (${tramitations.length})</h2>
  ${tramitations.length === 0 ? `<p style="color:#888;font-style:italic">Nenhuma tramitação registrada.</p>` : `
  <table>
    <thead><tr><th>Data/Hora</th><th>Ação</th><th>Responsável</th><th>Observação</th></tr></thead>
    <tbody>${tramRows}</tbody>
  </table>
  `}

  <!-- Transcrição da conversa -->
  ${msgs.length > 0 ? `
  <h2>Transcrição da Conversa (${msgs.length} mensagens${conversation ? ` — ${channelLabel}${conversation.externalId ? " | ID: " + conversation.externalId : ""}` : ""})</h2>
  <table>
    <thead><tr><th style="width:120px">Data/Hora</th><th style="width:100px">Remetente</th><th>Mensagem</th></tr></thead>
    <tbody>${msgRows}</tbody>
  </table>
  ` : ""}

  ${(verifiableDoc?.signatures?.length ?? 0) > 0 ? `
  <h2>Assinaturas Eletrônicas</h2>
  <table>
    <thead><tr><th>Signatário</th><th>Cargo</th><th>Unidade</th><th>Tipo de Assinatura</th><th>Data/Hora</th><th>Código de Acesso</th></tr></thead>
    <tbody>${sigRows}</tbody>
  </table>
  ` : ""}

  <!-- Chancela de autenticidade -->
  ${verifiableDoc ? `
  <div class="chancela">
    <div class="chancela-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3a6b" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <span class="chancela-title">Autenticidade do Documento</span>
    </div>
    <div class="chancela-body">
      <div class="chancela-info">
        <div class="field" style="margin-bottom:4px"><span class="field-label">NUP:</span><span class="field-value" style="font-family:monospace">${verifiableDoc.nup ?? protocol.nup}</span></div>
        <div style="font-size:9px;color:#666;margin-bottom:2px">Chave de Verificação:</div>
        <div class="key-box">${verifiableDoc.verificationKey}</div>
        <div style="font-size:9px;color:#666;margin-bottom:2px;margin-top:4px">Link de Verificação:</div>
        <div class="key-box">${verifyUrl}</div>
        <div class="chancela-text">
          Documento emitido pelo ${appTitle} — Plataforma Pública Omnichannel de Atendimento e Gestão Administrativa.<br/>
          Autenticidade verificável pelo NUP/chave acima no portal do cidadão.<br/>
          Emitido em: ${fmt(verifiableDoc.issuedAt)} | Status: <strong>${verifiableDoc.status === "authentic" ? "AUTÊNTICO" : verifiableDoc.status.toUpperCase()}</strong>
        </div>
      </div>
      <div class="chancela-qr">
        <div style="font-size:8px;color:#666;text-align:center;margin-bottom:4px">Escaneie para verificar</div>
        ${qrSvgId}
      </div>
    </div>
  </div>
  ` : `
  <div class="chancela" style="border-color:#ccc;">
    <div class="chancela-header">
      <span class="chancela-title" style="color:#666;">Documento sem Chancela de Autenticidade</span>
    </div>
    <div class="chancela-text" style="color:#888;">
      Este protocolo ainda não possui chancela de autenticidade emitida.<br/>
      Para emitir a chancela, acesse o painel de Assinaturas Digitais.
    </div>
  </div>
  `}

  <!-- Rodapé -->
  <div class="footer">
    <span>${appTitle} — Plataforma Pública Omnichannel</span>
    <span>NUP: ${protocol.nup} | Emitido em: ${fmt(new Date())}</span>
  </div>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProtocolPrintButton({
  protocolData,
  tramitations,
}: {
  protocolData: ProtocolData;
  tramitations: TramitationItem[];
}) {
  const { protocol } = protocolData;
  const { orgName } = useOrgConfig();
  const appTitle = orgName || (import.meta.env.VITE_APP_TITLE as string) || "CAIUS";

  // Buscar chancela se existir
  const { data: verifiableDoc } = trpc.verification.getByEntity.useQuery(
    { entityType: "protocol", entityId: protocol.id },
    { retry: false }
  );

  const handlePrint = () => {
    const html = buildPrintHtml(protocolData, tramitations, verifiableDoc, appTitle);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      alert("Permita pop-ups para exportar o PDF.");
      return;
    }
    win.document.write(html);
    win.document.close();

    // Aguardar carregamento e abrir diálogo de impressão
    win.onload = () => {
      // Injetar QR Code SVG real via canvas
      if (verifiableDoc) {
        const verifyUrl = verifiableDoc.verificationUrl
          ?? `${window.location.origin}/verificar/${verifiableDoc.verificationKey}`;
        // Usar QRCode.js via CDN na janela de impressão
        const script = win.document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";
        script.onload = () => {
          const container = win.document.getElementById("qr-placeholder");
          if (container && (win as any).QRCode) {
            container.innerHTML = "";
            new (win as any).QRCode(container, {
              text: verifyUrl,
              width: 80,
              height: 80,
              colorDark: "#1a3a6b",
              colorLight: "#ffffff",
            });
          }
          setTimeout(() => win.print(), 300);
        };
        win.document.head.appendChild(script);
      } else {
        setTimeout(() => win.print(), 300);
      }
    };
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className="gap-1.5"
      title="Exportar protocolo em PDF com chancela"
    >
      <FileDown className="h-4 w-4" />
      Exportar PDF
    </Button>
  );
}
