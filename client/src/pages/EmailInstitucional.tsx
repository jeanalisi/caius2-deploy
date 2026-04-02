/**
 * EmailInstitucional.tsx
 * Página principal do módulo de E-mail Institucional do CAIUS2
 * Inclui: Dashboard, Caixa de Entrada, Envio, Regras, Fila, Auditoria
 */

import { useState } from "react";
import OmniLayout from "@/components/OmniLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Mail,
  MailOpen,
  Inbox,
  Send,
  Archive,
  Star,
  AlertTriangle,
  RefreshCw,
  Plus,
  Settings,
  MoreVertical,
  Reply,
  Forward,
  Trash2,
  Tag,
  Link2,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Shield,
  Activity,
  Filter,
  Search,
  ChevronRight,
  Building2,
  Wifi,
  WifiOff,
  BarChart3,
  FileText,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    received:    { label: "Recebida",    variant: "default" },
    triaged:     { label: "Triada",      variant: "secondary" },
    in_progress: { label: "Em andamento",variant: "secondary" },
    replied:     { label: "Respondida",  variant: "outline" },
    archived:    { label: "Arquivada",   variant: "outline" },
    spam:        { label: "Spam",        variant: "destructive" },
    bounced:     { label: "Retornou",    variant: "destructive" },
    failed:      { label: "Falhou",      variant: "destructive" },
    sent:        { label: "Enviada",     variant: "outline" },
  };
  const s = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function mailboxStatusIcon(status: string) {
  switch (status) {
    case "active":   return <Wifi className="h-4 w-4 text-green-500" />;
    case "syncing":  return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "error":    return <WifiOff className="h-4 w-4 text-red-500" />;
    default:         return <WifiOff className="h-4 w-4 text-muted-foreground" />;
  }
}

function priorityBadge(priority: string) {
  const map: Record<string, string> = {
    low:    "bg-slate-100 text-slate-700",
    normal: "bg-blue-100 text-blue-700",
    high:   "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente",
  };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", map[priority] ?? map.normal)}>
      {labels[priority] ?? priority}
    </span>
  );
}

// ─── Componente: Dashboard ────────────────────────────────────────────────────

function DashboardTab() {
  const { data: dash, isLoading, refetch } = trpc.emailInstitutional.dashboard.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Caixas Ativas</p>
                <p className="text-2xl font-bold">{dash?.activeMailboxes ?? 0}</p>
                <p className="text-xs text-muted-foreground">de {dash?.totalMailboxes ?? 0} total</p>
              </div>
              <Building2 className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Não Lidas</p>
                <p className="text-2xl font-bold text-orange-500">{dash?.unreadMessages ?? 0}</p>
                <p className="text-xs text-muted-foreground">de {dash?.totalMessages ?? 0} total</p>
              </div>
              <Mail className="h-8 w-8 text-orange-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fila de Envio</p>
                <p className="text-2xl font-bold text-blue-500">{dash?.pendingQueue ?? 0}</p>
                <p className="text-xs text-muted-foreground">pendentes</p>
              </div>
              <Send className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Falhas de Envio</p>
                <p className="text-2xl font-bold text-red-500">{dash?.failedQueue ?? 0}</p>
                <p className="text-xs text-muted-foreground">precisam atenção</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mensagens recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Mensagens Recentes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {(dash?.recentMessages?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma mensagem recebida ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dash?.recentMessages?.map((msg: any) => (
                <div key={msg.id} className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer",
                  !msg.isRead && "bg-blue-50/50 border-blue-200"
                )}>
                  <div className="mt-0.5">
                    {msg.isRead
                      ? <MailOpen className="h-4 w-4 text-muted-foreground" />
                      : <Mail className="h-4 w-4 text-blue-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm truncate", !msg.isRead && "font-semibold")}>
                        {msg.fromName || msg.fromAddress}
                      </span>
                      {msg.nup && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {msg.nup}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{msg.subject}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {msg.receivedAt
                      ? formatDistanceToNow(new Date(msg.receivedAt), { addSuffix: true, locale: ptBR })
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Componente: Caixa de Entrada ─────────────────────────────────────────────

function InboxTab() {
  const [selectedMailbox, setSelectedMailbox] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [search, setSearch] = useState("");

  const { data: mailboxes } = trpc.emailInstitutional.mailboxes.list.useQuery();
  const { data: msgData, isLoading, refetch } = trpc.emailInstitutional.messages.list.useQuery({
    mailboxId: selectedMailbox,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    direction: "inbound",
    limit: 100,
  });

  const { data: msgDetail } = trpc.emailInstitutional.messages.get.useQuery(
    { id: selectedMessage?.id },
    { enabled: !!selectedMessage?.id }
  );

  const classifyMutation = trpc.emailInstitutional.messages.classify.useMutation({
    onSuccess: () => refetch(),
  });

  const replyMutation = trpc.emailInstitutional.compose.reply.useMutation({
    onSuccess: () => {
      setReplyOpen(false);
      setReplyBody("");
      refetch();
    },
  });

  const messages = msgData?.messages ?? [];
  const filtered = search
    ? messages.filter((m: any) =>
        m.subject?.toLowerCase().includes(search.toLowerCase()) ||
        m.fromAddress?.toLowerCase().includes(search.toLowerCase()) ||
        m.fromName?.toLowerCase().includes(search.toLowerCase()) ||
        m.nup?.toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  return (
    <div className="flex h-full gap-4">
      {/* Lista de mensagens */}
      <div className={cn("flex flex-col gap-3", selectedMessage ? "w-80 shrink-0" : "flex-1")}>
        {/* Filtros */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mensagens..."
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={selectedMailbox?.toString() ?? "all"} onValueChange={v => setSelectedMailbox(v !== "all" ? Number(v) : undefined)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as caixas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as caixas</SelectItem>
              {mailboxes?.map((mb: any) => (
                <SelectItem key={mb.id} value={mb.id.toString()}>{mb.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="received">Recebidas</SelectItem>
              <SelectItem value="triaged">Triadas</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="replied">Respondidas</SelectItem>
              <SelectItem value="archived">Arquivadas</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Nenhuma mensagem encontrada</p>
          </div>
        ) : (
          <div className="space-y-1 overflow-y-auto">
            {filtered.map((msg: any) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedMessage?.id === msg.id && "bg-primary/5 border-primary/30",
                  !msg.isRead && "bg-blue-50/50 border-blue-200"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {msg.isStarred
                    ? <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    : msg.isRead
                    ? <MailOpen className="h-4 w-4 text-muted-foreground" />
                    : <Mail className="h-4 w-4 text-blue-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("text-sm truncate", !msg.isRead && "font-semibold")}>
                      {msg.fromName || msg.fromAddress}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {msg.receivedAt ? format(new Date(msg.receivedAt), "dd/MM HH:mm") : "—"}
                    </span>
                  </div>
                  <p className={cn("text-sm truncate", !msg.isRead ? "text-foreground" : "text-muted-foreground")}>
                    {msg.subject}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {msg.nup && <Badge variant="outline" className="text-xs">{msg.nup}</Badge>}
                    {statusBadge(msg.status)}
                    {msg.hasAttachments && <FileText className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detalhe da mensagem */}
      {selectedMessage && (
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
            <Button variant="ghost" size="icon" onClick={() => setSelectedMessage(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{selectedMessage.subject}</h3>
              <p className="text-sm text-muted-foreground">
                De: {selectedMessage.fromName || selectedMessage.fromAddress}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {selectedMessage.nup && (
                <Badge variant="secondary">{selectedMessage.nup}</Badge>
              )}
              {priorityBadge(selectedMessage.priority ?? "normal")}
              <Button
                variant="default"
                size="sm"
                onClick={() => setReplyOpen(true)}
              >
                <Reply className="h-4 w-4 mr-1" />
                Responder
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => classifyMutation.mutate({ id: selectedMessage.id, status: "triaged" })}>
                    <Tag className="h-4 w-4 mr-2" /> Marcar como triada
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => classifyMutation.mutate({ id: selectedMessage.id, status: "in_progress" })}>
                    <Clock className="h-4 w-4 mr-2" /> Em andamento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => classifyMutation.mutate({ id: selectedMessage.id, status: "archived" })}>
                    <Archive className="h-4 w-4 mr-2" /> Arquivar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => classifyMutation.mutate({ id: selectedMessage.id, status: "spam" })}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" /> Marcar como spam
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Corpo */}
          <div className="flex-1 overflow-y-auto p-4">
            {msgDetail ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>De:</strong> {msgDetail.fromName} &lt;{msgDetail.fromAddress}&gt;</p>
                  <p><strong>Para:</strong> {(() => { try { return JSON.parse(msgDetail.toAddresses ?? "[]").map((a: any) => a.address).join(", "); } catch { return msgDetail.toAddresses; } })()}</p>
                  {msgDetail.receivedAt && (
                    <p><strong>Data:</strong> {format(new Date(msgDetail.receivedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  )}
                </div>
                <hr />
                {msgDetail.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: msgDetail.bodyHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm font-sans">{msgDetail.bodyText}</pre>
                )}

                {/* Anexos */}
                {(msgDetail.attachments?.length ?? 0) > 0 && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium">Anexos ({msgDetail.attachments.length})</p>
                    {msgDetail.attachments.map((att: any) => (
                      <div key={att.id} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{att.filename}</span>
                        <span className="text-muted-foreground">({Math.round(att.sizeBytes / 1024)} KB)</span>
                        {att.storageUrl && (
                          <a href={att.storageUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            Baixar
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Vínculos NUP */}
                {(msgDetail.nupLinks?.length ?? 0) > 0 && (
                  <div className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Link2 className="h-4 w-4" /> Vínculos NUP
                    </p>
                    {msgDetail.nupLinks.map((link: any) => (
                      <div key={link.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{link.nup}</Badge>
                        <span className="text-muted-foreground capitalize">{link.entityType}</span>
                        <span className="text-xs text-muted-foreground">via {link.linkMethod?.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog de resposta */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Responder mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Para</Label>
              <Input value={selectedMessage?.fromAddress ?? ""} disabled />
            </div>
            <div>
              <Label>Assunto</Label>
              <Input value={`Re: ${selectedMessage?.subject ?? ""}`} disabled />
            </div>
            {selectedMessage?.nup && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link2 className="h-4 w-4" />
                NUP {selectedMessage.nup} será incluído automaticamente no assunto
              </div>
            )}
            <div>
              <Label>Mensagem</Label>
              <Textarea
                rows={8}
                placeholder="Digite sua resposta..."
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!selectedMessage) return;
                replyMutation.mutate({
                  emailMessageId: selectedMessage.id,
                  bodyText: replyBody,
                });
              }}
              disabled={replyMutation.isPending || !replyBody.trim()}
            >
              {replyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Resposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente: Caixas Postais ───────────────────────────────────────────────

function MailboxesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", address: "", displayName: "Prefeitura de Itabaiana - PB", description: "", sectorId: undefined as number | undefined,
    imapHost: "itabaiana.pb.gov.br", imapPort: 993, imapUser: "", imapPassword: "", imapSecure: true, imapMailbox: "INBOX",
    smtpHost: "itabaiana.pb.gov.br", smtpPort: 465, smtpUser: "", smtpPassword: "", smtpSecure: true,
    syncIntervalMinutes: 2, autoReplyEnabled: true, autoReplyTemplate: "", signature: "",
  });

  const { data: mailboxes, isLoading, refetch } = trpc.emailInstitutional.mailboxes.list.useQuery();
  const createMutation = trpc.emailInstitutional.mailboxes.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); resetForm(); } });
  const updateMutation = trpc.emailInstitutional.mailboxes.update.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setEditingId(null); resetForm(); } });
  const deleteMutation = trpc.emailInstitutional.mailboxes.delete.useMutation({ onSuccess: () => refetch() });
  const syncMutation = trpc.emailInstitutional.mailboxes.syncNow.useMutation({ onSuccess: () => refetch() });
  const testMutation = trpc.emailInstitutional.mailboxes.testConnection.useMutation({
    onSuccess: (data) => setTestResult(data),
  });

  function resetForm() {
    setForm({ name: "", address: "", displayName: "Prefeitura de Itabaiana - PB", description: "", sectorId: undefined,
      imapHost: "itabaiana.pb.gov.br", imapPort: 993, imapUser: "", imapPassword: "", imapSecure: true, imapMailbox: "INBOX",
      smtpHost: "itabaiana.pb.gov.br", smtpPort: 465, smtpUser: "", smtpPassword: "", smtpSecure: true,
      syncIntervalMinutes: 2, autoReplyEnabled: true, autoReplyTemplate: "", signature: "" });
    setTestResult(null);
  }

  function handleSubmit() {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form as any);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Caixas Postais Institucionais</h3>
        <Button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Caixa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (mailboxes?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Nenhuma caixa postal configurada</p>
            <p className="text-sm">Adicione uma caixa para começar a receber e-mails institucionais</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Caixa Postal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {mailboxes?.map((mb: any) => (
            <Card key={mb.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {mailboxStatusIcon(mb.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{mb.name}</span>
                        <Badge variant="outline" className="text-xs">{mb.address}</Badge>
                      </div>
                      {mb.description && <p className="text-sm text-muted-foreground">{mb.description}</p>}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Sync: a cada {mb.syncIntervalMinutes}min</span>
                        {mb.lastSyncAt && (
                          <span>Última sync: {formatDistanceToNow(new Date(mb.lastSyncAt), { addSuffix: true, locale: ptBR })}</span>
                        )}
                        {mb.lastSyncError && (
                          <span className="text-red-500">Erro: {mb.lastSyncError.substring(0, 60)}...</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncMutation.mutate({ id: mb.id })}
                      disabled={syncMutation.isPending}
                    >
                      <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm({ ...mb, imapPassword: "••••••••", smtpPassword: "••••••••" });
                        setEditingId(mb.id);
                        setShowForm(true);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: mb.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de formulário */}
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { resetForm(); setEditingId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Caixa Postal" : "Nova Caixa Postal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome da Caixa *</Label>
                <Input placeholder="ex: Atendimento Geral" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Endereço de E-mail *</Label>
                <Input placeholder="atendimento@itabaiana.pb.gov.br" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <Label>Nome de Exibição</Label>
                <Input placeholder="Prefeitura de Itabaiana" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
              </div>
              <div>
                <Label>Intervalo de Sync (min)</Label>
                <Input type="number" min={1} max={1440} value={form.syncIntervalMinutes} onChange={e => setForm(f => ({ ...f, syncIntervalMinutes: Number(e.target.value) }))} />
              </div>
            </div>

            <hr />
            <p className="font-medium text-sm">Configuração IMAP (Recebimento)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Servidor IMAP *</Label>
                <Input placeholder="itabaiana.pb.gov.br" value={form.imapHost} onChange={e => setForm(f => ({ ...f, imapHost: e.target.value }))} />
              </div>
              <div>
                <Label>Porta IMAP</Label>
                <Input type="number" value={form.imapPort} onChange={e => setForm(f => ({ ...f, imapPort: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Usuário IMAP *</Label>
                <Input placeholder="atendimento@itabaiana.pb.gov.br" value={form.imapUser} onChange={e => setForm(f => ({ ...f, imapUser: e.target.value }))} />
              </div>
              <div>
                <Label>Senha IMAP *</Label>
                <Input type="password" value={form.imapPassword} onChange={e => setForm(f => ({ ...f, imapPassword: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.imapSecure} onCheckedChange={v => setForm(f => ({ ...f, imapSecure: v }))} />
                <Label>SSL/TLS (porta 993)</Label>
              </div>
              <div>
                <Label>Caixa IMAP</Label>
                <Input value={form.imapMailbox} onChange={e => setForm(f => ({ ...f, imapMailbox: e.target.value }))} />
              </div>
            </div>

            <hr />
            <p className="font-medium text-sm">Configuração SMTP (Envio)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Servidor SMTP *</Label>
                <Input placeholder="itabaiana.pb.gov.br" value={form.smtpHost} onChange={e => setForm(f => ({ ...f, smtpHost: e.target.value }))} />
              </div>
              <div>
                <Label>Porta SMTP</Label>
                <Input type="number" value={form.smtpPort} onChange={e => setForm(f => ({ ...f, smtpPort: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Usuário SMTP *</Label>
                <Input placeholder="atendimento@itabaiana.pb.gov.br" value={form.smtpUser} onChange={e => setForm(f => ({ ...f, smtpUser: e.target.value }))} />
              </div>
              <div>
                <Label>Senha SMTP *</Label>
                <Input type="password" value={form.smtpPassword} onChange={e => setForm(f => ({ ...f, smtpPassword: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.smtpSecure} onCheckedChange={v => setForm(f => ({ ...f, smtpSecure: v }))} />
                <Label>SSL/TLS (porta 465)</Label>
              </div>
            </div>

            <hr />
            <div className="flex items-center gap-2">
              <Switch checked={form.autoReplyEnabled} onCheckedChange={v => setForm(f => ({ ...f, autoReplyEnabled: v }))} />
              <Label>Resposta automática com NUP</Label>
            </div>
            {form.autoReplyEnabled && (
              <div>
                <Label>Template da resposta automática</Label>
                <Textarea
                  rows={4}
                  placeholder="Olá, {{name}}! Recebemos sua mensagem. Protocolo: {{nup}}"
                  value={form.autoReplyTemplate}
                  onChange={e => setForm(f => ({ ...f, autoReplyTemplate: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Variáveis: {"{{name}}"}, {"{{subject}}"}, {"{{nup}}"}, {"{{mailbox}}"}</p>
              </div>
            )}

            {/* Teste de conexão */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Testar Conexão</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate({
                    imapHost: form.imapHost, imapPort: form.imapPort,
                    imapUser: form.imapUser, imapPassword: form.imapPassword, imapSecure: form.imapSecure,
                    smtpHost: form.smtpHost, smtpPort: form.smtpPort,
                    smtpUser: form.smtpUser, smtpPassword: form.smtpPassword, smtpSecure: form.smtpSecure,
                  })}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar"}
                </Button>
              </div>
              {testResult && (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    {testResult.imap
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-red-500" />
                    }
                    <span>IMAP: {testResult.imap ? "Conectado" : testResult.imapError}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResult.smtp
                      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                      : <XCircle className="h-4 w-4 text-red-500" />
                    }
                    <span>SMTP: {testResult.smtp ? "Conectado" : testResult.smtpError}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); setEditingId(null); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar Alterações" : "Criar Caixa Postal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente: Regras de Roteamento ─────────────────────────────────────────

function RulesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", isActive: true, priority: 100,
    conditionLogic: "and" as "and" | "or",
    conditions: [{ field: "subject" as const, operator: "contains" as const, value: "" }],
    actions: [{ action: "set_sector" as const, value: "" }],
    mailboxId: undefined as number | undefined,
  });

  const { data: rules, isLoading, refetch } = trpc.emailInstitutional.rules.list.useQuery({});
  const { data: mailboxes } = trpc.emailInstitutional.mailboxes.list.useQuery();
  const createMutation = trpc.emailInstitutional.rules.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); } });
  const updateMutation = trpc.emailInstitutional.rules.update.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setEditingId(null); } });
  const deleteMutation = trpc.emailInstitutional.rules.delete.useMutation({ onSuccess: () => refetch() });

  const FIELD_LABELS: Record<string, string> = {
    subject: "Assunto", from: "Remetente", to: "Destinatário", body: "Corpo", has_attachment: "Tem anexo",
  };
  const OP_LABELS: Record<string, string> = {
    contains: "contém", equals: "é igual a", starts_with: "começa com", ends_with: "termina com", regex: "regex",
  };
  const ACTION_LABELS: Record<string, string> = {
    set_sector: "Definir setor", set_agent: "Atribuir agente", set_priority: "Definir prioridade",
    add_tag: "Adicionar tag", mark_spam: "Marcar como spam", archive: "Arquivar",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Regras de Roteamento Automático</h3>
        <Button onClick={() => { setEditingId(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Regra
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (rules?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Filter className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Nenhuma regra configurada</p>
            <p className="text-sm">Crie regras para classificar e rotear e-mails automaticamente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules?.map((rule: any) => (
            <Card key={rule.id} className={cn(!rule.isActive && "opacity-60")}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant="outline" className="text-xs">Prioridade {rule.priority}</Badge>
                      {!rule.isActive && <Badge variant="secondary">Inativa</Badge>}
                    </div>
                    {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Condições ({rule.conditionLogic?.toUpperCase()}):</span>{" "}
                      {(rule.conditions as any[])?.map((c: any, i: number) => (
                        <span key={i}>{FIELD_LABELS[c.field] ?? c.field} {OP_LABELS[c.operator] ?? c.operator} "{c.value}"</span>
                      )).reduce((a: any, b: any) => <>{a} · {b}</>)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium">Ações:</span>{" "}
                      {(rule.actions as any[])?.map((a: any, i: number) => (
                        <span key={i}>{ACTION_LABELS[a.action] ?? a.action}{a.value ? `: ${a.value}` : ""}</span>
                      )).reduce((a: any, b: any) => <>{a} · {b}</>)}
                    </div>
                    {rule.matchCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Aplicada {rule.matchCount} vez(es)
                        {rule.lastMatchAt && ` — última: ${formatDistanceToNow(new Date(rule.lastMatchAt), { addSuffix: true, locale: ptBR })}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate({ id: rule.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de criação de regra */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Regra de Roteamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome da Regra *</Label>
                <Input placeholder="ex: Urgências para Chefia" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Prioridade (menor = mais prioritária)</Label>
                <Input type="number" min={1} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
              </div>
            </div>

            <div>
              <Label>Lógica das condições</Label>
              <Select value={form.conditionLogic} onValueChange={v => setForm(f => ({ ...f, conditionLogic: v as "and" | "or" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">Todas as condições (AND)</SelectItem>
                  <SelectItem value="or">Qualquer condição (OR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condições</Label>
              {form.conditions.map((cond, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select value={cond.field} onValueChange={v => setForm(f => ({ ...f, conditions: f.conditions.map((c, j) => j === i ? { ...c, field: v as any } : c) }))}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIELD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={cond.operator} onValueChange={v => setForm(f => ({ ...f, conditions: f.conditions.map((c, j) => j === i ? { ...c, operator: v as any } : c) }))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(OP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    value={cond.value}
                    onChange={e => setForm(f => ({ ...f, conditions: f.conditions.map((c, j) => j === i ? { ...c, value: e.target.value } : c) }))}
                    placeholder="valor..."
                  />
                  <Button variant="ghost" size="icon" onClick={() => setForm(f => ({ ...f, conditions: f.conditions.filter((_, j) => j !== i) }))}>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, conditions: [...f.conditions, { field: "subject", operator: "contains", value: "" }] }))}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar condição
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Ações</Label>
              {form.actions.map((action, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select value={action.action} onValueChange={v => setForm(f => ({ ...f, actions: f.actions.map((a, j) => j === i ? { ...a, action: v as any } : a) }))}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    value={action.value ?? ""}
                    onChange={e => setForm(f => ({ ...f, actions: f.actions.map((a, j) => j === i ? { ...a, value: e.target.value } : a) }))}
                    placeholder="valor (ID do setor, prioridade, etc.)"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setForm(f => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }))}>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setForm((f: any) => ({ ...f, actions: [...f.actions, { action: "set_sector", value: "" }] }))}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar ação
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form as any)} disabled={createMutation.isPending || !form.name}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente: Fila de Envio ────────────────────────────────────────────────

function QueueTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: queueData, isLoading, refetch } = trpc.emailInstitutional.queue.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    limit: 100,
  });
  const retryMutation = trpc.emailInstitutional.queue.retry.useMutation({ onSuccess: () => refetch() });
  const cancelMutation = trpc.emailInstitutional.queue.cancel.useMutation({ onSuccess: () => refetch() });

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending":    return <Clock className="h-4 w-4 text-yellow-500" />;
      case "processing": return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "sent":       return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":     return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":  return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:           return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Fila de Envio</h3>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Todos os status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>NUP</TableHead>
              <TableHead>Tentativas</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(queueData?.items?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum item na fila
                </TableCell>
              </TableRow>
            ) : (
              queueData?.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {statusIcon(item.status)}
                      <span className="text-sm capitalize">{item.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {(() => { try { return JSON.parse(item.toAddresses ?? "[]").map((a: any) => a.address).join(", "); } catch { return item.toAddresses; } })()}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{item.subject}</TableCell>
                  <TableCell>{item.nup && <Badge variant="outline">{item.nup}</Badge>}</TableCell>
                  <TableCell className="text-sm">{item.attempts}/{item.maxAttempts}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.createdAt ? format(new Date(item.createdAt), "dd/MM HH:mm") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.status === "failed" && (
                        <Button variant="outline" size="sm" onClick={() => retryMutation.mutate({ id: item.id })}>
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                      {["pending", "failed"].includes(item.status) && (
                        <Button variant="outline" size="sm" onClick={() => cancelMutation.mutate({ id: item.id })}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── Componente: Auditoria ────────────────────────────────────────────────────

function AuditTab() {
  const { data: logs, isLoading } = trpc.emailInstitutional.audit.list.useQuery({ limit: 200 });

  const actionLabel = (action: string) => action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  const actionColor = (action: string) => {
    if (action.includes("created") || action.includes("received")) return "text-green-600";
    if (action.includes("deleted") || action.includes("failed") || action.includes("spam")) return "text-red-600";
    if (action.includes("updated") || action.includes("replied") || action.includes("sent")) return "text-blue-600";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Trilha de Auditoria</h3>
        <Badge variant="secondary">{logs?.length ?? 0} registros</Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1">
          {(logs?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum registro de auditoria</p>
            </div>
          ) : (
            logs?.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <Activity className={cn("h-4 w-4 mt-0.5 shrink-0", actionColor(log.action))} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", actionColor(log.action))}>
                      {actionLabel(log.action)}
                    </span>
                    {log.nup && <Badge variant="outline" className="text-xs">{log.nup}</Badge>}
                    {log.userName && <span className="text-xs text-muted-foreground">por {log.userName}</span>}
                  </div>
                  {log.description && <p className="text-sm text-muted-foreground truncate">{log.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {log.createdAt ? format(new Date(log.createdAt), "dd/MM HH:mm") : "—"}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function EmailInstitucional() {
  return (
    <OmniLayout title="E-mail Institucional" fullHeight>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">E-mail Institucional</h1>
            <p className="text-sm text-muted-foreground">
              Canal omnichannel integrado ao servidor de e-mail próprio (Mailcow/IMAP)
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="flex flex-col flex-1 min-h-0">
          <TabsList className="shrink-0 w-full justify-start">
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-1.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="inbox">
              <Inbox className="h-4 w-4 mr-1.5" /> Caixa de Entrada
            </TabsTrigger>
            <TabsTrigger value="mailboxes">
              <Building2 className="h-4 w-4 mr-1.5" /> Caixas Postais
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Filter className="h-4 w-4 mr-1.5" /> Regras
            </TabsTrigger>
            <TabsTrigger value="queue">
              <Send className="h-4 w-4 mr-1.5" /> Fila de Envio
            </TabsTrigger>
            <TabsTrigger value="audit">
              <Shield className="h-4 w-4 mr-1.5" /> Auditoria
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto pt-4">
            <TabsContent value="dashboard" className="mt-0 h-full">
              <DashboardTab />
            </TabsContent>
            <TabsContent value="inbox" className="mt-0 h-full">
              <InboxTab />
            </TabsContent>
            <TabsContent value="mailboxes" className="mt-0">
              <MailboxesTab />
            </TabsContent>
            <TabsContent value="rules" className="mt-0">
              <RulesTab />
            </TabsContent>
            <TabsContent value="queue" className="mt-0">
              <QueueTab />
            </TabsContent>
            <TabsContent value="audit" className="mt-0">
              <AuditTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </OmniLayout>
  );
}
