/**
 * WidgetServicos — Página pública embeddável via <iframe>
 * Rota: /widget/servicos
 *
 * Exibe o catálogo de serviços da Central do Cidadão em grade de blocos,
 * 16 por página, com paginação, busca e filtro por categoria.
 *
 * Código de incorporação:
 * <iframe src="https://SEU_DOMINIO/widget/servicos"
 *   width="100%" height="700" frameborder="0"
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
  ChevronLeft,
} from "lucide-react";

const PAGE_SIZE = 16;

// ─── Cor por categoria ────────────────────────────────────────────────────────
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
function ServiceDetail({ service, onBack }: { service: any; onBack: () => void }) {
  const isExternal = service.serviceMode === "external" && service.externalUrl;
  const slaText = formatSla(service.slaConclusionHours ?? service.slaResponseHours);
  const catColor = getCategoryColor(service.category);

  return (
    <div className="flex flex-col h-full">
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

// ─── Bloco de serviço ─────────────────────────────────────────────────────────
function ServiceBlock({ service, onClick }: { service: any; onClick: () => void }) {
  const catColor = getCategoryColor(service.category);
  const slaText = formatSla(service.slaConclusionHours ?? service.slaResponseHours);
  const isExternal = service.serviceMode === "external" && service.externalUrl;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center text-center p-4 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all w-full h-full"
    >
      {/* Ícone */}
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3 flex-shrink-0 shadow-sm", catColor)}>
        <FileText className="h-5 w-5 text-white" />
      </div>

      {/* Nome */}
      <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors mb-1">
        {service.name}
      </p>

      {/* Categoria */}
      {service.category && (
        <span className="text-[10px] text-gray-400 flex items-center gap-0.5 mb-1">
          <Tag className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="truncate max-w-[90px]">{service.category}</span>
        </span>
      )}

      {/* Prazo / externo */}
      <div className="flex items-center justify-center gap-2 mt-auto pt-2">
        {slaText && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />{slaText}
          </span>
        )}
        {isExternal && (
          <span className="text-[10px] text-indigo-400 flex items-center gap-0.5">
            <ExternalLink className="h-2.5 w-2.5" />Externo
          </span>
        )}
      </div>

      {/* Seta */}
      <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-400 mt-1.5 transition-colors" />
    </button>
  );
}

// ─── Paginação ────────────────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Gera janela de páginas ao redor da atual
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 py-3">
      <button
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p as number)}
            className={cn(
              "min-w-[30px] h-[30px] rounded-lg text-xs font-medium border transition-all",
              page === p
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function WidgetServicos() {
  const org = useOrgConfig();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [page, setPage] = useState(1);

  const { data: allServices = [], isLoading } = trpc.cidadao.listServices.useQuery(
    { search: search || undefined, category: selectedCategory || undefined },
    { staleTime: 2 * 60 * 1000 }
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set((allServices as any[]).filter((s) => s.category).map((s: any) => s.category as string))
      ).sort(),
    [allServices]
  );

  const totalPages = Math.max(1, Math.ceil((allServices as any[]).length / PAGE_SIZE));

  const pageServices = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return (allServices as any[]).slice(start, start + PAGE_SIZE);
  }, [allServices, page]);

  // Reset page when filters change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleCategory = (cat: string | null) => { setSelectedCategory(cat); setPage(1); };

  if (selectedService) {
    return (
      <div className="h-full bg-gray-50" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <ServiceDetail service={selectedService} onBack={() => setSelectedService(null)} />
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
            <img
              src={org.logoUrl}
              alt={org.orgName}
              className="h-7 w-auto object-contain brightness-0 invert opacity-90"
            />
          )}
          <div>
            <p className="text-white font-bold text-sm leading-tight">{org.orgName}</p>
            <p className="text-indigo-200 text-xs">Catálogo de Serviços</p>
          </div>
        </div>
      </div>

      {/* Barra de busca + filtros */}
      <div className="px-3 py-3 bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar serviço..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              onClick={() => handleCategory(null)}
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
                onClick={() => handleCategory(selectedCategory === cat ? null : cat)}
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

      {/* Grade de blocos */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-1">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-36 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : pageServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhum serviço encontrado</p>
            {search && (
              <button
                onClick={() => handleSearch("")}
                className="mt-2 text-xs text-indigo-600 hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {pageServices.map((svc: any) => (
              <ServiceBlock key={svc.id} service={svc} onClick={() => setSelectedService(svc)} />
            ))}
          </div>
        )}
      </div>

      {/* Paginação */}
      <div className="bg-white border-t border-gray-100 px-3">
        <Pagination page={page} totalPages={totalPages} onPage={(p) => { setPage(p); window.scrollTo(0, 0); }} />
        <p className="text-center text-[10px] text-gray-400 pb-2">
          {(allServices as any[]).length > 0 && (
            <>
              {Math.min((page - 1) * PAGE_SIZE + 1, (allServices as any[]).length)}–
              {Math.min(page * PAGE_SIZE, (allServices as any[]).length)} de {(allServices as any[]).length} serviço{(allServices as any[]).length !== 1 ? "s" : ""}
              {" · "}
            </>
          )}
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
