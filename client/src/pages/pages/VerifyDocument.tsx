/**
 * VerifyDocument.tsx
 * Página pública de verificação de autenticidade de documentos.
 * Acessível via /verificar/:key ou /verificar?key=XXXX
 * Não requer autenticação.
 */
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import QRCode from "react-qr-code";
import {
  Shield, CheckCircle2, XCircle, AlertTriangle, Search,
  ExternalLink, Copy, FileText, Calendar, Building2, User, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  authentic: {
    label: "Documento Autêntico e Válido",
    description: "Este documento foi emitido pelo sistema e sua autenticidade foi confirmada.",
    color: "border-green-200 bg-green-50",
    headerColor: "bg-green-600",
    icon: CheckCircle2,
    iconColor: "text-green-600",
    badgeColor: "bg-green-100 text-green-800",
  },
  invalid: {
    label: "Documento Inválido",
    description: "Este documento não pôde ser verificado ou foi marcado como inválido.",
    color: "border-red-200 bg-red-50",
    headerColor: "bg-red-600",
    icon: XCircle,
    iconColor: "text-red-600",
    badgeColor: "bg-red-100 text-red-800",
  },
  cancelled: {
    label: "Documento Cancelado",
    description: "Este documento foi cancelado e não possui mais validade.",
    color: "border-red-200 bg-red-50",
    headerColor: "bg-red-600",
    icon: XCircle,
    iconColor: "text-red-600",
    badgeColor: "bg-red-100 text-red-800",
  },
  replaced: {
    label: "Documento Substituído",
    description: "Este documento foi substituído por uma versão mais recente.",
    color: "border-amber-200 bg-amber-50",
    headerColor: "bg-amber-600",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    badgeColor: "bg-amber-100 text-amber-800",
  },
  revoked: {
    label: "Documento Revogado",
    description: "Este documento foi revogado e não possui mais validade.",
    color: "border-red-200 bg-red-50",
    headerColor: "bg-red-600",
    icon: XCircle,
    iconColor: "text-red-600",
    badgeColor: "bg-red-100 text-red-800",
  },
  unavailable: {
    label: "Documento Não Encontrado",
    description: "A chave informada não corresponde a nenhum documento no sistema.",
    color: "border-gray-200 bg-gray-50",
    headerColor: "bg-gray-600",
    icon: AlertTriangle,
    iconColor: "text-gray-600",
    badgeColor: "bg-gray-100 text-gray-800",
  },
};

const SIG_TYPE_LABELS: Record<string, string> = {
  institutional: "Assinatura Institucional",
  advanced: "Assinatura Eletrônica Avançada",
  qualified: "Assinatura Qualificada (ICP-Brasil)",
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerifyDocument() {
  const [, params] = useRoute("/verificar/:key");
  const [location] = useLocation();
  const [searchKey, setSearchKey] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Extrair chave da URL
  useEffect(() => {
    const urlKey = params?.key;
    if (urlKey) {
      setActiveKey(urlKey);
      setSearchKey(urlKey);
    } else {
      // Tentar extrair da query string
      const qp = new URLSearchParams(window.location.search);
      const qKey = qp.get("key") || qp.get("chave");
      if (qKey) {
        setActiveKey(qKey);
        setSearchKey(qKey);
      }
    }
  }, [params?.key, location]);

  // Query de verificação
  const { data: result, isLoading, error } = trpc.verification.verify.useQuery(
    { key: activeKey! },
    { enabled: !!activeKey, retry: false }
  );

  const handleSearch = () => {
    const trimmed = searchKey.trim().toUpperCase();
    if (!trimmed) { toast.error("Digite uma chave de verificação."); return; }
    setActiveKey(trimmed);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Chave copiada!");
  };

  const doc = result?.document;
  const statusKey = result
    ? result.found
      ? (doc?.status as keyof typeof STATUS_CONFIG) ?? "authentic"
      : "unavailable"
    : activeKey && !isLoading ? "unavailable" : null;

  const cfg = statusKey ? STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.authentic : null;
  const StatusIcon = cfg?.icon ?? Shield;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header institucional */}
      <div className="bg-blue-900 text-white py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-300" />
          <div>
            <h1 className="font-bold text-lg leading-tight">Verificação de Autenticidade de Documentos</h1>
            <p className="text-blue-300 text-sm">Portal de Verificação — Sistema de Gestão Pública</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Campo de busca */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              Consultar Documento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Digite a chave de verificação impressa no documento ou escaneie o QR Code.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: PMI-2026-000001-ABCD1234"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="font-mono"
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? "Verificando..." : "Verificar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-muted-foreground">Verificando autenticidade...</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && activeKey && cfg && (
          <Card className={`border-2 ${cfg.color}`}>
            {/* Status header */}
            <div className={`${cfg.headerColor} text-white px-5 py-3 flex items-center gap-2 rounded-t-lg`}>
              <StatusIcon className="w-5 h-5" />
              <span className="font-bold">{cfg.label}</span>
            </div>
            <CardContent className="pt-5 space-y-5">
              <p className="text-sm text-muted-foreground">{cfg.description}</p>

              {result?.found && doc && (
                <>
                  {/* Dados do documento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {doc.nup && (
                        <div className="flex items-start gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">NUP</p>
                            <p className="font-mono font-bold">{doc.nup}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Documento</p>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <Badge variant="outline" className="text-xs mt-0.5">{doc.documentType}</Badge>
                        </div>
                      </div>
                      {doc.documentNumber && (
                        <div className="flex items-start gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Número</p>
                            <p className="font-mono text-sm">{doc.documentNumber}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Emitido em</p>
                          <p className="text-sm">{formatDate(doc.issuedAt)}</p>
                        </div>
                      </div>
                      {doc.issuingUnit && (
                        <div className="flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Unidade Emissora</p>
                            <p className="text-sm">{doc.issuingUnit}</p>
                          </div>
                        </div>
                      )}
                      {doc.issuingUserName && (
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Emitido por</p>
                            <p className="text-sm">{doc.issuingUserName}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Chave + QR Code */}
                  <div className="flex gap-4 items-start">
                    <div className="bg-white p-2 rounded-lg border shadow-sm flex-shrink-0">
                      <QRCode value={window.location.href} size={80} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Chave de Verificação</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">{doc.verificationKey}</code>
                        <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => copyKey(doc.verificationKey)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Documento emitido em {formatDate(doc.issuedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Assinaturas */}
                  {result.signatures && result.signatures.length > 0 && doc && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-primary" />
                          Assinaturas Eletrônicas ({result.signatures.length})
                        </h3>
                        <div className="space-y-3">
                          {result.signatures.map((sig: {
                            id: number;
                            signatureOrder: number;
                            signerName: string;
                            signerRole?: string | null;
                            signerUnit?: string | null;
                            signerCpfMasked?: string | null;
                            signatureType: string;
                            signatureMethod?: string | null;
                            status: string;
                            signedAt: Date | string;
                            accessCode: string;
                          }) => (
                            <div key={sig.id} className="border rounded-lg p-3 bg-white space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                    {sig.signatureOrder}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{sig.signerName}</p>
                                    {sig.signerRole && <p className="text-xs text-muted-foreground">{sig.signerRole}</p>}
                                    {sig.signerUnit && <p className="text-xs text-muted-foreground">{sig.signerUnit}</p>}
                                  </div>
                                </div>
                                <Badge className={`text-xs ${sig.status === "valid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                  {sig.status === "valid" ? "Válida" : "Inválida"}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>{SIG_TYPE_LABELS[sig.signatureType] ?? sig.signatureType}</p>
                                {sig.signatureMethod && <p className="font-mono">{sig.signatureMethod}</p>}
                                <p>Assinado em {formatDate(sig.signedAt)}</p>
                                {sig.signerCpfMasked && <p className="font-mono">CPF: {sig.signerCpfMasked}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Chave não encontrada */}
              {!result && !isLoading && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Chave consultada: <code className="font-mono bg-muted px-1 rounded">{activeKey}</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verifique se a chave foi digitada corretamente e tente novamente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informações sobre o sistema */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">Sobre a verificação de documentos</p>
                <p className="text-xs text-blue-700">
                  Este portal permite verificar a autenticidade de documentos emitidos pelo sistema de gestão pública.
                  Cada documento recebe uma chave única e um QR Code que podem ser usados para confirmar sua validade.
                  Em caso de dúvidas, entre em contato com a unidade emissora.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
