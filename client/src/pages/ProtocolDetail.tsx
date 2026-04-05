import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import DocumentEditor from "@/components/DocumentEditor";
import { ProtocolPrintButton } from "@/components/ProtocolPrintView";
import { WorkflowPanel } from "@/components/WorkflowPanel";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Paperclip,
  Phone,
  Send,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  Hash,
  Bot,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRef, useState } from "react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Aberto", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  in_analysis: { label: "Em Análise", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  pending_docs: { label: "Pendente Docs", color: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  in_progress: { label: "Em Andamento", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
  concluded: { label: "Concluído", color: "bg-green-500/15 text-green-400 border-green-500/20" },
  archived: { label: "Arquivado", color: "bg-muted text-muted-foreground border-border" },
};

const ACTION_LABELS: Record<string, string> = {
  forward: "Encaminhado",
  return: "Devolvido",
  assign: "Atribuído",
  conclude: "Concluído",
  archive: "Arquivado",
  reopen: "Reaberto",
  comment: "Comentário",
};

const ACTION_COLORS: Record<string, string> = {
  forward: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  return: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  assign: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  conclude: "bg-green-500/10 text-green-400 border-green-500/20",
  archive: "bg-muted text-muted-foreground border-border",
  reopen: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  comment: "bg-primary/10 text-primary border-primary/20",
};

const MAX_FILES = 5;
const MAX_FILE_MB = 20;

interface PendingFile {
  file: File;
  base64: string;
}

interface Props {
  id: number;
  onBack: () => void;
}

// ─── TramitationDialog ────────────────────────────────────────────────────────
function TramitationDialog({ protocolId, nup, onDone }: { protocolId: number; nup: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<any>("forward");
  const [dispatch, setDispatch] = useState("");
  const [toSectorId, setToSectorId] = useState<number | undefined>();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sectors } = trpc.caius.sectors.list.useQuery();

  const uploadAttachment = trpc.attachments.upload.useMutation();

  const create = trpc.caius.tramitations.create.useMutation({
    onSuccess: async (data: any) => {
      // Upload pending files after tramitation is created
      if (pendingFiles.length > 0 && data?.tramitationId) {
        setUploading(true);
        try {
          await Promise.all(
            pendingFiles.map((pf) =>
              uploadAttachment.mutateAsync({
                entityType: "tramitation",
                entityId: data.tramitationId,
                nup,
                fileName: pf.file.name,
                mimeType: pf.file.type,
                base64Data: pf.base64,
                category: "despacho",
              })
            )
          );
        } catch {
          toast.error("Tramitação registrada, mas alguns anexos falharam.");
        } finally {
          setUploading(false);
        }
      }
      toast.success("Tramitação registrada com sucesso");
      setOpen(false);
      setDispatch("");
      setPendingFiles([]);
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_FILES - pendingFiles.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_FILES} arquivos por despacho`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    const oversized = toAdd.filter((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (oversized.length) {
      toast.error(`Arquivo(s) excedem ${MAX_FILE_MB}MB: ${oversized.map((f) => f.name).join(", ")}`);
      return;
    }

    // Convert to base64
    Promise.all(
      toAdd.map(
        (file) =>
          new Promise<PendingFile>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(",")[1];
              resolve({ file, base64 });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    ).then((results) => {
      setPendingFiles((prev) => [...prev, ...results]);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = () => {
    create.mutate({ protocolId, nup, action, dispatch, toSectorId });
  };

  const isPending = create.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setDispatch(""); setPendingFiles([]); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ArrowRight className="h-4 w-4" />
          Tramitar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Tramitação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Ação */}
          <div>
            <Label>Ação</Label>
            <Select value={action} onValueChange={(v) => setAction(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="forward">Encaminhar</SelectItem>
                <SelectItem value="return">Devolver</SelectItem>
                <SelectItem value="assign">Atribuir</SelectItem>
                <SelectItem value="conclude">Concluir</SelectItem>
                <SelectItem value="archive">Arquivar</SelectItem>
                <SelectItem value="reopen">Reabrir</SelectItem>
                <SelectItem value="comment">Comentário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Setor destino */}
          {(action === "forward" || action === "assign") && (
            <div>
              <Label>Setor Destino</Label>
              <Select
                value={toSectorId?.toString() ?? "none"}
                onValueChange={(v) => setToSectorId(v && v !== "none" ? Number(v) : undefined)}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                <SelectContent>
                  {sectors?.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Despacho — Editor Rich Text */}
          <div>
            <Label className="mb-1 block">Despacho / Observação</Label>
            <DocumentEditor compact
              value={dispatch}
              onChange={setDispatch}
              placeholder="Descreva a ação realizada, fundamento legal, observações relevantes..."
              minHeight="160px"
            />
          </div>

          {/* Upload de Documentos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Documentos Anexos</Label>
              <span className="text-xs text-muted-foreground">
                {pendingFiles.length}/{MAX_FILES} arquivos · máx. {MAX_FILE_MB}MB cada
              </span>
            </div>

            {/* Drop zone / button */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                pendingFiles.length >= MAX_FILES
                  ? "border-muted opacity-50 cursor-not-allowed"
                  : "border-border hover:border-primary/50 hover:bg-primary/5"
              )}
              onClick={() => pendingFiles.length < MAX_FILES && fileInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique para selecionar ou arraste arquivos aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, Word, imagens, planilhas — até {MAX_FILE_MB}MB por arquivo
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.odt,.ods"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Lista de arquivos pendentes */}
            {pendingFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {pendingFiles.map((pf, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{pf.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(pf.file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(idx)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading ? "Enviando anexos..." : "Registrar Tramitação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AiAssistDialog ────────────────────────────────────────────────────────────
function AiAssistDialog({ protocolId, nup, subject, description }: { protocolId: number; nup: string; subject: string; description?: string | null }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<any>("suggest_response");
  const [result, setResult] = useState("");

  const assist = trpc.caius.ai.assist.useMutation({
    onSuccess: (data) => setResult(data.suggestion),
    onError: (e) => toast.error(e.message),
  });

  const context = `NUP: ${nup}\nAssunto: ${subject}\n${description ? `Descrição: ${description}` : ""}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Assistente IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Assistente de IA — CAIUS
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Ação da IA</Label>
            <Select value={action} onValueChange={(v) => setAction(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="suggest_response">Sugerir Resposta</SelectItem>
                <SelectItem value="summarize">Resumir Protocolo</SelectItem>
                <SelectItem value="classify">Classificar e Sugerir Roteamento</SelectItem>
                <SelectItem value="suggest_routing">Sugerir Encaminhamento</SelectItem>
                <SelectItem value="extract_info">Extrair Informações</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => assist.mutate({ action, context, nup, entityType: "protocol", entityId: protocolId })}
              disabled={assist.isPending}
              className="gap-2"
            >
              {assist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Gerar com IA
            </Button>
          </div>
          {result && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Resultado da IA</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{result}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── TramitationItem ───────────────────────────────────────────────────────────
function TramitationItem({ t }: { t: any }) {
  const [showAttachments, setShowAttachments] = useState(false);
  const { data: attachments } = trpc.attachments.getByEntity.useQuery(
    { entityType: "tramitation", entityId: t.tramitation.id },
    { enabled: showAttachments }
  );

  const actionColor = ACTION_COLORS[t.tramitation.action] ?? ACTION_COLORS.comment;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn("h-7 w-7 rounded-full border flex items-center justify-center flex-shrink-0", actionColor)}>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 w-px bg-border mt-1" />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn("inline-flex items-center text-xs font-semibold border rounded-full px-2 py-0.5", actionColor)}>
            {ACTION_LABELS[t.tramitation.action] ?? t.tramitation.action}
          </span>
          {t.fromSector && (
            <span className="text-xs text-muted-foreground">
              {t.fromSector.name} → {t.toSector?.name ?? "—"}
            </span>
          )}
        </div>

        {/* Despacho — renderizado como HTML */}
        {t.tramitation.dispatch && (
          <div
            className="text-sm text-foreground bg-muted/30 rounded-md p-3 border border-border prose prose-sm dark:prose-invert max-w-none [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground [&_blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: t.tramitation.dispatch }}
          />
        )}

        {/* Attachments toggle */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {t.fromUser?.name ?? "Sistema"} · {new Date(t.tramitation.createdAt).toLocaleString("pt-BR")}
            </span>
          </div>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowAttachments((v) => !v)}
          >
            <Paperclip className="h-3 w-3" />
            {showAttachments ? "Ocultar anexos" : "Ver anexos"}
          </button>
        </div>

        {/* Attachments list */}
        {showAttachments && (
          <div className="mt-2">
            {!attachments ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Carregando...
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum anexo nesta tramitação</p>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att: any) => (
                  <a
                    key={att.id}
                    href={att.s3Url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-muted/50 transition-colors group"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="flex-1 truncate text-foreground">{att.originalName}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {att.fileSizeBytes < 1024 * 1024
                        ? `${(att.fileSizeBytes / 1024).toFixed(1)} KB`
                        : `${(att.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CitizenReportPanel ─────────────────────────────────────────────────────
function CitizenReportPanel({ data }: { data: any }) {
  const [expanded, setExpanded] = useState(false);
  const { protocol, contact, conversation, conversationMessages } = data;

  const CHANNEL_LABELS: Record<string, string> = {
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    email: "E-mail",
    web: "Web",
    phone: "Telefone",
    in_person: "Presencial",
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

  const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    low: { label: "Baixa", color: "text-slate-400" },
    normal: { label: "Normal", color: "text-blue-400" },
    high: { label: "Alta", color: "text-orange-400" },
    urgent: { label: "Urgente", color: "text-red-400" },
  };

  // Consolidar dados do cidadão
  const citizenName = contact?.name || protocol.requesterName || "Não identificado";
  const citizenPhone = contact?.phone || protocol.requesterPhone;
  const citizenEmail = contact?.email || protocol.requesterEmail;
  const citizenCpf = contact?.cpfCnpj || protocol.requesterCpfCnpj;
  const hasCitizenData = citizenName !== "Não identificado" || citizenPhone || citizenEmail || citizenCpf;

  const priority = PRIORITY_LABELS[protocol.priority] ?? PRIORITY_LABELS.normal;

  return (
    <Card className="bg-card border-border col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Relatório Consolidado do Cidadão
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Recolher" : "Expandir"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Resumo sempre visível */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tipo</p>
            <p className="text-sm font-semibold text-foreground">{TYPE_LABELS[protocol.type] ?? protocol.type}</p>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Canal</p>
            <p className="text-sm font-semibold text-foreground">{CHANNEL_LABELS[protocol.channel] ?? protocol.channel}</p>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prioridade</p>
            <p className={cn("text-sm font-semibold", priority.color)}>{priority.label}</p>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Abertura</p>
            <p className="text-sm font-semibold text-foreground">{new Date(protocol.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        {/* Dados do cidadão */}
        {hasCitizenData && (
          <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">{citizenName}</p>
              {contact && (
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">Contato cadastrado</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {citizenPhone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{citizenPhone}</span>
                </div>
              )}
              {citizenEmail && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span>{citizenEmail}</span>
                </div>
              )}
              {citizenCpf && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Hash className="h-3 w-3 shrink-0" />
                  <span className="font-mono">{citizenCpf}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversa vinculada — expandível */}
        {expanded && conversation && (
          <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Conversa Vinculada</p>
              <span className="text-[10px] text-muted-foreground font-mono">{conversation.externalId ?? `#${conversation.id}`}</span>
            </div>
            {conversationMessages?.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-2 pr-2">
                  {conversationMessages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-lg px-3 py-2 text-xs max-w-[85%]",
                        msg.direction === "inbound"
                          ? "bg-muted/40 text-foreground mr-auto"
                          : "bg-primary/10 text-primary ml-auto"
                      )}
                    >
                      {msg.type === "location" ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="text-muted-foreground">
                            {msg.metadata?.latitude && msg.metadata?.longitude
                              ? `Localização: ${Number(msg.metadata.latitude).toFixed(6)}, ${Number(msg.metadata.longitude).toFixed(6)}`
                              : "Localização compartilhada"}
                          </span>
                        </div>
                      ) : msg.type === "image" ? (
                        <div className="flex items-center gap-1.5">
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <span className="text-muted-foreground">Imagem enviada</span>
                        </div>
                      ) : msg.type === "audio" ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="text-muted-foreground">Áudio enviado</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content ?? "(sem conteúdo)"}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">
                        {new Date(msg.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma mensagem registrada nesta conversa.</p>
            )}
          </div>
        )}

        {/* Descrição do protocolo */}
        {expanded && protocol.description && (
          <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descrição Completa</p>
            <div
              className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: protocol.description }}
            />
          </div>
        )}

        {/* Localização (se houver nas mensagens) */}
        {expanded && (() => {
          const locationMsg = conversationMessages?.find((m: any) => m.type === "location" && m.metadata?.latitude);
          if (!locationMsg) return null;
          const lat = locationMsg.metadata.latitude;
          const lng = locationMsg.metadata.longitude;
          const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          return (
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-orange-400" />
                <p className="text-sm font-semibold text-foreground">Localização Informada</p>
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-2">{lat}, {lng}</p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <MapPin className="h-3 w-3" />
                Abrir no Google Maps
              </a>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

// ─── ProtocolDetail ────────────────────────────────────────────────────────────
export default function ProtocolDetail({ id, onBack }: Props) {
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.caius.protocols.byId.useQuery({ id });
  const { data: tramitations } = trpc.caius.tramitations.byProtocol.useQuery({ protocolId: id });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-muted-foreground">Protocolo não encontrado</p>
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>
    );
  }

  const { protocol, sector, responsible, creator, contact, conversation, conversationMessages } = data as any;
  const status = STATUS_CONFIG[protocol.status] ?? STATUS_CONFIG.open;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-sm bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 select-all">
                {protocol.nup}
              </span>
              <span className={cn("inline-flex items-center text-xs border rounded-full px-2 py-0.5", status.color)}>
                {status.label}
              </span>
              {protocol.isConfidential && (
                <span className="inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5 bg-red-500/10 text-red-400 border-red-500/20">
                  <Lock className="h-3 w-3" />
                  Sigiloso
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-foreground">{protocol.subject}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProtocolPrintButton
            protocolData={data as any}
            tramitations={(tramitations ?? []) as any}
          />
          <AiAssistDialog
            protocolId={protocol.id}
            nup={protocol.nup}
            subject={protocol.subject}
            description={protocol.description}
          />
          <TramitationDialog
            protocolId={protocol.id}
            nup={protocol.nup}
            onDone={() => {
              utils.caius.protocols.byId.invalidate({ id });
              utils.caius.tramitations.byProtocol.invalidate({ protocolId: id });
            }}
          />
        </div>
      </div>

      {/* Relatório Consolidado do Cidadão */}
      <div className="grid grid-cols-2 gap-6">
        <CitizenReportPanel data={data} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main info */}
        <div className="col-span-2 space-y-4">
          {protocol.description && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: protocol.description }}
                />
              </CardContent>
            </Card>
          )}

          {/* Tramitations */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Histórico de Tramitações ({tramitations?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!tramitations?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tramitação registrada</p>
              ) : (
                <div className="space-y-1">
                  {tramitations.map((t: any) => (
                    <TramitationItem key={t.tramitation.id} t={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <span className="text-foreground font-medium">{protocol.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal</span>
                <span className="text-foreground font-medium capitalize">{protocol.channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prioridade</span>
                <span className="text-foreground font-medium capitalize">{protocol.priority}</span>
              </div>
              {sector && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setor</span>
                  <span className="text-foreground font-medium">{sector.name}</span>
                </div>
              )}
              {responsible && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsável</span>
                  <span className="text-foreground font-medium">{responsible.name}</span>
                </div>
              )}
              {creator && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado por</span>
                  <span className="text-foreground font-medium">{creator.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Abertura</span>
                <span className="text-foreground font-medium">
                  {new Date(protocol.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {protocol.deadline && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prazo</span>
                  <span className="text-foreground font-medium">
                    {new Date(protocol.deadline).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow */}
          <WorkflowPanel
            entityType="protocol"
            entityId={protocol.id}
            nup={protocol.nup ?? undefined}
          />

          {/* Requester */}
          {(protocol.requesterName || protocol.requesterEmail) && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Solicitante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {protocol.requesterName && (
                  <div>
                    <span className="text-muted-foreground">Nome</span>
                    <p className="text-foreground font-medium">{protocol.requesterName}</p>
                  </div>
                )}
                {protocol.requesterCpfCnpj && (
                  <div>
                    <span className="text-muted-foreground">CPF/CNPJ</span>
                    <p className="text-foreground font-mono text-xs">{protocol.requesterCpfCnpj}</p>
                  </div>
                )}
                {protocol.requesterEmail && (
                  <div>
                    <span className="text-muted-foreground">E-mail</span>
                    <p className="text-foreground text-xs">{protocol.requesterEmail}</p>
                  </div>
                )}
                {protocol.requesterPhone && (
                  <div>
                    <span className="text-muted-foreground">Telefone</span>
                    <p className="text-foreground">{protocol.requesterPhone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
