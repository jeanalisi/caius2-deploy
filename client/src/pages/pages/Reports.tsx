import OmniLayout from "@/components/OmniLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Inbox,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "oklch(0.60 0.18 145)",
  instagram: "oklch(0.60 0.20 340)",
  email: "oklch(0.60 0.15 220)",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  pending: "#eab308",
  resolved: "#22c55e",
  snoozed: "#a855f7",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Abertas",
  pending: "Pendentes",
  resolved: "Resolvidas",
  snoozed: "Adiadas",
};

export default function Reports() {
  const [period, setPeriod] = useState("30d");

  const dateFrom = useMemo(() => {
    const now = new Date();
    const days = parseInt(period);
    now.setDate(now.getDate() - days);
    return now;
  }, [period]);

  const { data: analytics } = trpc.analytics.overview.useQuery({ dateFrom });
  const { data: stats } = trpc.conversations.stats.useQuery();
  const { data: agents } = trpc.users.agents.useQuery();

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
      .map((a) => ({
        name: a.agentName ?? "Desconhecido",
        conversas: Number(a.count),
      }))
      .sort((a, b) => b.conversas - a.conversas)
      .slice(0, 10);
  }, [analytics]);

  const totalConversations = channelData.reduce((acc, c) => acc + c.value, 0);

  const summaryCards = [
    {
      title: "Total de Conversas",
      value: totalConversations,
      icon: MessageSquare,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      title: "Abertas",
      value: stats?.open ?? 0,
      icon: Inbox,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Resolvidas",
      value: stats?.resolved ?? 0,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      title: "Total de Mensagens",
      value: analytics?.totalMessages ?? 0,
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-2.5 shadow-lg">
          <p className="text-xs font-medium text-foreground mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} className="text-xs text-muted-foreground">
              {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <OmniLayout title="Relatórios & Analytics">
      <div className="p-6 space-y-6">
        {/* Period selector */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Métricas de atendimento</p>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 text-xs w-36 bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.title} className={cn("border", card.border, "bg-card/50")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
                    <p className="text-2xl font-bold text-foreground">{card.value.toLocaleString()}</p>
                  </div>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", card.bg)}>
                    <card.icon className={cn("h-4.5 w-4.5", card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By Channel - Pie */}
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversas por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              {channelData.length === 0 ? (
                <div className="flex h-52 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sem dados no período</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="55%" height={200}>
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        strokeWidth={0}
                        paddingAngle={3}
                      >
                        {channelData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-3 flex-1">
                    {channelData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-muted-foreground flex-1">{d.name}</span>
                        <span className="text-sm font-bold text-foreground">{d.value}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({totalConversations > 0 ? Math.round((d.value / totalConversations) * 100) : 0}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* By Status - Bar */}
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversas por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <div className="flex h-52 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sem dados no período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Conversas" radius={[6, 6, 0, 0]}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent performance */}
        <Card className="border-border bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Desempenho por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            {agentData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Users className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum dado de agente disponível</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={agentData} barSize={32} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="conversas" name="Conversas" fill="var(--primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Agents table */}
        {agents && agents.length > 0 && (
          <Card className="border-border bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Equipe de Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                <div className="grid grid-cols-4 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <div>Agente</div>
                  <div>Função</div>
                  <div>Status</div>
                  <div>Conversas atribuídas</div>
                </div>
                {agents.map((agent) => {
                  const agentConvs = agentData.find((a) => a.name === agent.name)?.conversas ?? 0;
                  return (
                    <div key={agent.id} className="grid grid-cols-4 gap-3 px-4 py-3 items-center hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                          {(agent.name ?? "A").charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-foreground">{agent.name}</p>
                      </div>
                      <div>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border",
                          agent.role === "admin"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary text-muted-foreground border-border"
                        )}>
                          {agent.role === "admin" ? "Admin" : "Agente"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("h-1.5 w-1.5 rounded-full", agent.isAvailable ? "bg-green-400" : "bg-muted-foreground/40")} />
                          <span className="text-xs text-muted-foreground">
                            {agent.isAvailable ? "Disponível" : "Ocupado"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden max-w-24">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${agentData.length > 0 ? Math.round((agentConvs / Math.max(...agentData.map((a) => a.conversas))) * 100) : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground">{agentConvs}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OmniLayout>
  );
}
