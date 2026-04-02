/**
 * Dashboard Institucional — CAIUS
 * Layout corporativo com KPIs, gráficos e atividade recente.
 */

import OmniLayout from "@/components/OmniLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "wouter";

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#22c55e",
  instagram: "#ec4899",
  email: "#3b82f6",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  pending: "#f59e0b",
  resolved: "#22c55e",
  snoozed: "#a855f7",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  pending: "Pendente",
  resolved: "Resolvido",
  snoozed: "Adiado",
};

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  bg,
  border,
  trend,
  href,
}: {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  trend?: number;
  href?: string;
}) {
  const content = (
    <Card className={cn("border transition-all hover:shadow-md hover:shadow-black/5 group cursor-pointer", border, "bg-card")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bg)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
          {trend !== undefined && (
            <div className={cn("flex items-center gap-0.5 text-xs font-medium", trend >= 0 ? "text-emerald-500" : "text-red-500")}>
              <ArrowUpRight className={cn("h-3.5 w-3.5", trend < 0 && "rotate-180")} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: stats, isLoading: statsLoading } = trpc.conversations.stats.useQuery();
  const { data: analytics } = trpc.analytics.overview.useQuery();
  const { data: agents } = trpc.users.agents.useQuery();
  const { data: accounts } = trpc.accounts.list.useQuery();
  const { data: protocols } = trpc.caius.protocols.list.useQuery({ limit: 5 }, { retry: false } as any);
  const { data: orgStats } = trpc.caius.protocols.stats.useQuery(undefined, { retry: false } as any);

  const connectedAccounts = accounts?.filter((a) => a.status === "connected").length ?? 0;
  const availableAgents = agents?.filter((a) => a.isAvailable).length ?? 0;
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";

  const channelData = useMemo(() => {
    if (!analytics?.byChannel) return [];
    return analytics.byChannel.map((c) => ({
      name: CHANNEL_LABELS[c.channel] ?? c.channel,
      value: Number(c.count),
      color: CHANNEL_COLORS[c.channel] ?? "#6366f1",
    }));
  }, [analytics]);

  const statusData = useMemo(() => {
    if (!analytics?.byStatus) return [];
    return analytics.byStatus.map((s) => ({
      name: STATUS_LABELS[s.status] ?? s.status,
      value: Number(s.count),
      color: STATUS_COLORS[s.status] ?? "#6366f1",
    }));
  }, [analytics]);

  const agentData = useMemo(() => {
    if (!analytics?.byAgent) return [];
    return analytics.byAgent
      .filter((a) => a.agentName)
      .slice(0, 6)
      .map((a) => ({
        name: (a.agentName ?? "").split(" ")[0],
        conversas: Number(a.count),
      }));
  }, [analytics]);

  const kpis = [
    {
      title: "Conversas Abertas",
      value: stats?.open ?? 0,
      icon: Inbox,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/15",
      href: "/inbox",
    },
    {
      title: "Pendentes",
      value: stats?.pending ?? 0,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/15",
      href: "/inbox",
    },
    {
      title: "Resolvidas",
      value: stats?.resolved ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/15",
    },
    {
      title: "Total Mensagens",
      value: analytics?.totalMessages ?? 0,
      icon: MessageSquare,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      border: "border-violet-500/15",
    },
    {
      title: "Contas Conectadas",
      value: connectedAccounts,
      icon: Wifi,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/15",
      href: "/accounts",
    },
    {
      title: "Agentes Disponíveis",
      value: availableAgents,
      icon: Users,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/15",
      href: "/agents",
    },
    {
      title: "Protocolos Abertos",
      value: orgStats?.open ?? ((protocols as any[])?.filter((p: any) => p?.protocol?.status === "open").length ?? 0),
      icon: FileText,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/15",
      href: "/protocols",
    },
    {
      title: "Conversas Totais",
      value: stats?.total ?? 0,
      icon: BarChart3,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
      border: "border-pink-500/15",
    },
  ];

  const recentProtocols = ((protocols as any[]) ?? []).slice(0, 5);

  return (
    <OmniLayout title="Dashboard">
      <div className="p-6 space-y-6">
        {/* ── Barra de boas-vindas ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-foreground">{greeting}, bem-vindo ao CAIUS</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
            <Link href="/inbox">
              <Button size="sm" className="gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5" />
                Ir para Inbox
              </Button>
            </Link>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </div>

        {/* ── Gráficos ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Por Canal */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-blue-500" />
                Conversas por Canal
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {channelData.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sem dados de canal</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={140}>
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%" cy="50%"
                        innerRadius={38} outerRadius={58}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="var(--card)"
                      >
                        {channelData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "var(--foreground)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2.5">
                    {channelData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-muted-foreground">{d.name}</span>
                        <span className="text-xs font-bold text-foreground ml-auto tabular-nums">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Por Status */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                Conversas por Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {statusData.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sem dados de status</p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {statusData.map((s) => (
                    <div key={s.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-xs text-muted-foreground">{s.name}</span>
                        </div>
                        <span className="text-xs font-bold text-foreground tabular-nums">{s.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            background: s.color,
                            width: `${Math.round((s.value / Math.max(stats?.total || 1, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Por Agente */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-violet-500" />
                Conversas por Agente
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {agentData.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sem dados de agente</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={agentData} barSize={14}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="conversas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Linha inferior: Protocolos Recentes + Status das Contas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Protocolos Recentes */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-orange-500" />
                Protocolos Recentes
              </CardTitle>
              <Link href="/protocols">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {recentProtocols.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhum protocolo recente</p>
                  <Link href="/protocols">
                    <span className="text-xs text-primary hover:underline cursor-pointer">Criar protocolo →</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentProtocols.map((p: any) => {
                    const proto = p?.protocol ?? p;
                    return (
                      <div key={proto.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/30 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{proto.subject ?? "Sem assunto"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{proto.nup}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0",
                            proto.status === "open" && "border-blue-500/30 text-blue-500 bg-blue-500/5",
                            proto.status === "concluded" && "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
                            proto.status === "in_analysis" && "border-amber-500/30 text-amber-500 bg-amber-500/5",
                          )}
                        >
                          {proto.status === "open" ? "Aberto" : proto.status === "concluded" ? "Concluído" : proto.status === "in_analysis" ? "Em Análise" : proto.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status das Contas */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-cyan-500" />
                Status das Contas
              </CardTitle>
              <Link href="/accounts">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  Gerenciar <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {!accounts || accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Wifi className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma conta conectada</p>
                  <Link href="/accounts">
                    <span className="text-xs text-primary hover:underline cursor-pointer">Conectar conta →</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-2.5 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold shrink-0",
                          account.channel === "whatsapp" && "bg-green-500/10 text-green-600",
                          account.channel === "instagram" && "bg-pink-500/10 text-pink-600",
                          account.channel === "email" && "bg-blue-500/10 text-blue-600",
                        )}
                      >
                        {account.channel === "whatsapp" ? "WA" : account.channel === "instagram" ? "IG" : "EM"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{account.identifier}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            account.status === "connected" && "bg-emerald-400",
                            account.status === "connecting" && "bg-amber-400 animate-pulse",
                            account.status === "disconnected" && "bg-muted-foreground/30",
                            account.status === "error" && "bg-red-400",
                          )}
                        />
                        <span className={cn(
                          "text-[10px] font-medium",
                          account.status === "connected" && "text-emerald-500",
                          account.status === "connecting" && "text-amber-500",
                          account.status === "disconnected" && "text-muted-foreground",
                          account.status === "error" && "text-red-500",
                        )}>
                          {account.status === "connected" ? "Conectado" : account.status === "connecting" ? "Conectando" : account.status === "error" ? "Erro" : "Desconectado"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Alertas / Avisos ── */}
        {(connectedAccounts === 0 || availableAgents === 0) && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-600">Atenção necessária</p>
                  <ul className="mt-1 space-y-0.5">
                    {connectedAccounts === 0 && (
                      <li className="text-xs text-amber-600/80">
                        Nenhuma conta de canal conectada.{" "}
                        <Link href="/accounts">
                          <span className="underline cursor-pointer">Conectar agora →</span>
                        </Link>
                      </li>
                    )}
                    {availableAgents === 0 && (
                      <li className="text-xs text-amber-600/80">
                        Nenhum agente disponível no momento.{" "}
                        <Link href="/agents">
                          <span className="underline cursor-pointer">Gerenciar agentes →</span>
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OmniLayout>
  );
}
