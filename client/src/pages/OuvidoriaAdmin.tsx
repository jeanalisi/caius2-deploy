/**
 * OuvidoriaAdmin — Gestão interna de manifestações da Ouvidoria / e-SIC
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Search, Filter, Eye, CheckCircle2, Clock,
  AlertCircle, Archive, Star, FileText, Users, Send, ChevronRight,
  MoreHorizontal, Calendar, Shield, User,
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

export default function OuvidoriaAdmin() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");

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

  const respond = trpc.publicServices.ouvidoria.respond.useMutation({
    onSuccess: () => { refetch(); toast.success("Resposta enviada!"); setSelected(null); setResponse(""); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.publicServices.ouvidoria.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const openDetail = (m: any) => {
    setSelected(m);
    setResponse(m.response ?? "");
    setNewStatus(m.status);
  };

  const st = stats as any;

  return (
    <OmniLayout title="Ouvidoria — Gestão">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ouvidoria / e-SIC</h1>
            <p className="text-gray-500 text-sm mt-0.5">Gestão de manifestações, reclamações e pedidos de informação</p>
          </div>
        </div>

        {/* Stats */}
        {st && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{st.total ?? 0}</p>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <p className="text-xs text-blue-600 mb-1">Recebidas</p>
              <p className="text-2xl font-bold text-blue-700">{st.received ?? 0}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
              <p className="text-xs text-yellow-600 mb-1">Em Análise</p>
              <p className="text-2xl font-bold text-yellow-700">{st.inAnalysis ?? 0}</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <p className="text-xs text-green-600 mb-1">Respondidas</p>
              <p className="text-2xl font-bold text-green-700">{st.answered ?? 0}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por NUP, assunto ou requerente..." className="pl-9" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="all">Todos os tipos</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">NUP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assunto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Requerente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(manifestations as any[]).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma manifestação encontrada</p>
                    </td>
                  </tr>
                ) : (
                  (manifestations as any[]).map((m: any) => {
                    const tc = TYPE_CONFIG[m.type] ?? { label: m.type, color: "bg-gray-100 text-gray-600" };
                    const sc = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.received;
                    const SIcon = sc.icon;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openDetail(m)}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{m.nup}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", tc.color)}>{tc.label}</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="truncate text-gray-900">{m.subject}</p>
                          {m.isAnonymous && <span className="text-xs text-gray-400">Anônimo</span>}
                          {m.isConfidential && <span className="text-xs text-orange-500 ml-1">Sigiloso</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{m.requesterName ?? (m.isAnonymous ? "Anônimo" : "—")}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", sc.color)}>
                            <SIcon className="w-3 h-3" />{sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-gray-300" />
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

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Manifestação — {selected?.nup}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 py-2">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Tipo</p>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", (TYPE_CONFIG[selected.type] ?? { color: "bg-gray-100 text-gray-600" }).color)}>
                    {(TYPE_CONFIG[selected.type] ?? { label: selected.type }).label}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Status atual</p>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="text-xs border-0 bg-transparent focus:outline-none font-medium text-gray-900 w-full">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                {selected.requesterName && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Requerente</p>
                    <p className="text-sm font-medium text-gray-900">{selected.requesterName}</p>
                    {selected.requesterEmail && <p className="text-xs text-gray-400">{selected.requesterEmail}</p>}
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Registrada em</p>
                  <p className="text-sm font-medium text-gray-900">{new Date(selected.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              {/* Flags */}
              <div className="flex gap-2">
                {selected.isAnonymous && <Badge variant="outline" className="text-xs gap-1"><User className="w-3 h-3" />Anônimo</Badge>}
                {selected.isConfidential && <Badge variant="outline" className="text-xs gap-1 text-orange-600 border-orange-300"><Shield className="w-3 h-3" />Sigiloso</Badge>}
              </div>

              {/* Subject + Description */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">{selected.subject}</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
              </div>

              {/* Response */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resposta da Ouvidoria</label>
                <textarea
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                  rows={4}
                  placeholder="Digite a resposta para o cidadão..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: selected.id, status: newStatus as any })}
                  disabled={updateStatus.isPending || newStatus === selected.status}
                >
                  Atualizar Status
                </Button>
                <Button
                  onClick={() => respond.mutate({ manifestationId: selected.id, content: response, responseType: "citizen" })}
                  disabled={!response.trim() || respond.isPending}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />Enviar Resposta
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
