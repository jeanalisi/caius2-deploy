/**
 * DocumentFinalView.tsx
 * Visualização e exportação consolidada do documento assinado com chancela completa.
 * Exibe: conteúdo integral + bloco de assinaturas + chancela + QR Code + link de verificação.
 * Conforme Especificação 40: documento final consolidado após assinatura.
 */
import { useState, useRef } from "react";
import QRCode from "react-qr-code";
import {
  Shield, CheckCircle2, Download, Copy, ExternalLink,
  QrCode, History, Eye, FileText, Building2, Clock, User, PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useOrgConfig } from "@/hooks/useOrgConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignatureInfo {
  id: number;
  signerName: string;
  signerCpfMasked?: string | null;
  signerRole?: string | null;
  signerUnit?: string | null;
  signatureType: "institutional" | "advanced" | "qualified";
  status: "valid" | "invalid" | "altered" | "revoked" | "expired" | "replaced";
  signedAt: Date | string;
  accessCode: string;
  signatureOrder: number;
}

export interface VerifiableDocInfo {
  id: number;
  nup?: string | null;
  title: string;
  documentType: string;
  issuingUnit?: string | null;
  issuingUserName?: string | null;
  status: string;
  verificationKey: string;
  verificationUrl?: string | null;
  qrCodeData?: string | null;
  issuedAt: Date | string;
  signatures?: SignatureInfo[];
}

interface DocumentFinalViewProps {
  verDoc: VerifiableDocInfo;
  content?: string;        // HTML ou texto do conteúdo do documento
  nup?: string;
  title?: string;
  issuingUnit?: string;
  /** Versão do documento: rascunho | assinada | vigente */
  versionLabel?: string;
  /** Callback para abrir histórico de assinaturas */
  onShowHistory?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SIG_TYPE_LABELS: Record<string, string> = {
  institutional: "Assinatura Eletrônica Institucional",
  advanced: "Assinatura Eletrônica Avançada",
  qualified: "Assinatura Qualificada (ICP-Brasil)",
};

const SIG_STATUS_COLORS: Record<string, string> = {
  valid: "bg-green-100 text-green-800",
  invalid: "bg-red-100 text-red-800",
  altered: "bg-amber-100 text-amber-800",
  revoked: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  replaced: "bg-amber-100 text-amber-800",
};

const SIG_STATUS_LABELS: Record<string, string> = {
  valid: "Válida",
  invalid: "Inválida",
  altered: "Alterada",
  revoked: "Revogada",
  expired: "Expirada",
  replaced: "Substituída",
};

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Build PDF HTML ────────────────────────────────────────────────────────────

export function buildDocumentFinalHtml(
  verDoc: VerifiableDocInfo,
  content: string | undefined,
  appTitle: string,
): string {
  const verifyUrl = verDoc.verificationUrl
    ?? `${window.location.origin}/verificar/${verDoc.verificationKey}`;
  const nup = verDoc.nup ?? "";
  const signatures = verDoc.signatures ?? [];

  const sigRows = signatures.map((s) => `
    <tr>
      <td style="font-weight:600">${s.signerName}</td>
      <td>${s.signerCpfMasked ?? "—"}</td>
      <td>${s.signerRole ?? "—"}</td>
      <td>${s.signerUnit ?? verDoc.issuingUnit ?? "—"}</td>
      <td>${SIG_TYPE_LABELS[s.signatureType] ?? s.signatureType}</td>
      <td>${fmt(s.signedAt)}</td>
      <td style="font-family:monospace;font-size:9px">${s.accessCode}</td>
      <td style="color:#166534;font-weight:bold">${SIG_STATUS_LABELS[s.status] ?? s.status}</td>
    </tr>
  `).join("");

  const contentSection = content ? `
  <div class="doc-content">
    ${content}
  </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${verDoc.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20mm 20mm 15mm 20mm; }
    h1 { font-size: 17px; font-weight: bold; margin-bottom: 4px; }
    h2 { font-size: 12px; font-weight: bold; margin: 18px 0 6px; border-bottom: 1.5px solid #1a3a6b; padding-bottom: 4px; color: #1a3a6b; text-transform: uppercase; letter-spacing: 0.5px; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; border-bottom: 2px solid #1a3a6b; padding-bottom: 10px; }
    .header-left { flex: 1; }
    .system-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .doc-type-badge { display: inline-block; background: #1a3a6b; color: #fff; font-size: 9px; font-weight: bold; padding: 2px 8px; border-radius: 10px; margin-bottom: 6px; }
    .version-badge { display: inline-block; background: #166534; color: #fff; font-size: 9px; font-weight: bold; padding: 2px 8px; border-radius: 10px; margin-left: 6px; }
    .doc-title { font-size: 16px; font-weight: bold; margin-top: 4px; line-height: 1.3; }
    .doc-meta { font-size: 9px; color: #666; margin-top: 4px; }
    .doc-content { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 4px; padding: 14px; margin-bottom: 8px; line-height: 1.7; font-size: 11px; min-height: 80px; }
    .doc-content p { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px; }
    th { background: #1a3a6b; color: #fff; padding: 5px 6px; text-align: left; font-size: 9px; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .chancela { border: 2px solid #1a3a6b; border-radius: 6px; padding: 14px; margin-top: 20px; page-break-inside: avoid; }
    .chancela-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .chancela-title { font-size: 12px; font-weight: bold; color: #1a3a6b; text-transform: uppercase; letter-spacing: 0.5px; }
    .chancela-body { display: flex; gap: 16px; }
    .chancela-info { flex: 1; }
    .chancela-qr { width: 90px; flex-shrink: 0; text-align: center; }
    .field { display: flex; gap: 4px; margin-bottom: 3px; font-size: 10px; }
    .field-label { color: #666; min-width: 110px; }
    .field-value { font-weight: 600; }
    .key-box { background: #f0f4ff; border: 1px solid #c0d0f0; border-radius: 4px; padding: 5px 8px; font-family: monospace; font-size: 10px; color: #1a3a6b; margin: 4px 0; word-break: break-all; }
    .chancela-text { font-size: 9px; color: #555; line-height: 1.5; margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 6px; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9px; color: #888; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <!-- Cabeçalho institucional -->
  <div class="header">
    <div class="header-left">
      <div class="system-label">${appTitle} — Plataforma Pública Omnichannel</div>
      <span class="doc-type-badge">${verDoc.documentType}</span>
      <span class="version-badge">VERSÃO ASSINADA</span>
      <div class="doc-title">${verDoc.title}</div>
      <div class="doc-meta">
        ${nup ? `NUP: <strong>${nup}</strong> &nbsp;|&nbsp;` : ""}
        Unidade Certificadora: <strong>${verDoc.issuingUnit ?? appTitle}</strong> &nbsp;|&nbsp;
        Emitido em: ${fmt(verDoc.issuedAt)}
      </div>
    </div>
    <div style="text-align:right;font-size:9px;color:#666;">
      <div>Exportado em: ${fmt(new Date())}</div>
      <div style="margin-top:4px;color:#166534;font-weight:bold">● DOCUMENTO AUTÊNTICO</div>
    </div>
  </div>

  <!-- Conteúdo do documento -->
  ${contentSection ? `<h2>Conteúdo do Documento</h2>${contentSection}` : ""}

  <!-- Bloco de assinaturas -->
  ${signatures.length > 0 ? `
  <h2>Assinaturas Eletrônicas (${signatures.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Signatário</th>
        <th>CPF</th>
        <th>Cargo</th>
        <th>Unidade Certificadora</th>
        <th>Tipo de Assinatura</th>
        <th>Data/Hora</th>
        <th>Código de Acesso</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${sigRows}</tbody>
  </table>
  ` : ""}

  <!-- Chancela de autenticidade -->
  <div class="chancela">
    <div class="chancela-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3a6b" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
      <span class="chancela-title">Chancela de Autenticidade — ${appTitle}</span>
    </div>
    <div class="chancela-body">
      <div class="chancela-info">
        ${nup ? `<div class="field"><span class="field-label">NUP:</span><span class="field-value" style="font-family:monospace">${nup}</span></div>` : ""}
        <div class="field"><span class="field-label">Unidade Certificadora:</span><span class="field-value">${verDoc.issuingUnit ?? appTitle}</span></div>
        <div class="field"><span class="field-label">Título do Documento:</span><span class="field-value">${verDoc.title}</span></div>
        <div class="field"><span class="field-label">Status:</span><span class="field-value" style="color:#166534">AUTÊNTICO</span></div>
        <div style="font-size:9px;color:#666;margin-top:6px;margin-bottom:2px">Chave de Verificação:</div>
        <div class="key-box">${verDoc.verificationKey}</div>
        <div style="font-size:9px;color:#666;margin-bottom:2px;margin-top:4px">Link de Verificação Pública:</div>
        <div class="key-box">${verifyUrl}</div>
        <div class="chancela-text">
          Documento emitido e autenticado pelo ${appTitle} — Plataforma Pública Omnichannel de Atendimento e Gestão Administrativa.<br/>
          A autenticidade deste documento pode ser verificada pelo cidadão através do NUP, chave ou link acima.<br/>
          Emitido em: ${fmt(verDoc.issuedAt)} &nbsp;|&nbsp; Exportado em: ${fmt(new Date())}
        </div>
      </div>
      <div class="chancela-qr">
        <div style="font-size:8px;color:#666;text-align:center;margin-bottom:4px">Escaneie para verificar</div>
        <div id="qr-placeholder" style="width:90px;height:90px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:8px;color:#666;text-align:center;">
          QR Code<br/>${verDoc.verificationKey.slice(0, 8)}...
        </div>
        <div style="font-size:7px;color:#888;text-align:center;margin-top:3px">Verificação pública</div>
      </div>
    </div>
  </div>

  <!-- Rodapé -->
  <div class="footer">
    <span>${appTitle} — Plataforma Pública Omnichannel | Documento Oficial</span>
    <span>${nup ? `NUP: ${nup} | ` : ""}Exportado em: ${fmt(new Date())}</span>
  </div>
</body>
</html>`;
}

// ─── Inline Viewer ─────────────────────────────────────────────────────────────

export function DocumentFinalView({
  verDoc,
  content,
  nup,
  title,
  issuingUnit,
  versionLabel = "Versão Assinada",
  onShowHistory,
}: DocumentFinalViewProps) {
  const [showQrModal, setShowQrModal] = useState(false);
  const { orgName } = useOrgConfig();
  const appTitle = orgName || (import.meta.env.VITE_APP_TITLE as string) || "CAIUS";
  const verifyUrl = verDoc.verificationUrl
    ?? `${window.location.origin}/verificar/${verDoc.verificationKey}`;
  const signatures = verDoc.signatures ?? [];
  const docNup = nup ?? verDoc.nup ?? undefined;
  const docTitle = title ?? verDoc.title;
  const docIssuingUnit = issuingUnit ?? verDoc.issuingUnit ?? appTitle;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      toast.success("Link de verificação copiado!");
    });
  };

  const handleDownloadPDF = () => {
    const html = buildDocumentFinalHtml(
      { ...verDoc, nup: docNup, title: docTitle, issuingUnit: docIssuingUnit },
      content,
      appTitle,
    );
    const win = window.open("", "_blank", "width=960,height=750");
    if (!win) {
      toast.error("Permita pop-ups para exportar o PDF.");
      return;
    }
    win.document.write(html);
    win.document.close();

    win.onload = () => {
      const script = win.document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";
      script.onload = () => {
        const container = win.document.getElementById("qr-placeholder");
        if (container && (win as any).QRCode) {
          container.innerHTML = "";
          new (win as any).QRCode(container, {
            text: verifyUrl,
            width: 90,
            height: 90,
            colorDark: "#1a3a6b",
            colorLight: "#ffffff",
          });
        }
        setTimeout(() => win.print(), 400);
      };
      win.document.head.appendChild(script);
    };
  };

  return (
    <div className="space-y-0 border rounded-xl overflow-hidden bg-white dark:bg-card shadow-sm">
      {/* ── Cabeçalho do documento final ── */}
      <div className="bg-primary/5 border-b px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              {verDoc.documentType}
            </Badge>
            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs font-semibold">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {versionLabel}
            </Badge>
          </div>
          <h2 className="text-base font-bold leading-tight">{docTitle}</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            {docNup && (
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                NUP: <span className="font-mono font-medium text-foreground">{docNup}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Unidade Certificadora: <span className="font-medium text-foreground">{docIssuingUnit}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Emitido em {fmt(verDoc.issuedAt)}
            </span>
          </div>
        </div>
        {/* Ações pós-assinatura */}
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={handleDownloadPDF} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            Baixar PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open(verifyUrl, "_blank")} className="gap-1.5 text-xs">
            <ExternalLink className="w-3.5 h-3.5" />
            Verificar
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-1.5 text-xs">
            <Copy className="w-3.5 h-3.5" />
            Copiar Link
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowQrModal(true)} className="gap-1.5 text-xs">
            <QrCode className="w-3.5 h-3.5" />
            QR Code
          </Button>
          {onShowHistory && (
            <Button size="sm" variant="ghost" onClick={onShowHistory} className="gap-1.5 text-xs">
              <History className="w-3.5 h-3.5" />
              Histórico
            </Button>
          )}
        </div>
      </div>

      {/* ── Conteúdo do documento ── */}
      {content && (
        <div className="px-5 py-4 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Conteúdo do Documento
          </p>
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}

      {/* ── Bloco de assinaturas ── */}
      {signatures.length > 0 && (
        <div className="px-5 py-4 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <PenLine className="w-3.5 h-3.5" />
            Assinaturas Eletrônicas ({signatures.length})
          </p>
          <div className="space-y-2">
            {signatures.map((sig) => (
              <div key={sig.id} className="border rounded-lg p-3 flex items-start gap-3 bg-muted/20">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {sig.signatureOrder}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{sig.signerName}</span>
                    {sig.signerCpfMasked && (
                      <span className="text-xs text-muted-foreground font-mono">{sig.signerCpfMasked}</span>
                    )}
                    <Badge className={`text-xs ${SIG_STATUS_COLORS[sig.status] ?? "bg-gray-100 text-gray-800"}`}>
                      {SIG_STATUS_LABELS[sig.status] ?? sig.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    {sig.signerRole && (
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{sig.signerRole}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {sig.signerUnit ?? docIssuingUnit}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{fmt(sig.signedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {SIG_TYPE_LABELS[sig.signatureType] ?? sig.signatureType}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    Código: {sig.accessCode}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Chancela de autenticidade ── */}
      <div className="px-5 py-4 bg-primary/3 border-t">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Chancela de Autenticidade — {appTitle}
            </p>
            <div className="space-y-1 text-xs">
              {docNup && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-36 shrink-0">NUP:</span>
                  <span className="font-mono font-semibold">{docNup}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-muted-foreground w-36 shrink-0">Unidade Certificadora:</span>
                <span className="font-semibold">{docIssuingUnit}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-36 shrink-0">Título do Documento:</span>
                <span className="font-semibold">{docTitle}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-36 shrink-0">Status:</span>
                <span className="font-semibold text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> AUTÊNTICO
                </span>
              </div>
              <div className="mt-2">
                <p className="text-muted-foreground mb-1">Chave de Verificação:</p>
                <div className="bg-primary/5 border border-primary/20 rounded px-2 py-1.5 font-mono text-xs text-primary break-all">
                  {verDoc.verificationKey}
                </div>
              </div>
              <div className="mt-1">
                <p className="text-muted-foreground mb-1">Link de Verificação Pública:</p>
                <div className="bg-primary/5 border border-primary/20 rounded px-2 py-1.5 font-mono text-xs text-primary break-all">
                  {verifyUrl}
                </div>
              </div>
              <p className="text-muted-foreground mt-2 leading-relaxed">
                Documento emitido e autenticado pelo {appTitle}. A autenticidade pode ser verificada
                pelo cidadão através do NUP, chave ou link acima.
              </p>
            </div>
          </div>
          {/* QR Code inline */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="border border-primary/20 rounded-lg p-2 bg-white">
              <QRCode
                value={verifyUrl}
                size={88}
                fgColor="#1a3a6b"
                bgColor="#ffffff"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">Escaneie para<br/>verificar</p>
          </div>
        </div>
      </div>

      {/* ── Modal QR Code ampliado ── */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              QR Code de Verificação
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="border-2 border-primary/20 rounded-xl p-4 bg-white">
              <QRCode
                value={verifyUrl}
                size={200}
                fgColor="#1a3a6b"
                bgColor="#ffffff"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1 w-full text-left">
              <p className="font-semibold text-foreground">{docTitle}</p>
              {docNup && <p>NUP: <span className="font-mono">{docNup}</span></p>}
              <p className="break-all font-mono text-primary">{verDoc.verificationKey}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 w-full">
              <Copy className="w-3.5 h-3.5" />
              Copiar Link de Verificação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Version Badge ─────────────────────────────────────────────────────────────

export function DocumentVersionBadge({ version }: { version: "draft" | "signed" | "current" | "exportable" }) {
  const config = {
    draft: { label: "Rascunho", className: "bg-gray-100 text-gray-700 border-gray-200" },
    signed: { label: "Versão Assinada", className: "bg-green-100 text-green-800 border-green-200" },
    current: { label: "Versão Vigente", className: "bg-blue-100 text-blue-800 border-blue-200" },
    exportable: { label: "Exportável", className: "bg-purple-100 text-purple-800 border-purple-200" },
  };
  const { label, className } = config[version];
  return <Badge className={`text-xs font-semibold ${className}`}>{label}</Badge>;
}
