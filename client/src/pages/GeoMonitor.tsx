/**
 * GeoMonitor — Georreferenciamento e mapa de ocorrências urbanas
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MapPin, Plus, Search, AlertCircle, Circle,
  ChevronRight, Navigation,
} from "lucide-react";

// Coordenadas de Itabaiana-PB
const ITABAIANA_CENTER = { lat: -7.3297, lng: -35.3330 };
const ITABAIANA_ZOOM = 13;

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; pinColor: string }> = {
  open: { label: "Aberto", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500", pinColor: "#3B82F6" },
  in_progress: { label: "Em Andamento", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500", pinColor: "#F59E0B" },
  resolved: { label: "Resolvido", color: "bg-green-100 text-green-700", dot: "bg-green-500", pinColor: "#10B981" },
  closed: { label: "Fechado", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400", pinColor: "#9CA3AF" },
};

const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: "bg-orange-100 text-orange-700",
  environment: "bg-green-100 text-green-700",
  security: "bg-red-100 text-red-700",
  health: "bg-pink-100 text-pink-700",
  education: "bg-blue-100 text-blue-700",
  other: "bg-gray-100 text-gray-600",
};

const CATEGORIES = [
  { value: "infrastructure", label: "Infraestrutura" },
  { value: "environment", label: "Meio Ambiente" },
  { value: "security", label: "Segurança" },
  { value: "health", label: "Saúde" },
  { value: "education", label: "Educação" },
  { value: "other", label: "Outros" },
];

export default function GeoMonitor() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", category: "infrastructure" as "infrastructure" | "environment" | "security" | "health" | "education" | "other",
    latitude: "", longitude: "", address: "", neighborhood: "",
  });

  const mainMapRef = useRef<google.maps.Map | null>(null);
  const createMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const createMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const { data: points = [], refetch } = trpc.publicServices.geo.points.list.useQuery({});
  const { data: events = [] } = trpc.publicServices.geo.events.list.useQuery({ status: "open" });

  const createPoint = trpc.publicServices.geo.points.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreate(false);
      toast.success("Ponto georreferenciado criado!");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateEventStatus = trpc.publicServices.geo.events.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status atualizado!"); },
  });

  const resetForm = () => setForm({
    title: "", description: "", category: "infrastructure",
    latitude: "", longitude: "", address: "", neighborhood: "",
  });

  const filteredPoints = (points as any[]).filter((p: any) =>
    (!search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.address?.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === "all" || p.status === statusFilter)
  );

  // Inicializa o mapa principal e adiciona marcadores
  const handleMainMapReady = useCallback((map: google.maps.Map) => {
    mainMapRef.current = map;
    // Adicionar marcadores para pontos existentes
    (points as any[]).forEach((p: any) => {
      if (!p.latitude || !p.longitude) return;
      const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.open;
      const pin = new google.maps.marker.PinElement({
        background: sc.pinColor,
        borderColor: "#fff",
        glyphColor: "#fff",
        scale: 1.1,
      });
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: Number(p.latitude), lng: Number(p.longitude) },
        title: p.name,
        content: pin.element,
      });
      marker.addListener("click", () => setSelected(p));
      markersRef.current.push(marker);
    });
  }, [points]);

  // Inicializa o mini-mapa no dialog de criação
  const handleCreateMapReady = useCallback((map: google.maps.Map) => {
    createMapRef.current = map;
    // Clique no mapa define as coordenadas
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat().toFixed(6);
      const lng = e.latLng.lng().toFixed(6);
      setForm(f => ({ ...f, latitude: lat, longitude: lng }));
      // Atualizar marcador
      if (createMarkerRef.current) {
        createMarkerRef.current.position = e.latLng;
      } else {
        createMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: e.latLng,
          title: "Novo ponto",
        });
      }
      // Geocodificar para preencher endereço
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: e.latLng }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          setForm(f => ({ ...f, address: results[0].formatted_address }));
        }
      });
    });
  }, []);

  // Centralizar mapa no ponto selecionado
  const flyToPoint = (p: any) => {
    if (mainMapRef.current && p.latitude && p.longitude) {
      mainMapRef.current.panTo({ lat: Number(p.latitude), lng: Number(p.longitude) });
      mainMapRef.current.setZoom(16);
    }
    setSelected(p);
  };

  return (
    <OmniLayout title="Geo Monitor">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Georreferenciamento</h1>
            <p className="text-gray-500 text-sm mt-0.5">Monitoramento de pontos e ocorrências urbanas — Itabaiana-PB</p>
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

        {/* Mapa principal — Itabaiana-PB */}
        <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Mapa Interativo — Itabaiana-PB</span>
            <span className="ml-auto text-xs text-gray-400">{(points as any[]).filter((p: any) => p.latitude && p.longitude).length} pontos mapeados</span>
          </div>
          <MapView
            className="w-full h-[420px]"
            initialCenter={ITABAIANA_CENTER}
            initialZoom={ITABAIANA_ZOOM}
            onMapReady={handleMainMapReady}
          />
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
                      <div
                        key={p.id}
                        className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => flyToPoint(p)}
                      >
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
          </div>
        </div>
      </div>

      {/* Create Point Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            {/* Mini-mapa para selecionar localização */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Localização <span className="text-xs text-gray-400 font-normal">(clique no mapa para definir as coordenadas)</span>
              </label>
              <div className="rounded-lg overflow-hidden border border-gray-300">
                <MapView
                  className="w-full h-[220px]"
                  initialCenter={ITABAIANA_CENTER}
                  initialZoom={13}
                  onMapReady={handleCreateMapReady}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <Input value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="-7.3259" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <Input value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="-35.8578" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Preenchido automaticamente ao clicar no mapa" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button
                onClick={() => createPoint.mutate({
                  latitude: form.latitude || String(ITABAIANA_CENTER.lat),
                  longitude: form.longitude || String(ITABAIANA_CENTER.lng),
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

      {/* Point Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          {selected && (
            <>
              <SheetHeader className="px-6 py-4 border-b border-border/60 bg-card/60 sticky top-0 z-10">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-5 h-5 text-primary" />{selected.name}
                </SheetTitle>
              </SheetHeader>
              <div className="p-6 space-y-4">
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                {selected.latitude && selected.longitude && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <MapView
                      className="w-full h-[200px]"
                      initialCenter={{ lat: Number(selected.latitude), lng: Number(selected.longitude) }}
                      initialZoom={16}
                      onMapReady={(map) => {
                        new google.maps.marker.AdvancedMarkerElement({
                          map,
                          position: { lat: Number(selected.latitude), lng: Number(selected.longitude) },
                          title: selected.name,
                        });
                      }}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {selected.address && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Endereço</p>
                      <p className="text-sm font-medium text-foreground">{selected.address}</p>
                    </div>
                  )}
                  {selected.latitude && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Coordenadas</p>
                      <p className="text-xs font-mono text-foreground">{Number(selected.latitude).toFixed(6)}, {Number(selected.longitude).toFixed(6)}</p>
                    </div>
                  )}
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", (STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.open).color)}>
                      {(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.open).label}
                    </span>
                  </div>
                </div>
                {selected.latitude && selected.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Navigation className="w-4 h-4" />
                    Abrir no Google Maps
                  </a>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </OmniLayout>
  );
}
