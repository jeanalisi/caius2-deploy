import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DocumentEditor from "@/components/DocumentEditor";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Copy,
  Edit,
  FileText,
  Loader2,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DOC_TYPE_LABELS: Record<string, string> = {
  memo: "Memorando",
  official_letter: "Ofício",
  dispatch: "Despacho",
  opinion: "Parecer",
  notification: "Notificação",
  certificate: "Certidão",
  report: "Relatório",
  response: "Resposta",
  other: "Outro",
};

function CreateTemplateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "memo" as any,
    content: "",
    variables: "",
  });
  const [aiLoading, setAiLoading] = useState(false);

  const create = trpc.caius.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Modelo criado com sucesso");
      setOpen(false);
      setForm({ name: "", type: "memo", content: "", variables: "" });
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const assist = trpc.caius.ai.assist.useMutation({
    onSuccess: (data) => {
      setForm((f) => ({ ...f, content: data.suggestion }));
      setAiLoading(false);
      toast.success("Modelo gerado pela IA — revise antes de salvar");
    },
    onError: (e) => { setAiLoading(false); toast.error(e.message); },
  });

  const handleAiGenerate = () => {
    if (!form.name) { toast.error("Informe o nome do modelo primeiro"); return; }
    setAiLoading(true);
    assist.mutate({
      action: "draft_document",
      context: `Tipo: ${DOC_TYPE_LABELS[form.type]}\nNome do modelo: ${form.name}\nVariáveis disponíveis: ${form.variables || "{{nome}}, {{data}}, {{setor}}, {{nup}}"}`,
      documentType: DOC_TYPE_LABELS[form.type],
    });
  };

  const variablesList = form.variables
    ? form.variables.split(",").map((v) => v.trim()).filter(Boolean)
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Novo Modelo</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Criar Modelo de Documento
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Modelo *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Ofício de Resposta Padrão" className="mt-1" />
            </div>
            <div>
              <Label>Tipo de Documento</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Variáveis (separadas por vírgula)</Label>
              <Input
                value={form.variables}
                onChange={(e) => setForm((f) => ({ ...f, variables: e.target.value }))}
                placeholder="{{nome}}, {{data}}, {{setor}}, {{nup}}, {{assunto}}"
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Use estas variáveis no conteúdo para substituição automática</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Conteúdo do Modelo *</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="gap-1.5 h-7 text-xs"
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                Gerar com IA
              </Button>
            </div>
            <DocumentEditor compact
              value={form.content}
              onChange={(v) => setForm((f) => ({ ...f, content: v }))}
              placeholder="Conteúdo do modelo com variáveis como {{nome}}, {{data}}, etc..."
              minHeight="260px"
            />
          </div>

          {variablesList.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {variablesList.map((v) => (
                <span key={v} className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5">{v}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => create.mutate({
              ...form,
              variables: variablesList.length ? variablesList : undefined,
            })}
            disabled={!form.name || !form.content || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Modelo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Templates() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data: templates, isLoading } = trpc.caius.templates.list.useQuery({
    type: typeFilter === "all" ? undefined : typeFilter,
  });

  const deleteTemplate = trpc.caius.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Modelo removido");
      utils.caius.templates.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = templates?.filter((t: any) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OmniLayout title="Modelos de Documentos">
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar modelos..." className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CreateTemplateDialog onCreated={() => utils.caius.templates.list.invalidate()} />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !filtered?.length ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <PenLine className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum modelo encontrado</p>
            <p className="text-xs text-muted-foreground/70">Crie modelos para agilizar a criação de documentos oficiais</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template: any) => (
              <Card
                key={template.id}
                className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => setPreviewTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-foreground line-clamp-1">{template.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{DOC_TYPE_LABELS[template.type] ?? template.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(template.content);
                          toast.success("Conteúdo copiado");
                        }}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Remover este modelo?")) deleteTemplate.mutate({ id: template.id });
                        }}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-3 font-mono">{template.content}</p>
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.variables.slice(0, 4).map((v: string) => (
                        <span key={v} className="text-[10px] font-mono bg-muted text-muted-foreground rounded px-1.5 py-0.5">{v}</span>
                      ))}
                      {template.variables.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{template.variables.length - 4}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preview Sheet */}
        <Sheet open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
            {previewTemplate && (
              <>
                <SheetHeader className="px-6 py-4 border-b border-border/60 bg-card/60 sticky top-0 z-10">
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-primary" />
                    {previewTemplate.name}
                  </SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Tipo:</span>
                    <span className="text-xs font-medium text-foreground">{DOC_TYPE_LABELS[previewTemplate.type] ?? previewTemplate.type}</span>
                  </div>
                </SheetHeader>
                <div className="p-6 space-y-4">
                  {previewTemplate.variables?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Variáveis:</p>
                      <div className="flex flex-wrap gap-1">
                        {previewTemplate.variables.map((v: string) => (
                          <span key={v} className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5">{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{previewTemplate.content}</pre>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        navigator.clipboard.writeText(previewTemplate.content ?? "");
                        toast.success("Conteúdo copiado para a área de transferência");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      Copiar Conteúdo
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </OmniLayout>
  );
}
