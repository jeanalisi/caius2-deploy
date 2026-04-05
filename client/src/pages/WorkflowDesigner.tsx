/**
 * WorkflowDesigner — Motor de Workflow Visual
 * Criação e gestão de fluxos de trabalho com etapas, condições e SLA
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GitBranch, Plus, Play, Pause, Archive, Eye, Edit2, Trash2,
  Clock, CheckCircle2, AlertCircle, Settings, ChevronRight,
  ArrowRight, Circle, Square, Diamond, MoreHorizontal, Zap,
  Users, FileText, Bell, Mail, Code, Filter, Timer,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700", icon: Circle },
  active: { label: "Ativo", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  paused: { label: "Pausado", color: "bg-yellow-100 text-yellow-700", icon: Pause },
  archived: { label: "Arquivado", color: "bg-red-100 text-red-700", icon: Archive },
};

const STEP_TYPES = [
  { value: "start", label: "Início", icon: Play, color: "bg-green-100 text-green-700 border-green-300" },
  { value: "task", label: "Tarefa", icon: Square, color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "approval", label: "Aprovação", icon: CheckCircle2, color: "bg-purple-100 text-purple-700 border-purple-300" },
  { value: "condition", label: "Condição", icon: Diamond, color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "notification", label: "Notificação", icon: Bell, color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "email", label: "E-mail", icon: Mail, color: "bg-cyan-100 text-cyan-700 border-cyan-300" },
  { value: "wait", label: "Aguardar", icon: Timer, color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "end", label: "Fim", icon: Circle, color: "bg-red-100 text-red-700 border-red-300" },
];

function WorkflowCard({ wf, onEdit, onView, onActivate, onPause, onArchive }: {
  wf: any; onEdit: () => void; onView: () => void;
  onActivate: () => void; onPause: () => void; onArchive: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = STATUS_CONFIG[wf.status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  const steps = (wf.definition?.steps as any[]) ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{wf.name}</h3>
            {wf.triggerType && (
              <span className="text-xs text-gray-400">Gatilho: {wf.triggerType}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
            <Icon className="w-3 h-3" />{cfg.label}
          </span>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[160px] py-1" onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { onView(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Eye className="w-3.5 h-3.5" />Visualizar</button>
                <button onClick={() => { onEdit(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Edit2 className="w-3.5 h-3.5" />Editar</button>
                {wf.status === "draft" || wf.status === "paused" ? (
                  <button onClick={() => { onActivate(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-700 hover:bg-green-50"><Play className="w-3.5 h-3.5" />Ativar</button>
                ) : wf.status === "active" ? (
                  <button onClick={() => { onPause(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-50"><Pause className="w-3.5 h-3.5" />Pausar</button>
                ) : null}
                <button onClick={() => { onArchive(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Archive className="w-3.5 h-3.5" />Arquivar</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {wf.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{wf.description}</p>
      )}

      {/* Steps preview */}
      {steps.length > 0 && (
        <div className="flex items-center gap-1 mb-3 overflow-hidden">
          {steps.slice(0, 5).map((s: any, i: number) => {
            const st = STEP_TYPES.find(t => t.value === s.type);
            const StIcon = st?.icon ?? Square;
            return (
              <div key={i} className="flex items-center gap-1">
                <div className={cn("w-6 h-6 rounded-md border flex items-center justify-center", st?.color ?? "bg-gray-100 text-gray-600 border-gray-300")}>
                  <StIcon className="w-3 h-3" />
                </div>
                {i < Math.min(steps.length - 1, 4) && <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />}
              </div>
            );
          })}
          {steps.length > 5 && <span className="text-xs text-gray-400 ml-1">+{steps.length - 5}</span>}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{steps.length} etapa{steps.length !== 1 ? "s" : ""}</span>
        {wf.version && <span>v{wf.version}</span>}
      </div>
    </div>
  );
}

function StepEditor({ steps, onChange }: { steps: any[]; onChange: (steps: any[]) => void }) {
  const addStep = (type: string) => {
    const st = STEP_TYPES.find(t => t.value === type);
    onChange([...steps, {
      id: `step_${Date.now()}`,
      type,
      name: st?.label ?? "Nova Etapa",
      config: {},
      transitions: [],
    }]);
  };

  const removeStep = (id: string) => onChange(steps.filter(s => s.id !== id));

  const updateStep = (id: string, field: string, value: string) => {
    onChange(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="space-y-4">
      {/* Step list */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const st = STEP_TYPES.find(t => t.value === step.type);
          const StIcon = st?.icon ?? Square;
          return (
            <div key={step.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 group">
              <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", st?.color ?? "bg-gray-100 text-gray-600 border-gray-300")}>
                <StIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  value={step.name}
                  onChange={e => updateStep(step.id, "name", e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none border-b border-transparent focus:border-gray-300"
                />
                <span className="text-xs text-gray-400">{st?.label}</span>
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />}
              <button onClick={() => removeStep(step.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        {steps.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            Adicione etapas ao workflow abaixo
          </div>
        )}
      </div>

      {/* Add step buttons */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Adicionar etapa:</p>
        <div className="flex flex-wrap gap-2">
          {STEP_TYPES.map(t => {
            const TIcon = t.icon;
            return (
              <button key={t.value} onClick={() => addStep(t.value)} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all hover:opacity-80", t.color)}>
                <TIcon className="w-3 h-3" />{t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WorkflowDesigner() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState<any>(null);
  const [editingWf, setEditingWf] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", triggerType: "manual" as "manual" | "protocol_created" | "protocol_status_changed" | "sla_breach" | "scheduled", steps: [] as any[] });

  const { data: workflows = [], refetch } = trpc.workflow.definitions.list.useQuery();
  const createWf = trpc.workflow.definitions.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); toast.success("Workflow criado!"); resetForm(); } });
  const updateWf = trpc.workflow.definitions.update.useMutation({ onSuccess: () => { refetch(); setEditingWf(null); toast.success("Workflow atualizado!"); } });
  const activateWf = trpc.workflow.definitions.update.useMutation({ onSuccess: () => { refetch(); toast.success("Workflow ativado!"); } });
  const pauseWf = trpc.workflow.definitions.update.useMutation({ onSuccess: () => { refetch(); toast.success("Workflow pausado!"); } });
  const archiveWf = trpc.workflow.definitions.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Workflow arquivado!"); } });

  const resetForm = () => setForm({ name: "", description: "", triggerType: "manual", steps: [] });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editingWf) {
      await updateWf.mutateAsync({ id: editingWf.id, name: form.name, description: form.description });
    } else {
      await createWf.mutateAsync({ name: form.name, description: form.description });
    }
  };

  const openEdit = (wf: any) => {
    setForm({ name: wf.name, description: wf.description ?? "", triggerType: "manual", steps: [] });
    setEditingWf(wf);
    setShowCreate(true);
  };

  const TRIGGER_OPTIONS = [
    { value: "manual", label: "Manual" },
    { value: "protocol_created", label: "Protocolo criado" },
    { value: "protocol_status_changed", label: "Status alterado" },
    { value: "sla_breach", label: "Violação de SLA" },
    { value: "scheduled", label: "Agendado" },
  ];

  return (
    <OmniLayout title="Motor de Workflow">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Motor de Workflow</h1>
            <p className="text-gray-500 text-sm mt-0.5">Crie e gerencie fluxos de trabalho automatizados para seus processos</p>
          </div>
          <Button onClick={() => { resetForm(); setEditingWf(null); setShowCreate(true); }} className="gap-2">
            <Plus className="w-4 h-4" />Novo Workflow
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar workflows..." className="pl-9" />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className="flex gap-2">
            {["all", "draft", "active", "paused", "archived"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", statusFilter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
                {s === "all" ? "Todos" : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: (workflows as any[]).length, color: "text-gray-900", bg: "bg-gray-50" },
            { label: "Ativos", value: (workflows as any[]).filter((w: any) => w.status === "active").length, color: "text-green-700", bg: "bg-green-50" },
            { label: "Rascunhos", value: (workflows as any[]).filter((w: any) => w.status === "draft").length, color: "text-gray-700", bg: "bg-gray-50" },
            { label: "Pausados", value: (workflows as any[]).filter((w: any) => w.status === "paused").length, color: "text-yellow-700", bg: "bg-yellow-50" },
          ].map(stat => (
            <div key={stat.label} className={cn("rounded-xl p-4 border border-gray-200", stat.bg)}>
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Workflow grid */}
        {(workflows as any[]).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">Nenhum workflow encontrado</p>
            <p className="text-sm mt-1">Crie seu primeiro workflow para automatizar processos</p>
            <Button onClick={() => { resetForm(); setEditingWf(null); setShowCreate(true); }} className="mt-4 gap-2" variant="outline">
              <Plus className="w-4 h-4" />Criar Workflow
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(workflows as any[]).map((wf: any) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                onEdit={() => openEdit(wf)}
                onView={() => setShowView(wf)}
                onActivate={() => activateWf.mutate({ id: wf.id, isActive: true })}
                onPause={() => pauseWf.mutate({ id: wf.id, isActive: false })}
                onArchive={() => archiveWf.mutate({ id: wf.id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) { setShowCreate(false); setEditingWf(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-blue-600" />
              {editingWf ? "Editar Workflow" : "Novo Workflow"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do workflow" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gatilho</label>
                <select value={form.triggerType} onChange={e => setForm(f => ({ ...f, triggerType: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descreva o objetivo deste workflow..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Etapas do Workflow</label>
              <StepEditor steps={form.steps} onChange={steps => setForm(f => ({ ...f, steps }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditingWf(null); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createWf.isPending || updateWf.isPending} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {editingWf ? "Salvar Alterações" : "Criar Workflow"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Sheet */}
      <Sheet open={!!showView} onOpenChange={() => setShowView(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          {showView && (
            <>
              <SheetHeader className="px-6 py-4 border-b border-border/60 bg-card/60 sticky top-0 z-10">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="w-5 h-5 text-primary" />
                  {showView.name}
                </SheetTitle>
              </SheetHeader>
              <div className="p-6 space-y-4">
                {showView.description && <p className="text-sm text-muted-foreground">{showView.description}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="text-sm font-semibold text-foreground">{STATUS_CONFIG[showView.status]?.label ?? showView.status}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Gatilho</p>
                    <p className="text-sm font-semibold text-foreground">{showView.triggerType ?? "Manual"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Etapas ({((showView.definition?.steps as any[]) ?? []).length})</p>
                  <div className="space-y-2">
                    {((showView.definition?.steps as any[]) ?? []).map((step: any, i: number) => {
                      const st = STEP_TYPES.find(t => t.value === step.type);
                      const StIcon = st?.icon ?? Square;
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                          <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                          <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center shrink-0", st?.color ?? "bg-muted text-muted-foreground border-border")}>
                            <StIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{step.name}</p>
                            <p className="text-xs text-muted-foreground">{st?.label}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </OmniLayout>
  );
}
