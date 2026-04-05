import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Hash,
  FileText,
  Activity,
  CheckCircle2,
  Clock,
  BookOpen,
  Gavel,
  ScrollText,
  Newspaper,
  Handshake,
  ClipboardList,
} from "lucide-react";

const docTypeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  oficio: { label: "Ofício", color: "#3b82f6", icon: <FileText className="w-4 h-4" /> },
  memorando: { label: "Memorando", color: "#8b5cf6", icon: <BookOpen className="w-4 h-4" /> },
  decreto: { label: "Decreto", color: "#ef4444", icon: <Gavel className="w-4 h-4" /> },
  lei: { label: "Lei", color: "#f59e0b", icon: <ScrollText className="w-4 h-4" /> },
  diario_oficial: { label: "Diário Oficial", color: "#10b981", icon: <Newspaper className="w-4 h-4" /> },
  contrato: { label: "Contrato", color: "#6366f1", icon: <Handshake className="w-4 h-4" /> },
  portaria: { label: "Portaria", color: "#f97316", icon: <ClipboardList className="w-4 h-4" /> },
};

export default function ControleDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: loadingStats } = trpc.controle.dashboard.stats.useQuery();
  const { data: recentUsages, isLoading: loadingRecent } = trpc.controle.historico.list.useQuery({ limit: 10 });
  const { data: myPerms } = trpc.controle.permissoes.getMyPermissions.useQuery();

  const chartData = (stats?.usagesByType ?? [])
    .filter((u) => u.documentType && Number(u.count) > 0)
    .map((u) => ({
      name: docTypeConfig[u.documentType!]?.label ?? u.documentType,
      total: Number(u.count),
      color: docTypeConfig[u.documentType!]?.color ?? "#94a3b8",
    }));

  const accessibleTypes = Object.entries(docTypeConfig).filter(([key]) => {
    if (isAdmin) return true;
    const permMap: Record<string, string> = {
      oficio: "canAccessOficios",
      memorando: "canAccessMemorandos",
      decreto: "canAccessDecretos",
      lei: "canAccessLeis",
      diario_oficial: "canAccessDiarioOficial",
      contrato: "canAccessContratos",
      portaria: "canAccessPortarias",
    };
    return (myPerms as Record<string, boolean> | undefined)?.[permMap[key]];
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard — Controle</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do controle de numeração de documentos</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <Card className="border border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalControls ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total de Controles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.activeControls ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Controles Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalUsages ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Números Emitidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.usagesToday ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Emitidos Hoje</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        {isAdmin && (
          <Card className="lg:col-span-2 border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Emissões por Tipo Documental</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-48 w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum dado de uso disponível
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tipos acessíveis */}
        <Card className={`border border-border shadow-sm ${!isAdmin ? "lg:col-span-3" : ""}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Tipos Documentais Disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {accessibleTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum módulo disponível. Solicite permissões ao administrador.
              </p>
            ) : (
              accessibleTypes.map(([key, config]) => (
                <div
                  key={key}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: config.color + "20", color: config.color }}
                  >
                    {config.icon}
                  </div>
                  <span className="text-sm font-medium text-foreground">{config.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">Ativo</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atividade recente */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : !recentUsages || recentUsages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum número utilizado ainda</p>
          ) : (
            <div className="space-y-2">
              {recentUsages.map((usage) => {
                const config = docTypeConfig[usage.documentType ?? ""];
                return (
                  <div key={usage.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                      style={{ background: config?.color ?? "#94a3b8" }}
                    >
                      {config?.icon ?? <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{usage.formattedNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{usage.documentDescription}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">{usage.userName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {usage.usedAt ? new Date(usage.usedAt).toLocaleDateString("pt-BR") : "—"}
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
  );
}
