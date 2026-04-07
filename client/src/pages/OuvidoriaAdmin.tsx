/**
 * OuvidoriaAdmin — Gestão interna de manifestações da Ouvidoria / e-SIC
 * Layout split-view: lista à esquerda, detalhe inline à direita.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useOrgConfig } from "@/hooks/useOrgConfig";
import {
  MessageSquare, Search, CheckCircle2, Clock,
  AlertCircle, Archive, Send, ChevronRight,
  Shield, User, FileDown, X, History, MessageCircle,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  complaint: { label: "Reclamação", color: "bg-orange-100 text-orange-700" },
  denounce: { label: "Denúncia", color: "bg-red-100 text-red-700" },
  praise: { label: "Elogio", color: "bg-green-100 text-green-700" },
  suggestion: { label: "Sugestão", color: "bg-blue-100 text-blue-700" },
  request: { label: "Solicitação", color: "bg-indigo-100 text-indigo-700" },
  esic: { label: "e-SIC (LAI)", color: "bg-purple-100 text-purple-700" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  received: { label: "Recebida", color: "bg-blue-100 text-blue-700", icon: Clock },
  in_analysis: { label: "Em Análise", color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
  in_progress: { label: "Em Andamento", color: "bg-indigo-100 text-indigo-700", icon: CheckCircle2 },
  answered: { label: "Respondida", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  archived: { label: "Arquivada", color: "bg-gray-100 text-gray-600", icon: Archive },
};

const STATUS_LABELS: Record<string, string> = {
  received: "Recebida", in_analysis: "Em Análise", in_progress: "Em Andamento",
  answered: "Respondida", archived: "Arquivada",
};

const TYPE_LABELS: Record<string, string> = {
  complaint: "Reclamação", denounce: "Denúncia", praise: "Elogio",
  suggestion: "Sugestão", request: "Solicitação", esic: "e-SIC (LAI)",
};

function fmt(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── PDF Export ────────────────────────────────────────────────────────────────
function buildOuvidoriaPdf(m: any, detail: any, appTitle: string): string {
  const history: any[] = detail?.history ?? [];
  const responses: any[] = detail?.responses ?? [];

  const histRows = history.map((h: any) => `
    <tr>
      <td>${fmt(h.createdAt)}</td>
      <td>${STATUS_LABELS[h.toStatus] ?? h.toStatus}</td>
      <td>${h.changedByName ?? "—"}</td>
      <td>${h.note ?? "—"}</td>
    </tr>`).join("");

  const respRows = responses.map((r: any) => `
    <div class="resp-block">
      <div class="resp-meta">${fmt(r.createdAt)} — ${r.responseType === "citizen" ? "Resposta ao Cidadão" : r.responseType === "internal" ? "Nota Interna" : r.responseType}</div>
      <div class="resp-content">${r.content ?? ""}</div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Ouvidoria ${m.nup}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20mm 20mm 15mm 20mm; }
    h2 { font-size: 13px; font-weight: bold; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; color: #333; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; border-bottom: 2px solid #1a3a6b; padding-bottom: 10px; }
    .nup-badge { display: inline-block; background: #1a3a6b; color: #fff; font-family: monospace; font-size: 13px; font-weight: bold; padding: 4px 12px; border-radius: 4px; margin-bottom: 6px; }
    .status-badge { display: inline-block; background: #e8f0fe; color: #1a3a6b; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 10px; border: 1px solid #1a3a6b; margin-left: 8px; }
    .subject { font-size: 14px; font-weight: bold; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 8px; }
    .field { display: flex; gap: 4px; }
    .field-label { color: #666; min-width: 90px; }
    .field-value { font-weight: 500; }
    .description-box { background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 8px; line-height: 1.5; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px; }
    th { background: #1a3a6b; color: #fff; padding: 5px 6px; text-align: left; font-size: 10px; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .resp-block { background: #f0f4ff; border-left: 3px solid #1a3a6b; padding: 8px 10px; margin-bottom: 8px; border-radius: 0 4px 4px 0; }
    .resp-meta { font-size: 9px; color: #666; margin-bottom: 4px; }
    .resp-content { font-size: 11px; line-height: 1.5; white-space: pre-wrap; }
    .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9px; color: #888; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${appTitle} — Ouvidoria / e-SIC</div>
      <div class="nup-badge">${m.nup}</div>
      <span class="status-badge">${STATUS_LABELS[m.status] ?? m.status}</span>
      <div class="subject">${m.subject}</div>
    </div>
    <div style="text-align:right;font-size:9px;color:#666;">
      <div>Emitido em: ${fmt(new Date())}</div>
      <div>Abertura: ${fmt(m.createdAt)}</div>
    </div>
  </div>

  <h2>Informações da Manifestação</h2>
  <div class="grid">
    <div class="field"><span class="field-label">Tipo:</span><span class="field-value">${TYPE_LABELS[m.type] ?? m.type}</span></div>
    <div class="field"><span class="field-label">Status:</span><span class="field-value">${STATUS_LABELS[m.status] ?? m.status}</span></div>
    ${m.requesterName ? `<div class="field"><span class="field-label">Requerente:</span><span class="field-value">${m.requesterName}</span></div>` : ""}
    ${m.requesterEmail ? `<div class="field"><span class="field-label">E-mail:</span><span class="field-value">${m.requesterEmail}</span></div>` : ""}
    ${m.requesterPhone ? `<div class="field"><span class="field-label">Telefone:</span><span class="field-value">${m.requesterPhone}</span></div>` : ""}
    ${m.isAnonymous ? `<div class="field"><span class="field-label">Identificação:</span><span class="field-value">Anônimo</span></div>` : ""}
    ${m.isConfidential ? `<div class="field"><span class="field-label">Sigilo:</span><span class="field-value" style="color:#b91c1c;font-weight:bold">SIGILOSO</span></div>` : ""}
  </div>

  ${m.description ? `<h2>Descrição</h2><div class="description-box">${m.description}</div>` : ""}

  <h2>Histórico de Tramitação (${history.length})</h2>
  ${history.length === 0 ? `<p style="color:#888;font-style:italic">Nenhuma tramitação registrada.</p>` : `
  <table>
    <thead><tr><th>Data/Hora</th><th>Status</th><th>Responsável</th><th>Observação</th></tr></thead>
    <tbody>${histRows}</tbody>
  </table>`}

  <h2>Respostas e Notas (${responses.length})</h2>
  ${responses.length === 0 ? `<p style="color:#888;font-style:italic">Nenhuma resposta registrada.</p>` : respRows}

  <div class="footer">
    <span>${appTitle} — Ouvidoria / e-SIC</span>
    <span>NUP: ${m.nup} | Emitido em: ${fmt(new Date())}</span>
  </div>
</body>
</html>`;
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────
function OuvidoriaDetailPanel({
  manifestation,
  onClose,
  onUpdated,
}: {
  manifestation: any;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState(manifestation.status);
  const { orgName } = useOrgConfig();

  // Buscar detalhes completos (histórico + respostas)
  const { data: detail } = trpc.publicServices.ouvidoria.get.useQuery(
    { id: manifestation.id },
    { enabled: !!manifestation.id }
  );

  const respond = trpc.publicServices.ouvidoria.respond.useMutation({
    onSuccess: () => {
      toast.success("Resposta enviada!");
      setResponse("");
      onUpdated();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.publicServices.ouvidoria.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      onUpdated();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleExportPdf = () => {
    const appTitle = orgName || (import.meta.env.VITE_APP_TITLE as string) || "CAIUS";
    const html = buildOuvidoriaPdf(manifestation, detail, appTitle);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Permita pop-ups para exportar o PDF."); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 300);
  };

  const tc = TYPE_CONFIG[manifestation.type] ?? { label: manifestation.type, color: "bg-gray-100 text-gray-600" };
  const sc = STATUS_CONFIG[manifestation.status] ?? STATUS_CONFIG.received;
  const SIcon = sc.icon;
  const history: any[] = (detail as any)?.history ?? [];
  const responses: any[] = (detail as any)?.responses ?? [];

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-mono text-xs text-gray-500">{manifestation.nup}</span>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", tc.color)}>{tc.label}</span>
          </div>
          <p className="font-semibold text-gray-900 text-sm leading-snug">{manifestation.subject}</p>
        </div>
        <div className="flex items-center gap-1 ml-3 shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1.5 text-xs h-7 px-2">
            <FileDown className="w-3.5 h-3.5" />PDF
          </Button>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", sc.color)}>
              <SIcon className="w-3 h-3" />{sc.label}
            </span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Registrada em</p>
            <p className="text-sm font-medium text-gray-900">{new Date(manifestation.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
          {manifestation.requesterName && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 col-span-2">
              <p className="text-xs text-gray-500 mb-1">Requerente</p>
              <p className="text-sm font-medium text-gray-900">{manifestation.requesterName}</p>
              {manifestation.requesterEmail && <p className="text-xs text-gray-400">{manifestation.requesterEmail}</p>}
              {manifestation.requesterPhone && <p className="text-xs text-gray-400">{manifestation.requesterPhone}</p>}
            </div>
          )}
        </div>

        {/* Flags */}
        {(manifestation.isAnonymous || manifestation.isConfidential) && (
          <div className="flex gap-2">
            {manifestation.isAnonymous && <Badge variant="outline" className="text-xs gap-1"><User className="w-3 h-3" />Anônimo</Badge>}
            {manifestation.isConfidential && <Badge variant="outline" className="text-xs gap-1 text-orange-600 border-orange-300"><Shield className="w-3 h-3" />Sigiloso</Badge>}
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">{manifestation.subject}</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{manifestation.description}</p>
        </div>

        {/* Histórico de tramitação */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />Histórico de Tramitação ({history.length})
            </p>
            <div className="space-y-2">
              {history.map((h: any, i: number) => (
                <div key={i} className="flex gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="text-gray-400">{fmt(h.createdAt)}</span>
                    {" — "}
                    <span className="font-medium text-gray-700">{STATUS_LABELS[h.toStatus] ?? h.toStatus}</span>
                    {h.changedByName && <span className="text-gray-400"> por {h.changedByName}</span>}
                    {h.note && <p className="text-gray-500 mt-0.5">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Respostas anteriores */}
        {responses.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />Respostas ({responses.length})
            </p>
            <div className="space-y-2">
              {responses.map((r: any, i: number) => (
                <div key={i} className="bg-blue-50 border-l-2 border-blue-400 rounded-r-lg px-3 py-2">
                  <p className="text-xs text-gray-400 mb-1">{fmt(r.createdAt)} — {r.responseType === "citizen" ? "Resposta ao Cidadão" : r.responseType === "internal" ? "Nota Interna" : r.responseType}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atualizar status */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alterar Status</p>
          <div className="flex gap-2">
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate({ id: manifestation.id, status: newStatus as any })}
              disabled={updateStatus.isPending || newStatus === manifestation.status}
            >
              Salvar
            </Button>
          </div>
        </div>

        {/* Nova resposta */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nova Resposta</p>
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            rows={4}
            placeholder="Digite a resposta para o cidadão..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          <Button
            className="mt-2 w-full gap-2"
            onClick={() => respond.mutate({ manifestationId: manifestation.id, content: response, responseType: "citizen" })}
            disabled={!response.trim() || respond.isPending}
          >
            <Send className="w-4 h-4" />Enviar Resposta
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function OuvidoriaAdmin() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const { data: manifestations = [], refetch } = trpc.publicServices.ouvidoria.list.useQuery({
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter as any : undefined,
    status: statusFilter !== "all" ? statusFilter as any : undefined,
  });

  const { data: statsData } = trpc.publicServices.dashboard.kpis.useQuery();
  const stats = statsData ? {
    total: (statsData as any).totalManifestations ?? 0,
    received: (statsData as any).pendingManifestations ?? 0,
    inAnalysis: 0,
    answered: 0,
  } : null;

  const st = stats as any;

  return (
    <OmniLayout title="Ouvidoria — Gestão">
      <div className="flex h-full overflow-hidden">
        {/* ── Painel esquerdo: lista ── */}
        <div className={cn(
          "flex flex-col transition-all duration-200",
          selected ? "w-[420px] min-w-[320px] shrink-0" : "flex-1"
        )}>
          <div className="p-6 pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ouvidoria / e-SIC</h1>
                <p className="text-gray-500 text-sm mt-0.5">Gestão de manifestações, reclamações e pedidos de informação</p>
              </div>
            </div>

            {/* Stats */}
            {st && !selected && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{st.total ?? 0}</p>
                </div>
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-3">
                  <p className="text-xs text-blue-600 mb-1">Recebidas</p>
                  <p className="text-2xl font-bold text-blue-700">{st.received ?? 0}</p>
                </div>
                <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-3">
                  <p className="text-xs text-yellow-600 mb-1">Em Análise</p>
                  <p className="text-2xl font-bold text-yellow-700">{st.inAnalysis ?? 0}</p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-3">
                  <p className="text-xs text-green-600 mb-1">Respondidas</p>
                  <p className="text-2xl font-bold text-green-700">{st.answered ?? 0}</p>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-2 mb-3">
              <div className="relative">
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por NUP, assunto ou requerente..." className="pl-9 text-sm h-9" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <div className="flex gap-2">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="all">Todos os tipos</option>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="all">Todos os status</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">NUP</th>
                      {!selected && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assunto</th>
                      {!selected && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Requerente</th>}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(manifestations as any[]).length === 0 ? (
                      <tr>
                        <td colSpan={selected ? 4 : 6} className="text-center py-12 text-gray-400">
                          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                          <p>Nenhuma manifestação encontrada</p>
                        </td>
                      </tr>
                    ) : (
                      (manifestations as any[]).map((m: any) => {
                        const tc = TYPE_CONFIG[m.type] ?? { label: m.type, color: "bg-gray-100 text-gray-600" };
                        const sc = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.received;
                        const SIcon = sc.icon;
                        const isActive = selected?.id === m.id;
                        return (
                          <tr
                            key={m.id}
                            className={cn(
                              "hover:bg-gray-50 transition-colors cursor-pointer",
                              isActive && "bg-blue-50 border-l-2 border-blue-500"
                            )}
                            onClick={() => setSelected(isActive ? null : m)}
                          >
                            <td className="px-4 py-3 font-mono text-xs text-gray-700">{m.nup}</td>
                            {!selected && (
                              <td className="px-4 py-3">
                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", tc.color)}>{tc.label}</span>
                              </td>
                            )}
                            <td className="px-4 py-3 max-w-[180px]">
                              <p className="truncate text-gray-900 text-xs">{m.subject}</p>
                              {m.isAnonymous && <span className="text-xs text-gray-400">Anônimo</span>}
                            </td>
                            {!selected && (
                              <td className="px-4 py-3 text-gray-600 text-xs">{m.requesterName ?? (m.isAnonymous ? "Anônimo" : "—")}</td>
                            )}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", sc.color)}>
                                <SIcon className="w-3 h-3" />{sc.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <ChevronRight className={cn("w-4 h-4 text-gray-300 transition-transform", isActive && "rotate-90 text-blue-500")} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── Painel direito: detalhe inline ── */}
        {selected && (
          <div className="flex-1 overflow-hidden border-l border-gray-200">
            <OuvidoriaDetailPanel
              manifestation={selected}
              onClose={() => setSelected(null)}
              onUpdated={() => { refetch(); }}
            />
          </div>
        )}
      </div>
    </OmniLayout>
  );
}
