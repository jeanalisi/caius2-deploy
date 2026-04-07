import OmniLayout from "@/components/OmniLayout";
import DocumentEditor from "@/components/DocumentEditor";
import { WorkflowPanel } from "@/components/WorkflowPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  History,
  Loader2,
  Paperclip,
  Plus,
  Scale,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useRef, useState } from "react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Aberto", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Clock },
  in_analysis: { label: "Em Análise", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", icon: AlertCircle },
  pending_docs: { label: "Pendente Docs", color: "bg-orange-500/15 text-orange-400 border-orange-500/20", icon: AlertCircle },
  in_progress: { label: "Em Andamento", color: "bg-purple-500/15 text-purple-400 border-purple-500/20", icon: Clock },
  concluded: { label: "Concluído", color: "bg-green-500/15 text-green-400 border-green-500/20", icon: CheckCircle2 },
  archived: { label: "Arquivado", color: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

const PROCESS_TYPES = [
  "Licitação", "Contrato", "Convênio", "Sindicância", "PAD",
  "Recurso Administrativo", "Dispensa de Licitação", "Inexigibilidade",
  "Prestação de Contas", "Outro",
];

const MAX_FILES = 5;
const MAX_SIZE_MB = 20;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CreateProcessDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "",
    description: "",
    legalBasis: "",
    observations: "",
    priority: "normal" as any,
    isConfidential: false,
    originProtocolNup: "",
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sectors } = trpc.caius.sectors.list.useQuery();
  const [sectorId, setSectorId] = useState<number | undefined>();

  const uploadAttachment = trpc.attachments.upload.useMutation();

  const create = trpc.caius.processes.create.useMutation({
    onSuccess: async (data: any) => {
      if (pendingFiles.length > 0 && data.processId) {
        setUploading(true);
        try {
          for (const file of pendingFiles) {
            const base64 = await fileToBase64(file);
            await uploadAttachment.mutateAsync({
              entityType: "process",
              entityId: data.processId,
              fileName: file.name,
              mimeType: file.type,
              base64Data: base64,
            });
          }
        } catch {
          toast.error("Processo criado, mas alguns anexos falharam");
        } finally {
          setUploading(false);
        }
      }
      toast.success(`Processo criado com NUP: ${data.nup}`, { duration: 8000 });
      setOpen(false);
      setForm({ title: "", type: "", description: "", legalBasis: "", observations: "", priority: "normal", isConfidential: false, originProtocolNup: "" });
      setPendingFiles([]);
      onCreated();
    },
    onError: (e) => toast.error(e.message),
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
        toast.error(`Máximo de ${MAX_FILES} arquivos por processo`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Novo Processo</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Abrir Processo Administrativo
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Título do processo" className="mt-1" />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
                <SelectContent>
                  {PROCESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                  {sectors?.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>NUP de Origem (opcional)</Label>
              <Input value={form.originProtocolNup} onChange={(e) => setForm((f) => ({ ...f, originProtocolNup: e.target.value }))} placeholder="NUP do protocolo origem" className="mt-1 font-mono text-sm" />
            </div>

            {/* Rich Text Editor */}
            <div className="col-span-2">
              <Label>Descrição</Label>
              <div className="mt-1">
                <DocumentEditor compact
                  value={form.description}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                  placeholder="Descreva o processo administrativo..."
                  minHeight="140px"
                />
              </div>
            </div>

            <div>
              <Label>Fundamento Legal</Label>
              <Input value={form.legalBasis} onChange={(e) => setForm((f) => ({ ...f, legalBasis: e.target.value }))} placeholder="Ex: Lei 8.666/93, art. 24" className="mt-1" />
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={form.observations} onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))} className="mt-1" />
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
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => create.mutate({ ...form, responsibleSectorId: sectorId, originProtocolNup: form.originProtocolNup || undefined })}
            disabled={!form.title || !form.type || create.isPending || uploading}
          >
            {(create.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {uploading ? "Enviando anexos..." : "Abrir Processo e Gerar NUP"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Deadline Management Modal ───────────────────────────────────────────────
function DeadlineInlinePanel({ process, onClose, onSaved }: { process: any; onClose: () => void; onSaved: () => void }) {
  const utils = trpc.useUtils();
  const [newDeadline, setNewDeadline] = useState(
    process.deadline ? new Date(process.deadline).toISOString().split("T")[0] : ""
  );
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"set" | "extend" | "reduce" | "remove">("set");

  const { data: history = [], isLoading: historyLoading } = trpc.caius.processes.deadlineHistory.useQuery(
    { processId: process.id }
  );

  const setDeadline = trpc.caius.processes.setDeadline.useMutation({
    onSuccess: () => {
      toast.success("Prazo atualizado com sucesso!");
      utils.caius.processes.list.invalidate();
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!reason.trim()) return toast.error("Informe o motivo da alteração.");
    if (action !== "remove" && !newDeadline) return toast.error("Informe a nova data de prazo.");
    setDeadline.mutate({
      processId: process.id,
      newDeadline: action === "remove" ? null : new Date(newDeadline + "T23:59:59"),
      reason,
      action,
    });
  };

  const actionLabels: Record<string, string> = {
    set: "Definir Prazo", extend: "Prorrogar Prazo", reduce: "Reduzir Prazo", remove: "Remover Prazo",
  };
  const actionColors: Record<string, string> = {
    set: "text-blue-400", extend: "text-yellow-400", reduce: "text-orange-400", remove: "text-red-400",
  };

  return (
    <div className="rounded-lg border border-border bg-card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Gestão de Prazo</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <XCircle className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-lg bg-muted/30 border border-border p-3">
        <p className="text-xs text-muted-foreground mb-1">Prazo Atual</p>
        <p className="font-semibold text-sm">
          {process.deadline
            ? new Date(process.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
            : <span className="text-muted-foreground italic">Sem prazo definido</span>}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Tipo de Alteração</Label>
        <Select value={action} onValueChange={(v) => setAction(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="set">Definir Prazo</SelectItem>
            <SelectItem value="extend">Prorrogar Prazo</SelectItem>
            <SelectItem value="reduce">Reduzir Prazo</SelectItem>
            <SelectItem value="remove">Remover Prazo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {action !== "remove" && (
        <div className="space-y-1.5">
          <Label>Nova Data de Prazo</Label>
          <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} min={new Date().toISOString().split("T")[0]} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Motivo / Justificativa *</Label>
        <Textarea placeholder="Descreva o motivo da alteração do prazo..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={handleSubmit} disabled={setDeadline.isPending}>
          {setDeadline.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Salvar Prazo
        </Button>
      </div>

      {/* Histórico */}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm">Histórico de Alterações</Label>
        </div>
        {historyLoading ? (
          <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma alteração registrada.</p>
        ) : (
          <div className="space-y-2">
            {(history as any[]).map((h: any) => (
              <div key={h.id} className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("font-semibold capitalize", actionColors[h.action] ?? "text-foreground")}>{actionLabels[h.action] ?? h.action}</span>
                  <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
                <p className="text-muted-foreground">{h.reason}</p>
                {h.changedByName && <p className="text-muted-foreground mt-0.5">Por: {h.changedByName}</p>}
                {h.newDeadline && <p className="text-foreground mt-0.5">Novo prazo: {new Date(h.newDeadline).toLocaleDateString("pt-BR")}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeadlineModal({ process, onClose }: { process: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [newDeadline, setNewDeadline] = useState(
    process.deadline ? new Date(process.deadline).toISOString().split("T")[0] : ""
  );
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"set" | "extend" | "reduce" | "remove">("set");

  const { data: history = [], isLoading: historyLoading } = trpc.caius.processes.deadlineHistory.useQuery(
    { processId: process.id }
  );

  const setDeadline = trpc.caius.processes.setDeadline.useMutation({
    onSuccess: () => {
      toast.success("Prazo atualizado com sucesso!");
      utils.caius.processes.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!reason.trim()) return toast.error("Informe o motivo da alteração.");
    if (action !== "remove" && !newDeadline) return toast.error("Informe a nova data de prazo.");
    setDeadline.mutate({
      processId: process.id,
      newDeadline: action === "remove" ? null : new Date(newDeadline + "T23:59:59"),
      reason,
      action,
    });
  };

  const actionLabels: Record<string, string> = {
    set: "Definir Prazo",
    extend: "Prorrogar Prazo",
    reduce: "Reduzir Prazo",
    remove: "Remover Prazo",
  };

  const actionColors: Record<string, string> = {
    set: "text-blue-400",
    extend: "text-yellow-400",
    reduce: "text-orange-400",
    remove: "text-red-400",
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Gestão de Prazo
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{process.nup}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current deadline */}
          <div className="rounded-lg bg-muted/30 border border-border p-3">
            <p className="text-xs text-muted-foreground mb-1">Prazo Atual</p>
            <p className="font-semibold text-sm">
              {process.deadline
                ? new Date(process.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
                : <span className="text-muted-foreground italic">Sem prazo definido</span>}
            </p>
          </div>

          {/* Action type */}
          <div className="space-y-1.5">
            <Label>Tipo de Alteração</Label>
            <Select value={action} onValueChange={(v) => setAction(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set">Definir Prazo</SelectItem>
                <SelectItem value="extend">Prorrogar Prazo</SelectItem>
                <SelectItem value="reduce">Reduzir Prazo</SelectItem>
                <SelectItem value="remove">Remover Prazo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* New deadline date */}
          {action !== "remove" && (
            <div className="space-y-1.5">
              <Label>Nova Data de Prazo</Label>
              <Input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Motivo / Justificativa *</Label>
            <Textarea
              placeholder="Descreva o motivo da alteração do prazo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* History */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Histórico de Alterações</Label>
            </div>
            {historyLoading ? (
              <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma alteração registrada.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h: any) => (
                  <div key={h.id} className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("font-semibold capitalize", actionColors[h.action] ?? "text-foreground")}>
                        {actionLabels[h.action] ?? h.action}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(h.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{h.reason}</p>
                    {h.changedByName && (
                      <p className="text-muted-foreground mt-0.5">Por: {h.changedByName}</p>
                    )}
                    {h.newDeadline && (
                      <p className="text-foreground mt-0.5">
                        Novo prazo: {new Date(h.newDeadline).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={setDeadline.isPending}>
            {setDeadline.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Prazo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProcesses() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewProcess, setViewProcess] = useState<any>(null);
  const [showDeadline, setShowDeadline] = useState(false);
  const utils = trpc.useUtils();

  const { data: processes, isLoading } = trpc.caius.processes.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    limit: 100,
  });

  return (
    <OmniLayout title="Processos Administrativos">
      <div className="flex h-full overflow-hidden">

        {/* ── Painel esquerdo: lista ── */}
        <div className={cn(
          "flex flex-col transition-all duration-200",
          viewProcess ? "w-[480px] min-w-[320px] shrink-0" : "flex-1"
        )}>
          <div className="p-6 pb-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por NUP, título..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <CreateProcessDialog onCreated={() => utils.caius.processes.list.invalidate()} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <Card className="bg-card border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">NUP</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                      {!viewProcess && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      {!viewProcess && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setor</th>}
                      {!viewProcess && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Abertura</th>}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prazo</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      <tr><td colSpan={viewProcess ? 5 : 8} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                    ) : !processes?.length ? (
                      <tr>
                        <td colSpan={viewProcess ? 5 : 8} className="text-center py-12">
                          <Scale className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-muted-foreground text-sm">Nenhum processo encontrado</p>
                        </td>
                      </tr>
                    ) : (
                      processes.map(({ process, sector }: any) => {
                        const status = STATUS_CONFIG[process.status] ?? STATUS_CONFIG.open;
                        const StatusIcon = status.icon;
                        const isActive = viewProcess?.id === process.id;
                        return (
                          <tr
                            key={process.id}
                            className={cn("hover:bg-muted/30 cursor-pointer transition-colors", isActive && "bg-primary/5 border-l-2 border-primary")}
                            onClick={() => { setViewProcess(isActive ? null : process); setShowDeadline(false); }}
                          >
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">{process.nup}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground line-clamp-1 max-w-[160px]">{process.title}</p>
                              {!viewProcess && process.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 [&_*]:inline" dangerouslySetInnerHTML={{ __html: process.description }} />
                              )}
                            </td>
                            {!viewProcess && (
                              <td className="px-4 py-3">
                                <span className="text-xs text-muted-foreground">{process.type}</span>
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5", status.color)}>
                                <StatusIcon className="h-3 w-3" />{status.label}
                              </span>
                            </td>
                            {!viewProcess && (
                              <td className="px-4 py-3">
                                <span className="text-xs text-muted-foreground">{sector?.name ?? "—"}</span>
                              </td>
                            )}
                            {!viewProcess && (
                              <td className="px-4 py-3">
                                <span className="text-xs text-muted-foreground">{new Date(process.createdAt).toLocaleDateString("pt-BR")}</span>
                              </td>
                            )}
                            <td className="px-4 py-3">
                              {process.deadline ? (
                                <span className={cn("text-xs font-medium", new Date(process.deadline) < new Date() ? "text-red-400" : "text-green-400")}>
                                  {new Date(process.deadline).toLocaleDateString("pt-BR")}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Gerenciar Prazo"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewProcess(process);
                                  setShowDeadline(true);
                                }}
                              >
                                <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
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
        </div>

        {/* ── Painel direito: detalhe inline ── */}
        {viewProcess && (
          <div className="flex-1 overflow-hidden border-l border-border flex flex-col">
            {/* Header do painel */}
            <div className="px-6 py-4 border-b border-border/60 bg-card/60 shrink-0 flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Scale className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-mono text-xs text-muted-foreground">{viewProcess.nup}</span>
                </div>
                <p className="font-semibold text-foreground text-sm leading-snug">{viewProcess.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{viewProcess.type}</p>
              </div>
              <div className="flex items-center gap-1 ml-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setShowDeadline(!showDeadline)}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {showDeadline ? "Ver Fluxo" : "Prazo"}
                </Button>
                <button
                  onClick={() => { setViewProcess(null); setShowDeadline(false); }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body do painel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Descrição */}
              {viewProcess.description && (
                <div className="rounded-lg bg-muted/30 border border-border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                  <div
                    className="text-sm text-foreground prose prose-sm prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: viewProcess.description }}
                  />
                </div>
              )}

              {/* Informações adicionais */}
              <div className="grid grid-cols-2 gap-3">
                {viewProcess.legalBasis && (
                  <div className="rounded-lg bg-muted/30 border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Base Legal</p>
                    <p className="text-sm text-foreground">{viewProcess.legalBasis}</p>
                  </div>
                )}
                {viewProcess.observations && (
                  <div className="rounded-lg bg-muted/30 border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm text-foreground">{viewProcess.observations}</p>
                  </div>
                )}
              </div>

              {showDeadline ? (
                /* Painel de prazo inline */
                <DeadlineInlinePanel
                  process={viewProcess}
                  onClose={() => setShowDeadline(false)}
                  onSaved={() => { utils.caius.processes.list.invalidate(); setShowDeadline(false); }}
                />
              ) : (
                /* Workflow / tramitações */
                <WorkflowPanel
                  entityType="process"
                  entityId={viewProcess.id}
                  nup={viewProcess.nup ?? undefined}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </OmniLayout>
  );
}
