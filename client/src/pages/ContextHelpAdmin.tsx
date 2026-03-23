import { useState } from "react";
import OmniLayout from "@/components/OmniLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { HelpCircle, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";

const DISPLAY_MODES = [
  { value: "tooltip", label: "Tooltip" },
  { value: "modal", label: "Modal" },
  { value: "sidebar", label: "Painel Lateral" },
  { value: "expandable", label: "Expansível" },
];

const FEATURE_KEYS = [
  "dashboard", "inbox", "protocols", "documents", "processes",
  "ombudsman", "tickets", "queue", "reports", "agents",
  "accounts", "sectors", "service-types", "form-builder",
  "templates", "audit", "ai-settings", "institutional",
];

type HelpForm = {
  featureKey: string;
  title: string;
  description: string;
  detailedInstructions: string;
  examples: string;
  requiredDocuments: string;
  warnings: string;
  normativeBase: string;
  displayMode: "tooltip" | "modal" | "sidebar" | "expandable";
  isActive: boolean;
};

const defaultForm: HelpForm = {
  featureKey: "dashboard",
  title: "",
  description: "",
  detailedInstructions: "",
  examples: "",
  requiredDocuments: "",
  warnings: "",
  normativeBase: "",
  displayMode: "modal",
  isActive: true,
};

export default function ContextHelpAdmin() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<HelpForm>(defaultForm);

  const { data: helpItems = [], refetch } = trpc.contextHelp.list.useQuery();

  const upsertMutation = trpc.contextHelp.upsert.useMutation({
    onSuccess: () => { toast.success("Ajuda salva!"); refetch(); setOpen(false); setForm(defaultForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = trpc.contextHelp.delete.useMutation({
    onSuccess: () => { toast.success("Ajuda removida."); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(item: any) {
    setForm({
      featureKey: item.featureKey ?? "dashboard",
      title: item.title ?? "",
      description: item.description ?? "",
      detailedInstructions: item.detailedInstructions ?? "",
      examples: item.examples ?? "",
      requiredDocuments: item.requiredDocuments ?? "",
      warnings: item.warnings ?? "",
      normativeBase: item.normativeBase ?? "",
      displayMode: item.displayMode ?? "modal",
      isActive: item.isActive ?? true,
    });
    setOpen(true);
  }

  function handleSubmit() {
    upsertMutation.mutate({
      ...form,
      description: form.description || undefined,
      detailedInstructions: form.detailedInstructions || undefined,
      examples: form.examples || undefined,
      requiredDocuments: form.requiredDocuments || undefined,
      warnings: form.warnings || undefined,
      normativeBase: form.normativeBase || undefined,
    });
  }

  return (
    <OmniLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Ajuda Contextual</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure textos de ajuda, tooltips, modais e instruções exibidas em cada tela da plataforma.
            </p>
          </div>
          <Button onClick={() => { setForm(defaultForm); setOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Ajuda
          </Button>
        </div>

        {helpItems.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum item de ajuda configurado.</p>
            <p className="text-sm mt-1">Adicione tooltips e modais para orientar os usuários da plataforma.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {helpItems.map((item: any) => {
            const modeLabel = DISPLAY_MODES.find(m => m.value === item.displayMode)?.label ?? item.displayMode;
            return (
              <Card key={item.id} className="border-border hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm">{item.title}</CardTitle>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-xs font-mono">{item.featureKey}</Badge>
                        <Badge variant="outline" className="text-xs text-primary border-primary/30">{modeLabel}</Badge>
                        {!item.isActive && (
                          <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">Inativo</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  {item.warnings && (
                    <p className="text-xs text-amber-400 line-clamp-1">⚠ {item.warnings}</p>
                  )}
                  {item.normativeBase && (
                    <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {item.normativeBase}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => openEdit(item)}>
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => deleteMutation.mutate({ id: item.id })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Ajuda Contextual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tela / Funcionalidade *</Label>
                <Select value={form.featureKey} onValueChange={v => setForm(f => ({ ...f, featureKey: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {FEATURE_KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modo de Exibição *</Label>
                <Select value={form.displayMode} onValueChange={(v: any) => setForm(f => ({ ...f, displayMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPLAY_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Como criar um protocolo" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição Resumida</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Breve descrição da funcionalidade..." />
            </div>
            <div className="space-y-1.5">
              <Label>Instruções Detalhadas</Label>
              <Textarea value={form.detailedInstructions} onChange={e => setForm(f => ({ ...f, detailedInstructions: e.target.value }))} rows={3} placeholder="Passo a passo detalhado..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Exemplos</Label>
                <Textarea value={form.examples} onChange={e => setForm(f => ({ ...f, examples: e.target.value }))} rows={2} placeholder="Exemplos práticos..." />
              </div>
              <div className="space-y-1.5">
                <Label>Documentos Necessários</Label>
                <Textarea value={form.requiredDocuments} onChange={e => setForm(f => ({ ...f, requiredDocuments: e.target.value }))} rows={2} placeholder="Lista de documentos..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Avisos / Alertas</Label>
                <Textarea value={form.warnings} onChange={e => setForm(f => ({ ...f, warnings: e.target.value }))} rows={2} placeholder="Atenção: ..." />
              </div>
              <div className="space-y-1.5">
                <Label>Base Normativa</Label>
                <Input value={form.normativeBase} onChange={e => setForm(f => ({ ...f, normativeBase: e.target.value }))} placeholder="Lei nº..., Decreto..." />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <Label>Ativo</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.title || upsertMutation.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
