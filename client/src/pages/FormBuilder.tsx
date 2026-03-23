import { useState } from "react";
import { useParams, useLocation } from "wouter";
import OmniLayout from "@/components/OmniLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  FileText,
  ArrowLeft,
  Camera,
  MapPin,
  Type,
  Hash,
  Calendar,
  List,
  CheckSquare,
  Upload,
  Pen,
} from "lucide-react";

const FIELD_TYPES = [
  { value: "text", label: "Texto", icon: Type },
  { value: "textarea", label: "Texto Longo", icon: FileText },
  { value: "number", label: "Número", icon: Hash },
  { value: "currency", label: "Valor Monetário", icon: Hash },
  { value: "cpf", label: "CPF", icon: Type },
  { value: "cnpj", label: "CNPJ", icon: Type },
  { value: "email", label: "E-mail", icon: Type },
  { value: "phone", label: "Telefone", icon: Type },
  { value: "date", label: "Data", icon: Calendar },
  { value: "datetime", label: "Data e Hora", icon: Calendar },
  { value: "select", label: "Lista de Seleção", icon: List },
  { value: "multiselect", label: "Seleção Múltipla", icon: List },
  { value: "checkbox", label: "Caixa de Seleção", icon: CheckSquare },
  { value: "radio", label: "Opção Única", icon: CheckSquare },
  { value: "file_upload", label: "Upload de Arquivo", icon: Upload },
  { value: "selfie", label: "Selfie (Câmera)", icon: Camera },
  { value: "geolocation", label: "Geolocalização", icon: MapPin },
  { value: "signature", label: "Assinatura", icon: Pen },
  { value: "address", label: "Endereço", icon: Type },
  { value: "cep", label: "CEP", icon: Type },
  { value: "acknowledgment", label: "Confirmação/Aceite", icon: CheckSquare },
];

const fieldTypeIcons: Record<string, any> = Object.fromEntries(FIELD_TYPES.map(f => [f.value, f.icon]));

export default function FormBuilder() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const templateId = params.id ? Number(params.id) : null;
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [editFieldId, setEditFieldId] = useState<number | null>(null);
  const [fieldForm, setFieldForm] = useState({
    name: "", label: "", fieldType: "text" as any,
    placeholder: "", helpText: "", isRequired: false,
    sectionName: "", displayOrder: 0,
  });

  const { data: templates = [], refetch: refetchList } = trpc.formTemplates.list.useQuery({});
  const { data: template, refetch } = trpc.formTemplates.get.useQuery(
    { id: templateId! },
    { enabled: !!templateId }
  );

  const createTemplate = trpc.formTemplates.create.useMutation({
    onSuccess: (t: any) => { toast.success("Formulário criado!"); refetchList(); navigate(`/form-builder/${t?.id}`); },
    onError: (e) => toast.error(e.message),
  });

  const addField = trpc.formTemplates.addField.useMutation({
    onSuccess: () => { toast.success("Campo adicionado!"); refetch(); setAddFieldOpen(false); resetFieldForm(); },
    onError: (e) => toast.error(e.message),
  });

  const updateField = trpc.formTemplates.updateField.useMutation({
    onSuccess: () => { toast.success("Campo atualizado!"); refetch(); setAddFieldOpen(false); setEditFieldId(null); resetFieldForm(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteField = trpc.formTemplates.deleteField.useMutation({
    onSuccess: () => { toast.success("Campo removido."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteTemplate = trpc.formTemplates.delete.useMutation({
    onSuccess: () => { toast.success("Formulário removido."); refetchList(); navigate("/form-builder"); },
    onError: (e) => toast.error(e.message),
  });

  function resetFieldForm() {
    setFieldForm({ name: "", label: "", fieldType: "text", placeholder: "", helpText: "", isRequired: false, sectionName: "", displayOrder: 0 });
  }

  function openEditField(field: any) {
    setEditFieldId(field.id);
    setFieldForm({
      name: field.name, label: field.label, fieldType: field.fieldType,
      placeholder: field.placeholder ?? "", helpText: field.helpText ?? "",
      isRequired: field.isRequired, sectionName: field.sectionName ?? "",
      displayOrder: field.displayOrder,
    });
    setAddFieldOpen(true);
  }

  function handleFieldSubmit() {
    if (!templateId) return;
    if (editFieldId) {
      updateField.mutate({ id: editFieldId, ...fieldForm });
    } else {
      addField.mutate({ formTemplateId: templateId, ...fieldForm });
    }
  }

  // ─── Template List View ────────────────────────────────────────────────────
  if (!templateId) {
    return (
      <OmniLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Construtor de Formulários</h1>
              <p className="text-sm text-muted-foreground mt-1">Crie formulários dinâmicos com campos configuráveis para cada tipo de atendimento.</p>
            </div>
            <Button onClick={() => {
              const name = prompt("Nome do formulário:");
              if (name) createTemplate.mutate({ name });
            }} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Formulário
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.length === 0 && (
              <div className="col-span-3 text-center py-16 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum formulário criado ainda.</p>
              </div>
            )}
            {templates.map((t: any) => (
              <Card key={t.id} className="border-border hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate(`/form-builder/${t.id}`)}>
                <CardHeader>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">v{t.version}</Badge>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={e => { e.stopPropagation(); deleteTemplate.mutate({ id: t.id }); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </OmniLayout>
    );
  }

  // ─── Field Builder View ────────────────────────────────────────────────────
  const fields = (template as any)?.fields ?? [];

  return (
    <OmniLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/form-builder")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{(template as any)?.name ?? "Formulário"}</h1>
            <p className="text-sm text-muted-foreground">{fields.length} campo(s) configurado(s)</p>
          </div>
          <Button onClick={() => { setEditFieldId(null); resetFieldForm(); setAddFieldOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Campo
          </Button>
        </div>

        {fields.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            <Type className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum campo adicionado.</p>
            <p className="text-sm mt-1">Clique em "Adicionar Campo" para começar.</p>
          </div>
        )}

        <div className="space-y-2">
          {fields.map((field: any, idx: number) => {
            const Icon = fieldTypeIcons[field.fieldType] ?? Type;
            return (
              <div key={field.id} className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{field.label}</span>
                    {field.isRequired && <Badge variant="outline" className="text-xs text-red-400 border-red-400/30">Obrigatório</Badge>}
                    {field.sectionName && <Badge variant="outline" className="text-xs">{field.sectionName}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{field.name} · {FIELD_TYPES.find(f => f.value === field.fieldType)?.label ?? field.fieldType}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => openEditField(field)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteField.mutate({ id: field.id })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Field Dialog */}
      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editFieldId ? "Editar Campo" : "Adicionar Campo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de Campo *</Label>
              <Select value={fieldForm.fieldType} onValueChange={v => setFieldForm(f => ({ ...f, fieldType: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {FIELD_TYPES.map(ft => (
                    <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rótulo (Label) *</Label>
                <Input value={fieldForm.label} onChange={e => setFieldForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Nome Completo" />
              </div>
              <div className="space-y-1.5">
                <Label>Nome (chave) *</Label>
                <Input value={fieldForm.name} onChange={e => setFieldForm(f => ({ ...f, name: e.target.value.replace(/\s/g, "_").toLowerCase() }))} placeholder="Ex: nome_completo" className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Placeholder</Label>
              <Input value={fieldForm.placeholder} onChange={e => setFieldForm(f => ({ ...f, placeholder: e.target.value }))} placeholder="Texto de exemplo..." />
            </div>
            <div className="space-y-1.5">
              <Label>Texto de Ajuda</Label>
              <Input value={fieldForm.helpText} onChange={e => setFieldForm(f => ({ ...f, helpText: e.target.value }))} placeholder="Instrução para o usuário..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Seção</Label>
                <Input value={fieldForm.sectionName} onChange={e => setFieldForm(f => ({ ...f, sectionName: e.target.value }))} placeholder="Ex: Dados Pessoais" />
              </div>
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input type="number" value={fieldForm.displayOrder} onChange={e => setFieldForm(f => ({ ...f, displayOrder: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <Label className="cursor-pointer">Campo Obrigatório</Label>
              <Switch checked={fieldForm.isRequired} onCheckedChange={v => setFieldForm(f => ({ ...f, isRequired: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddFieldOpen(false); setEditFieldId(null); resetFieldForm(); }}>Cancelar</Button>
            <Button onClick={handleFieldSubmit} disabled={!fieldForm.label || !fieldForm.name || addField.isPending || updateField.isPending}>
              {editFieldId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
