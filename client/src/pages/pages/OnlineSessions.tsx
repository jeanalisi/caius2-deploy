import { useState } from "react";
import OmniLayout from "@/components/OmniLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Monitor, Wifi, WifiOff, Clock, User, RefreshCw, LogOut, Globe } from "lucide-react";

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return d.toLocaleDateString("pt-BR");
}

export default function OnlineSessions() {
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");

  const { data: sessions = [], refetch, isLoading } = trpc.onlineSessions.getActive.useQuery();

  const terminateMutation = trpc.onlineSessions.terminate.useMutation({
    onSuccess: () => { toast.success("Sessão encerrada."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filteredSessions = filter === "all" ? sessions : sessions.filter((s: any) => filter === "online" ? s.status === "online" : s.status !== "online");

  const onlineCount = sessions.filter((s: any) => s.status === "online").length;
  const offlineCount = sessions.filter((s: any) => s.status !== "online").length;

  return (
    <OmniLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Sessões de Usuários</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitore os usuários conectados em tempo real e gerencie sessões ativas.
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{onlineCount}</p>
                <p className="text-xs text-muted-foreground">Online agora</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <WifiOff className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{offlineCount}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-xs text-muted-foreground">Total de sessões</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "online", "offline"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todas" : f === "online" ? "Online" : "Offline"}
            </Button>
          ))}
        </div>

        {/* Sessions List */}
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">Carregando sessões...</div>
        )}
        {!isLoading && filteredSessions.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma sessão encontrada.</p>
          </div>
        )}
        <div className="space-y-2">
          {filteredSessions.map((session: any) => (
            <div key={session.id} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
              {/* Status indicator */}
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${session.status === "online" ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-muted-foreground"}`} />

              {/* User info */}
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{session.userName ?? "Usuário"}</span>
                  <Badge variant="outline" className={`text-xs ${session.status === "online" ? "text-green-400 border-green-400/30" : "text-muted-foreground"}`}>
                    {session.status === "online" ? "Online" : "Offline"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  {session.ipAddress && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {session.ipAddress}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {session.status === "online" ? `Ativo ${timeAgo(session.lastActivityAt)}` : `Último acesso ${timeAgo(session.lastActivityAt)}`}
                  </span>
                </div>
                {session.userAgent && (
                  <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{session.userAgent}</p>
                )}
              </div>

              {/* Actions */}
              {session.status === "online" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive gap-1.5 shrink-0"
                  onClick={() => terminateMutation.mutate({ sessionId: session.id })}
                  disabled={terminateMutation.isPending}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Encerrar
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </OmniLayout>
  );
}
