import OmniLayout from "@/components/OmniLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Ticket as TicketIcon,
  TrendingUp,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRIORITY_MAP = {
  low: { label: "Baixa", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  normal: { label: "Normal", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  high: { label: "Alta", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  urgent: { label: "Urgente", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const STATUS_MAP = {
  open: { label: "Aberto", className: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  in_progress: { label: "Em andamento", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: TrendingUp },
  resolved: { label: "Resolvido", className: "bg-green-500/10 text-green-400 border-green-500/20", icon: CheckCircle2 },
  closed: { label: "Fechado", className: "bg-muted/50 text-muted-foreground border-border", icon: CheckCircle2 },
};

export default function Tickets() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    conversationId: "",
    title: "",
    description: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    assignedAgentId: "",
  });

  const { data: tickets, isLoading } = trpc.tickets.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
  });

  const { data: agents } = trpc.users.agents.useQuery();
  const { data: conversations } = trpc.conversations.list.useQuery({ limit: 100 });

  const create = trpc.tickets.create.useMutation({
    onSuccess: () => {
      utils.tickets.list.invalidate();
      toast.success("Ticket criado com sucesso!");
      setCreateOpen(false);
      setForm({ conversationId: "", title: "", description: "", priority: "normal", assignedAgentId: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.tickets.update.useMutation({
    onSuccess: () => { utils.tickets.list.invalidate(); toast.success("Ticket atualizado"); },
    onError: (e) => toast.error(e.message),
  });

  const counts = {
    open: tickets?.filter((t) => t.ticket.status === "open").length ?? 0,
    in_progress: tickets?.filter((t) => t.ticket.status === "in_progress").length ?? 0,
    resolved: tickets?.filter((t) => t.ticket.status === "resolved").length ?? 0,
  };

  return (
    <OmniLayout title="Tickets">
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {(["open", "in_progress", "resolved"] as const).map((s) => {
            const info = STATUS_MAP[s];
            return (
              <Card
                key={s}
                className={cn(
                  "border cursor-pointer transition-all",
                  statusFilter === s ? "border-primary/40 bg-primary/5" : "border-border bg-card/50 hover:border-border/80"
                )}
                onClick={() => setStatusFilter(s)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", info.className)}>
                    <info.icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{info.label}</p>
                    <p className="text-2xl font-bold text-foreground">{counts[s]}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters + Create */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-36 bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
                <SelectItem value="closed">Fechados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Novo Ticket
          </Button>
        </div>

        {/* Tickets table */}
        <Card className="border-border bg-card/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !tickets || tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <TicketIcon className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum ticket encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {/* Header */}
                <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Título</div>
                  <div className="col-span-2">Prioridade</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Agente</div>
                  <div className="col-span-1">Ações</div>
                </div>
                {tickets.map(({ ticket, conversation }) => {
                  const priorityInfo = PRIORITY_MAP[ticket.priority];
                  const statusInfo = STATUS_MAP[ticket.status];
                  const agent = agents?.find((a) => a.id === ticket.assignedAgentId);
                  return (
                    <div key={ticket.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-accent/30 transition-colors">
                      <div className="col-span-1">
                        <span className="text-xs text-muted-foreground font-mono">#{ticket.id}</span>
                      </div>
                      <div className="col-span-4">
                        <p className="text-sm font-medium text-foreground truncate">{ticket.title}</p>
                        {ticket.description && (
                          <p className="text-xs text-muted-foreground truncate">{ticket.description}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border", priorityInfo.className)}>
                          {priorityInfo.label}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={ticket.status}
                          onValueChange={(v) => update.mutate({ id: ticket.id, status: v as any })}
                        >
                          <SelectTrigger className={cn("h-6 text-[10px] border rounded-full px-2", statusInfo.className)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto</SelectItem>
                            <SelectItem value="in_progress">Em andamento</SelectItem>
                            <SelectItem value="resolved">Resolvido</SelectItem>
                            <SelectItem value="closed">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={ticket.assignedAgentId?.toString() ?? "unassigned"}
                          onValueChange={(v) => update.mutate({ id: ticket.id, assignedAgentId: v === "unassigned" ? null : parseInt(v) })}
                        >
                          <SelectTrigger className="h-6 text-[10px] bg-secondary/50 border-border">
                            <User className="h-2.5 w-2.5 mr-1" />
                            <SelectValue placeholder="Atribuir" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Sem agente</SelectItem>
                            {agents?.map((a) => (
                              <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-green-400 hover:text-green-300 hover:bg-green-500/10 px-2"
                          onClick={() => update.mutate({ id: ticket.id, status: "resolved", resolvedAt: new Date() })}
                        >
                          Resolver
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Conversa</Label>
              <Select value={form.conversationId} onValueChange={(v) => setForm({ ...form, conversationId: v })}>
                <SelectTrigger className="h-8 text-xs bg-secondary/50">
                  <SelectValue placeholder="Selecionar conversa" />
                </SelectTrigger>
                <SelectContent>
                  {conversations?.map(({ conversation: c, contact }) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      #{c.id} - {contact?.name ?? contact?.phone ?? "Desconhecido"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <Input
                placeholder="Descreva o problema..."
                className="text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                className="text-sm min-h-[80px] resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                  <SelectTrigger className="h-8 text-xs bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Atribuir a</Label>
                <Select value={form.assignedAgentId} onValueChange={(v) => setForm({ ...form, assignedAgentId: v })}>
                  <SelectTrigger className="h-8 text-xs bg-secondary/50">
                    <SelectValue placeholder="Agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents?.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!form.conversationId || !form.title) { toast.error("Preencha conversa e título"); return; }
                create.mutate({
                  conversationId: parseInt(form.conversationId),
                  title: form.title,
                  description: form.description || undefined,
                  priority: form.priority,
                  assignedAgentId: form.assignedAgentId ? parseInt(form.assignedAgentId) : undefined,
                });
              }}
              disabled={create.isPending}
              className="gap-2"
            >
              {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Criar Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
