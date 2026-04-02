import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Settings,
  FileText, FolderOpen, ClipboardList, Scale, Building2,
  Users, BookOpen, Archive, Star, Briefcase, Globe
} from "lucide-react";

const ICON_OPTIONS = [
  { value: "FileText", label: "Documento", icon: FileText },
  { value: "FolderOpen", label: "Pasta", icon: FolderOpen },
  { value: "ClipboardList", label: "Lista", icon: ClipboardList },
  { value: "Scale", label: "Balança", icon: Scale },
  { value: "Building2", label: "Prédio", icon: Building2 },
  { value: "Users", label: "Usuários", icon: Users },
  { value: "BookOpen", label: "Livro", icon: BookOpen },
  { value: "Archive", label: "Arquivo", icon: Archive },
  { value: "Star", label: "Estrela", icon: Star },
  { value: "Briefcase", label: "Maleta", icon: Briefcase },
  { value: "Globe", label: "Globo", icon: Globe },
];

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#1e293b",
];

const MENU_SECTIONS = [
  { value: "gestao-publica", label: "Gestão Pública" },
  { value: "atendimento", label: "Atendimento" },
  { value: "admin", label: "Administração" },
  { value: "config", label: "Configurações" },
  { value: "org", label: "Estrutura Organizacional" },
];

function getMenuSectionLabel(value: string) {
  return MENU_SECTIONS.find(s => s.value === value)?.label ?? value;
}

function getIconComponent(name: string) {
  const found = ICON_OPTIONS.find(o => o.value === name);
  return found?.icon ?? FileText;
}

interface ModuleFormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  menuSection: string;
  menuOrder: number;
}

const defaultForm: ModuleFormData = {
  name: "",
  slug: "",
  description: "",
  icon: "FileText",
  color: "#6366f1",
  menuSection: "gestao-publica",
  menuOrder: 0,
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CustomModules() {
  const utils = trpc.useUtils();
  const { data: modules = [], isLoading } = trpc.customModules.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ModuleFormData>(defaultForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createMutation = trpc.customModules.create.useMutation({
    onSuccess: () => {
      toast.success("Módulo criado com sucesso!");
      utils.customModules.list.invalidate();
      setShowCreate(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.customModules.update.useMutation({
    onSuccess: () => {
      toast.success("Módulo atualizado!");
      utils.customModules.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.customModules.delete.useMutation({
    onSuccess: () => {
      toast.success("Módulo excluído.");
      utils.customModules.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = (id: number, isActive: boolean) => {
    updateMutation.mutate({ id, isActive });
  };

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: slugify(name) }));
  };

  const openEdit = (mod: any) => {
    setForm({
      name: mod.name,
      slug: mod.slug,
      description: mod.description ?? "",
      icon: mod.icon ?? "FileText",
      color: mod.color ?? "#6366f1",
      menuSection: mod.menuSection ?? "gestao-publica",
      menuOrder: mod.menuOrder ?? 0,
    });
    setEditingId(mod.id);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Nome é obrigatório.");
    if (!form.slug.trim()) return toast.error("Slug é obrigatório.");
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <OmniLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Módulos Personalizados</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie novos tipos de processos que aparecerão no menu de Gestão Pública.
            </p>
          </div>
          <Button onClick={() => { setForm(defaultForm); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Módulo
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : modules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Settings className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-center">
                Nenhum módulo criado ainda.<br />
                Clique em <strong>Novo Módulo</strong> para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((mod: any) => {
              const IconComp = getIconComponent(mod.icon ?? "FileText");
              return (
                <Card key={mod.id} className={`border transition-opacity ${mod.isActive ? "" : "opacity-60"}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: (mod.color ?? "#6366f1") + "20", border: `1.5px solid ${mod.color ?? "#6366f1"}40` }}
                      >
                        <IconComp className="h-5 w-5" style={{ color: mod.color ?? "#6366f1" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-semibold">{mod.name}</CardTitle>
                          {!mod.isActive && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">/{mod.slug}</p>
                        {mod.menuSection && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {getMenuSectionLabel(mod.menuSection)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(mod)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(mod.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {mod.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{mod.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Ordem no menu: {mod.menuOrder ?? 0}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{mod.isActive ? "Visível" : "Oculto"}</span>
                        <Switch
                          checked={mod.isActive ?? true}
                          onCheckedChange={(v) => toggleActive(mod.id, v)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate || editingId !== null} onOpenChange={(open) => {
        if (!open) { setShowCreate(false); setEditingId(null); }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Módulo *</Label>
              <Input
                placeholder="Ex: Contratos, Licitações, Alvarás..."
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (URL) *</Label>
              <Input
                placeholder="Ex: contratos"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                disabled={!!editingId}
              />
              <p className="text-xs text-muted-foreground">Aparecerá na URL: /gestao-publica/{form.slug || "slug"}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o propósito deste módulo..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Ícone</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {ICON_OPTIONS.map(opt => {
                    const Ic = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.label}
                        onClick={() => setForm(f => ({ ...f, icon: opt.value }))}
                        className={`h-9 w-full rounded-lg border flex items-center justify-center transition-colors ${form.icon === opt.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                      >
                        <Ic className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className={`h-9 w-full rounded-lg border-2 transition-transform ${form.color === color ? "scale-110 border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Grupo do Menu *</Label>
              <Select value={form.menuSection} onValueChange={v => setForm(f => ({ ...f, menuSection: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo..." />
                </SelectTrigger>
                <SelectContent>
                  {MENU_SECTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">O módulo aparecerá neste grupo do menu lateral.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Ordem no Menu</Label>
              <Input
                type="number"
                min={0}
                value={form.menuOrder}
                onChange={e => setForm(f => ({ ...f, menuOrder: Number(e.target.value) }))}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">Menor número aparece primeiro no menu.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Módulo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Módulo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação excluirá o módulo e <strong>todos os registros vinculados</strong>. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
