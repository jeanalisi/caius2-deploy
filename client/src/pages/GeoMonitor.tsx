/**
 * GeoMonitor — Georreferenciamento e mapa de ocorrências urbanas
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MapPin, Plus, Search, Filter, Eye, CheckCircle2, Clock,
  AlertCircle, Archive, Camera, Tag, ChevronRight, MoreHorizontal,
  Layers, Navigation, Circle,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  open: { label: "Aberto", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  in_progress: { label: "Em Andamento", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  resolved: { label: "Resolvido", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  closed: { label: "Fechado", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: "bg-orange-100 text-orange-700",
  environment: "bg-green-100 text-green-700",
  security: "bg-red-100 text-red-700",
  health: "bg-pink-100 text-pink-700",
  education: "bg-blue-100 text-blue-700",
  other: "bg-gray-100 text-gray-600",
};

export default function GeoMonitor() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", category: "infrastructure" as "infrastructure" | "environment" | "security" | "health" | "education" | "other",
    latitude: "", longitude: "", address: "", neighborhood: "",
  });

  const { data: points = [], refetch } = trpc.publicServices.geo.points.list.useQuery({});

  const { data: events = [] } = trpc.publicServices.geo.events.list.useQuery({
    status: "open",
  });

  const createPoint = trpc.publicServices.geo.points.create.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); toast.success("Ponto georreferenciado criado!"); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const createEvent = trpc.publicServices.geo.events.create.useMutation({
    onSuccess: () => { refetch(); toast.success("Ocorrência registrada!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEventStatus = trpc.publicServices.geo.events.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status atualizado!"); },
  });

  const resetForm = () => setForm({ title: "", description: "", category: "infrastructure", latitude: "", longitude: "", address: "", neighborhood: "" });

  const filteredPoints = (points as any[]).filter((p: any) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.address?.toLowerCase().includes(search.toLowerCase())
  );

  const CATEGORIES = [
    { value: "infrastructure", label: "Infraestrutura" },
    { value: "environment", label: "Meio Ambiente" },
    { value: "security", label: "Segurança" },
    { value: "health", label: "Saúde" },
    { value: "education", label: "Educação" },
    { value: "other", label: "Outros" },
  ];

  return (
    <OmniLayout title="Geo Monitor">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Georreferenciamento</h1>
            <p className="text-gray-500 text-sm mt-0.5">Monitoramento de pontos e ocorrências urbanas georreferenciadas</p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} className="gap-2">
            <Plus className="w-4 h-4" />Novo Ponto
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total de Pontos", value: (points as any[]).length, color: "text-gray-900", bg: "bg-white" },
            { label: "Ocorrências Abertas", value: (events as any[]).filter((e: any) => e.status === "open").length, color: "text-blue-700", bg: "bg-blue-50" },
            { label: "Em Andamento", value: (events as any[]).filter((e: any) => e.status === "in_progress").length, color: "text-yellow-700", bg: "bg-yellow-50" },
            { label: "Resolvidas", value: (events as any[]).filter((e: any) => e.status === "resolved").length, color: "text-green-700", bg: "bg-green-50" },
          ].map(s => (
            <div key={s.label} className={cn("rounded-xl border border-gray-200 p-4", s.bg)}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Points list */}
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pontos..." className="pl-9" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="all">Todos</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />Pontos Cadastrados ({filteredPoints.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {filteredPoints.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum ponto encontrado</p>
                  </div>
                ) : (
                  filteredPoints.map((p: any) => {
                    const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.open;
                    const cc = CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS.other;
                    return (
                      <div key={p.id} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(p)}>
                        <div className="mt-0.5">
                          <div className={cn("w-2.5 h-2.5 rounded-full mt-1", sc.dot)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                            {p.category && <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", cc)}>{p.category}</span>}
                          </div>
                          {p.address && <p className="text-xs text-gray-400 truncate">{p.address}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>{sc.label}</span>
                            {p.latitude && p.longitude && (
                              <span className="text-[10px] text-gray-400 font-mono">{Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Events list */}
          <div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />Ocorrências Recentes
                </h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {(events as any[]).length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Circle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma ocorrência aberta</p>
                  </div>
                ) : (
                  (events as any[]).map((e: any) => {
                    const sc = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.open;
                    return (
                      <div key={e.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                            {e.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{e.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>{sc.label}</span>
                              <span className="text-[10px] text-gray-400">{new Date(e.createdAt).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>
                          {e.status === "open" && (
                            <button
                              onClick={() => updateEventStatus.mutate({ id: e.id, status: "in_progress" })}
                              className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors shrink-0"
                            >
                              Iniciar
                            </button>
                          )}
                          {e.status === "in_progress" && (
                            <button
                              onClick={() => updateEventStatus.mutate({ id: e.id, status: "resolved" })}
                              className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors shrink-0"
                            >
                              Resolver
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Map placeholder */}
            <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 text-center">
              <Navigation className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-blue-700 mb-1">Mapa Interativo</p>
              <p className="text-xs text-blue-500">Integração com Google Maps disponível — configure a chave de API nas configurações para visualizar os pontos no mapa.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Point Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />Novo Ponto Georreferenciado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nome do ponto" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <Input value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="-10.9234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <Input value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="-37.4234" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button
                onClick={() => createPoint.mutate({
                  latitude: form.latitude || "0",
                  longitude: form.longitude || "0",
                  address: form.address || undefined,
                  neighborhood: form.neighborhood || undefined,
                  entityType: form.category,
                })}
                disabled={!form.title || createPoint.isPending}
                className="gap-2"
              >
                <MapPin className="w-4 h-4" />Criar Ponto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Point Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />{selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              {selected.description && <p className="text-sm text-gray-600">{selected.description}</p>}
              <div className="grid grid-cols-2 gap-3">
                {selected.address && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Endereço</p>
                    <p className="text-sm font-medium text-gray-900">{selected.address}</p>
                  </div>
                )}
                {selected.latitude && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Coordenadas</p>
                    <p className="text-xs font-mono text-gray-900">{Number(selected.latitude).toFixed(6)}, {Number(selected.longitude).toFixed(6)}</p>
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", (STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.open).color)}>
                    {(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.open).label}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
