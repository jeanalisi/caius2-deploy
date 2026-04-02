import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Building2, ChevronRight, ChevronDown, Plus, Edit, Trash2,
  Users, Layers, Search, TreePine, LayoutGrid, Loader2,
  GitBranch, AlertCircle, RefreshCw, Download
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Type Labels ──────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  prefeitura: "Prefeitura", gabinete: "Gabinete", procuradoria: "Procuradoria",
  controladoria: "Controladoria", secretaria: "Secretaria",
  superintendencia: "Superintendência", secretaria_executiva: "Sec. Executiva",
  diretoria: "Diretoria", departamento: "Departamento", coordenacao: "Coordenação",
  gerencia: "Gerência", supervisao: "Supervisão", secao: "Seção",
  setor: "Setor", nucleo: "Núcleo", assessoria: "Assessoria",
  unidade: "Unidade", junta: "Junta", tesouraria: "Tesouraria", ouvidoria: "Ouvidoria",
};

const TYPE_COLORS: Record<string, string> = {
  prefeitura: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  gabinete: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  procuradoria: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  controladoria: "bg-red-500/20 text-red-300 border-red-500/30",
  secretaria: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  superintendencia: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  secretaria_executiva: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  diretoria: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  departamento: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  coordenacao: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  gerencia: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  supervisao: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  secao: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  setor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  nucleo: "bg-lime-500/20 text-lime-300 border-lime-500/30",
  assessoria: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  ouvidoria: "bg-red-500/20 text-red-300 border-red-500/30",
  tesouraria: "bg-green-500/20 text-green-300 border-green-500/30",
  junta: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  unidade: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

const ORG_TYPES = Object.entries(TYPE_LABELS);

// ─── Tree Node Component ──────────────────────────────────────────────────────
function OrgTreeNode({
  unit,
  depth = 0,
  onSelect,
  selectedId,
}: {
  unit: any;
  depth?: number;
  onSelect: (unit: any) => void;
  selectedId: number | null;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = unit.children && unit.children.length > 0;
  const isSelected = selectedId === unit.id;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-all group
          ${isSelected ? "bg-primary/20 border border-primary/40" : "hover:bg-white/5 border border-transparent"}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(unit)}
      >
        {/* Expand toggle */}
        <button
          className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <span className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Icon */}
        <Building2 className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />

        {/* Name */}
        <span className={`text-sm flex-1 truncate ${isSelected ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"}`}>
          {unit.acronym ? <span className="font-mono text-xs text-primary mr-1.5">[{unit.acronym}]</span> : null}
          {unit.name}
        </span>

        {/* Type badge */}
        <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${TYPE_COLORS[unit.type] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
          {TYPE_LABELS[unit.type] ?? unit.type}
        </span>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {unit.children.map((child: any) => (
            <OrgTreeNode
              key={child.id}
              unit={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Org Card Component ───────────────────────────────────────────────────────
function OrgCard({ unit, onSelect }: { unit: any; onSelect: (u: any) => void }) {
  const hasChildren = unit.children && unit.children.length > 0;
  return (
    <div
      className="bg-card/60 border border-border/50 rounded-xl p-4 cursor-pointer hover:border-primary/40 hover:bg-card transition-all group"
      onClick={() => onSelect(unit)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            {unit.acronym && (
              <div className="text-[10px] font-mono text-primary font-semibold">{unit.acronym}</div>
            )}
            <div className="text-sm font-medium text-foreground leading-tight">{unit.name}</div>
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${TYPE_COLORS[unit.type] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
          {TYPE_LABELS[unit.type] ?? unit.type}
        </span>
      </div>

      {hasChildren && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Layers className="w-3 h-3" />
          <span>{unit.children.length} subestrutura{unit.children.length !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}

// ─── Create/Edit Dialog ───────────────────────────────────────────────────────
function OrgUnitDialog({
  open,
  onClose,
  editUnit,
  parentId,
}: {
  open: boolean;
  onClose: () => void;
  editUnit?: any;
  parentId?: number | null;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: editUnit?.name ?? "",
    acronym: editUnit?.acronym ?? "",
    type: editUnit?.type ?? "setor",
    level: editUnit?.level ?? 2,
    description: editUnit?.description ?? "",
    legalBasis: editUnit?.legalBasis ?? "Lei Complementar nº 010/2025",
    sortOrder: editUnit?.sortOrder ?? 0,
  });

  const create = trpc.orgUnits.create.useMutation({
    onSuccess: () => {
      toast.success("Unidade criada com sucesso!");
      utils.orgUnits.tree.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.orgUnits.update.useMutation({
    onSuccess: () => {
      toast.success("Unidade atualizada!");
      utils.orgUnits.tree.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Nome é obrigatório.");
    if (editUnit) {
      update.mutate({ id: editUnit.id, ...form, parentId: editUnit.parentId });
    } else {
      create.mutate({ ...form as any, parentId: parentId ?? null });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle>{editUnit ? "Editar Unidade" : "Nova Unidade Organizacional"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da unidade" className="mt-1" />
            </div>
            <div>
              <Label>Sigla</Label>
              <Input value={form.acronym} onChange={e => setForm(f => ({ ...f, acronym: e.target.value }))} placeholder="Ex: SEPLAN" className="mt-1 font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORG_TYPES.map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nível Hierárquico</Label>
              <Input type="number" min={1} max={10} value={form.level} onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição e atribuições da unidade" className="mt-1 resize-none" rows={2} />
          </div>
          <div>
            <Label>Base Legal</Label>
            <Input value={form.legalBasis} onChange={e => setForm(f => ({ ...f, legalBasis: e.target.value }))} placeholder="Ex: Lei Complementar nº 010/2025" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editUnit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrgStructure() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [view, setView] = useState<"tree" | "cards">("tree");
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editUnit, setEditUnit] = useState<any>(null);
  const [createParentId, setCreateParentId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: tree, isLoading } = trpc.orgUnits.tree.useQuery({ parentId: null });
  const { data: stats } = trpc.orgUnits.stats.useQuery(
    { id: selectedUnit?.id ?? 0 },
    { enabled: !!selectedUnit }
  );
  const { data: breadcrumb } = trpc.orgUnits.withBreadcrumb.useQuery(
    { id: selectedUnit?.id ?? 0 },
    { enabled: !!selectedUnit }
  );

  const seedMutation = trpc.orgUnits.seed.useMutation({
    onSuccess: (data) => {
      toast.success(`Estrutura criada: ${data.units} unidades e ${data.positions} cargos.`);
      utils.orgUnits.tree.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.orgUnits.delete.useMutation({
    onSuccess: () => {
      toast.success("Unidade desativada.");
      setSelectedUnit(null);
      utils.orgUnits.tree.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter tree by search
  const filterTree = useCallback((nodes: any[], query: string): any[] => {
    if (!query) return nodes;
    return nodes.reduce((acc: any[], node) => {
      const match = node.name.toLowerCase().includes(query.toLowerCase()) ||
        node.acronym?.toLowerCase().includes(query.toLowerCase());
      const filteredChildren = filterTree(node.children ?? [], query);
      if (match || filteredChildren.length > 0) {
        acc.push({ ...node, children: filteredChildren });
      }
      return acc;
    }, []);
  }, []);

  const filteredTree = filterTree(tree ?? [], search);

  // Count total units
  const countUnits = (nodes: any[]): number =>
    nodes.reduce((acc, n) => acc + 1 + countUnits(n.children ?? []), 0);
  const totalUnits = countUnits(tree ?? []);

  return (
    <OmniLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              Estrutura Organizacional
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Lei Complementar nº 010/2025 — Município de Itabaiana/PB
              {totalUnits > 0 && <span className="ml-2 text-primary">· {totalUnits} unidades</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
              <button
                onClick={() => setView("tree")}
                className={`p-1.5 rounded-md transition-colors ${view === "tree" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <TreePine className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("cards")}
                className={`p-1.5 rounded-md transition-colors ${view === "cards" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {isAdmin && totalUnits === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="gap-1.5"
              >
                {seedMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Importar Lei 010/2025
              </Button>
            )}

            {isAdmin && (
              <Button
                size="sm"
                onClick={() => { setCreateParentId(null); setShowCreate(true); }}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Unidade
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — Tree or Cards */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search */}
            <div className="px-4 py-3 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar unidade ou sigla..."
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-3 py-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Building2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {search ? "Nenhuma unidade encontrada." : "Nenhuma unidade cadastrada."}
                  </p>
                  {isAdmin && !search && totalUnits === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-1.5"
                      onClick={() => seedMutation.mutate()}
                      disabled={seedMutation.isPending}
                    >
                      {seedMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Importar estrutura da Lei 010/2025
                    </Button>
                  )}
                </div>
              ) : view === "tree" ? (
                <div className="space-y-0.5">
                  {filteredTree.map(unit => (
                    <OrgTreeNode
                      key={unit.id}
                      unit={unit}
                      depth={0}
                      onSelect={setSelectedUnit}
                      selectedId={selectedUnit?.id ?? null}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-1">
                  {filteredTree.map(unit => (
                    <OrgCard key={unit.id} unit={unit} onSelect={setSelectedUnit} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right panel — Detail */}
          {selectedUnit && (
            <div className="w-80 border-l border-border/50 flex flex-col">
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Detalhes</h3>
                <button onClick={() => setSelectedUnit(null)} className="text-muted-foreground hover:text-foreground">
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>

              <ScrollArea className="flex-1 p-4">
                {/* Breadcrumb */}
                {breadcrumb?.breadcrumb && breadcrumb.breadcrumb.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1 mb-4 text-xs text-muted-foreground">
                    {breadcrumb.breadcrumb.map((b: any, i: number) => (
                      <span key={b.id} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="w-3 h-3" />}
                        <button
                          onClick={() => setSelectedUnit(b)}
                          className={`hover:text-foreground transition-colors ${b.id === selectedUnit.id ? "text-primary font-medium" : ""}`}
                        >
                          {b.acronym ?? b.name.split(" ")[0]}
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {selectedUnit.acronym && (
                        <div className="text-xs font-mono text-primary font-bold mb-0.5">{selectedUnit.acronym}</div>
                      )}
                      <div className="text-sm font-semibold text-foreground leading-tight">{selectedUnit.name}</div>
                      <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded border ${TYPE_COLORS[selectedUnit.type] ?? ""}`}>
                        {TYPE_LABELS[selectedUnit.type] ?? selectedUnit.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                {stats && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: "Usuários", value: stats.userCount, icon: Users },
                      { label: "Subestruturas", value: stats.childCount, icon: Layers },
                      { label: "Cargos", value: stats.positionCount, icon: GitBranch },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-card/60 border border-border/50 rounded-lg p-2 text-center">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
                        <div className="text-base font-bold text-foreground">{value}</div>
                        <div className="text-[10px] text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Info */}
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Nível hierárquico</span>
                    <div className="text-foreground font-medium">{selectedUnit.level}º nível</div>
                  </div>
                  {selectedUnit.description && (
                    <div>
                      <span className="text-xs text-muted-foreground">Descrição</span>
                      <div className="text-foreground/80 text-xs mt-0.5 leading-relaxed">{selectedUnit.description}</div>
                    </div>
                  )}
                  {selectedUnit.legalBasis && (
                    <div>
                      <span className="text-xs text-muted-foreground">Base Legal</span>
                      <div className="text-foreground/80 text-xs mt-0.5">{selectedUnit.legalBasis}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-muted-foreground">Status</span>
                    <div>
                      <Badge variant={selectedUnit.isActive ? "default" : "secondary"} className="text-xs mt-0.5">
                        {selectedUnit.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Actions */}
                {isAdmin && (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 justify-start"
                      onClick={() => { setCreateParentId(selectedUnit.id); setShowCreate(true); }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Subestrutura
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5 justify-start"
                      onClick={() => setEditUnit(selectedUnit)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar Unidade
                    </Button>
                    {!selectedUnit.isSeeded && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 justify-start text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Desativar "${selectedUnit.name}"?`)) {
                            deleteMutation.mutate({ id: selectedUnit.id });
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Desativar
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showCreate && (
        <OrgUnitDialog
          open={showCreate}
          onClose={() => { setShowCreate(false); setCreateParentId(null); }}
          parentId={createParentId}
        />
      )}
      {editUnit && (
        <OrgUnitDialog
          open={!!editUnit}
          onClose={() => setEditUnit(null)}
          editUnit={editUnit}
        />
      )}
    </OmniLayout>
  );
}
