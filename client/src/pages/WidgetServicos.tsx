/**
 * WidgetServicos — Página pública embeddável via <iframe>
 * Rota: /widget/servicos
 *
 * Exibe o catálogo de serviços da Central do Cidadão de forma limpa,
 * sem header/sidebar do CAIUS, pronta para ser inserida em portais externos.
 *
 * Código de incorporação:
 * <iframe src="https://SEU_DOMINIO/widget/servicos"
 *   width="100%" height="600" frameborder="0"
 *   style="border-radius:12px;border:1px solid #e5e7eb">
 * </iframe>
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useOrgConfig } from "@/hooks/useOrgConfig";
import { cn } from "@/lib/utils";
import {
  Search,
  Clock,
  ExternalLink,
  ChevronRight,
  FileText,
  Tag,
  ArrowLeft,
  CheckCircle,
  Info,
  DollarSign,
  Users,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

// ─── Ícones por categoria ─────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Habitação": "bg-blue-500",
  "Saúde": "bg-green-500",
  "Educação": "bg-yellow-500",
  "Transporte": "bg-orange-500",
  "Meio Ambiente": "bg-emerald-500",
  "Assistência Social": "bg-purple-500",
  "Tributação": "bg-red-500",
  "Urbanismo": "bg-cyan-500",
  "Segurança": "bg-slate-500",
  "Cultura": "bg-pink-500",
  "Esporte": "bg-lime-500",
  "Infraestrutura": "bg-amber-500",
};

function getCategoryColor(category?: string | null): string {
  if (!category) return "bg-indigo-500";
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return color;
  }
  // Hash-based fallback for unknown categories
  const colors = ["bg-indigo-500", "bg-violet-500", "bg-teal-500", "bg-rose-500", "bg-sky-500"];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) & 0xffff;
  return colors[hash % colors.length];
}

function formatSla(hours?: number | null): string {
  if (!hours) return "";
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days} dia${days > 1 ? "s" : ""}`;
}

// ─── Detalhe do serviço (inline) ─────────────────────────────────────────────
function ServiceDetail({ service, onBack, orgName }: { service: any; onBack: () => void; orgName: string }) {
  const isExternal = service.serviceMode === "external" && service.externalUrl;
  const slaText = formatSla(service.slaConclusionHours ?? service.slaResponseHours);
  const catColor = getCategoryColor(service.category);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Voltar
        </button>
        {service.category && (
          <span className={cn("text-xs font-medium text-white px-2 py-0.5 rounded-full", catColor)}>
            {service.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-snug">{service.name}</h2>
          {service.code && (
            <span className="text-xs text-gray-400 font-mono">Código: {service.code}</span>
          )}
        </div>

        {service.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{service.description}</p>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-1 gap-3">
          {service.purpose && (
            <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-0.5">Finalidade</p>
                <p className="text-xs text-blue-600">{service.purpose}</p>
              </div>
            </div>
          )}

          {service.whoCanRequest && (
            <div className="flex gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <Users className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-700 mb-0.5">Quem pode solicitar</p>
                <p className="text-xs text-green-600">{service.whoCanRequest}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {service.cost !== undefined && service.cost !== null && (
              <div className="flex gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-0.5">Custo</p>
                  <p className="text-xs text-gray-500">{service.cost || "Gratuito"}</p>
                </div>
              </div>
            )}
            {slaText && (
              <div className="flex gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-0.5">Prazo</p>
                  <p className="text-xs text-gray-500">{slaText}</p>
                </div>
              </div>
            )}
            {service.formOfService && (
              <div className="flex gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-0.5">Forma</p>
                  <p className="text-xs text-gray-500">{service.formOfService}</p>
                </div>
              </div>
            )}
            {service.responseChannel && (
              <div className="flex gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-0.5">Canal</p>
                  <p className="text-xs text-gray-500">{service.responseChannel}</p>
                </div>
              </div>
            )}
          </div>

          {service.importantNotes && (
            <div className="flex gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Informações importantes</p>
                <p className="text-xs text-amber-600">{service.importantNotes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {service.requiresApproval && (
            <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5">
              <CheckCircle className="h-3 w-3" />Requer aprovação
            </span>
          )}
          {service.secrecyLevel && service.secrecyLevel !== "public" && (
            <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
              <AlertCircle className="h-3 w-3" />Sigiloso
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        {isExternal ? (
          <a
            href={service.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Acessar serviço externo
          </a>
        ) : (
          <a
            href={`/servico/${service.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            Solicitar este serviço
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Card de serviço ──────────────────────────────────────────────────────────
function ServiceCard({ service, onClick }: { service: any; onClick: () => void }) {
  const catColor = getCategoryColor(service.category);
  const slaText = formatSla(service.slaConclusionHours ?? service.slaResponseHours);
  const isExternal = service.serviceMode === "external" && service.externalUrl;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3.5 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center", catColor)}>
          <FileText className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
            {service.name}
          </p>
          {service.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
              {service.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {service.category && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Tag className="h-2.5 w-2.5" />{service.category}
              </span>
            )}
            {slaText && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />{slaText}
              </span>
            )}
            {isExternal && (
              <span className="text-[10px] text-indigo-400 flex items-center gap-0.5">
                <ExternalLink className="h-2.5 w-2.5" />Link externo
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function WidgetServicos() {
  const org = useOrgConfig();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);

  const { data: services = [], isLoading } = trpc.cidadao.listServices.useQuery(
    { search: search || undefined, category: selectedCategory || undefined },
    { staleTime: 2 * 60 * 1000 }
  );

  const categories = useMemo(
    () => Array.from(new Set((services as any[]).filter((s) => s.category).map((s: any) => s.category as string))).sort(),
    [services]
  );

  if (selectedService) {
    return (
      <div className="h-full bg-gray-50 font-sans" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <ServiceDetail service={selectedService} onBack={() => setSelectedService(null)} orgName={org.orgName} />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-gray-50"
      style={{ minHeight: "100%", fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Header institucional */}
      <div className="bg-indigo-700 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {org.logoUrl && (
            <img src={org.logoUrl} alt={org.orgName} className="h-7 w-auto object-contain brightness-0 invert opacity-90" />
          )}
          <div>
            <p className="text-white font-bold text-sm leading-tight">{org.orgName}</p>
            <p className="text-indigo-200 text-xs">Catálogo de Serviços</p>
          </div>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="px-3 py-3 bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar serviço..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Filtros de categoria */}
        {categories.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-all",
                !selectedCategory
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              )}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={cn(
                  "flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-all",
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de serviços */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (services as any[]).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhum serviço encontrado</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-2 text-xs text-indigo-600 hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(services as any[]).map((svc: any) => (
              <ServiceCard key={svc.id} service={svc} onClick={() => setSelectedService(svc)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-white border-t border-gray-100 text-center">
        <p className="text-[10px] text-gray-400">
          {(services as any[]).length > 0 && `${(services as any[]).length} serviço${(services as any[]).length > 1 ? "s" : ""} disponível${(services as any[]).length > 1 ? "s" : ""} · `}
          <a
            href="/central-cidadao"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            Acessar Central do Cidadão
          </a>
        </p>
      </div>
    </div>
  );
}
