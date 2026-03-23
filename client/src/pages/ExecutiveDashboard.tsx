/**
 * ExecutiveDashboard — Painel Executivo com KPIs, gráficos e análises
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { cn } from "@/lib/utils";
import {
  BarChart2, TrendingUp, TrendingDown, Clock, CheckCircle2,
  AlertCircle, Users, FileText, MessageSquare, Activity,
  ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Download,
  Building2, Star, Zap, Target,
} from "lucide-react";

function KpiCard({ label, value, sub, trend, trendValue, color, icon: Icon }: {
  label: string; value: string | number; sub?: string;
  trend?: "up" | "down" | "flat"; trendValue?: string;
  color: string; icon: typeof BarChart2;
}) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-gray-400";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && trendValue && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />{trendValue}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SimpleBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 truncate max-w-[70%]">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState(30);

  const { data: overview, isLoading: loadingOverview, refetch } = trpc.publicServices.dashboard.kpis.useQuery();
  const { data: byChannel = [] } = trpc.publicServices.dashboard.byChannel.useQuery();
  const { data: bySector = [] } = trpc.publicServices.dashboard.bySector.useQuery();
  const { data: timeSeries = [] } = trpc.publicServices.dashboard.timeSeries.useQuery({ days: period });

  const ov = overview as any;

  const channelLabels: Record<string, string> = {
    whatsapp: "WhatsApp", instagram: "Instagram", email: "E-mail",
    web: "Web", phone: "Telefone", in_person: "Presencial",
  };
  const channelColors: Record<string, string> = {
    whatsapp: "bg-green-500", instagram: "bg-pink-500", email: "bg-blue-500",
    web: "bg-indigo-500", phone: "bg-orange-500", in_person: "bg-purple-500",
  };

  const maxChannel = Math.max(...(byChannel as any[]).map((c: any) => Number(c.total) || 0), 1);
  const maxSector = Math.max(...(bySector as any[]).map((s: any) => Number(s.total) || 0), 1);

  return (
    <OmniLayout title="Dashboard Executivo">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Executivo</h1>
            <p className="text-gray-500 text-sm mt-0.5">Visão consolidada de atendimentos, protocolos e desempenho</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setPeriod(d)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", period === d ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50")}>
                  {d}d
                </button>
              ))}
            </div>
            <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        {loadingOverview ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
                <div className="h-7 bg-gray-100 rounded w-16 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : ov && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Total de Protocolos" value={ov.totalProtocols ?? 0} icon={FileText} color="bg-blue-50 text-blue-600" />
            <KpiCard label="Protocolos Abertos" value={ov.openProtocols ?? 0} icon={CheckCircle2} color="bg-green-50 text-green-600" trend="up" trendValue={`${period}d`} />
            <KpiCard label="Total de Conversas" value={ov.totalConversations ?? 0} icon={Activity} color="bg-indigo-50 text-indigo-600" />
            <KpiCard label="Conversas Abertas" value={ov.openConversations ?? 0} icon={AlertCircle} color="bg-red-50 text-red-600" />
            <KpiCard label="Manifestações" value={ov.totalManifestations ?? 0} icon={MessageSquare} color="bg-purple-50 text-purple-600" />
            <KpiCard label="Manifestações Pendentes" value={ov.pendingManifestations ?? 0} icon={Users} color="bg-cyan-50 text-cyan-600" />
            <KpiCard label="Atendimentos" value={(ov.totalConversations ?? 0)} sub="Total de conversas" icon={Clock} color="bg-amber-50 text-amber-600" />
            <KpiCard label="Protocolos + Conversas" value={(ov.totalProtocols ?? 0) + (ov.totalConversations ?? 0)} icon={Star} color="bg-rose-50 text-rose-600" />
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* By Channel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />Atendimentos por Canal
            </h3>
            {(byChannel as any[]).length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Sem dados para o período</div>
            ) : (
              <div className="space-y-3">
                {(byChannel as any[]).map((c: any) => (
                  <SimpleBar
                    key={c.channel}
                    label={channelLabels[c.channel as string] ?? c.channel}
                    value={Number(c.total) || 0}
                    max={maxChannel}
                    color={channelColors[c.channel as string] ?? "bg-gray-400"}
                  />
                ))}
              </div>
            )}
          </div>

          {/* By Sector */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />Protocolos por Setor
            </h3>
            {(bySector as any[]).length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Sem dados para o período</div>
            ) : (
              <div className="space-y-3">
                {(bySector as any[]).slice(0, 8).map((s: any, i: number) => (
                  <SimpleBar
                    key={i}
                    label={s.sectorName ?? `Setor ${s.sectorId ?? "—"}`}
                    value={Number(s.total) || 0}
                    max={maxSector}
                    color="bg-blue-500"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Time series */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />Evolução Diária de Protocolos ({period} dias)
          </h3>
          {(timeSeries as any[]).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sem dados para o período selecionado</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-1 h-32 min-w-[400px]">
                {(timeSeries as any[]).map((d: any, i: number) => {
                  const maxVal = Math.max(...(timeSeries as any[]).map((x: any) => Number(x.total) || 0), 1);
                  const h = Math.max(4, Math.round(((Number(d.total) || 0) / maxVal) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{d.total}</span>
                      <div
                        className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-colors cursor-default"
                        style={{ height: `${h}%` }}
                        title={`${d.date}: ${d.total}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                <span>{(timeSeries as any[])[0]?.date}</span>
                <span>{(timeSeries as any[])[(timeSeries as any[]).length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </OmniLayout>
  );
}
