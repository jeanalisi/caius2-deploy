import OmniLayout from "@/components/OmniLayout";
import DocumentEditor from "@/components/DocumentEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Filter,
  History,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  PenLine,
  Plus,
  Search,
  Send,
  Shield,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useRef, useState, useMemo, useEffect } from "react";
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

const RECIPIENT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/15 text-yellow-400" },
  sent: { label: "Enviado", color: "bg-green-500/15 text-green-400" },
  failed: { label: "Falhou", color: "bg-red-500/15 text-red-400" },
  skipped: { label: "Ignorado", color: "bg-muted text-muted-foreground" },
};

const MAX_FILES = 5;
const MAX_SIZE_MB = 20;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Painel Inline de Envio ───────────────────────────────────────────────────
function SendDocumentPanel({ document: doc, onSent, onCancel }: { document: any; onSent: () => void; onCancel: () => void }) {
  const [tab, setTab] = useState<"internal" | "external">("internal");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("email");
  const [recipientUserId, setRecipientUserId] = useState<number | undefined>();
  const [recipientUnitId, setRecipientUnitId] = useState<number | undefined>();
  const [extName, setExtName] = useState("");
  const [extEmail, setExtEmail] = useState("");
  const [extPhone, setExtPhone] = useState("");

  const { data: users } = trpc.caius.users.list.useQuery();
  const { data: units } = trpc.controle.unidades.list.useQuery();
  const { data: recipients, refetch: refetchRecipients } = trpc.caius.documents.recipients.useQuery({ documentId: doc.id });

  const send = trpc.caius.documents.send.useMutation({
    onSuccess: () => {
      toast.success("Documento enviado com sucesso!");
      setExtName(""); setExtEmail(""); setExtPhone("");
      setRecipientUserId(undefined); setRecipientUnitId(undefined);
      refetchRecipients();
      onSent();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSend = () => {
    if (tab === "internal") {
      if (!recipientUserId && !recipientUnitId) {
        toast.error("Selecione um usuário ou setor interno");
        return;
      }
      send.mutate({ documentId: doc.id, originType: "internal", recipientUserId, recipientUnitId, channel });
    } else {
      if (!extEmail && !extPhone) {
        toast.error("Informe e-mail ou telefone do destinatário externo");
        return;
      }
      send.mutate({ documentId: doc.id, originType: "external", recipientName: extName || undefined, recipientEmail: extEmail || undefined, recipientPhone: extPhone || undefined, channel });
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Voltar à lista
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Formulário de envio */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Enviar Documento</h2>
            </div>
            <div className="bg-muted/30 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
              <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
                {doc.nup ?? doc.documentNumber ?? "—"}
              </span>
              <span className="text-sm text-foreground truncate">{doc.title}</span>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="internal" className="gap-2">
                  <Users className="h-4 w-4" />Interno (CAIUS)
                </TabsTrigger>
                <TabsTrigger value="external" className="gap-2">
                  <ExternalLink className="h-4 w-4" />Externo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="internal" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span>O documento será enviado com a tag <strong>ORIGEM INTERNA</strong> para o destinatário selecionado.</span>
                </div>
                <div>
                  <Label>Usuário do CAIUS</Label>
                  <Select value={recipientUserId?.toString() ?? "none"} onValueChange={(v) => { setRecipientUserId(v !== "none" ? Number(v) : undefined); setRecipientUnitId(undefined); }}>
                    <SelectTrigger className="mt-1">
                      <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Selecionar usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      {users?.map((u: any) => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name ?? u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex-1 border-t border-border" /><span>ou</span><span className="flex-1 border-t border-border" />
                </div>
                <div>
                  <Label>Setor / Unidade Organizacional</Label>
                  <Select value={recipientUnitId?.toString() ?? "none"} onValueChange={(v) => { setRecipientUnitId(v !== "none" ? Number(v) : undefined); setRecipientUserId(undefined); }}>
                    <SelectTrigger className="mt-1">
                      <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Selecionar setor" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      {units?.map((u: any) => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.code ? `[${u.code}] ` : ""}{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="external" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  <span>O documento será enviado com a tag <strong>ORIGEM EXTERNA</strong>. Informe e-mail e/ou WhatsApp.</span>
                </div>
                <div>
                  <Label>Nome do Destinatário</Label>
                  <Input value={extName} onChange={(e) => setExtName(e.target.value)} placeholder="Nome completo" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />E-mail</Label>
                    <Input type="email" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} placeholder="email@exemplo.com" className="mt-1" />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />WhatsApp</Label>
                    <Input value={extPhone} onChange={(e) => setExtPhone(e.target.value)} placeholder="+55 79 99999-9999" className="mt-1" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Canal de Envio */}
            <div className="mt-4">
              <Label>Canal de Envio</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {([["email", "E-mail", Mail], ["whatsapp", "WhatsApp", MessageSquare], ["both", "Ambos", Send]] as const).map(([v, l, Icon]) => (
                  <button key={v} onClick={() => setChannel(v)}
                    className={cn("flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all",
                      channel === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"
                    )}>
                    <Icon className="h-4 w-4" />{l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
              <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button onClick={handleSend} disabled={send.isPending} className="gap-2">
                {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar Documento
              </Button>
            </div>
          </Card>
        </div>

        {/* Histórico de envios */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Histórico de Envios</h3>
            </div>
            {!recipients || recipients.length === 0 ? (
              <div className="text-center py-8">
                <Send className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Nenhum envio registrado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recipients.map((r: any) => {
                  const st = RECIPIENT_STATUS[r.status] ?? RECIPIENT_STATUS.pending;
                  return (
                    <div key={r.id} className="bg-muted/30 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold",
                            r.originType === "internal" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                          )}>
                            {r.originType === "internal" ? "INT" : "EXT"}
                          </span>
                          <span className="text-xs font-medium text-foreground">
                            {r.recipientName ?? r.recipientEmail ?? r.recipientPhone ?? "—"}
                          </span>
                        </div>
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", st.color)}>{st.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>via {r.channel}</span>
                        {r.sentAt && <span>· {new Date(r.sentAt).toLocaleString("pt-BR")}</span>}
                      </div>
                      {r.errorMessage && (
                        <p className="text-[11px] text-red-400 bg-red-500/10 rounded px-2 py-1">{r.errorMessage}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Painel Inline de Criação ─────────────────────────────────────────────────
function CreateDocumentPanel({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
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
    onError: (e) => { setAiLoading(false); toast.error(e.message); },
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
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`${f.name} excede ${MAX_SIZE_MB}MB`); return false; }
      return true;
    });
    setPendingFiles((prev) => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_FILES) { toast.error(`Máximo de ${MAX_FILES} arquivos por documento`); return combined.slice(0, MAX_FILES); }
      return combined;
    });
  }

  const handleAiGenerate = () => {
    if (!form.title) { toast.error("Informe o título primeiro"); return; }
    setAiLoading(true);
    assist.mutate({ action: "draft_document", context: `Tipo: ${DOC_TYPE_LABELS[form.type]}\nTítulo: ${form.title}`, documentType: DOC_TYPE_LABELS[form.type] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Voltar à lista
        </button>
      </div>

      <Card className="bg-card border-border p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Criar Documento Oficial</h2>
        </div>

        <div className="grid gap-5">
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Conteúdo</Label>
              <Button variant="outline" size="sm" onClick={handleAiGenerate} disabled={aiLoading} className="gap-1.5 h-7 text-xs">
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                Gerar com IA
              </Button>
            </div>
            <DocumentEditor compact
              value={form.content}
              onChange={(v) => setForm((f) => ({ ...f, content: v, aiGenerated: false }))}
              placeholder="Conteúdo do documento..."
              minHeight="280px"
            />
            {form.aiGenerated && (
              <p className="text-xs text-primary/70 mt-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />Conteúdo gerado por IA — revise antes de finalizar
              </p>
            )}
          </div>

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
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={(e) => handleFileAdd(e.target.files)} />
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

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => create.mutate({ ...form, sectorId })} disabled={create.isPending || uploading || !form.title}>
            {(create.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {uploading ? "Enviando anexos..." : "Criar Documento"}
          </Button>
        </div>
      </Card>
    </div>
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
    <Button size="sm" variant="outline" className="gap-1.5 text-xs"
      onClick={(e) => { e.stopPropagation(); sign.mutate({ documentId, nup }); }}
      disabled={sign.isPending}
    >
      {sign.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}
      Assinar
    </Button>
  );
}

// ─── Tipo do painel ativo ─────────────────────────────────────────────────────
type ActivePanel =
  | { type: "create" }
  | { type: "send"; document: any };

export default function Documents() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  // Handle ?highlight=ID from notification click
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightId(Number(id));
      window.history.replaceState({}, "", "/documents");
      const t = setTimeout(() => setHighlightId(null), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  const { data: documents, isLoading } = trpc.caius.documents.list.useQuery({
    type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search || undefined,
    limit: 100,
  });

  const documentIds = useMemo(
    () => (documents ?? []).map(({ document }: any) => document.id as number),
    [documents]
  );
  const { data: lastSends } = trpc.caius.documents.lastSends.useQuery(
    { documentIds },
    { enabled: documentIds.length > 0 }
  );
  const lastSendMap = useMemo(() => {
    const m: Record<number, any> = {};
    for (const r of lastSends ?? []) m[r.documentId] = r;
    return m;
  }, [lastSends]);

  const closePanel = () => setActivePanel(null);

  return (
    <OmniLayout title="Documentos Oficiais">
      <div className="p-6 space-y-5">

        {/* ── Painel de Criação (inline) ── */}
        {activePanel?.type === "create" && (
          <CreateDocumentPanel
            onCreated={() => { utils.caius.documents.list.invalidate(); closePanel(); }}
            onCancel={closePanel}
          />
        )}

        {/* ── Painel de Envio (inline) ── */}
        {activePanel?.type === "send" && (
          <SendDocumentPanel
            document={activePanel.document}
            onSent={() => utils.caius.documents.list.invalidate()}
            onCancel={closePanel}
          />
        )}

        {/* ── Lista de Documentos ── */}
        {!activePanel && (
          <>
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
              <Button className="gap-2" onClick={() => setActivePanel({ type: "create" })}>
                <Plus className="h-4 w-4" />Novo Documento
              </Button>
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Último Envio</th>
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
                          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setActivePanel({ type: "create" })}>
                            <Plus className="h-3.5 w-3.5" />Criar primeiro documento
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      documents.map(({ document, author, sector }: any) => {
                        const status = STATUS_CONFIG[document.status] ?? STATUS_CONFIG.draft;
                        const isHighlighted = highlightId === document.id;
                        return (
                          <tr key={document.id} className={cn(
                            "hover:bg-muted/30 transition-colors",
                            isHighlighted && "bg-blue-500/10 ring-1 ring-inset ring-blue-500/30 animate-pulse"
                          )}>
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
                              {(() => {
                                const ls = lastSendMap[document.id];
                                if (!ls) return <span className="text-xs text-muted-foreground/50">—</span>;
                                const cfg: Record<string, { label: string; color: string }> = {
                                  sent: { label: "Enviado", color: "bg-green-500/10 text-green-600 border-green-500/20" },
                                  failed: { label: "Falhou", color: "bg-red-500/10 text-red-600 border-red-500/20" },
                                  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
                                  skipped: { label: "Ignorado", color: "bg-muted text-muted-foreground border-border" },
                                };
                                const s = cfg[ls.status] ?? cfg.pending;
                                return (
                                  <div className="space-y-0.5">
                                    <span className={cn("text-xs border rounded-full px-2 py-0.5", s.color)}>{s.label}</span>
                                    {ls.sentAt && <p className="text-xs text-muted-foreground/60">{new Date(ls.sentAt).toLocaleDateString("pt-BR")}</p>}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {(document.status === "draft" || document.status === "pending_signature") && (
                                  <SignDocumentButton documentId={document.id} nup={document.nup} />
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs"
                                  onClick={(e) => { e.stopPropagation(); setActivePanel({ type: "send", document }); }}
                                >
                                  <Send className="h-3 w-3" />Enviar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1.5 text-xs"
                                  title="Ver chancela e assinaturas digitais"
                                  onClick={(e) => { e.stopPropagation(); setLocation(`/assinaturas/document/${document.id}`); }}
                                >
                                  <Shield className="h-3 w-3" />Chancela
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
          </>
        )}
      </div>
    </OmniLayout>
  );
}
