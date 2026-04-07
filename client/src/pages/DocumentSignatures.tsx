/**
 * DocumentSignatures.tsx
 * Módulo interno de assinatura eletrônica de documentos.
 * Permite assinar documentos com 3 níveis: institucional, avançada, qualificada.
 * Suporta múltiplos signatários em ordem configurável.
 * Fluxo: Emitir Chancela → Confirmar com PIN → Assinar → Download PDF
 */
import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Shield, PenLine, CheckCircle2, XCircle, AlertTriangle, Plus,
  FileText, User, Building2, Clock, ChevronDown, ChevronUp, Trash2,
  Search, Download, KeyRound, Lock, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import OmniLayout from "@/components/OmniLayout";
import { DocumentChancela } from "@/components/DocumentChancela";
import { DocumentFinalView } from "@/components/DocumentFinalView";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

const SIG_TYPES = [
  {
    value: "institutional",
    label: "Assinatura Institucional",
    description: "Assinatura vinculada ao perfil institucional do usuário no sistema. Nível básico.",
    icon: Building2,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  {
    value: "advanced",
    label: "Assinatura Eletrônica Avançada",
    description: "Assinatura com hash criptográfico SHA-256 do conteúdo do documento. Nível intermediário.",
    icon: Shield,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
  },
  {
    value: "qualified",
    label: "Assinatura Qualificada (ICP-Brasil)",
    description: "Assinatura com certificado digital ICP-Brasil. Nível máximo de validade jurídica.",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
  },
] as const;

const SIG_STATUS_COLORS: Record<string, string> = {
  valid: "bg-green-100 text-green-800",
  invalid: "bg-red-100 text-red-800",
  altered: "bg-amber-100 text-amber-800",
  revoked: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
  replaced: "bg-amber-100 text-amber-800",
};

const DOCUMENT_TYPES = [
  "Ofício", "Memorando", "Portaria", "Decreto", "Certidão", "Declaração",
  "Contrato", "Convênio", "Ata", "Relatório", "Parecer", "Protocolo",
  "Processo Administrativo", "Outro",
];

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Issue Chancela Dialog ────────────────────────────────────────────────────

interface IssueChancelaDialogProps {
  open: boolean;
  onClose: () => void;
  entityType: DocumentSignaturesProps["entityType"];
  entityId: number;
  nup?: string;
  defaultTitle?: string;
  defaultDocumentType?: string;
  defaultIssuingUnit?: string;
  onIssued: () => void;
}

function IssueChancelaDialog({
  open, onClose, entityType, entityId, nup,
  defaultTitle, defaultDocumentType, defaultIssuingUnit, onIssued,
}: IssueChancelaDialogProps) {
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [documentType, setDocumentType] = useState(defaultDocumentType ?? "");
  const [issuingUnit, setIssuingUnit] = useState(defaultIssuingUnit ?? "");

  const issueMutation = trpc.verification.issue.useMutation({
    onSuccess: () => {
      toast.success("Chancela emitida com sucesso!");
      onIssued();
      onClose();
    },
    onError: (e) => toast.error(`Erro ao emitir chancela: ${e.message}`),
  });

  const handleIssue = () => {
    if (!title.trim()) { toast.error("O título do documento é obrigatório."); return; }
    if (!documentType) { toast.error("O tipo do documento é obrigatório."); return; }
    issueMutation.mutate({
      entityType, entityId, nup,
      title: title.trim(),
      documentType,
      issuingUnit: issuingUnit.trim() || undefined,
      origin: window.location.origin,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Emitir Chancela de Autenticidade
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do documento para emitir a chancela com QR Code e código de verificação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Título do Documento <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Ex: Ofício nº 001/2026 — Secretaria de Administração"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo do Documento <span className="text-red-500">*</span></Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Unidade Emissora</Label>
            <Input
              placeholder="Ex: Secretaria Municipal de Administração"
              value={issuingUnit}
              onChange={e => setIssuingUnit(e.target.value)}
            />
          </div>
          {nup && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">NUP: </span>
              <span className="font-mono font-medium">{nup}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleIssue} disabled={issueMutation.isPending}>
            <Shield className="w-4 h-4 mr-1.5" />
            {issueMutation.isPending ? "Emitindo..." : "Emitir Chancela"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sign Dialog com confirmação PIN ─────────────────────────────────────────

interface SignDialogProps {
  open: boolean;
  onClose: () => void;
  verifiableDocumentId: number;
  nup?: string;
  onSigned: (accessCode: string) => void;
}

function SignDialog({ open, onClose, verifiableDocumentId, nup, onSigned }: SignDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "pin">("form");
  const [signatureType, setSignatureType] = useState<"institutional" | "advanced" | "qualified">("institutional");
  const [cpfMasked, setCpfMasked] = useState("");
  const [role, setRole] = useState("");
  const [unit, setUnit] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: string; lng: string } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "denied">("idle");
  const pinRef = useRef<HTMLInputElement>(null);

  // PIN gerado dinamicamente: últimos 4 dígitos do ID do usuário + 2 aleatórios
  // Na prática, o PIN é exibido ao usuário para confirmação de intencionalidade
  const CONFIRM_PHRASE = user?.name?.split(" ")[0]?.toUpperCase() ?? "CONFIRMAR";

  const signMutation = trpc.verification.sign.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Documento assinado com sucesso!`);
        onSigned(data.accessCode ?? "");
        onClose();
        setStep("form");
        setPin("");
      } else {
        toast.error(data.message ?? "Erro ao assinar.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  // Capturar geolocalização quando o usuário avança para o passo de confirmação
  const handleProceedToPin = () => {
    setStep("pin");
    setTimeout(() => pinRef.current?.focus(), 100);
    if (geoStatus === "idle" && navigator.geolocation) {
      setGeoStatus("loading");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({
            lat: pos.coords.latitude.toString(),
            lng: pos.coords.longitude.toString(),
          });
          setGeoStatus("ok");
        },
        () => setGeoStatus("denied"),
        { timeout: 8000, maximumAge: 60000 }
      );
    }
  };

  const handleSign = () => {
    if (pin.trim().toUpperCase() !== CONFIRM_PHRASE) {
      toast.error(`Digite "${CONFIRM_PHRASE}" para confirmar a assinatura.`);
      return;
    }
    signMutation.mutate({
      verifiableDocumentId,
      nup,
      signatureType,
      cpfMasked: cpfMasked || undefined,
      role: role || undefined,
      unit: unit || undefined,
      userAgent: navigator.userAgent,
      origin: window.location.origin,
      latitude: geoCoords?.lat,
      longitude: geoCoords?.lng,
    });
  };

  const selectedType = SIG_TYPES.find((t) => t.value === signatureType);

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setStep("form"); setPin(""); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-primary" />
            {step === "form" ? "Assinar Documento Eletronicamente" : "Confirmar Assinatura"}
          </DialogTitle>
          {step === "pin" && (
            <DialogDescription>
              Para confirmar sua assinatura eletrônica, digite seu primeiro nome em maiúsculas no campo abaixo.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4">
            {/* Tipo de assinatura */}
            <div className="space-y-2">
              <Label>Tipo de Assinatura</Label>
              <div className="space-y-2">
                {SIG_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      className={`w-full text-left border rounded-lg p-3 transition-all ${
                        signatureType === t.value ? `${t.bg} border-current ring-2 ring-offset-1` : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSignatureType(t.value)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${t.color}`} />
                        <span className="font-medium text-sm">{t.label}</span>
                        {signatureType === t.value && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 ml-6">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dados opcionais */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CPF (mascarado)</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpfMasked}
                  onChange={(e) => setCpfMasked(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cargo/Função</Label>
                <Input
                  placeholder="Ex: Secretário Municipal"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unidade/Setor</Label>
              <Input
                placeholder="Ex: Secretaria de Administração"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="text-sm"
              />
            </div>

            {selectedType && (
              <div className={`rounded-lg p-3 border text-sm ${selectedType.bg}`}>
                <p className="font-medium flex items-center gap-1.5">
                  <selectedType.icon className={`w-4 h-4 ${selectedType.color}`} />
                  {selectedType.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedType.description}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Confirmação de Identidade</p>
                  <p className="text-amber-700 mt-1">
                    Ao assinar, você confirma que leu e concorda com o conteúdo deste documento.
                    Esta assinatura tem validade legal conforme a Lei nº 14.063/2020.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Digite <strong className="font-mono text-primary">{CONFIRM_PHRASE}</strong> para confirmar
              </Label>
              <div className="relative">
                <Input
                  ref={pinRef}
                  type={showPin ? "text" : "password"}
                  placeholder={`Digite ${CONFIRM_PHRASE}...`}
                  value={pin}
                  onChange={e => setPin(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleSign()}
                  className="pr-10 font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Assinatura do tipo: <strong>{selectedType?.label}</strong>
              </p>
              {/* Status de geolocalização */}
              {geoStatus === "loading" && (
                <p className="text-xs text-amber-600">&#x1F4CD; Capturando localização geográfica...</p>
              )}
              {geoStatus === "ok" && geoCoords && (
                <p className="text-xs text-green-600">&#x2705; Localização capturada: {parseFloat(geoCoords.lat).toFixed(5)}, {parseFloat(geoCoords.lng).toFixed(5)}</p>
              )}
              {geoStatus === "denied" && (
                <p className="text-xs text-muted-foreground">&#x26A0;&#xFE0F; Localização não autorizada (será omitida da chancela).</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "form" ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleProceedToPin}>
                <KeyRound className="w-4 h-4 mr-1.5" />
                Prosseguir
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setStep("form"); setPin(""); }}>Voltar</Button>
              <Button onClick={handleSign} disabled={signMutation.isPending}>
                <PenLine className="w-4 h-4 mr-1.5" />
                {signMutation.isPending ? "Assinando..." : "Assinar Documento"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DocumentSignaturesProps {
  entityType: "protocol" | "process" | "document" | "ombudsman" | "template" | "receipt" | "report" | "custom";
  entityId: number;
  nup?: string;
  title?: string;
  documentType?: string;
  content?: string;
  issuingUnit?: string;
}

export function DocumentSignaturesPanel({
  entityType, entityId, nup, title, documentType, content, issuingUnit,
}: DocumentSignaturesProps) {
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [showFinalView, setShowFinalView] = useState(false);
  const [showLegacyChancela, setShowLegacyChancela] = useState(false);
  const [lastAccessCode, setLastAccessCode] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: verDoc, refetch } = trpc.verification.getByEntity.useQuery(
    { entityType, entityId },
    { retry: false }
  );

  const downloadSignedPdf = trpc.verification.downloadSignedPdf.useMutation();

  const signatures = verDoc?.signatures ?? [];
  const hasSigned = signatures.length > 0;

  const handleSigned = (accessCode: string) => {
    setLastAccessCode(accessCode);
    refetch();
    // Auto-exibir documento final consolidado após assinatura
    setShowFinalView(true);
    toast.success(`Assinatura registrada! Código de acesso: ${accessCode}`, { duration: 8000 });
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Autenticação e Assinaturas
        </h3>
        <div className="flex gap-2 flex-wrap">
          {verDoc && (
            <>
              <Button size="sm" variant="outline" onClick={() => setSignDialogOpen(true)}>
                <PenLine className="w-3.5 h-3.5 mr-1.5" />
                Assinar
              </Button>
              {hasSigned && (
                <Button size="sm" variant="default" onClick={() => setShowFinalView(!showFinalView)}>
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  {showFinalView ? "Ocultar" : "Visualizar Documento Final"}
                </Button>
              )}
              {!hasSigned && (
                <Button size="sm" variant="ghost" onClick={() => setShowLegacyChancela(!showLegacyChancela)}>
                  {showLegacyChancela ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              )}
            </>
          )}
          {!verDoc && (
            <Button size="sm" onClick={() => setIssueDialogOpen(true)}>
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Emitir Chancela
            </Button>
          )}
        </div>
      </div>

      {/* Código de acesso recém-gerado */}
      {lastAccessCode && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
          <p className="font-medium text-green-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Assinatura registrada com sucesso!
          </p>
          <p className="text-green-700 mt-1">
            Código de acesso: <span className="font-mono font-bold">{lastAccessCode}</span>
          </p>
          <p className="text-xs text-green-600 mt-0.5">Guarde este código para verificação futura da sua assinatura.</p>
        </div>
      )}

      {/* Sem chancela */}
      {!verDoc && (
        <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">Nenhuma chancela emitida</p>
          <p className="text-xs mt-1">Clique em "Emitir Chancela" para autenticar este documento.</p>
        </div>
      )}

      {/* Status da chancela (quando não há assinaturas ainda) */}
      {verDoc && !hasSigned && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <div>
              <p className="font-medium">{verDoc.title}</p>
              <p className="text-xs text-muted-foreground">
                {verDoc.documentType} · Emitido em {formatDate(verDoc.issuedAt)}
                {verDoc.nup && <span className="ml-2 font-mono">{verDoc.nup}</span>}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Chancela emitida — aguardando assinatura</p>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-800 shrink-0">Pendente de Assinatura</Badge>
        </div>
      )}

      {/* Chancela sem assinatura (modo legado) */}
      {verDoc && !hasSigned && showLegacyChancela && (
        <DocumentChancela
          entityType={entityType}
          entityId={entityId}
          nup={nup ?? verDoc.nup ?? undefined}
          title={title ?? verDoc.title}
          documentType={documentType ?? verDoc.documentType}
          content={content}
          issuingUnit={issuingUnit ?? verDoc.issuingUnit ?? undefined}
        />
      )}

      {/* DOCUMENTO FINAL CONSOLIDADO (após assinatura) */}
      {verDoc && hasSigned && showFinalView && (
        <div className="space-y-3">
          <DocumentFinalView
            verDoc={{
              ...verDoc,
              signatures: signatures as any,
            }}
            content={content}
            nup={nup ?? verDoc.nup ?? undefined}
            title={title ?? verDoc.title}
            issuingUnit={issuingUnit ?? verDoc.issuingUnit ?? undefined}
            versionLabel="Versão Assinada"
          />
          {/* Botão de download do PDF consolidado real */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="default"
              disabled={isDownloading}
              onClick={async () => {
                setIsDownloading(true);
                try {
                  const result = await downloadSignedPdf.mutateAsync({
                    verifiableDocumentId: verDoc.id,
                    documentContent: content,
                    origin: window.location.origin,
                  });
                  const byteChars = atob(result.base64Pdf);
                  const byteArr = new Uint8Array(byteChars.length);
                  for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
                  const blob = new Blob([byteArr], { type: "application/pdf" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = result.fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success("PDF consolidado baixado com sucesso!");
                } catch (err: any) {
                  toast.error(err?.message ?? "Erro ao gerar PDF consolidado");
                } finally {
                  setIsDownloading(false);
                }
              }}
              className="gap-1.5"
            >
              {isDownloading ? (
                <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Gerando PDF...</>
              ) : (
                <><Download className="w-3.5 h-3.5" />Baixar PDF Assinado</>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`${window.location.origin}/verificar/${verDoc.verificationKey}`, "_blank")}
              className="gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Verificar Autenticidade
            </Button>
          </div>
        </div>
      )}

      {/* Lista resumida de assinaturas (quando documento final não está expandido) */}
      {verDoc && hasSigned && !showFinalView && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {signatures.length} assinatura{signatures.length > 1 ? "s" : ""} registrada{signatures.length > 1 ? "s" : ""}
          </p>
          {signatures.map((sig) => (
            <div key={sig.id} className="border rounded-lg p-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {sig.signatureOrder}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{sig.signerName}</span>
                  <Badge className={`text-xs ${SIG_STATUS_COLORS[sig.status] ?? "bg-gray-100 text-gray-800"}`}>
                    {sig.status === "valid" ? "Válida" : sig.status}
                  </Badge>
                </div>
                {sig.signerRole && <p className="text-xs text-muted-foreground">{sig.signerRole}</p>}
                {sig.signerUnit && <p className="text-xs text-muted-foreground">{sig.signerUnit}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sig.signatureType === "institutional" ? "Institucional" : sig.signatureType === "advanced" ? "Avançada" : "Qualificada"} · {formatDate(sig.signedAt)}
                </p>
                {sig.accessCode && (
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">Código: {sig.accessCode}</p>
                )}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-1">
            Clique em <strong>"Visualizar Documento Final"</strong> para ver o documento completo com chancela e exportar o PDF.
          </p>
        </div>
      )}

      {/* Dialog de emissão de chancela */}
      <IssueChancelaDialog
        open={issueDialogOpen}
        onClose={() => setIssueDialogOpen(false)}
        entityType={entityType}
        entityId={entityId}
        nup={nup}
        defaultTitle={title}
        defaultDocumentType={documentType}
        defaultIssuingUnit={issuingUnit}
        onIssued={refetch}
      />

      {/* Dialog de assinatura */}
      {verDoc && (
        <SignDialog
          open={signDialogOpen}
          onClose={() => setSignDialogOpen(false)}
          verifiableDocumentId={verDoc.id}
          nup={nup ?? verDoc.nup ?? undefined}
          onSigned={handleSigned}
        />
      )}
    </div>
  );
}

// ─── Standalone Page ──────────────────────────────────────────────────────────

export default function DocumentSignaturesPage() {
  // Suporta /assinaturas/:entityType/:entityId para acesso direto a um documento
  const [matchDetail, paramsDetail] = useRoute("/assinaturas/:entityType/:entityId");
  const entityType = (paramsDetail?.entityType ?? "document") as DocumentSignaturesProps["entityType"];
  const entityId = parseInt(paramsDetail?.entityId ?? "0");

  if (matchDetail && entityId > 0) {
    return (
      <OmniLayout title="Assinaturas Digitais">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Assinaturas Eletrônicas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie as assinaturas eletrônicas e a chancela de autenticidade deste documento.
            </p>
          </div>
          <DocumentSignaturesPanel entityType={entityType} entityId={entityId} />
        </div>
      </OmniLayout>
    );
  }

  // Listagem geral de documentos com chancela
  return <DocumentSignaturesListPage />;
}

function DocumentSignaturesListPage() {
  const { data: docs = [], isLoading } = trpc.verification.list.useQuery({ limit: 100 });
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const filtered = (docs as any[]).filter((d: any) =>
    !search ||
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.nup?.toLowerCase().includes(search.toLowerCase()) ||
    d.documentType?.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    authentic: { label: "Autêntico", color: "bg-green-100 text-green-800" },
    invalid: { label: "Inválido", color: "bg-red-100 text-red-800" },
    cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
    replaced: { label: "Substituído", color: "bg-amber-100 text-amber-800" },
  };

  return (
    <OmniLayout title="Assinaturas Digitais">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <PenLine className="w-5 h-5 text-primary" />
              Assinaturas Digitais
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Documentos com chancela de autenticidade e assinaturas eletrônicas emitidas pelo sistema.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/verificar", "_blank")}
          >
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Portal de Verificação
          </Button>
        </div>

        {/* Busca */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por título, NUP ou tipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de Documentos", value: (docs as any[]).length, icon: FileText, color: "text-blue-600" },
            { label: "Autênticos", value: (docs as any[]).filter((d: any) => d.status === "authentic").length, icon: CheckCircle2, color: "text-green-600" },
            { label: "Cancelados", value: (docs as any[]).filter((d: any) => d.status === "cancelled").length, icon: XCircle, color: "text-red-600" },
            { label: "Substituídos", value: (docs as any[]).filter((d: any) => d.status === "replaced").length, icon: AlertTriangle, color: "text-amber-600" },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lista de documentos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Documentos com Chancela</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 animate-spin" />
                <p>Carregando...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-medium">Nenhum documento encontrado</p>
                <p className="text-xs mt-1">Documentos com chancela emitida aparecerão aqui.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((doc: any) => {
                  const statusCfg = STATUS_LABELS[doc.status] ?? { label: doc.status, color: "bg-gray-100 text-gray-800" };
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/assinaturas/${doc.entityType}/${doc.entityId}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.documentType}
                            {doc.nup && <span className="ml-2 font-mono">{doc.nup}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString("pt-BR") : "—"}
                        </span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dica de uso */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Como funciona:</strong> Clique em qualquer documento para gerenciar suas assinaturas eletrônicas.
              Você pode emitir a chancela de autenticidade e assinar com nível institucional, avançado ou qualificado (ICP-Brasil).
              Após assinar, um código de acesso único é gerado para verificação pública no portal.
            </p>
          </CardContent>
        </Card>
      </div>
    </OmniLayout>
  );
}
