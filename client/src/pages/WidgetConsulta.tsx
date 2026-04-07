/**
 * WidgetConsulta — Página pública embeddável via <iframe>
 * Rota: /widget/consulta
 *
 * Permite ao cidadão acompanhar o status de um protocolo pelo NUP
 * ou listar todos os protocolos vinculados ao seu CPF/CNPJ.
 *
 * Código de incorporação:
 * <iframe src="https://SEU_DOMINIO/widget/consulta"
 *   width="100%" height="700" frameborder="0"
 *   style="border-radius:12px;border:1px solid #e5e7eb">
 * </iframe>
 *
 * Parâmetro opcional via URL:
 * /widget/consulta?nup=PMI-2026-000001  → pré-preenche e executa a busca
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useOrgConfig } from "@/hooks/useOrgConfig";
import { cn } from "@/lib/utils";
import {
  Search,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  ArrowLeft,
  Lock,
  RefreshCw,
  User,
  Calendar,
  Hash,
  Info,
  Circle,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:       { label: "Aberto",      color: "text-blue-600 bg-blue-50 border-blue-200",   icon: Circle },
  pending:    { label: "Pendente",    color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: Clock },
  in_progress:{ label: "Em andamento",color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: RefreshCw },
  concluded:  { label: "Concluído",   color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle },
  archived:   { label: "Arquivado",   color: "text-gray-500 bg-gray-50 border-gray-200",   icon: FileText },
  cancelled:  { label: "Cancelado",   color: "text-red-600 bg-red-50 border-red-200",      icon: AlertCircle },
  resolved:   { label: "Resolvido",   color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle },
  closed:     { label: "Encerrado",   color: "text-gray-600 bg-gray-50 border-gray-200",   icon: CheckCircle },
};

const ENTITY_LABELS: Record<string, string> = {
  protocol:  "Protocolo de Serviço",
  document:  "Documento Oficial",
  process:   "Processo Administrativo",
  ombudsman: "Manifestação de Ouvidoria",
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  forward:  ArrowRight,
  return:   ArrowLeft,
  assign:   User,
  conclude: CheckCircle,
  archive:  FileText,
  reopen:   RefreshCw,
  comment:  Info,
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function StatusBadge({ status }: { status?: string | null }) {
  const cfg = STATUS_CONFIG[status ?? ""] ?? {
    label: status ?? "Desconhecido",
    color: "text-gray-500 bg-gray-50 border-gray-200",
    icon: Circle,
  };
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border", cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── Linha do tempo de tramitações ───────────────────────────────────────────
function TramitationTimeline({ nup }: { nup: string }) {
  const { data: tramitations = [], isLoading } = trpc.caius.public.getTramitations.useQuery(
    { nup },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3 bg-gray-100 rounded w-1/3" />
              <div className="h-2.5 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if ((tramitations as any[]).length === 0) {
    return (
      <div className="mt-4 py-6 text-center">
        <Clock className="h-6 w-6 text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-400">Nenhuma movimentação registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 relative">
      {/* Linha vertical */}
      <div className="absolute left-3.5 top-4 bottom-4 w-px bg-gray-100" />

      <div className="space-y-4">
        {(tramitations as any[]).map((t: any, idx: number) => {
          const Icon = ACTION_ICONS[t.action] ?? Circle;
          const isLast = idx === (tramitations as any[]).length - 1;
          return (
            <div key={t.id} className="flex gap-3 relative">
              {/* Ícone */}
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10",
                isLast
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-gray-200 text-gray-400"
              )}>
                <Icon className="h-3 w-3" />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 pb-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-xs font-semibold", isLast ? "text-indigo-700" : "text-gray-700")}>
                    {t.actionLabel}
                  </p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatDateShort(t.createdAt)}
                  </span>
                </div>

                {(t.fromSector || t.toSector) && (
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                    {t.fromSector && <span>{t.fromSector}</span>}
                    {t.fromSector && t.toSector && <ChevronRight className="h-2.5 w-2.5 text-gray-300" />}
                    {t.toSector && <span className="font-medium text-gray-600">{t.toSector}</span>}
                  </p>
                )}

                {t.dispatch && (
                  <p className="text-[11px] text-gray-500 mt-1 italic leading-relaxed border-l-2 border-gray-100 pl-2">
                    {t.dispatch}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detalhe de um protocolo ──────────────────────────────────────────────────
function ProtocolDetail({
  result,
  onBack,
}: {
  result: { entity: string; data: any };
  onBack: () => void;
}) {
  const { entity, data } = result;
  const entityLabel = ENTITY_LABELS[entity] ?? "Registro";
  const title = data.subject ?? data.title ?? "Sem título";

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Voltar
        </button>
        <span className="text-xs text-gray-400">{entityLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* NUP + Status */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono text-gray-400 mb-0.5">NUP</p>
            <p className="text-base font-bold text-gray-900 font-mono">{data.nup}</p>
          </div>
          <StatusBadge status={data.status} />
        </div>

        {/* Título */}
        {!data.isConfidential && (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 mb-0.5">Assunto</p>
            <p className="text-sm font-semibold text-gray-800 leading-snug">{title}</p>
          </div>
        )}

        {/* Sigiloso */}
        {data.isConfidential && (
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
            <Lock className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">Registro Sigiloso</p>
              <p className="text-[11px] text-red-500 mt-0.5">
                As informações detalhadas deste registro são restritas.
              </p>
            </div>
          </div>
        )}

        {/* Metadados */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-gray-400">Aberto em</p>
              <p className="text-xs font-medium text-gray-700">{formatDate(data.createdAt)}</p>
            </div>
          </div>
          <div className="flex gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
            <RefreshCw className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-gray-400">Atualizado</p>
              <p className="text-xs font-medium text-gray-700">{formatDate(data.updatedAt)}</p>
            </div>
          </div>
          {data.type && (
            <div className="flex gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 col-span-2">
              <Hash className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-gray-400">Tipo</p>
                <p className="text-xs font-medium text-gray-700">{data.type}</p>
              </div>
            </div>
          )}
        </div>

        {/* Linha do tempo — apenas para protocolos */}
        {entity === "protocol" && !data.isConfidential && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              Histórico de Tramitações
            </p>
            <TramitationTimeline nup={data.nup} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Card de resultado (lista CPF/CNPJ) ──────────────────────────────────────
function ResultCard({ result, onClick }: { result: { entity: string; data: any }; onClick: () => void }) {
  const { entity, data } = result;
  const title = data.subject ?? data.title ?? "Sem título";
  const entityLabel = ENTITY_LABELS[entity] ?? "Registro";

  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
        <FileText className="h-4 w-4 text-indigo-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-bold text-gray-800 font-mono truncate">{data.nup}</p>
          <StatusBadge status={data.status} />
        </div>
        <p className="text-[11px] text-gray-500 truncate">{data.isConfidential ? "REGISTRO SIGILOSO" : title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{entityLabel}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
type SearchMode = "nup" | "cpf";

export default function WidgetConsulta() {
  const org = useOrgConfig();

  // Pré-preenche NUP via query string ?nup=PMI-2026-...
  // Base URL do CAIUS — garante links absolutos mesmo dentro de iframe em portal externo
  const CAIUS_ORIGIN = window.location.origin;
  const urlParams = new URLSearchParams(window.location.search);
  const initialNup = urlParams.get("nup") ?? "";

  const [mode, setMode] = useState<SearchMode>("nup");
  const [nupInput, setNupInput] = useState(initialNup);
  const [cpfInput, setCpfInput] = useState("");
  const [submitted, setSubmitted] = useState(!!initialNup);
  const [selectedResult, setSelectedResult] = useState<{ entity: string; data: any } | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const nupQuery = trpc.caius.public.lookupNup.useQuery(
    { nup: nupInput.trim() },
    { enabled: submitted && mode === "nup" && nupInput.trim().length > 0, staleTime: 30_000 }
  );

  const cpfQuery = trpc.caius.public.lookupByCpfCnpj.useQuery(
    { cpfCnpj: cpfInput.trim() },
    { enabled: submitted && mode === "cpf" && cpfInput.trim().length >= 3, staleTime: 30_000 }
  );

  // Auto-seleciona quando há um único resultado NUP
  useEffect(() => {
    if (mode === "nup" && nupQuery.data && !selectedResult) {
      setSelectedResult(nupQuery.data as any);
    }
  }, [nupQuery.data]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedResult(null);
    setSubmitted(true);
  };

  const handleModeChange = (m: SearchMode) => {
    setMode(m);
    setSubmitted(false);
    setSelectedResult(null);
  };

  const handleBack = () => setSelectedResult(null);

  // ── Estado de loading / erro ───────────────────────────────────────────────
  const isLoading = mode === "nup" ? nupQuery.isLoading : cpfQuery.isLoading;
  const cpfResults = (cpfQuery.data ?? []) as { entity: string; data: any }[];
  const nupNotFound = submitted && mode === "nup" && !nupQuery.isLoading && !nupQuery.data && nupInput.trim();
  const cpfNotFound = submitted && mode === "cpf" && !cpfQuery.isLoading && cpfResults.length === 0 && cpfInput.trim();

  // ── Renderização ───────────────────────────────────────────────────────────
  if (selectedResult) {
    return (
      <div className="h-full bg-gray-50" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div className="bg-indigo-700 px-4 py-3">
          <div className="flex items-center gap-2.5">
            {org.logoUrl && (
              <img src={org.logoUrl} alt={org.orgName} className="h-7 w-auto object-contain brightness-0 invert opacity-90" />
            )}
            <div>
              <p className="text-white font-bold text-sm leading-tight">{org.orgName}</p>
              <p className="text-indigo-200 text-xs">Consulta de Protocolo</p>
            </div>
          </div>
        </div>
        <ProtocolDetail result={selectedResult} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-gray-50"
      style={{ minHeight: "100%", fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Header institucional */}
      <div className="bg-indigo-700 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {org.logoUrl && (
            <img src={org.logoUrl} alt={org.orgName} className="h-7 w-auto object-contain brightness-0 invert opacity-90" />
          )}
          <div>
            <p className="text-white font-bold text-sm leading-tight">{org.orgName}</p>
            <p className="text-indigo-200 text-xs">Consulta de Protocolo</p>
          </div>
        </div>
      </div>

      {/* Formulário de busca */}
      <div className="px-4 py-4 bg-white border-b border-gray-100 shadow-sm">
        {/* Toggle NUP / CPF */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleModeChange("nup")}
            className={cn(
              "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
              mode === "nup"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Por NUP
          </button>
          <button
            onClick={() => handleModeChange("cpf")}
            className={cn(
              "flex-1 text-xs font-semibold py-1.5 rounded-md transition-all",
              mode === "cpf"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Por CPF / CNPJ
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          {mode === "nup" ? (
            <input
              type="text"
              value={nupInput}
              onChange={(e) => { setNupInput(e.target.value); setSubmitted(false); }}
              placeholder="Ex: PMI-2026-000001"
              className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 font-mono transition-all"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={cpfInput}
              onChange={(e) => { setCpfInput(e.target.value); setSubmitted(false); }}
              placeholder="Digite seu CPF ou CNPJ"
              className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
              autoFocus
            />
          )}
          <button
            type="submit"
            disabled={isLoading || (mode === "nup" ? !nupInput.trim() : cpfInput.trim().length < 3)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </button>
        </form>

        {mode === "nup" && (
          <p className="text-[10px] text-gray-400 mt-2">
            O NUP foi informado no comprovante de solicitação do serviço.
          </p>
        )}
        {mode === "cpf" && (
          <p className="text-[10px] text-gray-400 mt-2">
            Serão listados todos os protocolos vinculados ao CPF ou CNPJ informado.
          </p>
        )}
      </div>

      {/* Resultados */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin" />
            <p className="text-sm text-gray-500">Consultando...</p>
          </div>
        )}

        {/* NUP não encontrado */}
        {nupNotFound && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-gray-300" />
            <div>
              <p className="text-sm font-semibold text-gray-600">NUP não encontrado</p>
              <p className="text-xs text-gray-400 mt-1">
                Verifique se o número foi digitado corretamente.
              </p>
            </div>
          </div>
        )}

        {/* CPF não encontrado */}
        {cpfNotFound && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <AlertCircle className="h-8 w-8 text-gray-300" />
            <div>
              <p className="text-sm font-semibold text-gray-600">Nenhum protocolo encontrado</p>
              <p className="text-xs text-gray-400 mt-1">
                Nenhum registro foi localizado para este CPF/CNPJ.
              </p>
            </div>
          </div>
        )}

        {/* Lista de resultados CPF/CNPJ */}
        {mode === "cpf" && !isLoading && cpfResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-3">
              {cpfResults.length} protocolo{cpfResults.length !== 1 ? "s" : ""} encontrado{cpfResults.length !== 1 ? "s" : ""}
            </p>
            {cpfResults.map((r: any, i: number) => (
              <ResultCard key={i} result={r} onClick={() => setSelectedResult(r)} />
            ))}
          </div>
        )}

        {/* Estado inicial (sem busca) */}
        {!submitted && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Search className="h-7 w-7 text-indigo-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Consulte seu protocolo</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                Informe o NUP ou seu CPF/CNPJ para acompanhar o andamento da sua solicitação.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-white text-center">
        <p className="text-[10px] text-gray-400">
          <a
            href={`${CAIUS_ORIGIN}/central-cidadao`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            Acessar a Central do Cidadão
          </a>
          {" · "}
          {org.orgName}
        </p>
      </div>
    </div>
  );
}
