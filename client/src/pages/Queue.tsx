import OmniLayout from "@/components/OmniLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Clock,
  Loader2,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

function timeWaiting(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
}

export default function Queue() {
  const utils = trpc.useUtils();
  const { data: queueItems, isLoading } = trpc.queue.list.useQuery(undefined, { refetchInterval: 10000 });
  const { data: agents } = trpc.users.agents.useQuery();

  const assign = trpc.queue.assign.useMutation({
    onSuccess: () => { utils.queue.list.invalidate(); toast.success("Atendimento atribuído!"); },
    onError: (e) => toast.error(e.message),
  });

  const autoAssign = trpc.queue.autoAssign.useMutation({
    onSuccess: (data) => {
      utils.queue.list.invalidate();
      toast.success(`${data.assigned} atendimento(s) distribuído(s) automaticamente`);
    },
    onError: (e) => toast.error(e.message),
  });

  const availableAgents = agents?.filter((a) => a.isAvailable) ?? [];

  return (
    <OmniLayout title="Fila de Atendimento">
      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Clock className="h-4.5 w-4.5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Na fila</p>
                <p className="text-2xl font-bold text-foreground">{queueItems?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                <Users className="h-4.5 w-4.5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agentes disponíveis</p>
                <p className="text-2xl font-bold text-foreground">{availableAgents.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Zap className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total de agentes</p>
                <p className="text-2xl font-bold text-foreground">{agents?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Fila de espera</h2>
          <Button
            size="sm"
            className="gap-2 h-8 text-xs"
            onClick={() => autoAssign.mutate()}
            disabled={autoAssign.isPending || (queueItems?.length ?? 0) === 0}
          >
            {autoAssign.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Distribuir automaticamente
          </Button>
        </div>

        {/* Queue list */}
        <Card className="border-border bg-card/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !queueItems || queueItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <CheckCircle2 className="h-8 w-8 text-green-400/50" />
                <p className="text-sm text-muted-foreground">Fila vazia! Todos os atendimentos foram distribuídos.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">Pos.</div>
                  <div className="col-span-3">Conversa</div>
                  <div className="col-span-2">Canal</div>
                  <div className="col-span-2">Aguardando</div>
                  <div className="col-span-4">Atribuir a</div>
                </div>
                {queueItems.map(({ queue: q, conversation: conv }) => (
                  <div key={q.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-accent/30 transition-colors">
                    <div className="col-span-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                        {q.position}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-foreground">Conversa #{conv?.id ?? q.conversationId}</p>
                      <p className="text-xs text-muted-foreground">{conv?.subject ?? "—"}</p>
                    </div>
                    <div className="col-span-2">
                      {conv && (
                        <span className={cn("inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", `channel-${conv.channel}`)}>
                          {conv.channel === "whatsapp" ? "WA" : conv.channel === "instagram" ? "IG" : "EM"}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1 text-xs text-yellow-400">
                        <Clock className="h-3 w-3" />
                        {timeWaiting(q.waitingSince)}
                      </div>
                    </div>
                    <div className="col-span-4 flex items-center gap-2">
                      <Select
                        onValueChange={(agentId) => assign.mutate({ queueId: q.id, agentId: parseInt(agentId) })}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1 bg-secondary/50">
                          <SelectValue placeholder="Selecionar agente" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAgents.map((a) => (
                            <SelectItem key={a.id} value={a.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                {a.name}
                              </div>
                            </SelectItem>
                          ))}
                          {availableAgents.length === 0 && (
                            <SelectItem value="none" disabled>Nenhum agente disponível</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agents status */}
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status dos Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!agents || agents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum agente cadastrado</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 bg-secondary/20">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        {(agent.name ?? "A").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className={cn("h-1.5 w-1.5 rounded-full", agent.isAvailable ? "bg-green-400" : "bg-muted-foreground/40")} />
                        <span className="text-[10px] text-muted-foreground">
                          {agent.isAvailable ? "Disponível" : "Ocupado"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OmniLayout>
  );
}
