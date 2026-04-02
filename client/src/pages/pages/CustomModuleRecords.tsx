import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DocumentEditor from "@/components/DocumentEditor";
import { toast } from "sonner";
import {
  Plus, Search, FileText, FolderOpen, ClipboardList, Scale, Building2,
  Users, BookOpen, Archive, Star, Briefcase, Globe, AlertTriangle, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ICON_MAP: Record<string, any> = {
  FileText, FolderOpen, ClipboardList, Scale, Building2,
  Users, BookOpen, Archive, Star, Briefcase, Globe,
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "text-slate-500" },
  normal: { label: "Normal", color: "text-blue-600" },
  high: { label: "Alta", color: "text-orange-500" },
  urgent: { label: "Urgente", color: "text-red-600" },
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  "in_progress": "bg-yellow-50 text-yellow-700 border-yellow-200",
  closed: "bg-green-50 text-green-700 border-green-200",
  archived: "bg-slate-50 text-slate-600 border-slate-200",
};

interface RecordForm {
  title: string;
  status: string;
  priority: "low" | "normal" | "high" | "urgent";
  content: string;
  isConfidential: boolean;
}

const defaultForm: RecordForm = {
  title: "",
  status: "open",
  priority: "normal",
  content: "",
  isConfidential: false,
};

export default function CustomModuleRecords() {
  const [, params] = useRoute("/gestao-publica/:slug");
  const slug = params?.slug ?? "";

  const { data: module, isLoading: loadingModule } = trpc.customModules.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<RecordForm>(defaultForm);

  const utils = trpc.useUtils();

  const { data, isLoading: loadingRecords } = trpc.customModules.records.list.useQuery(
    {
      moduleId: module?.id ?? 0,
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: search || undefined,
      page,
      pageSize: 20,
    },
    { enabled: !!module?.id }
  );

  const createMutation = trpc.customModules.records.create.useMutation({
    onSuccess: (res) => {
      toast.success(`Registro criado! NUP: ${res.nup}`);
      utils.customModules.records.list.invalidate();
      setShowCreate(false);
      setForm(defaultForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.customModules.records.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro excluído.");
      utils.customModules.records.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const IconComp = ICON_MAP[module?.icon ?? "FileText"] ?? FileText;
  const records = data?.records ?? [];
  const total = data?.total ?? 0;

  if (loadingModule) {
    return (
      <OmniLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </OmniLayout>
    );
  }

  if (!module) {
    return (
      <OmniLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertTriangle className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Módulo não encontrado.</p>
        </div>
      </OmniLayout>
    );
  }

  return (
    <OmniLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: (module.color ?? "#6366f1") + "20", border: `1.5px solid ${module.color ?? "#6366f1"}40` }}
            >
              <IconComp className="h-5 w-5" style={{ color: module.color ?? "#6366f1" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{module.name}</h1>
              {module.description && (
                <p className="text-sm text-muted-foreground">{module.description}</p>
              )}
            </div>
          </div>
          <Button onClick={() => { setForm(defaultForm); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Registro
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou NUP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="closed">Concluído</SelectItem>
              <SelectItem value="archived">Arquivado</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{total} registro(s)</span>
        </div>

        {/* Records Table */}
        {loadingRecords ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : records.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <IconComp className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground text-center">
                Nenhum registro encontrado.<br />
                Clique em <strong>Novo Registro</strong> para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">NUP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prioridade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((rec: any) => {
                    const priCfg = PRIORITY_CONFIG[rec.priority ?? "normal"];
                    const statusCls = STATUS_COLORS[rec.status ?? "open"] ?? STATUS_COLORS.open;
                    return (
                      <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-primary/10 text-primary rounded px-2 py-0.5">
                            {rec.nup ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground line-clamp-1">{rec.title}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${statusCls}`}>
                            {rec.status ?? "open"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${priCfg?.color ?? ""}`}>
                            {priCfg?.label ?? rec.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {rec.createdAt ? format(new Date(rec.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-7 text-xs"
                            onClick={() => deleteMutation.mutate({ id: rec.id as number })}
                          >
                            Excluir
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Registro — {module.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                placeholder="Título do registro..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="closed">Concluído</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Conteúdo / Descrição</Label>
              <DocumentEditor
                value={form.content}
                onChange={v => setForm(f => ({ ...f, content: v }))}
                placeholder="Digite o conteúdo do registro..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!form.title.trim()) return toast.error("Título é obrigatório.");
                createMutation.mutate({ moduleId: module.id, ...form });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
