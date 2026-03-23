import OmniLayout from "@/components/OmniLayout";
import DocumentEditor from "@/components/DocumentEditor";
import { Badge } from "@/components/ui/badge";
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
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardList,
  Filter,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import ProtocolDetail from "./ProtocolDetail";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Aberto", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Clock },
  in_analysis: { label: "Em Análise", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", icon: AlertCircle },
  pending_docs: { label: "Pendente Docs", color: "bg-orange-500/15 text-orange-400 border-orange-500/20", icon: AlertCircle },
  in_progress: { label: "Em Andamento", color: "bg-purple-500/15 text-purple-400 border-purple-500/20", icon: Clock },
  concluded: { label: "Concluído", color: "bg-green-500/15 text-green-400 border-green-500/20", icon: CheckCircle2 },
  archived: { label: "Arquivado", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  request: "Solicitação",
  complaint: "Reclamação",
  information: "Informação",
  suggestion: "Sugestão",
  praise: "Elogio",
  ombudsman: "Ouvidoria",
  esic: "e-SIC",
  administrative: "Administrativo",
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "text-muted-foreground" },
  normal: { label: "Normal", color: "text-blue-400" },
  high: { label: "Alta", color: "text-orange-400" },
  urgent: { label: "Urgente", color: "text-red-400" },
};

const MAX_FILES = 5;
const MAX_SIZE_MB = 20;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function NupBadge({ nup }: { nup: string }) {
  return (
    <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 select-all">
      {nup}
    </span>
  );
}

function CreateProtocolDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    type: "request" as any,
    channel: "web" as any,
    priority: "normal" as any,
    requesterName: "",
    requesterEmail: "",
    requesterPhone: "",
    requesterCpfCnpj: "",
    isConfidential: false,
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sectors } = trpc.caius.sectors.list.useQuery();
  const [sectorId, setSectorId] = useState<number | undefined>();

  const uploadAttachment = trpc.attachments.upload.useMutation();

  const create = trpc.caius.protocols.create.useMutation({
    onSuccess: async (data) => {
      // Upload pending files linked to the new protocol
      if (pendingFiles.length > 0) {
        setUploading(true);
        try {
          for (const file of pendingFiles) {
            const base64 = await fileToBase64(file);
            await uploadAttachment.mutateAsync({
              entityType: "protocol",
              entityId: data.protocolId ?? 0,
              fileName: file.name,
              mimeType: file.type,
              base64Data: base64,
            });
          }
        } catch {
          toast.error("Protocolo criado, mas alguns anexos falharam");
        } finally {
          setUploading(false);
        }
      }
      toast.success(`Protocolo criado com NUP: ${data.nup}`, { duration: 8000 });
      setOpen(false);
      setForm({ subject: "", description: "", type: "request", channel: "web", priority: "normal", requesterName: "", requesterEmail: "", requesterPhone: "", requesterCpfCnpj: "", isConfidential: false });
      setPendingFiles([]);
      onCreated();
    },
    onError: (e) => toast.error("Erro ao criar protocolo: " + e.message),
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
        toast.error(`Máximo de ${MAX_FILES} arquivos por protocolo`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Protocolo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Abrir Novo Protocolo
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Assunto *</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Descreva brevemente o assunto"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Canal de Entrada</Label>
              <Select value={form.channel} onValueChange={(v) => setForm((f) => ({ ...f, channel: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="in_person">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Setor Responsável</Label>
              <Select value={sectorId?.toString() ?? "none"} onValueChange={(v) => setSectorId(v && v !== "none" ? Number(v) : undefined)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                <SelectContent>
                  {sectors?.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rich Text Editor */}
            <div className="col-span-2">
              <Label>Descrição</Label>
              <div className="mt-1">
                <DocumentEditor compact
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                  placeholder="Detalhes da solicitação..."
                  minHeight="140px"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="col-span-2">
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

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dados do Solicitante</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.requesterName} onChange={(e) => setForm((f) => ({ ...f, requesterName: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input value={form.requesterCpfCnpj} onChange={(e) => setForm((f) => ({ ...f, requesterCpfCnpj: e.target.value }))} className="mt-1" placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.requesterEmail} onChange={(e) => setForm((f) => ({ ...f, requesterEmail: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.requesterPhone} onChange={(e) => setForm((f) => ({ ...f, requesterPhone: e.target.value }))} className="mt-1" placeholder="(00) 00000-0000" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => create.mutate({ ...form, responsibleSectorId: sectorId })}
            disabled={!form.subject || create.isPending || uploading}
          >
            {(create.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {uploading ? "Enviando anexos..." : "Abrir Protocolo e Gerar NUP"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Protocols() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: protocols, isLoading } = trpc.caius.protocols.list.useQuery({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
    limit: 100,
  });

  const { data: stats } = trpc.caius.protocols.stats.useQuery();

  if (selectedId) {
    return <ProtocolDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <OmniLayout title="Protocolos — NUP">
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { key: "total", label: "Total", color: "text-foreground" },
            { key: "open", label: "Abertos", color: "text-blue-400" },
            { key: "in_analysis", label: "Em Análise", color: "text-yellow-400" },
            { key: "in_progress", label: "Em Andamento", color: "text-purple-400" },
            { key: "concluded", label: "Concluídos", color: "text-green-400" },
            { key: "archived", label: "Arquivados", color: "text-muted-foreground" },
          ].map((s) => (
            <Card key={s.key} className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={cn("text-2xl font-bold mt-1", s.color)}>
                  {(stats as any)?.[s.key] ?? 0}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por NUP, assunto, nome, CPF..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <SelectItem key={v} value={v}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v: string) => setTypeFilter(v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CreateProtocolDialog onCreated={() => utils.caius.protocols.list.invalidate()} />
        </div>

        {/* Table */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">NUP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assunto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prioridade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Abertura</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : !protocols?.length ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">Nenhum protocolo encontrado</p>
                    </td>
                  </tr>
                ) : (
                  protocols.map(({ protocol, sector }) => {
                    const status = STATUS_CONFIG[protocol.status] ?? STATUS_CONFIG.open;
                    const priority = PRIORITY_CONFIG[protocol.priority] ?? PRIORITY_CONFIG.normal;
                    const StatusIcon = status.icon;
                    return (
                      <tr
                        key={protocol.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedId(protocol.id)}
                      >
                        <td className="px-4 py-3">
                          <NupBadge nup={protocol.nup} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground line-clamp-1 max-w-xs">{protocol.subject}</p>
                          {protocol.requesterName && (
                            <p className="text-xs text-muted-foreground mt-0.5">{protocol.requesterName}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{TYPE_LABELS[protocol.type] ?? protocol.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5", status.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-medium", priority.color)}>{priority.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{sector?.name ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(protocol.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
