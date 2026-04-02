import OmniLayout from "@/components/OmniLayout";
import DocumentEditor from "@/components/DocumentEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronRight,
  FileText,
  Filter,
  Loader2,
  Paperclip,
  PenLine,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const DOC_TYPE_LABELS: Record<string, string> = {
  memo: "Memorando",
  official_letter: "Ofício",
  dispatch: "Despacho",
  opinion: "Parecer",
  notification: "Notificação",
  certificate: "Certidão",
  report: "Relatório",
  other: "Outro",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground border-border" },
  pending_signature: { label: "Aguardando Assinatura", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  signed: { label: "Assinado", color: "bg-green-500/15 text-green-400 border-green-500/20" },
  published: { label: "Publicado", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  archived: { label: "Arquivado", color: "bg-muted text-muted-foreground border-border" },
};

const MAX_FILES = 5;
const MAX_SIZE_MB = 20;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CreateDocumentDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "memo" as any,
    title: "",
    content: "",
    isConfidential: false,
    aiGenerated: false,
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sectors } = trpc.caius.sectors.list.useQuery();
  const [sectorId, setSectorId] = useState<number | undefined>();

  const uploadAttachment = trpc.attachments.upload.useMutation();

  const create = trpc.caius.documents.create.useMutation({
    onSuccess: async (data: any) => {
      if (pendingFiles.length > 0 && data.documentId) {
        setUploading(true);
        try {
          for (const file of pendingFiles) {
            const base64 = await fileToBase64(file);
            await uploadAttachment.mutateAsync({
              entityType: "document",
              entityId: data.documentId,
              fileName: file.name,
              mimeType: file.type,
              base64Data: base64,
            });
          }
        } catch {
          toast.error("Documento criado, mas alguns anexos falharam");
        } finally {
          setUploading(false);
        }
      }
      toast.success(`Documento criado com NUP: ${data.nup}`);
      setOpen(false);
      setForm({ type: "memo", title: "", content: "", isConfidential: false, aiGenerated: false });
      setPendingFiles([]);
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const assist = trpc.caius.ai.assist.useMutation({
    onSuccess: (data) => {
      setForm((f) => ({ ...f, content: data.suggestion, aiGenerated: true }));
      setAiLoading(false);
      toast.success("Conteúdo gerado pela IA — revise antes de salvar");
    },
    onError: (e) => {
      setAiLoading(false);
      toast.error(e.message);
    },
  });

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleFileAdd(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name} excede ${MAX_SIZE_MB}MB`);
        return false;
      }
      return true;
    });
    setPendingFiles((prev) => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_FILES) {
        toast.error(`Máximo de ${MAX_FILES} arquivos por documento`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }

  const handleAiGenerate = () => {
    if (!form.title) { toast.error("Informe o título primeiro"); return; }
    setAiLoading(true);
    assist.mutate({
      action: "draft_document",
      context: `Tipo: ${DOC_TYPE_LABELS[form.type]}\nTítulo: ${form.title}`,
      documentType: DOC_TYPE_LABELS[form.type],
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Novo Documento</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Criar Documento Oficial
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label>Setor</Label>
              <Select value={sectorId?.toString() ?? "none"} onValueChange={(v) => setSectorId(v && v !== "none" ? Number(v) : undefined)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                <SelectContent>
                  {sectors?.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Título do documento"
                className="mt-1"
              />
            </div>
          </div>

          {/* Rich Text Editor com botão IA */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Conteúdo</Label>
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
              onChange={(v) => setForm((f) => ({ ...f, content: v, aiGenerated: false }))}
              placeholder="Conteúdo do documento..."
              minHeight="220px"
            />
            {form.aiGenerated && (
              <p className="text-xs text-primary/70 mt-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Conteúdo gerado por IA — revise antes de finalizar
              </p>
            )}
          </div>

          {/* File Upload */}
          <div>
            <Label>Documentos Anexos</Label>
            <div
              className="mt-1 border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileAdd(e.dataTransfer.files); }}
            >
              <Paperclip className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">
                Clique ou arraste arquivos aqui (PDF, Word, imagens — máx. {MAX_SIZE_MB}MB cada, até {MAX_FILES} arquivos)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                className="hidden"
                onChange={(e) => handleFileAdd(e.target.files)}
              />
            </div>
            {pendingFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {pendingFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-muted/40 rounded px-3 py-1.5">
                    <span className="truncate max-w-[80%] text-foreground">{f.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-muted-foreground">{formatBytes(f.size)}</span>
                      <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => create.mutate({ ...form, sectorId })}
            disabled={!form.title || create.isPending || uploading}
          >
            {(create.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {uploading ? "Enviando anexos..." : "Criar Documento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SignDocumentButton({ documentId, nup }: { documentId: number; nup?: string }) {
  const utils = trpc.useUtils();
  const sign = trpc.caius.documents.sign.useMutation({
    onSuccess: () => {
      toast.success("Documento assinado eletronicamente");
      utils.caius.documents.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-xs"
      onClick={(e) => {
        e.stopPropagation();
        sign.mutate({ documentId, nup });
      }}
      disabled={sign.isPending}
    >
      {sign.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}
      Assinar
    </Button>
  );
}

export default function Documents() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const { data: documents, isLoading } = trpc.caius.documents.list.useQuery({
    type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    limit: 100,
  });

  return (
    <OmniLayout title="Documentos Oficiais">
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por NUP, título..."
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <SelectItem key={v} value={v}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CreateDocumentDialog onCreated={() => utils.caius.documents.list.invalidate()} />
        </div>

        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">NUP / Número</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Criado em</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : !documents?.length ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">Nenhum documento encontrado</p>
                    </td>
                  </tr>
                ) : (
                  documents.map(({ document, author, sector }: any) => {
                    const status = STATUS_CONFIG[document.status] ?? STATUS_CONFIG.draft;
                    return (
                      <tr key={document.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
                            {document.nup ?? document.documentNumber ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground line-clamp-1 max-w-xs">{document.title}</p>
                          {author && <p className="text-xs text-muted-foreground mt-0.5">{author.name}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{DOC_TYPE_LABELS[document.type] ?? document.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs border rounded-full px-2 py-0.5", status.color)}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{new Date(document.createdAt).toLocaleDateString("pt-BR")}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {(document.status === "draft" || document.status === "pending_signature") && (
                              <SignDocumentButton documentId={document.id} nup={document.nup} />
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-xs"
                              title="Ver chancela e assinaturas digitais"
                              onClick={(e) => { e.stopPropagation(); setLocation(`/assinaturas/document/${document.id}`); }}
                            >
                              <Shield className="h-3 w-3" />
                              Chancela
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </OmniLayout>
  );
}
