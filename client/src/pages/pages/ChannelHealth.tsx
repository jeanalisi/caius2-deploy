import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  MessageSquare, Mail, Instagram, Wifi, WifiOff, Clock,
  PlugZap, Unplug,
} from "lucide-react";
import { toast } from "sonner";
import OmniLayout from "@/components/OmniLayout";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  if (status === "healthy") return <Badge className="bg-green-500 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Saudável</Badge>;
  if (status === "degraded") return <Badge className="bg-yellow-500 text-white gap-1"><AlertTriangle className="h-3 w-3" />Degradado</Badge>;
  if (status === "unhealthy") return <Badge className="bg-red-500 text-white gap-1"><XCircle className="h-3 w-3" />Falha</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Desconhecido</Badge>;
}

function channelIcon(channel: string) {
  if (channel === "whatsapp") return <MessageSquare className="h-4 w-4 text-green-500" />;
  if (channel === "instagram") return <Instagram className="h-4 w-4 text-pink-500" />;
  if (channel === "email") return <Mail className="h-4 w-4 text-blue-500" />;
  return <Activity className="h-4 w-4" />;
}

function channelLabel(channel: string) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "instagram") return "Instagram";
  if (channel === "email") return "E-mail";
  return channel;
}

function formatLatency(ms: number | null | undefined) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ChannelHealth() {
  const utils = trpc.useUtils();

  // Dados do dashboard
  const { data: dashboard, isLoading: loadingDashboard } = trpc.omnichannel.health.dashboard.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // Conectores ativos
  const { data: connectors = [], isLoading: loadingConnectors } = trpc.omnichannel.connectors.list.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  // Contas do banco
  const { data: accounts = [] } = trpc.accounts.list.useQuery();

  // Mutations
  const checkHealth = trpc.omnichannel.health.check.useMutation({
    onSuccess: () => {
      toast.success("Verificação concluída", { description: "Status dos canais atualizado." });
      utils.omnichannel.health.dashboard.invalidate();
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  const reinitConnectors = trpc.omnichannel.connectors.reinit.useMutation({
    onSuccess: (data) => {
      toast.success("Conectores reinicializados", { description: `${data.count} conector(es) ativo(s).` });
      utils.omnichannel.connectors.list.invalidate();
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  const registerConnector = trpc.omnichannel.connectors.register.useMutation({
    onSuccess: () => {
      toast.success("Conector registrado", { description: "Canal conectado ao gateway." });
      utils.omnichannel.connectors.list.invalidate();
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  const unregisterConnector = trpc.omnichannel.connectors.unregister.useMutation({
    onSuccess: () => {
      toast.success("Conector removido", { description: "Canal desconectado do gateway." });
      utils.omnichannel.connectors.list.invalidate();
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  const isRegistered = (channel: string, accountId: number) =>
    connectors.some((c: any) => c.channel === channel && c.accountId === accountId);

  return (
    <OmniLayout title="Saúde dos Canais">
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Saúde dos Canais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoramento em tempo real dos conectores omnichannel
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => reinitConnectors.mutate()}
            disabled={reinitConnectors.isPending}
          >
            <PlugZap className="h-4 w-4 mr-2" />
            Reinicializar
          </Button>
          <Button
            size="sm"
            onClick={() => checkHealth.mutate()}
            disabled={checkHealth.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkHealth.isPending ? "animate-spin" : ""}`} />
            Verificar Agora
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{dashboard?.healthy ?? 0}</p>
                <p className="text-xs text-muted-foreground">Saudáveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{dashboard?.degraded ?? 0}</p>
                <p className="text-xs text-muted-foreground">Degradados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{dashboard?.unhealthy ?? 0}</p>
                <p className="text-xs text-muted-foreground">Com Falha</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Wifi className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{connectors.length}</p>
                <p className="text-xs text-muted-foreground">Conectores Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Por canal */}
      {dashboard?.byChannel && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["whatsapp", "instagram", "email"] as const).map((ch) => {
            const stats = dashboard.byChannel[ch] ?? { healthy: 0, degraded: 0, unhealthy: 0 };
            const total = stats.healthy + stats.degraded + stats.unhealthy;
            return (
              <Card key={ch}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {channelIcon(ch)}
                    {channelLabel(ch)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {total === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados nas últimas 24h</p>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Saudáveis</span>
                        <span className="font-medium text-green-600">{stats.healthy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Degradados</span>
                        <span className="font-medium text-yellow-600">{stats.degraded}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Com falha</span>
                        <span className="font-medium text-red-600">{stats.unhealthy}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tabs: Contas / Logs */}
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Contas e Conectores</TabsTrigger>
          <TabsTrigger value="logs">Histórico de Logs</TabsTrigger>
        </TabsList>

        {/* Contas */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contas Conectadas</CardTitle>
              <CardDescription>
                Gerencie os conectores do gateway omnichannel para cada conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma conta cadastrada. Acesse <strong>Contas</strong> para adicionar.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Identificador</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(accounts as any[]).map((acc: any) => {
                      const registered = isRegistered(acc.channel, acc.id);
                      return (
                        <TableRow key={acc.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {channelIcon(acc.channel)}
                              <span className="text-xs">{channelLabel(acc.channel)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{acc.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{acc.identifier}</TableCell>
                          <TableCell>
                            <Badge
                              variant={acc.status === "connected" ? "default" : "secondary"}
                              className={acc.status === "connected" ? "bg-green-500 text-white" : ""}
                            >
                              {acc.status === "connected" ? "Conectado" :
                               acc.status === "connecting" ? "Conectando..." :
                               acc.status === "error" ? "Erro" : "Desconectado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {registered ? (
                              <div className="flex items-center gap-1 text-green-600 text-xs">
                                <Wifi className="h-3 w-3" />
                                Ativo
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                <WifiOff className="h-3 w-3" />
                                Inativo
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {registered ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unregisterConnector.mutate({ channel: acc.channel, accountId: acc.id })}
                                disabled={unregisterConnector.isPending}
                              >
                                <Unplug className="h-3 w-3 mr-1" />
                                Desconectar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => registerConnector.mutate({ accountId: acc.id })}
                                disabled={registerConnector.isPending}
                              >
                                <PlugZap className="h-3 w-3 mr-1" />
                                Conectar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Saúde (últimas 24h)</CardTitle>
              <CardDescription>
                Registros de verificação de saúde dos conectores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!dashboard?.recentLogs || dashboard.recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum log disponível. Clique em <strong>Verificar Agora</strong> para gerar o primeiro registro.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latência</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead>Verificado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.recentLogs.map((log: any) => {
                      const acc = (accounts as any[]).find((a: any) => a.id === log.accountId);
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {channelIcon(log.channel)}
                              <span className="text-xs">{channelLabel(log.channel)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{acc?.name ?? `#${log.accountId}`}</TableCell>
                          <TableCell>{statusBadge(log.status)}</TableCell>
                          <TableCell className="text-sm">{formatLatency(log.latencyMs)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {log.errorMessage ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(log.checkedAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </OmniLayout>
  );
}
