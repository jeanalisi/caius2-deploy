import { useState } from "react";
import OmniLayout from "@/components/OmniLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Settings2, Clock, Shield, Camera, MapPin,
  CheckCircle2, XCircle, FileText, FormInput, FileCheck, ChevronRight,
  GripVertical, X, CircleDot, Circle, ArrowLeft, Globe, EyeOff, Tag,
  Info, Users, DollarSign, Building2, MessageSquare, Copy,
} from "lucide-react";

const secrecyLabels: Record<string, { label: string; color: string }> = {
  public: { label: "Público", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  restricted: { label: "Restrito", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  confidential: { label: "Confidencial", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  secret: { label: "Sigiloso", color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const pubStatusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  published: { label: "Publicado", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  inactive: { label: "Inativo", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  restricted: { label: "Restrito", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
};

const FIELD_TYPES = [
  { value: "text", label: "Texto" }, { value: "textarea", label: "Texto Longo" },
  { value: "number", label: "Número" }, { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" }, { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" }, { value: "date", label: "Data" },
  { value: "datetime", label: "Data e Hora" }, { value: "select", label: "Seleção Única" },
  { value: "multiselect", label: "Seleção Múltipla" }, { value: "checkbox", label: "Caixa de Seleção" },
  { value: "radio", label: "Opção Única" }, { value: "file", label: "Arquivo" },
  { value: "image", label: "Imagem" }, { value: "signature", label: "Assinatura" },
  { value: "geolocation", label: "Geolocalização" },
];

const REQUIREMENT_CONFIG = {
  required: { label: "Obrigatório", color: "bg-red-500/10 text-red-400 border-red-500/20", Icon: CheckCircle2 },
  complementary: { label: "Complementar", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", Icon: CircleDot },
  optional: { label: "Opcional", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", Icon: Circle },
};

function ReqBadge({ r }: { r: string }) {
  const cfg = REQUIREMENT_CONFIG[r as keyof typeof REQUIREMENT_CONFIG] ?? REQUIREMENT_CONFIG.optional;
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

type ServiceTypeForm = {
  name: string; description: string; category: string; code: string;
  slaResponseHours: string; slaConclusionHours: string;
  secrecyLevel: "public" | "restricted" | "confidential" | "secret";
  requiresApproval: boolean; canConvertToProcess: boolean; allowPublicConsult: boolean;
  requiresSelfie: boolean; requiresGeolocation: boolean; requiresStrongAuth: boolean;
  serviceMode: "form" | "external";
  externalUrl: string;
};
const defaultForm: ServiceTypeForm = {
  name: "", description: "", category: "", code: "", slaResponseHours: "", slaConclusionHours: "",
  secrecyLevel: "public", requiresApproval: false, canConvertToProcess: false, allowPublicConsult: true,
  requiresSelfie: false, requiresGeolocation: false, requiresStrongAuth: false,
  serviceMode: "form", externalUrl: "",
};

type PublicationForm = {
  purpose: string; whoCanRequest: string; cost: string;
  formOfService: string; responseChannel: string; importantNotes: string;
};
const defaultPubForm: PublicationForm = {
  purpose: "", whoCanRequest: "", cost: "Gratuito", formOfService: "Online", responseChannel: "E-mail e Portal", importantNotes: "",
};

type SubjectForm = {
  name: string; description: string; code: string; isPublic: boolean;
  slaResponseHours: string; slaConclusionHours: string; importantNotes: string;
};
const defaultSubjectForm: SubjectForm = {
  name: "", description: "", code: "", isPublic: true,
  slaResponseHours: "", slaConclusionHours: "", importantNotes: "",
};

export default function ServiceTypes() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceTypeForm>(defaultForm);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("fields");

  // Fields
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [fieldForm, setFieldForm] = useState({ label: "", fieldType: "text", requirement: "optional", placeholder: "", helpText: "" });

  // Documents
  const [showDocForm, setShowDocForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [docForm, setDocForm] = useState({ name: "", description: "", requirement: "required", acceptedFormats: "pdf,jpg,png", maxSizeMb: 10 });

  // Subjects
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(defaultSubjectForm);

  // Duplicate
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingType, setDuplicatingType] = useState<any>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateCode, setDuplicateCode] = useState("");

  // Publication
  const [pubForm, setPubForm] = useState<PublicationForm>(defaultPubForm);
  const [savingPub, setSavingPub] = useState(false);

  const utils = trpc.useUtils();
  const { data: serviceTypes = [], refetch } = trpc.serviceTypes.list.useQuery({});
  const { data: fields = [] } = trpc.serviceTypeFields.list.useQuery(
    { serviceTypeId: selectedId! }, { enabled: !!selectedId }
  );
  const { data: documents = [] } = trpc.serviceTypeDocuments.list.useQuery(
    { serviceTypeId: selectedId! }, { enabled: !!selectedId }
  );
  const { data: subjects = [] } = trpc.serviceSubjects.list.useQuery(
    { serviceTypeId: selectedId! }, { enabled: !!selectedId }
  );

  const selectedType = (serviceTypes as any[]).find((s: any) => s.id === selectedId);

  // Service type mutations
  const createMutation = trpc.serviceTypes.create.useMutation({
    onSuccess: () => { toast.success("Tipo criado!"); refetch(); setOpen(false); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.serviceTypes.update.useMutation({
    onSuccess: () => { toast.success("Tipo atualizado!"); refetch(); setOpen(false); setEditId(null); setForm(defaultForm); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.serviceTypes.delete.useMutation({
    onSuccess: () => { toast.success("Tipo removido."); refetch(); setSelectedId(null); },
    onError: (e) => toast.error(e.message),
  });
  const duplicateMutation = trpc.serviceTypes.duplicate.useMutation({
    onSuccess: (newType) => {
      toast.success(`Tipo "${newType.name}" criado com sucesso!`);
      refetch();
      setDuplicateDialogOpen(false);
      setDuplicatingType(null);
      setDuplicateName("");
      setDuplicateCode("");
    },
    onError: (e) => toast.error(e.message),
  });

  const publishMutation = trpc.cidadao.publish.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isPublic ? "Serviço publicado na Central do Cidadão!" : "Serviço despublicado.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Fields mutations
  const createField = trpc.serviceTypeFields.create.useMutation({
    onSuccess: () => { utils.serviceTypeFields.list.invalidate({ serviceTypeId: selectedId! }); setShowFieldForm(false); setEditingField(null); toast.success("Campo adicionado"); },
    onError: (e) => toast.error(e.message),
  });
  const updateField = trpc.serviceTypeFields.update.useMutation({
    onSuccess: () => { utils.serviceTypeFields.list.invalidate({ serviceTypeId: selectedId! }); setShowFieldForm(false); setEditingField(null); toast.success("Campo atualizado"); },
  });
  const deleteField = trpc.serviceTypeFields.delete.useMutation({
    onSuccess: () => utils.serviceTypeFields.list.invalidate({ serviceTypeId: selectedId! }),
  });

  // Documents mutations
  const createDoc = trpc.serviceTypeDocuments.create.useMutation({
    onSuccess: () => { utils.serviceTypeDocuments.list.invalidate({ serviceTypeId: selectedId! }); setShowDocForm(false); setEditingDoc(null); toast.success("Documento adicionado"); },
    onError: (e) => toast.error(e.message),
  });
  const updateDoc = trpc.serviceTypeDocuments.update.useMutation({
    onSuccess: () => { utils.serviceTypeDocuments.list.invalidate({ serviceTypeId: selectedId! }); setShowDocForm(false); setEditingDoc(null); toast.success("Documento atualizado"); },
  });
  const deleteDoc = trpc.serviceTypeDocuments.delete.useMutation({
    onSuccess: () => utils.serviceTypeDocuments.list.invalidate({ serviceTypeId: selectedId! }),
  });

  // Subjects mutations
  const createSubject = trpc.serviceSubjects.create.useMutation({
    onSuccess: () => { utils.serviceSubjects.list.invalidate({ serviceTypeId: selectedId! }); setShowSubjectForm(false); setEditingSubject(null); toast.success("Assunto adicionado"); },
    onError: (e) => toast.error(e.message),
  });
  const updateSubject = trpc.serviceSubjects.update.useMutation({
    onSuccess: () => { utils.serviceSubjects.list.invalidate({ serviceTypeId: selectedId! }); setShowSubjectForm(false); setEditingSubject(null); toast.success("Assunto atualizado"); },
  });
  const deleteSubject = trpc.serviceSubjects.delete.useMutation({
    onSuccess: () => utils.serviceSubjects.list.invalidate({ serviceTypeId: selectedId! }),
  });

  // Publication update
  const updatePubMutation = trpc.serviceTypes.update.useMutation({
    onSuccess: () => { toast.success("Informações de publicação salvas!"); refetch(); setSavingPub(false); },
    onError: (e) => { toast.error(e.message); setSavingPub(false); },
  });

  function openCreate() { setEditId(null); setForm(defaultForm); setOpen(true); }
  function openDuplicate(st: any) {
    setDuplicatingType(st);
    setDuplicateName(`${st.name} (Cópia)`);
    setDuplicateCode(st.code ? `${st.code}-COPIA` : "");
    setDuplicateDialogOpen(true);
  }
  function handleDuplicate() {
    if (!duplicatingType || !duplicateName.trim()) return;
    duplicateMutation.mutate({
      id: duplicatingType.id,
      name: duplicateName.trim(),
      code: duplicateCode.trim() || null,
    });
  }
  function openEdit(st: any) {
    setEditId(st.id);
    setForm({
      name: st.name ?? "", description: st.description ?? "", category: st.category ?? "",
      code: st.code ?? "", slaResponseHours: st.slaResponseHours?.toString() ?? "",
      slaConclusionHours: st.slaConclusionHours?.toString() ?? "",
      secrecyLevel: st.secrecyLevel ?? "public", requiresApproval: st.requiresApproval ?? false,
      canConvertToProcess: st.canConvertToProcess ?? false, allowPublicConsult: st.allowPublicConsult ?? true,
      requiresSelfie: st.requiresSelfie ?? false, requiresGeolocation: st.requiresGeolocation ?? false,
      requiresStrongAuth: st.requiresStrongAuth ?? false,
      serviceMode: (st as any).serviceMode ?? "form",
      externalUrl: (st as any).externalUrl ?? "",
    });
    setOpen(true);
  }
  function handleSubmit() {
    const payload = {
      ...form,
      slaResponseHours: form.slaResponseHours ? Number(form.slaResponseHours) : undefined,
      slaConclusionHours: form.slaConclusionHours ? Number(form.slaConclusionHours) : undefined,
      code: form.code || undefined, category: form.category || undefined, description: form.description || undefined,
    };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  }
  function handleSaveField() {
    if (!selectedId) return;
    const name = fieldForm.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (editingField) updateField.mutate({ id: editingField.id, label: fieldForm.label, fieldType: fieldForm.fieldType as any, requirement: fieldForm.requirement as any, placeholder: fieldForm.placeholder || undefined, helpText: fieldForm.helpText || undefined });
    else createField.mutate({ serviceTypeId: selectedId, name, label: fieldForm.label, fieldType: fieldForm.fieldType as any, requirement: fieldForm.requirement as any, placeholder: fieldForm.placeholder || undefined, helpText: fieldForm.helpText || undefined });
  }
  function handleSaveDoc() {
    if (!selectedId) return;
    if (editingDoc) updateDoc.mutate({ id: editingDoc.id, name: docForm.name, description: docForm.description || undefined, requirement: docForm.requirement as any, acceptedFormats: docForm.acceptedFormats, maxSizeMb: docForm.maxSizeMb });
    else createDoc.mutate({ serviceTypeId: selectedId, name: docForm.name, description: docForm.description || undefined, requirement: docForm.requirement as any, acceptedFormats: docForm.acceptedFormats, maxSizeMb: docForm.maxSizeMb });
  }
  function handleSaveSubject() {
    if (!selectedId) return;
    const payload = {
      serviceTypeId: selectedId,
      name: subjectForm.name,
      description: subjectForm.description || undefined,
      code: subjectForm.code || undefined,
      isPublic: subjectForm.isPublic,
      slaResponseHours: subjectForm.slaResponseHours ? Number(subjectForm.slaResponseHours) : undefined,
      slaConclusionHours: subjectForm.slaConclusionHours ? Number(subjectForm.slaConclusionHours) : undefined,
      importantNotes: subjectForm.importantNotes || undefined,
    };
    if (editingSubject) updateSubject.mutate({ id: editingSubject.id, ...payload });
    else createSubject.mutate(payload);
  }
  function handleSavePub() {
    if (!selectedId) return;
    setSavingPub(true);
    updatePubMutation.mutate({
      id: selectedId,
      // @ts-ignore — extra fields added in migration
      purpose: pubForm.purpose || undefined,
      whoCanRequest: pubForm.whoCanRequest || undefined,
      cost: pubForm.cost || undefined,
      formOfService: pubForm.formOfService || undefined,
      responseChannel: pubForm.responseChannel || undefined,
      importantNotes: pubForm.importantNotes || undefined,
    } as any);
  }
  function openSubjectEdit(s: any) {
    setEditingSubject(s);
    setSubjectForm({
      name: s.name ?? "", description: s.description ?? "", code: s.code ?? "",
      isPublic: s.isPublic ?? true,
      slaResponseHours: s.slaResponseHours?.toString() ?? "",
      slaConclusionHours: s.slaConclusionHours?.toString() ?? "",
      importantNotes: s.importantNotes ?? "",
    });
    setShowSubjectForm(true);
  }
  function openDetail(st: any) {
    setSelectedId(st.id);
    setActiveTab("fields");
    setPubForm({
      purpose: (st as any).purpose ?? "",
      whoCanRequest: (st as any).whoCanRequest ?? "",
      cost: (st as any).cost ?? "Gratuito",
      formOfService: (st as any).formOfService ?? "Online",
      responseChannel: (st as any).responseChannel ?? "E-mail e Portal",
      importantNotes: (st as any).importantNotes ?? "",
    });
  }

  return (
    <OmniLayout>
      {selectedId && selectedType ? (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="p-5 border-b border-border/50 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />Voltar
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-foreground truncate">{selectedType.name}</h1>
                {selectedType.code && <Badge variant="outline" className="font-mono text-xs">{selectedType.code}</Badge>}
                <Badge className={`text-xs border ${secrecyLabels[selectedType.secrecyLevel]?.color ?? ""}`}>
                  <Shield className="w-3 h-3 mr-1" />{secrecyLabels[selectedType.secrecyLevel]?.label}
                </Badge>
                <Badge className={`text-xs border ${pubStatusLabels[(selectedType as any).publicationStatus ?? "draft"]?.color ?? ""}`}>
                  <Globe className="w-3 h-3 mr-1" />{pubStatusLabels[(selectedType as any).publicationStatus ?? "draft"]?.label}
                </Badge>
              </div>
              {selectedType.description && <p className="text-xs text-muted-foreground mt-0.5">{selectedType.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(selectedType as any).isPublic ? (
                <Button size="sm" variant="outline" className="gap-1.5 text-red-400 border-red-400/30 hover:bg-red-500/10"
                  onClick={() => publishMutation.mutate({ id: selectedType.id, isPublic: false })}>
                  <EyeOff className="w-3.5 h-3.5" />Despublicar
                </Button>
              ) : (
                <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={() => publishMutation.mutate({ id: selectedType.id, isPublic: true })}>
                  <Globe className="w-3.5 h-3.5" />Publicar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => openEdit(selectedType)}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" />Editar
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="mx-5 mt-4 w-fit flex-wrap h-auto gap-1">
              <TabsTrigger value="fields">
                <FormInput className="w-4 h-4 mr-1.5" />Campos
                {(fields as any[]).length > 0 && <Badge className="ml-1.5 h-4 px-1 text-xs">{(fields as any[]).length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileCheck className="w-4 h-4 mr-1.5" />Documentos
                {(documents as any[]).length > 0 && <Badge className="ml-1.5 h-4 px-1 text-xs">{(documents as any[]).length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="subjects">
                <Tag className="w-4 h-4 mr-1.5" />Assuntos
                {(subjects as any[]).length > 0 && <Badge className="ml-1.5 h-4 px-1 text-xs">{(subjects as any[]).length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="publication">
                <Globe className="w-4 h-4 mr-1.5" />Publicação
              </TabsTrigger>
            </TabsList>

            {/* FIELDS TAB */}
            <TabsContent value="fields" className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Campos do Formulário</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure os campos exibidos ao cidadão ao abrir este tipo de atendimento</p>
                  </div>
                  <Button size="sm" onClick={() => { setEditingField(null); setFieldForm({ label: "", fieldType: "text", requirement: "optional", placeholder: "", helpText: "" }); setShowFieldForm(true); }}>
                    <Plus className="w-4 h-4 mr-1.5" />Adicionar Campo
                  </Button>
                </div>
                {(fields as any[]).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                    <FormInput className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum campo configurado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(fields as any[]).map(f => (
                      <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30 group hover:border-border/60 transition-colors">
                        <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{f.label}</span>
                            <ReqBadge r={f.requirement} />
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              {FIELD_TYPES.find(t => t.value === f.fieldType)?.label ?? f.fieldType}
                            </span>
                          </div>
                          {(f.placeholder || f.helpText) && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.helpText || f.placeholder}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingField(f); setFieldForm({ label: f.label, fieldType: f.fieldType, requirement: f.requirement, placeholder: f.placeholder ?? "", helpText: f.helpText ?? "" }); setShowFieldForm(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteField.mutate({ id: f.id })}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* DOCUMENTS TAB */}
            <TabsContent value="documents" className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Documentos Exigidos</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Configure os documentos que o cidadão deve apresentar para este serviço</p>
                  </div>
                  <Button size="sm" onClick={() => { setEditingDoc(null); setDocForm({ name: "", description: "", requirement: "required", acceptedFormats: "pdf,jpg,png", maxSizeMb: 10 }); setShowDocForm(true); }}>
                    <Plus className="w-4 h-4 mr-1.5" />Adicionar Documento
                  </Button>
                </div>
                {(documents as any[]).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                    <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum documento configurado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(documents as any[]).map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30 group hover:border-border/60 transition-colors">
                        <FileText className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{d.name}</span>
                            <ReqBadge r={d.requirement} />
                          </div>
                          {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">Formatos: {d.acceptedFormats} · Máx: {d.maxSizeMb}MB</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingDoc(d); setDocForm({ name: d.name, description: d.description ?? "", requirement: d.requirement, acceptedFormats: d.acceptedFormats ?? "pdf,jpg,png", maxSizeMb: d.maxSizeMb ?? 10 }); setShowDocForm(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteDoc.mutate({ id: d.id })}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* SUBJECTS TAB */}
            <TabsContent value="subjects" className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Assuntos</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Defina os assuntos disponíveis para este tipo de atendimento (ex: reclamação, denúncia, requerimento)</p>
                  </div>
                  <Button size="sm" onClick={() => { setEditingSubject(null); setSubjectForm(defaultSubjectForm); setShowSubjectForm(true); }}>
                    <Plus className="w-4 h-4 mr-1.5" />Adicionar Assunto
                  </Button>
                </div>
                {(subjects as any[]).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum assunto configurado</p>
                    <p className="text-xs mt-1">Adicione assuntos para que o cidadão possa especificar o motivo do atendimento</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(subjects as any[]).map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/30 group hover:border-border/60 transition-colors">
                        <Tag className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">{s.name}</span>
                            {s.code && <Badge variant="outline" className="font-mono text-xs">{s.code}</Badge>}
                            <Badge className={s.isPublic ? "bg-green-500/10 text-green-400 border-green-500/20 text-xs" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-xs"}>
                              {s.isPublic ? "Público" : "Interno"}
                            </Badge>
                          </div>
                          {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                          {(s.slaResponseHours || s.slaConclusionHours) && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {s.slaResponseHours && `Resposta: ${s.slaResponseHours}h`}
                              {s.slaResponseHours && s.slaConclusionHours && " · "}
                              {s.slaConclusionHours && `Conclusão: ${s.slaConclusionHours}h`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openSubjectEdit(s)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteSubject.mutate({ id: s.id })}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PUBLICATION TAB */}
            <TabsContent value="publication" className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-foreground">Informações para o Cidadão</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Estas informações serão exibidas na Central de Serviços do Cidadão quando o serviço for publicado</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(selectedType as any).isPublic ? (
                      <Button size="sm" variant="outline" className="gap-1.5 text-red-400 border-red-400/30 hover:bg-red-500/10"
                        onClick={() => publishMutation.mutate({ id: selectedType.id, isPublic: false })}>
                        <EyeOff className="w-3.5 h-3.5" />Despublicar
                      </Button>
                    ) : (
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700"
                        onClick={() => publishMutation.mutate({ id: selectedType.id, isPublic: true })}>
                        <Globe className="w-3.5 h-3.5" />Publicar na Central
                      </Button>
                    )}
                  </div>
                </div>

                <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${(selectedType as any).isPublic ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-zinc-500/10 border-zinc-500/30 text-zinc-400"}`}>
                  {(selectedType as any).isPublic ? <Globe className="w-4 h-4 shrink-0" /> : <EyeOff className="w-4 h-4 shrink-0" />}
                  {(selectedType as any).isPublic ? "Este serviço está publicado e visível na Central do Cidadão." : "Este serviço não está publicado. Preencha as informações abaixo e clique em Publicar."}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5" />Para que serve este serviço?</Label>
                    <Textarea value={pubForm.purpose} onChange={e => setPubForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Descreva o objetivo e finalidade deste serviço para o cidadão..." rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Quem pode solicitar?</Label>
                    <Textarea value={pubForm.whoCanRequest} onChange={e => setPubForm(p => ({ ...p, whoCanRequest: e.target.value }))} placeholder="Ex: Qualquer cidadão maior de 18 anos com CPF..." rows={2} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />Custo</Label>
                      <Input value={pubForm.cost} onChange={e => setPubForm(p => ({ ...p, cost: e.target.value }))} placeholder="Ex: Gratuito, R$ 50,00..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />Forma de atendimento</Label>
                      <Input value={pubForm.formOfService} onChange={e => setPubForm(p => ({ ...p, formOfService: e.target.value }))} placeholder="Ex: Online, Presencial, Híbrido..." />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Canal de resposta</Label>
                    <Input value={pubForm.responseChannel} onChange={e => setPubForm(p => ({ ...p, responseChannel: e.target.value }))} placeholder="Ex: E-mail, Portal, Presencial..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5" />Observações importantes</Label>
                    <Textarea value={pubForm.importantNotes} onChange={e => setPubForm(p => ({ ...p, importantNotes: e.target.value }))} placeholder="Informações adicionais, restrições, avisos..." rows={3} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSavePub} disabled={savingPub}>
                    {savingPub ? "Salvando..." : "Salvar Informações de Publicação"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* ── List view ── */
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Tipos de Atendimento</h1>
              <p className="text-sm text-muted-foreground mt-1">Configure os serviços, campos obrigatórios, documentos exigidos, assuntos, SLAs e publicação na Central do Cidadão.</p>
            </div>
            <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" />Novo Tipo</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(serviceTypes as any[]).length === 0 && (
              <div className="col-span-3 text-center py-16 text-muted-foreground">
                <Settings2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum tipo de atendimento configurado.</p>
                <p className="text-sm mt-1">Crie o primeiro tipo para começar a receber protocolos.</p>
              </div>
            )}
            {(serviceTypes as any[]).map((st) => {
              const secrecy = secrecyLabels[st.secrecyLevel] ?? secrecyLabels.public;
              const pubStatus = pubStatusLabels[st.publicationStatus ?? "draft"] ?? pubStatusLabels.draft;
              return (
                <div key={st.id} className="rounded-xl border border-border bg-card hover:border-primary/40 transition-colors p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{st.name}</h3>
                      {st.code && <p className="font-mono text-xs text-muted-foreground mt-0.5">{st.code}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-xs border shrink-0 ${secrecy.color}`}>
                        <Shield className="w-3 h-3 mr-1" />{secrecy.label}
                      </Badge>
                      <Badge className={`text-xs border shrink-0 ${pubStatus.color}`}>
                        <Globe className="w-3 h-3 mr-1" />{pubStatus.label}
                      </Badge>
                    </div>
                  </div>
                  {st.description && <p className="text-xs text-muted-foreground line-clamp-2">{st.description}</p>}
                  {(st.slaResponseHours || st.slaConclusionHours) && (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {st.slaResponseHours && <span>Resposta: {st.slaResponseHours}h</span>}
                      {st.slaConclusionHours && <span>Conclusão: {st.slaConclusionHours}h</span>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {st.requiresSelfie && <span className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded px-1.5 py-0.5"><Camera className="w-3 h-3" />Selfie</span>}
                    {st.requiresGeolocation && <span className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-1.5 py-0.5"><MapPin className="w-3 h-3" />Geoloc.</span>}
                    {st.requiresApproval && <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5"><CheckCircle2 className="w-3 h-3" />Aprovação</span>}
                    {!st.isActive && <span className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1.5 py-0.5"><XCircle className="w-3 h-3" />Inativo</span>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => openDetail(st)}>
                      <FormInput className="w-3.5 h-3.5" />Configurar
                      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                    </Button>
                    {st.isPublic ? (
                      <Button size="sm" variant="outline" className="text-red-400 border-red-400/30 hover:bg-red-500/10" onClick={() => publishMutation.mutate({ id: st.id, isPublic: false })}>
                        <EyeOff className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => publishMutation.mutate({ id: st.id, isPublic: true })}>
                        <Globe className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openDuplicate(st)} title="Duplicar tipo de atendimento"><Copy className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(st)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: st.id })}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Service Type Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Tipo de Atendimento" : "Novo Tipo de Atendimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Alvará de Funcionamento" />
              </div>
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Ex: ALV-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Licenças" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>SLA Resposta (horas)</Label>
                <Input type="number" value={form.slaResponseHours} onChange={e => setForm(f => ({ ...f, slaResponseHours: e.target.value }))} placeholder="72" />
              </div>
              <div className="space-y-1.5">
                <Label>SLA Conclusão (horas)</Label>
                <Input type="number" value={form.slaConclusionHours} onChange={e => setForm(f => ({ ...f, slaConclusionHours: e.target.value }))} placeholder="720" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Nível de Sigilo</Label>
                <Select value={form.secrecyLevel} onValueChange={v => setForm(f => ({ ...f, secrecyLevel: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Público</SelectItem>
                    <SelectItem value="restricted">Restrito</SelectItem>
                    <SelectItem value="confidential">Confidencial</SelectItem>
                    <SelectItem value="secret">Sigiloso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Modo de Atendimento</Label>
                <Select value={form.serviceMode} onValueChange={v => setForm(f => ({ ...f, serviceMode: v as any, externalUrl: v === "form" ? "" : f.externalUrl }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="form">Formulário — cidadão preenche formulário no sistema</SelectItem>
                    <SelectItem value="external">Externo — redireciona para link externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.serviceMode === "external" && (
                <div className="col-span-2 space-y-1.5">
                  <Label>URL de Destino *</Label>
                  <Input
                    value={form.externalUrl}
                    onChange={e => setForm(f => ({ ...f, externalUrl: e.target.value }))}
                    placeholder="https://exemplo.gov.br/servico"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">O cidadão será redirecionado para este endereço ao acessar o serviço na Central do Cidadão.</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "requiresApproval", label: "Requer Aprovação" },
                { key: "canConvertToProcess", label: "Pode virar Processo" },
                { key: "allowPublicConsult", label: "Consulta Pública" },
                { key: "requiresSelfie", label: "Requer Selfie" },
                { key: "requiresGeolocation", label: "Requer Geolocalização" },
                { key: "requiresStrongAuth", label: "Autenticação Forte" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                  <Label className="text-sm cursor-pointer">{label}</Label>
                  <Switch checked={form[key as keyof ServiceTypeForm] as boolean} onCheckedChange={v => setForm(f => ({ ...f, [key]: v }))} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending || updateMutation.isPending}>
              {editId ? "Salvar Alterações" : "Criar Tipo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Form Dialog */}
      <Dialog open={showFieldForm} onOpenChange={setShowFieldForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingField ? "Editar Campo" : "Novo Campo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Rótulo *</Label>
              <Input value={fieldForm.label} onChange={e => setFieldForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Nome Completo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={fieldForm.fieldType} onValueChange={v => setFieldForm(f => ({ ...f, fieldType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Obrigatoriedade</Label>
                <Select value={fieldForm.requirement} onValueChange={v => setFieldForm(f => ({ ...f, requirement: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Obrigatório</SelectItem>
                    <SelectItem value="complementary">Complementar</SelectItem>
                    <SelectItem value="optional">Opcional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Placeholder</Label>
              <Input value={fieldForm.placeholder} onChange={e => setFieldForm(f => ({ ...f, placeholder: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Texto de Ajuda</Label>
              <Input value={fieldForm.helpText} onChange={e => setFieldForm(f => ({ ...f, helpText: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFieldForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveField} disabled={!fieldForm.label}>{editingField ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Form Dialog */}
      <Dialog open={showDocForm} onOpenChange={setShowDocForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingDoc ? "Editar Documento" : "Novo Documento"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: RG ou CNH" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Obrigatoriedade</Label>
                <Select value={docForm.requirement} onValueChange={v => setDocForm(f => ({ ...f, requirement: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Obrigatório</SelectItem>
                    <SelectItem value="complementary">Complementar</SelectItem>
                    <SelectItem value="optional">Opcional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tamanho Máx (MB)</Label>
                <Input type="number" value={docForm.maxSizeMb} onChange={e => setDocForm(f => ({ ...f, maxSizeMb: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Formatos Aceitos</Label>
              <Input value={docForm.acceptedFormats} onChange={e => setDocForm(f => ({ ...f, acceptedFormats: e.target.value }))} placeholder="pdf,jpg,png" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveDoc} disabled={!docForm.name}>{editingDoc ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subject Form Dialog */}
      <Dialog open={showSubjectForm} onOpenChange={setShowSubjectForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingSubject ? "Editar Assunto" : "Novo Assunto"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome *</Label>
                <Input value={subjectForm.name} onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Reclamação, Denúncia, Requerimento..." />
              </div>
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input value={subjectForm.code} onChange={e => setSubjectForm(f => ({ ...f, code: e.target.value }))} placeholder="Ex: REC-001" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                <Label className="text-sm cursor-pointer">Visível ao Cidadão</Label>
                <Switch checked={subjectForm.isPublic} onCheckedChange={v => setSubjectForm(f => ({ ...f, isPublic: v }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={subjectForm.description} onChange={e => setSubjectForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>SLA Resposta (horas)</Label>
                <Input type="number" value={subjectForm.slaResponseHours} onChange={e => setSubjectForm(f => ({ ...f, slaResponseHours: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>SLA Conclusão (horas)</Label>
                <Input type="number" value={subjectForm.slaConclusionHours} onChange={e => setSubjectForm(f => ({ ...f, slaConclusionHours: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={subjectForm.importantNotes} onChange={e => setSubjectForm(f => ({ ...f, importantNotes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubjectForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveSubject} disabled={!subjectForm.name}>{editingSubject ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Service Type Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={(v) => { setDuplicateDialogOpen(v); if (!v) setDuplicatingType(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              Duplicar Tipo de Atendimento
            </DialogTitle>
          </DialogHeader>

          {duplicatingType && (
            <div className="space-y-4 py-2">
              {/* Origem */}
              <div className="rounded-lg bg-muted/30 border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">Copiando de</p>
                <p className="font-semibold text-sm">{duplicatingType.name}</p>
                {duplicatingType.code && (
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">{duplicatingType.code}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Todas as configurações serão copiadas. A cópia será criada como <strong>Rascunho</strong> e não publicada.
                </p>
              </div>

              {/* Novo nome */}
              <div className="space-y-1.5">
                <Label>Nome da Cópia *</Label>
                <Input
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  placeholder="Ex: Alvará de Funcionamento (Cópia)"
                  autoFocus
                />
              </div>

              {/* Novo código */}
              <div className="space-y-1.5">
                <Label>Código <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  value={duplicateCode}
                  onChange={(e) => setDuplicateCode(e.target.value)}
                  placeholder="Ex: ALV-002"
                />
                <p className="text-xs text-muted-foreground">Deixe em branco para criar sem código. O código deve ser único.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleDuplicate}
              disabled={!duplicateName.trim() || duplicateMutation.isPending}
              className="gap-1.5"
            >
              {duplicateMutation.isPending ? (
                <><span className="animate-spin">⏳</span> Duplicando...</>
              ) : (
                <><Copy className="h-4 w-4" /> Duplicar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
