import OmniLayout from "@/components/OmniLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Filter,
  Loader2,
  MessageSquare,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
  web: "Webchat",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  pending: "Pendente",
  resolved: "Resolvida",
  snoozed: "Adiada",
};

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", `channel-${channel}`)}>
      {channel === "whatsapp" ? "WA" : channel === "instagram" ? "IG" : channel === "web" ? "WEB" : "EM"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    resolved: "bg-green-500/10 text-green-400 border-green-500/20",
    snoozed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border", map[status] ?? "bg-secondary text-muted-foreground border-border")}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function Conversations() {
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const { data: conversations, isLoading } = trpc.conversations.list.useQuery({
    channel: channelFilter !== "all" ? (channelFilter as any) : undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    limit: 200,
  });

  const { data: agents } = trpc.users.agents.useQuery();

  const filtered = useMemo(() => {
    if (!conversations) return [];
    let list = conversations;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.contact?.name?.toLowerCase().includes(q) ||
          c.contact?.email?.toLowerCase().includes(q) ||
          c.contact?.phone?.toLowerCase().includes(q) ||
          c.conversation.subject?.toLowerCase().includes(q)
      );
    }
    if (agentFilter !== "all") {
      list = list.filter((c) =>
        agentFilter === "unassigned"
          ? !c.conversation.assignedAgentId
          : c.conversation.assignedAgentId?.toString() === agentFilter
      );
    }
    return list;
  }, [conversations, search, agentFilter]);

  return (
    <OmniLayout title="Histórico de Conversas">
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, telefone..."
              className="pl-8 h-8 text-xs bg-secondary/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-8 text-xs w-32 bg-secondary/50">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos canais</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-32 bg-secondary/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="open">Aberta</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="resolved">Resolvida</SelectItem>
              <SelectItem value="snoozed">Adiada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="h-8 text-xs w-36 bg-secondary/50">
              <SelectValue placeholder="Agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos agentes</SelectItem>
              <SelectItem value="unassigned">Sem agente</SelectItem>
              {agents?.map((a) => (
                <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} conversa{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <Card className="border-border bg-card/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Contato</div>
                  <div className="col-span-2">Canal</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Agente</div>
                  <div className="col-span-2">Última mensagem</div>
                </div>
                {filtered.map(({ conversation: conv, contact, account }) => {
                  const agent = agents?.find((a) => a.id === conv.assignedAgentId);
                  return (
                    <div key={conv.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-accent/30 transition-colors">
                      <div className="col-span-1">
                        <span className="text-xs text-muted-foreground font-mono">#{conv.id}</span>
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                            {(contact?.name ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {contact?.name ?? contact?.phone ?? contact?.email ?? "Desconhecido"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.subject ?? `Conversa #${conv.id}`}
                          </p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex flex-col gap-1">
                          <ChannelBadge channel={conv.channel} />
                          <span className="text-[10px] text-muted-foreground truncate">{account?.name ?? ""}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <StatusBadge status={conv.status} />
                      </div>
                      <div className="col-span-2">
                        {agent ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-semibold">
                              {(agent.name ?? "A").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-muted-foreground truncate">{agent.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">
                          {conv.lastMessageAt
                            ? new Date(conv.lastMessageAt).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OmniLayout>
  );
}
