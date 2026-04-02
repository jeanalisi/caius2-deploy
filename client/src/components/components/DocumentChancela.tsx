/**
 * DocumentChancela.tsx
 * Componente de chancela visual para documentos autenticados.
 * Exibe: chave de verificação, QR Code, assinaturas e link de verificação.
 * Pode ser incluído no rodapé de qualquer documento emitido pelo sistema.
 */
import { useState } from "react";
import QRCode from "react-qr-code";
import { Shield, CheckCircle2, AlertTriangle, XCircle, ExternalLink, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Signature {
  id: number;
  signerName: string;
  signerCpfMasked?: string | null;
  signerRole?: string | null;
  signerUnit?: string | null;
  signatureType: "institutional" | "advanced" | "qualified";
  signatureMethod?: string | null;
  status: "valid" | "invalid" | "altered" | "revoked" | "expired" | "replaced";
  signedAt: Date | string;
  accessCode: string;
  signatureOrder: number;
}

interface VerifiableDoc {
  id: number;
  nup?: string | null;
  title: string;
  documentType: string;
  documentNumber?: string | null;
  issuingUnit?: string | null;
  issuingUserName?: string | null;
  status: string;
  verificationKey: string;
  verificationUrl?: string | null;
  qrCodeData?: string | null;
  issuedAt: Date | string;
  signatures?: Signature[];
}

interface DocumentChancelaProps {
  entityType: "protocol" | "process" | "document" | "ombudsman" | "template" | "receipt" | "report" | "custom";
  entityId: number;
  nup?: string;
  title?: string;
  documentType?: string;
  content?: string;
  issuingUnit?: string;
  compact?: boolean;   // Modo compacto para rodapé de documentos
  printable?: boolean; // Modo impressão (sem interatividade)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  authentic: { label: "Documento Autêntico", color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle2, iconColor: "text-green-600" },
  invalid: { label: "Documento Inválido", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle, iconColor: "text-red-600" },
  cancelled: { label: "Documento Cancelado", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle, iconColor: "text-red-600" },
  replaced: { label: "Documento Substituído", color: "text-amber-700 bg-amber-50 border-amber-200", icon: AlertTriangle, iconColor: "text-amber-600" },
  revoked: { label: "Documento Revogado", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle, iconColor: "text-red-600" },
  unavailable: { label: "Documento Indisponível", color: "text-gray-700 bg-gray-50 border-gray-200", icon: AlertTriangle, iconColor: "text-gray-600" },
};

const SIG_TYPE_LABELS = {
  institutional: "Assinatura Institucional",
  advanced: "Assinatura Eletrônica Avançada",
  qualified: "Assinatura Qualificada (ICP-Brasil)",
};

const SIG_STATUS_COLORS = {
  valid: "bg-green-100 text-green-800",
  invalid: "bg-red-100 text-red-800",
  altered: "bg-amber-100 text-amber-800",
  revoked: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  replaced: "bg-amber-100 text-amber-800",
};

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentChancela({
  entityType, entityId, nup, title, documentType, content, issuingUnit, compact = false, printable = false,
}: DocumentChancelaProps) {
  const [showSigs, setShowSigs] = useState(!compact);
  const [issuing, setIssuing] = useState(false);

  // Buscar documento verificável existente
  const { data: verDoc, refetch } = trpc.verification.getByEntity.useQuery(
    { entityType, entityId },
    { retry: false }
  );

  // Mutation para emitir
  const issueMutation = trpc.verification.issue.useMutation({
    onSuccess: () => { refetch(); setIssuing(false); },
    onError: (e) => { toast.error(e.message); setIssuing(false); },
  });

  const handleIssue = () => {
    if (!title || !documentType) {
      toast.error("Título e tipo do documento são obrigatórios para emitir a chancela.");
      return;
    }
    setIssuing(true);
    issueMutation.mutate({
      entityType, entityId, nup, title, documentType, content, issuingUnit,
      origin: window.location.origin,
    });
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Chave copiada!");
  };

  // Sem documento verificável ainda
  if (!verDoc) {
    if (printable) return null;
    return (
      <div className="border border-dashed border-muted-foreground/30 rounded-lg p-4 text-center space-y-2">
        <Shield className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Este documento ainda não possui chancela de autenticidade.</p>
        {title && documentType && (
          <Button size="sm" variant="outline" onClick={handleIssue} disabled={issuing}>
            {issuing ? "Emitindo..." : "Emitir Chancela"}
          </Button>
        )}
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[verDoc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.authentic;
  const StatusIcon = statusCfg.icon;
  const verUrl = verDoc.verificationUrl || `${window.location.origin}/verificar/${verDoc.verificationKey}`;
  const signatures = verDoc.signatures || [];

  if (compact) {
    // ── Modo compacto (rodapé de documento) ──────────────────────────────────
    return (
      <div className={`border rounded-lg p-3 ${statusCfg.color} print:border-gray-300 print:bg-white`}>
        <div className="flex items-start gap-3">
          {/* QR Code */}
          <div className="flex-shrink-0 bg-white p-1 rounded border border-gray-200">
            <QRCode value={verUrl} size={72} />
          </div>
          {/* Dados */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <StatusIcon className={`w-4 h-4 ${statusCfg.iconColor}`} />
              <span className="text-xs font-semibold uppercase tracking-wide">{statusCfg.label}</span>
            </div>
            {verDoc.nup && <p className="text-xs font-mono">NUP: <strong>{verDoc.nup}</strong></p>}
            <p className="text-xs font-mono break-all">Chave: <strong>{verDoc.verificationKey}</strong></p>
            <p className="text-xs text-muted-foreground">Emitido em {formatDate(verDoc.issuedAt)}</p>
            {verDoc.issuingUnit && <p className="text-xs text-muted-foreground">{verDoc.issuingUnit}</p>}
            {!printable && (
              <a href={verUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Verificar autenticidade
              </a>
            )}
          </div>
        </div>
        {/* Assinaturas compactas */}
        {signatures.length > 0 && (
          <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
            {signatures.map((sig) => (
              <div key={sig.id} className="text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="font-medium">{sig.signerName}</span>
                {sig.signerRole && <span className="text-muted-foreground">— {sig.signerRole}</span>}
                <span className="text-muted-foreground ml-auto">{formatDate(sig.signedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Modo completo ─────────────────────────────────────────────────────────
  return (
    <div className="border rounded-xl overflow-hidden shadow-sm">
      {/* Cabeçalho de status */}
      <div className={`px-4 py-3 border-b flex items-center gap-2 ${statusCfg.color}`}>
        <StatusIcon className={`w-5 h-5 ${statusCfg.iconColor}`} />
        <span className="font-semibold text-sm">{statusCfg.label}</span>
        <Badge variant="outline" className="ml-auto text-xs">{verDoc.documentType}</Badge>
      </div>

      <div className="p-4 space-y-4">
        {/* QR Code + dados principais */}
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0 bg-white p-2 rounded-lg border shadow-sm">
            <QRCode value={verUrl} size={100} />
            <p className="text-center text-xs text-muted-foreground mt-1">Escanear para verificar</p>
          </div>
          <div className="flex-1 space-y-2">
            {verDoc.nup && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">NUP</p>
                <p className="font-mono font-bold text-sm">{verDoc.nup}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Chave de Verificação</p>
              <div className="flex items-center gap-1">
                <p className="font-mono text-sm break-all">{verDoc.verificationKey}</p>
                <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={() => copyKey(verDoc.verificationKey)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Emitido em</p>
              <p className="text-sm">{formatDate(verDoc.issuedAt)}</p>
            </div>
            {verDoc.issuingUnit && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Unidade Emissora</p>
                <p className="text-sm">{verDoc.issuingUnit}</p>
              </div>
            )}
            <a href={verUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> Verificar autenticidade online
            </a>
          </div>
        </div>

        <Separator />

        {/* Assinaturas */}
        <div>
          <button
            className="flex items-center gap-2 text-sm font-medium w-full text-left"
            onClick={() => setShowSigs(!showSigs)}
          >
            <Shield className="w-4 h-4 text-primary" />
            Assinaturas Eletrônicas ({signatures.length})
            {showSigs ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </button>

          {showSigs && (
            <div className="mt-3 space-y-3">
              {signatures.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhuma assinatura registrada.</p>
              ) : (
                signatures.map((sig) => (
                  <div key={sig.id} className="border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {sig.signatureOrder}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{sig.signerName}</p>
                          {sig.signerRole && <p className="text-xs text-muted-foreground">{sig.signerRole}</p>}
                          {sig.signerUnit && <p className="text-xs text-muted-foreground">{sig.signerUnit}</p>}
                        </div>
                      </div>
                      <Badge className={`text-xs ${SIG_STATUS_COLORS[sig.status]}`}>
                        {sig.status === "valid" ? "Válida" : sig.status === "revoked" ? "Revogada" : sig.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{SIG_TYPE_LABELS[sig.signatureType]}</span>
                      {sig.signatureMethod && <span className="font-mono">{sig.signatureMethod}</span>}
                      <span>Assinado em {formatDate(sig.signedAt)}</span>
                    </div>
                    {sig.signerCpfMasked && (
                      <p className="text-xs text-muted-foreground font-mono">CPF: {sig.signerCpfMasked}</p>
                    )}
                    <p className="text-xs font-mono text-muted-foreground break-all">Código: {sig.accessCode}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentChancela;
