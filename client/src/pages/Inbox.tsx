import OmniLayout from "@/components/OmniLayout";
import { NewConversationModal } from "@/components/NewConversationModal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Inbox as InboxIcon,
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Phone,
  PhoneCall,
  PhoneMissed,
  Search,
  Send,
  Star,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  pending: "Pendente",
  resolved: "Resolvida",
  snoozed: "Adiada",
};

const CHANNEL_CONFIG: Record<string, { label: string; shortLabel: string; color: string; icon: string }> = {
  whatsapp: { label: "WhatsApp", shortLabel: "WA", color: "bg-green-500/15 text-green-500", icon: "💬" },
  instagram: { label: "Instagram", shortLabel: "IG", color: "bg-pink-500/15 text-pink-500", icon: "📸" },
  email: { label: "E-mail", shortLabel: "EM", color: "bg-blue-500/15 text-blue-500", icon: "✉️" },
  phone: { label: "Telefone", shortLabel: "TEL", color: "bg-orange-500/15 text-orange-500", icon: "📞" },
  chat: { label: "Chat", shortLabel: "CH", color: "bg-violet-500/15 text-violet-500", icon: "💬" },
  web: { label: "Webchat", shortLabel: "WEB", color: "bg-violet-500/15 text-violet-600", icon: "🌐" },
  sms: { label: "SMS", shortLabel: "SMS", color: "bg-teal-500/15 text-teal-500", icon: "📱" },
};

function ChannelBadge({ channel }: { channel: string }) {
  const cfg = CHANNEL_CONFIG[channel] ?? { shortLabel: channel, color: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", cfg.color)}>
      {cfg.shortLabel}
    </span>
  );
}

function ChannelOriginBadge({ channel }: { channel: string }) {
  const cfg = CHANNEL_CONFIG[channel] ?? { label: channel, color: "bg-muted text-muted-foreground", icon: "💬" };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border", cfg.color, "border-current/20")}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    open: "bg-blue-500/10 text-blue-400",
    pending: "bg-yellow-500/10 text-yellow-400",
    resolved: "bg-green-500/10 text-green-400",
    snoozed: "bg-purple-500/10 text-purple-400",
  };
  return (
    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", colorMap[status] ?? "bg-muted text-muted-foreground")}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function timeAgo(date: Date | string | null) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── Satisfaction Survey Modal ────────────────────────────────────────────────
function SatisfactionModal({
  open,
  onClose,
  contactName,
  channel,
}: {
  open: boolean;
  onClose: (rating?: number) => void;
  contactName: string;
  channel: string;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const labels = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Conversa Encerrada
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Conversa com <strong className="text-foreground">{contactName}</strong> via{" "}
              <ChannelOriginBadge channel={channel} /> encerrada com sucesso.
            </p>
          </div>
          <div className="bg-secondary/40 rounded-xl p-4 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">Como foi o atendimento?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      (hovered ?? rating ?? 0) >= n
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
            {(hovered ?? rating) && (
              <p className="text-xs text-muted-foreground animate-in fade-in">
                {labels[(hovered ?? rating ?? 1) - 1]}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onClose()}>
              Pular
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={!rating}
              onClick={() => {
                if (rating) {
                  toast.success(`Avaliação ${labels[rating - 1]} registrada!`);
                  onClose(rating);
                }
              }}
            >
              Enviar Avaliação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Incoming Call Banner ─────────────────────────────────────────────────────
function IncomingCallBanner({
  callerName,
  callerPhone,
  onAnswer,
  onDecline,
}: {
  callerName: string;
  callerPhone: string;
  onAnswer: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-orange-500/10 border-b border-orange-500/20 animate-in slide-in-from-top">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center animate-pulse">
          <PhoneCall className="h-4 w-4 text-orange-500" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Ligação recebida</p>
          <p className="text-[11px] text-muted-foreground">
            {callerName} · {callerPhone}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
          onClick={onDecline}
        >
          <PhoneMissed className="h-3 w-3" />
          Recusar
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
          onClick={onAnswer}
        >
          <Phone className="h-3 w-3" />
          Atender
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Inbox() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [messageText, setMessageText] = useState("");
  const [satisfactionOpen, setSatisfactionOpen] = useState(false);
  const [pendingResolveId, setPendingResolveId] = useState<number | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ name: string; phone: string } | null>(null);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: conversations = [], isLoading: convsLoading } = trpc.conversations.list.useQuery(
    {
      channel: channelFilter !== "all" ? (channelFilter as any) : undefined,
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      limit: 100,
    },
    { refetchInterval: 10000 }
  );

  const { data: agents = [] } = trpc.users.agents.useQuery();

  const selectedConv = useMemo(
    () => (conversations as any[]).find((c: any) => c.conversation.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const { data: messages = [], isLoading: msgsLoading } = trpc.messages.list.useQuery(
    { conversationId: selectedId! },
    { enabled: !!selectedId, refetchInterval: 5000 }
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      utils.messages.list.invalidate({ conversationId: selectedId! });
      utils.conversations.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markRead = trpc.messages.markRead.useMutation();

  const updateConv = trpc.conversations.update.useMutation({
    onSuccess: () => utils.conversations.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedId) {
      markRead.mutate({ conversationId: selectedId });
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages && (messages as any[]).length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = conversations as any[];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c: any) =>
        c.contact?.name?.toLowerCase().includes(q) ||
        c.contact?.email?.toLowerCase().includes(q) ||
        c.contact?.phone?.toLowerCase().includes(q) ||
        c.conversation.subject?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectConv = (id: number) => {
    setSelectedId(id);
    setMessageText("");
  };

  const handleSend = () => {
    if (!messageText.trim() || !selectedId || sendMessage.isPending) return;
    sendMessage.mutate({ conversationId: selectedId, content: messageText.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResolveClick = () => {
    if (!selectedId) return;
    setPendingResolveId(selectedId);
    setSatisfactionOpen(true);
  };

  const handleSatisfactionClose = (rating?: number) => {
    setSatisfactionOpen(false);
    if (pendingResolveId) {
      updateConv.mutate({ id: pendingResolveId, status: "resolved" });
      if (rating) {
        // Rating registered — could be saved to DB in a future iteration
      }
      setPendingResolveId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <OmniLayout title="Inbox Unificado" fullHeight>
      {/* Root: fills the main area completely */}
      <div className="flex h-full w-full overflow-hidden">

        {/* ── Left panel: conversation list ── */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card/20 overflow-hidden">
          {/* Filters */}
          <div className="shrink-0 space-y-2 border-b border-border p-3">
            <Button
              size="sm"
              className="w-full gap-1.5 h-8 text-xs"
              onClick={() => setNewConvOpen(true)}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Novo Atendimento
            </Button>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-8 h-8 text-xs bg-secondary/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="h-7 text-xs flex-1 bg-secondary/50">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos canais</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 text-xs flex-1 bg-secondary/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="open">Aberta</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="resolved">Resolvida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {convsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 px-4 text-center">
                <InboxIcon className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
                {search && (
                  <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline">
                    Limpar busca
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {filtered.map(({ conversation: conv, contact }: any) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleSelectConv(conv.id)}
                    className={cn(
                      "w-full text-left px-3 py-3 transition-colors hover:bg-accent/50",
                      selectedId === conv.id && "bg-accent/80 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {(contact?.name ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {contact?.name ?? contact?.phone ?? contact?.email ?? "Desconhecido"}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            <ChannelBadge channel={conv.channel} />
                            <span className="text-[10px] text-muted-foreground">{timeAgo(conv.lastMessageAt)}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {conv.subject ?? `Conversa #${conv.id}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <StatusBadge status={conv.status} />
                          {conv.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Count footer */}
          <div className="shrink-0 border-t border-border px-3 py-2">
            <p className="text-[10px] text-muted-foreground">
              {filtered.length} conversa{filtered.length !== 1 ? "s" : ""}
              {search ? ` (filtrado de ${(conversations as any[]).length})` : ""}
            </p>
          </div>
        </aside>

        {/* ── Right panel: conversation view ── */}
        {selectedId && selectedConv ? (
          <div className="flex flex-1 flex-col overflow-hidden">

            {/* Incoming call banner (demo — shown when channel is phone) */}
            {incomingCall && (
              <IncomingCallBanner
                callerName={incomingCall.name}
                callerPhone={incomingCall.phone}
                onAnswer={() => {
                  toast.success("Ligação atendida");
                  setIncomingCall(null);
                }}
                onDecline={() => {
                  toast.info("Ligação recusada");
                  setIncomingCall(null);
                }}
              />
            )}

            {/* Conversation header */}
            <div className="shrink-0 flex items-center justify-between border-b border-border px-4 py-3 bg-card/20">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {(selectedConv.contact?.name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {selectedConv.contact?.name ?? selectedConv.contact?.phone ?? selectedConv.contact?.email ?? "Desconhecido"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {/* Canal de origem destacado */}
                    <ChannelOriginBadge channel={selectedConv.conversation.channel} />
                    {selectedConv.account?.name && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        via {selectedConv.account.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {/* Assign agent */}
                <Select
                  value={selectedConv.conversation.assignedAgentId?.toString() ?? "unassigned"}
                  onValueChange={(v) =>
                    updateConv.mutate({
                      id: selectedId,
                      assignedAgentId: v === "unassigned" ? null : parseInt(v),
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-xs w-36 bg-secondary/50">
                    <User className="h-3 w-3 mr-1 shrink-0" />
                    <SelectValue placeholder="Atribuir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem agente</SelectItem>
                    {(agents as any[]).map((a: any) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status */}
                <Select
                  value={selectedConv.conversation.status}
                  onValueChange={(v) => updateConv.mutate({ id: selectedId, status: v as any })}
                >
                  <SelectTrigger className="h-7 text-xs w-28 bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aberta</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="resolved">Resolvida</SelectItem>
                    <SelectItem value="snoozed">Adiar</SelectItem>
                  </SelectContent>
                </Select>

                {/* Resolve button — opens satisfaction survey */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-green-500 border-green-500/30 hover:bg-green-500/10"
                  onClick={handleResolveClick}
                  disabled={updateConv.isPending || selectedConv.conversation.status === "resolved"}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Resolver
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 px-4 py-4">
              {msgsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (messages as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-muted-foreground/60">Envie a primeira mensagem abaixo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...(messages as any[])].reverse().map((msg: any) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2 max-w-[80%]",
                        msg.direction === "outbound" ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      {msg.direction === "inbound" && (
                        <Avatar className="h-6 w-6 shrink-0 mt-1">
                          <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                            {(selectedConv.contact?.name ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div
                          className={cn(
                            "rounded-2xl px-3 py-2 text-sm break-words",
                            msg.direction === "outbound"
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-secondary text-foreground rounded-tl-sm"
                          )}
                        >
                          {msg.content}
                        </div>
                        <p className={cn(
                          "text-[10px] text-muted-foreground mt-0.5",
                          msg.direction === "outbound" ? "text-right" : ""
                        )}>
                          {msg.senderName && msg.direction === "outbound" ? `${msg.senderName} · ` : ""}
                          {new Date(msg.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message input */}
            <div className="shrink-0 border-t border-border p-3 bg-card/20">
              <div className="flex items-end gap-2">
                <Textarea
                  placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                  className="min-h-[60px] max-h-32 resize-none text-sm bg-secondary/50 border-border flex-1"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  size="sm"
                  className="h-10 w-10 p-0 shrink-0"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <InboxIcon className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Selecione uma conversa</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(conversations as any[]).length > 0
                  ? "Escolha uma conversa na lista para visualizar as mensagens"
                  : "Nenhuma conversa disponível no momento"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Satisfaction Survey Modal ── */}
      <SatisfactionModal
        open={satisfactionOpen}
        onClose={handleSatisfactionClose}
        contactName={selectedConv?.contact?.name ?? "Contato"}
        channel={selectedConv?.conversation?.channel ?? "chat"}
      />

      {/* ── New Conversation Modal ── */}
      <NewConversationModal
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onSuccess={(conversationId) => {
          setNewConvOpen(false);
          utils.conversations.list.invalidate();
          setSelectedId(conversationId);
          toast.success("Atendimento iniciado com sucesso!");
        }}
      />
    </OmniLayout>
  );
}
