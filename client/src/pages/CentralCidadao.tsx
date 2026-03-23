/**
 * Central de Serviços ao Cidadão — CAIUS
 * Página pública com tema sempre claro, menu de navegação completo,
 * catálogo de serviços, perfis do cidadão, órgãos e rodapé institucional.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useOrgConfig } from "@/hooks/useOrgConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Search, Clock, Shield, Camera, MapPin, CheckCircle2, FileText,
  FormInput, ChevronRight, Building2, Phone, Mail, Globe, ArrowLeft,
  FileCheck, CircleDot, Circle, Info, ExternalLink, Scale, Menu, X,
  Baby, GraduationCap, Briefcase, Heart, Home, Car, Leaf, HelpCircle,
  ChevronDown, MessageSquare, ClipboardList, GitBranch, Star, Users,
} from "lucide-react";

// ─── Config ──────────────────────────────────────────────────────────────────
const secrecyLabels: Record<string, { label: string; color: string }> = {
  public: { label: "Público", color: "bg-green-100 text-green-700 border-green-200" },
  restricted: { label: "Restrito", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  confidential: { label: "Confidencial", color: "bg-orange-100 text-orange-700 border-orange-200" },
  secret: { label: "Sigiloso", color: "bg-red-100 text-red-700 border-red-200" },
};

const REQUIREMENT_CONFIG = {
  required: { label: "Obrigatório", color: "text-red-600 bg-red-50 border-red-200", Icon: CheckCircle2 },
  complementary: { label: "Complementar", color: "text-amber-600 bg-amber-50 border-amber-200", Icon: CircleDot },
  optional: { label: "Opcional", color: "text-gray-500 bg-gray-50 border-gray-200", Icon: Circle },
};

const CITIZEN_PROFILES = [
  { icon: Baby, label: "Criança e Adolescente", desc: "Serviços para menores de 18 anos", color: "bg-pink-50 text-pink-600 border-pink-200" },
  { icon: GraduationCap, label: "Estudante", desc: "Bolsas, matrículas e educação", color: "bg-blue-50 text-blue-600 border-blue-200" },
  { icon: Briefcase, label: "Trabalhador", desc: "Emprego, renda e previdência", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  { icon: Heart, label: "Idoso", desc: "Saúde, benefícios e assistência", color: "bg-rose-50 text-rose-600 border-rose-200" },
  { icon: Home, label: "Morador", desc: "Habitação, IPTU e urbanismo", color: "bg-amber-50 text-amber-600 border-amber-200" },
  { icon: Car, label: "Motorista", desc: "Trânsito, licenças e multas", color: "bg-orange-50 text-orange-600 border-orange-200" },
  { icon: Leaf, label: "Empreendedor", desc: "Alvarás, licenças e CNPJ", color: "bg-green-50 text-green-600 border-green-200" },
  { icon: Users, label: "Servidor Público", desc: "RH, contracheque e férias", color: "bg-violet-50 text-violet-600 border-violet-200" },
];

const QUICK_LINKS = [
  { icon: ClipboardList, label: "Consultar Protocolo", href: "/consulta", desc: "Acompanhe sua solicitação pelo NUP" },
  { icon: GitBranch, label: "Estrutura Administrativa", href: "/estrutura-administrativa", desc: "Conheça os órgãos e secretarias" },
  { icon: MessageSquare, label: "Ouvidoria", href: "/", desc: "Reclamações, sugestões e elogios" },
  { icon: HelpCircle, label: "Ajuda ao Cidadão", href: "/", desc: "Dúvidas frequentes e tutoriais" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function ReqBadge({ r }: { r: string }) {
  const cfg = REQUIREMENT_CONFIG[r as keyof typeof REQUIREMENT_CONFIG] ?? REQUIREMENT_CONFIG.optional;
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CentralCidadao() {
  const orgConfig = useOrgConfig();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"services" | "profiles" | "organs" | "help" | "ouvidoria" | "acompanhar" | "verificar">("services");
  const [verifyKey, setVerifyKey] = useState("");
  const [activeVerifyKey, setActiveVerifyKey] = useState<string | null>(null);
  const { data: verifyResult, isLoading: verifyLoading } = trpc.verification.verify.useQuery(
    { key: activeVerifyKey! },
    { enabled: !!activeVerifyKey, retry: false }
  );
  const [ouvidoriaStep, setOuvidoriaStep] = useState<"form" | "success">("form");
  const [ouvidoriaNup, setOuvidoriaNup] = useState("");
  const [trackNup, setTrackNup] = useState("");
  const [ouvidoriaForm, setOuvidoriaForm] = useState({ type: "complaint" as "complaint" | "denounce" | "praise" | "suggestion" | "request" | "esic", subject: "", description: "", isAnonymous: false, requesterName: "", requesterEmail: "", isConfidential: false });
  const createManifestation = trpc.publicServices.ouvidoria.create.useMutation();
  const { data: trackData, refetch: refetchTrack } = trpc.publicServices.ouvidoria.publicTrack.useQuery({ nup: trackNup }, { enabled: false });

  const { data: services = [], isLoading } = trpc.cidadao.listServices.useQuery({
    search: search || undefined,
    category: selectedCategory || undefined,
  });
  const { data: detail } = trpc.cidadao.getService.useQuery(
    { id: selectedService?.id ?? 0 },
    { enabled: !!selectedService?.id }
  );
  const { data: orgTree } = trpc.orgUnits.treePublic.useQuery();
  const { data: configs = [] } = trpc.institutionalConfig.get.useQuery();
  const cfg = (configs as any[]).reduce((acc: Record<string, string>, c: any) => {
    acc[c.key] = c.value ?? "";
    return acc;
  }, {} as Record<string, string>);
  const contactPhone = cfg.contact_phone || "0800-000-0000";
  const contactEmail = cfg.contact_email || "atendimento@municipio.gov.br";
  const contactAddress = cfg.contact_address || "Praça da Prefeitura, s/n";
  const contactHoursPhone = cfg.contact_hours_phone || "Seg–Sex, 8h–18h";
  const contactHoursPresential = cfg.contact_hours_presential || "Seg–Sex, 8h–17h";
  const contactWebsite = cfg.contact_website || cfg.org_website || "/";
  const footerName = cfg.contact_footer_name || cfg.org_name || "Prefeitura Municipal";
  const copyrightYear = cfg.contact_copyright_year || new Date().getFullYear().toString();

  const categories = Array.from(
    new Set((services as any[]).filter((s) => s.category).map((s: any) => s.category))
  );

  const topOrgs = ((orgTree as any[]) ?? []).filter((n) => !n.parentId).slice(0, 6);

  return (
    // ── Forçar sempre tema claro ──
    <div className="light min-h-screen flex flex-col" style={{
      background: "#f8fafc",
      color: "#0f172a",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>

      {/* ═══════════════════════════════════════════════════════════════════════
          BARRA SUPERIOR INSTITUCIONAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-blue-800 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <span className="hidden sm:block opacity-80">{footerName} — Serviços Públicos Digitais</span>
          <div className="flex items-center gap-4 ml-auto">
            <a href={`tel:${contactPhone}`} className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
              <Phone className="w-3 h-3" />{contactPhone}
            </a>
            <a href={`mailto:${contactEmail}`} className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
              <Mail className="w-3 h-3" />{contactEmail}
            </a>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          HEADER PRINCIPAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          {/* Logo + ações */}
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              {orgConfig.logoUrl ? (
                <img
                  src={orgConfig.logoUrl}
                  alt={orgConfig.orgName}
                  className="w-10 h-10 rounded-xl object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center shadow-md shadow-blue-700/30">
                  <Scale className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">Central de Serviços ao Cidadão</h1>
                <p className="text-[11px] text-gray-500 leading-tight">{orgConfig.orgName || "Município de Itabaiana"}</p>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { key: "services", label: "Serviços" },
                { key: "profiles", label: "Perfis" },
                { key: "organs", label: "Órgãos" },
                { key: "ouvidoria", label: "Ouvidoria" },
                { key: "acompanhar", label: "Acompanhar" },
                { key: "verificar", label: "Verificar Documento" },
                { key: "help", label: "Ajuda" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    activeTab === tab.key
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              <a href="/consulta">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-gray-200 text-gray-700 hover:bg-gray-50">
                  <ClipboardList className="w-3.5 h-3.5" />Consultar Protocolo
                </Button>
              </a>
              <a href="/">
                <Button size="sm" className="gap-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white">
                  <ExternalLink className="w-3.5 h-3.5" />Área Restrita
                </Button>
              </a>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
              {[
                { key: "services", label: "Serviços" },
                { key: "profiles", label: "Perfis" },
                { key: "organs", label: "Órgãos" },
                { key: "ouvidoria", label: "Ouvidoria" },
                { key: "acompanhar", label: "Acompanhar" },
                { key: "verificar", label: "Verificar Documento" },
                { key: "help", label: "Ajuda" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key as any); setMobileMenuOpen(false); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  {tab.label}
                </button>
              ))}
              <div className="pt-2 flex gap-2">
                <a href="/consulta" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">Consultar Protocolo</Button>
                </a>
                <a href="/" className="flex-1">
                  <Button size="sm" className="w-full text-xs bg-blue-700 text-white">Área Restrita</Button>
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          CONTEÚDO PRINCIPAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1">

        {/* ── ABA: SERVIÇOS ── */}
        {activeTab === "services" && (
          <>
            {/* Hero */}
            <section className="bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-700 text-white py-14 px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-1.5 text-xs text-blue-100 mb-5">
                  <Star className="w-3.5 h-3.5" />
                  Plataforma Oficial de Serviços Públicos
                </div>
                <h2 className="text-4xl font-bold mb-3 leading-tight">Como podemos te ajudar?</h2>
                <p className="text-blue-100 mb-8 text-lg">
                  Encontre o serviço que você precisa e veja os documentos e informações necessários
                </p>
                <div className="relative max-w-xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    className="w-full pl-12 pr-4 h-13 py-3.5 text-base rounded-xl bg-white border border-transparent text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-lg"
                    placeholder="Buscar serviço... (ex: certidão, alvará, licença)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Quick links */}
            <section className="bg-white border-b border-gray-100 py-4 px-4">
              <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
                {QUICK_LINKS.map(({ icon: Icon, label, href, desc }) => (
                  <a key={label} href={href} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                      <Icon className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-tight">{label}</p>
                      <p className="text-xs text-gray-500 leading-tight truncate">{desc}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            {/* Services catalog */}
            <section className="max-w-7xl mx-auto px-4 py-8">
              {/* Category filters */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                      !selectedCategory
                        ? "bg-blue-700 text-white border-blue-700"
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-700"
                    )}
                  >
                    Todos os serviços
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                        selectedCategory === cat
                          ? "bg-blue-700 text-white border-blue-700"
                          : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-700"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : (services as any[]).length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-gray-700">Nenhum serviço encontrado</p>
                  <p className="text-sm mt-1">Tente buscar com outros termos ou remova os filtros</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    {(services as any[]).length} serviço{(services as any[]).length !== 1 ? "s" : ""} disponível{(services as any[]).length !== 1 ? "is" : ""}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(services as any[]).map((svc) => {
                      const secrecy = secrecyLabels[svc.secrecyLevel] ?? secrecyLabels.public;
                      return (
                        <button
                          key={svc.id}
                          onClick={() => setSelectedService(svc)}
                          className="text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/8 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors leading-tight">
                              {svc.name}
                            </h3>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
                          </div>
                          {svc.category && (
                            <span className="inline-block text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 mb-2">
                              {svc.category}
                            </span>
                          )}
                          {svc.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{svc.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-auto">
                            {svc.slaResponseHours && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />Resposta em {svc.slaResponseHours}h
                              </span>
                            )}
                            {svc.requiresSelfie && (
                              <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                                <Camera className="w-3 h-3" />Selfie
                              </span>
                            )}
                            {svc.requiresGeolocation && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                <MapPin className="w-3 h-3" />Localização
                              </span>
                            )}
                            {svc.requiresApproval && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                <CheckCircle2 className="w-3 h-3" />Aprovação
                              </span>
                            )}
                          </div>
                          {(svc.fieldsCount > 0 || svc.documentsCount > 0) && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                              {svc.fieldsCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <FormInput className="w-3 h-3" />{svc.fieldsCount} campo{svc.fieldsCount !== 1 ? "s" : ""}
                                </span>
                              )}
                              {svc.documentsCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />{svc.documentsCount} doc{svc.documentsCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </>
        )}

        {/* ── ABA: PERFIS ── */}
        {activeTab === "profiles" && (
          <section className="max-w-7xl mx-auto px-4 py-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Serviços por Perfil do Cidadão</h2>
              <p className="text-gray-500">Encontre rapidamente os serviços mais relevantes para o seu perfil</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {CITIZEN_PROFILES.map(({ icon: Icon, label, desc, color }) => (
                <button
                  key={label}
                  onClick={() => { setSearch(label); setActiveTab("services"); }}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 bg-white hover:shadow-lg transition-all group text-center",
                    color.includes("pink") ? "border-pink-100 hover:border-pink-300" :
                    color.includes("blue") ? "border-blue-100 hover:border-blue-300" :
                    color.includes("indigo") ? "border-indigo-100 hover:border-indigo-300" :
                    color.includes("rose") ? "border-rose-100 hover:border-rose-300" :
                    color.includes("amber") ? "border-amber-100 hover:border-amber-300" :
                    color.includes("orange") ? "border-orange-100 hover:border-orange-300" :
                    color.includes("green") ? "border-green-100 hover:border-green-300" :
                    "border-violet-100 hover:border-violet-300"
                  )}
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", color.split(" ").slice(0, 2).join(" "))}>
                    <Icon className={cn("w-7 h-7", color.split(" ")[1])} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <span className="text-xs text-blue-600 group-hover:underline">Ver serviços →</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── ABA: ÓRGÃOS ── */}
        {activeTab === "organs" && (
          <section className="max-w-7xl mx-auto px-4 py-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Órgãos e Secretarias</h2>
              <p className="text-gray-500">Conheça a estrutura administrativa do município</p>
            </div>
            {!orgTree || (orgTree as any[]).length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-gray-600">Estrutura organizacional não cadastrada</p>
                <p className="text-sm mt-1">Acesse a área administrativa para configurar os órgãos e secretarias</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(orgTree as any[]).filter((n) => !n.parentId).map((org) => (
                  <div key={org.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">{org.name}</h3>
                        {org.type && <p className="text-xs text-gray-500 mt-0.5 capitalize">{org.type}</p>}
                      </div>
                    </div>
                    {org.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{org.description}</p>
                    )}
                    {org.children && org.children.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-2">{org.children.length} unidade{org.children.length !== 1 ? "s" : ""} vinculada{org.children.length !== 1 ? "s" : ""}</p>
                        <div className="flex flex-wrap gap-1">
                          {org.children.slice(0, 3).map((child: any) => (
                            <span key={child.id} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-600">{child.name}</span>
                          ))}
                          {org.children.length > 3 && (
                            <span className="text-xs text-blue-600">+{org.children.length - 3} mais</span>
                          )}
                        </div>
                      </div>
                    )}
                    <a href="/estrutura-administrativa" className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      Ver estrutura completa <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── ABA: AJUDA ── */}
        {activeTab === "help" && (
          <section className="max-w-4xl mx-auto px-4 py-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Central de Ajuda ao Cidadão</h2>
              <p className="text-gray-500">Dúvidas frequentes e canais de atendimento</p>
            </div>
            <div className="space-y-3 mb-8">
              {[
                { q: "Como faço para consultar o andamento da minha solicitação?", a: "Acesse a página 'Consultar Protocolo' e informe o NUP (Número Único de Protocolo) gerado no momento da solicitação. Você poderá acompanhar todas as etapas do processo." },
                { q: "Quais documentos são necessários para solicitar um serviço?", a: "Cada serviço possui seus próprios requisitos. Ao clicar no serviço desejado, você verá a lista completa de documentos e informações necessários, com indicação de quais são obrigatórios." },
                { q: "Posso solicitar serviços sem fazer login?", a: "Alguns serviços estão disponíveis para consulta sem login. Para solicitar formalmente um serviço e receber um NUP, é necessário acessar a Área Restrita com seu login institucional ou certificado digital." },
                { q: "Como entro em contato com a ouvidoria?", a: "Você pode registrar reclamações, sugestões e elogios diretamente pela plataforma. Acesse 'Ouvidoria' no menu ou entre em contato pelos canais abaixo." },
                { q: "Qual o prazo para resposta das solicitações?", a: "O prazo varia conforme o tipo de serviço. Cada serviço exibe o SLA (prazo de resposta e conclusão) na sua descrição. Em geral, solicitações são respondidas em até 5 dias úteis." },
              ].map(({ q, a }, i) => (
                <details key={i} className="bg-white rounded-xl border border-gray-200 group">
                  <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                    <span className="font-medium text-gray-900 text-sm">{q}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform shrink-0 ml-3" />
                  </summary>
                  <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{a}</div>
                </details>
              ))}
            </div>

            {/* Contact channels */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />Canais de Atendimento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <a href={`tel:${contactPhone}`} className="bg-white rounded-xl border border-blue-100 p-4 text-center hover:border-blue-300 transition-colors block">
                  <Phone className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900 text-sm">Telefone</p>
                  <p className="text-xs text-gray-500 mt-0.5">{contactPhone}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{contactHoursPhone}</p>
                </a>
                <a href={`mailto:${contactEmail}`} className="bg-white rounded-xl border border-blue-100 p-4 text-center hover:border-blue-300 transition-colors block">
                  <Mail className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900 text-sm">E-mail</p>
                  <p className="text-xs text-gray-500 mt-0.5">{contactEmail}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Resposta em 24h</p>
                </a>
                <div className="bg-white rounded-xl border border-blue-100 p-4 text-center">
                  <MapPin className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900 text-sm">Presencial</p>
                  <p className="text-xs text-gray-500 mt-0.5">{contactAddress}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{contactHoursPresential}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* OUVIDORIA */}
        {activeTab === "ouvidoria" && (
          <section className="max-w-3xl mx-auto px-4 py-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ouvidoria / e-SIC</h2>
              <p className="text-gray-500 text-sm">Registre reclamações, denúncias, elogios, sugestões ou pedidos de informação (e-SIC). Sua manifestação será tratada com sigilo e respondida dentro do prazo legal.</p>
            </div>
            {ouvidoriaStep === "success" ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-900 mb-2">Manifestação Registrada!</h3>
                <p className="text-green-700 mb-4">Seu NUP de acompanhamento é:</p>
                <div className="bg-white rounded-xl border border-green-300 px-6 py-4 inline-block mb-6">
                  <span className="text-2xl font-mono font-bold text-green-800">{ouvidoriaNup}</span>
                </div>
                <p className="text-sm text-green-600 mb-6">Guarde este número para acompanhar o status da sua manifestação na aba "Acompanhar".</p>
                <button onClick={() => { setOuvidoriaStep("form"); setOuvidoriaForm({ type: "complaint", subject: "", description: "", isAnonymous: false, requesterName: "", requesterEmail: "", isConfidential: false }); }} className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">Nova Manifestação</button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Manifestação *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {([
                      { value: "complaint", label: "Reclamação", color: "border-orange-300 bg-orange-50 text-orange-700" },
                      { value: "denounce", label: "Denúncia", color: "border-red-300 bg-red-50 text-red-700" },
                      { value: "praise", label: "Elogio", color: "border-green-300 bg-green-50 text-green-700" },
                      { value: "suggestion", label: "Sugestão", color: "border-blue-300 bg-blue-50 text-blue-700" },
                      { value: "request", label: "Solicitação", color: "border-indigo-300 bg-indigo-50 text-indigo-700" },
                      { value: "esic", label: "e-SIC (LAI)", color: "border-purple-300 bg-purple-50 text-purple-700" },
                    ] as const).map((t) => (
                      <button key={t.value} onClick={() => setOuvidoriaForm(f => ({ ...f, type: t.value }))} className={cn("px-3 py-2 rounded-lg border text-sm font-medium transition-all", ouvidoriaForm.type === t.value ? t.color + " ring-2 ring-offset-1 ring-blue-400" : "border-gray-200 text-gray-600 hover:border-gray-300")}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assunto *</label>
                  <input value={ouvidoriaForm.subject} onChange={e => setOuvidoriaForm(f => ({ ...f, subject: e.target.value }))} placeholder="Descreva brevemente o assunto" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição detalhada *</label>
                  <textarea value={ouvidoriaForm.description} onChange={e => setOuvidoriaForm(f => ({ ...f, description: e.target.value }))} rows={5} placeholder="Descreva com detalhes sua manifestação..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="anon" checked={ouvidoriaForm.isAnonymous} onChange={e => setOuvidoriaForm(f => ({ ...f, isAnonymous: e.target.checked }))} className="rounded" />
                  <label htmlFor="anon" className="text-sm text-gray-700">Manifestação anônima</label>
                </div>
                {!ouvidoriaForm.isAnonymous && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                      <input value={ouvidoriaForm.requesterName} onChange={e => setOuvidoriaForm(f => ({ ...f, requesterName: e.target.value }))} placeholder="Seu nome" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                      <input type="email" value={ouvidoriaForm.requesterEmail} onChange={e => setOuvidoriaForm(f => ({ ...f, requesterEmail: e.target.value }))} placeholder="seu@email.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="conf" checked={ouvidoriaForm.isConfidential} onChange={e => setOuvidoriaForm(f => ({ ...f, isConfidential: e.target.checked }))} className="rounded" />
                  <label htmlFor="conf" className="text-sm text-gray-700">Tratar com sigilo</label>
                </div>
                <button
                  disabled={!ouvidoriaForm.subject || !ouvidoriaForm.description || createManifestation.isPending}
                  onClick={async () => {
                    try {
                      const result = await createManifestation.mutateAsync({
                        type: ouvidoriaForm.type,
                        subject: ouvidoriaForm.subject,
                        description: ouvidoriaForm.description,
                        isAnonymous: ouvidoriaForm.isAnonymous,
                        requesterName: ouvidoriaForm.requesterName || undefined,
                        requesterEmail: ouvidoriaForm.requesterEmail || undefined,
                        isConfidential: ouvidoriaForm.isConfidential,
                      });
                      setOuvidoriaNup(result.nup);
                      setOuvidoriaStep("success");
                    } catch { alert("Erro ao registrar manifestação. Tente novamente."); }
                  }}
                  className="w-full py-3 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createManifestation.isPending ? "Enviando..." : "Registrar Manifestação"}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ACOMPANHAR */}
        {activeTab === "acompanhar" && (
          <section className="max-w-2xl mx-auto px-4 py-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Acompanhar Manifestação</h2>
              <p className="text-gray-500 text-sm">Informe o NUP recebido ao registrar sua manifestação na Ouvidoria.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex gap-3 mb-6">
                <input value={trackNup} onChange={e => setTrackNup(e.target.value.toUpperCase())} placeholder="Ex: OUV-2025-123456" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button disabled={!trackNup} onClick={() => refetchTrack()} className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50">Consultar</button>
              </div>
              {trackData && (
                trackData.found ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-500">NUP</span><span className="font-mono font-bold text-gray-900">{trackData.nup}</span></div>
                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-500">Tipo</span><span className="text-sm text-gray-900 capitalize">{trackData.type}</span></div>
                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-500">Assunto</span><span className="text-sm text-gray-900 text-right max-w-xs">{trackData.subject}</span></div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Status</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", { "bg-blue-100 text-blue-700": trackData.status === "received", "bg-yellow-100 text-yellow-700": trackData.status === "in_analysis" || trackData.status === "in_progress", "bg-green-100 text-green-700": trackData.status === "answered", "bg-gray-100 text-gray-600": trackData.status === "archived" })}>
                        {({ received: "Recebida", in_analysis: "Em Análise", in_progress: "Em Andamento", answered: "Respondida", archived: "Arquivada" } as Record<string, string>)[trackData.status as string] ?? trackData.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-500">Registrada em</span><span className="text-sm text-gray-900">{new Date(trackData.createdAt as string | number | Date).toLocaleDateString("pt-BR")}</span></div>
                    {trackData.response && (
                      <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                        <p className="text-xs font-semibold text-green-700 mb-2">Resposta da Ouvidoria:</p>
                        <p className="text-sm text-green-900">{trackData.response}</p>
                        {trackData.respondedAt && <p className="text-xs text-green-600 mt-2">Respondido em {new Date(trackData.respondedAt as string | number | Date).toLocaleDateString("pt-BR")}</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Info className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nenhuma manifestação encontrada com o NUP informado.</p>
                  </div>
                )
              )}
            </div>
          </section>
            )}
        {/* VERIFICAR DOCUMENTO */}
        {activeTab === "verificar" && (
          <section className="max-w-2xl mx-auto px-4 py-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-700" />
                Verificar Autenticidade de Documento
              </h2>
              <p className="text-gray-500 text-sm">Digite a chave de verificação impressa no documento ou escaneie o QR Code.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div className="flex gap-3">
                <input
                  value={verifyKey}
                  onChange={e => setVerifyKey(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && setActiveVerifyKey(verifyKey.trim())}
                  placeholder="Ex: PMI-2026-000001-ABCD1234"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  disabled={!verifyKey || verifyLoading}
                  onClick={() => setActiveVerifyKey(verifyKey.trim())}
                  className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {verifyLoading ? "Verificando..." : "Verificar"}
                </button>
              </div>
              {verifyLoading && (
                <div className="text-center py-6">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Verificando autenticidade...</p>
                </div>
              )}
              {!verifyLoading && activeVerifyKey && verifyResult && (
                <div className={cn(
                  "rounded-xl border-2 overflow-hidden",
                  verifyResult.found && verifyResult.document?.status === "authentic" ? "border-green-200" : "border-red-200"
                )}>
                  <div className={cn(
                    "px-5 py-3 flex items-center gap-2 text-white font-bold",
                    verifyResult.found && verifyResult.document?.status === "authentic" ? "bg-green-600" : "bg-red-600"
                  )}>
                    {verifyResult.found && verifyResult.document?.status === "authentic"
                      ? <><CheckCircle2 className="w-5 h-5" /> Documento Autêntico e Válido</>
                      : <><Info className="w-5 h-5" /> {verifyResult.found ? "Documento Inválido ou Cancelado" : "Documento Não Encontrado"}</>
                    }
                  </div>
                  <div className="p-5 space-y-4">
                    {verifyResult.found && verifyResult.document ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {verifyResult.document.nup && (
                            <div><p className="text-xs text-gray-500">NUP</p><p className="font-mono font-bold">{verifyResult.document.nup}</p></div>
                          )}
                          <div><p className="text-xs text-gray-500">Documento</p><p className="font-medium">{verifyResult.document.title}</p></div>
                          {verifyResult.document.documentNumber && (
                            <div><p className="text-xs text-gray-500">Número</p><p className="font-mono">{verifyResult.document.documentNumber}</p></div>
                          )}
                          {verifyResult.document.issuingUnit && (
                            <div><p className="text-xs text-gray-500">Unidade Emissora</p><p>{verifyResult.document.issuingUnit}</p></div>
                          )}
                          {verifyResult.document.issuedAt && (
                            <div><p className="text-xs text-gray-500">Emitido em</p><p>{new Date(verifyResult.document.issuedAt as string | number | Date).toLocaleDateString("pt-BR")}</p></div>
                          )}
                          {verifyResult.document.issuingUserName && (
                            <div><p className="text-xs text-gray-500">Emitido por</p><p>{verifyResult.document.issuingUserName}</p></div>
                          )}
                        </div>
                        {verifyResult.signatures && verifyResult.signatures.length > 0 && (
                          <div className="border-t pt-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Assinaturas Eletrônicas ({verifyResult.signatures.length})</p>
                            <div className="space-y-2">
                              {verifyResult.signatures.map((sig: any) => (
                                <div key={sig.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                  <div>
                                    <p className="text-sm font-medium">{sig.signerName}</p>
                                    {sig.signerRole && <p className="text-xs text-gray-500">{sig.signerRole}</p>}
                                  </div>
                                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", sig.status === "valid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                    {sig.status === "valid" ? "Válida" : "Inválida"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">Nenhum documento encontrado com a chave <code className="font-mono bg-gray-100 px-1 rounded">{activeVerifyKey}</code>.</p>
                        <p className="text-xs text-gray-400 mt-1">Verifique se a chave foi digitada corretamente.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Sobre a verificação</p>
                  <p className="text-xs text-blue-700 mt-0.5">Cada documento emitido pelo sistema recebe uma chave única e um QR Code. Digite a chave ou escaneie o QR Code para confirmar a autenticidade. Em caso de dúvidas, entre em contato com a unidade emissora.</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      {/* ═══════════════════════════════════════════════════════════════════════
          RODÉ INSTITUCIONAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 text-gray-300 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Coluna 1: Identidade */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Scale className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">CAIUS</p>
                  <p className="text-[11px] text-gray-400">Plataforma Pública Omnichannel</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
                Plataforma digital oficial de {footerName} para prestação de serviços públicos ao cidadão.
              </p>
            </div>

            {/* Coluna 2: Serviços */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Serviços</h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li><button onClick={() => setActiveTab("services")} className="hover:text-white transition-colors">Catálogo de Serviços</button></li>
                <li><a href="/consulta" className="hover:text-white transition-colors">Consultar Protocolo</a></li>
                <li><a href="/estrutura-administrativa" className="hover:text-white transition-colors">Estrutura Administrativa</a></li>
                <li><button onClick={() => setActiveTab("help")} className="hover:text-white transition-colors">Ajuda ao Cidadão</button></li>
              </ul>
            </div>

            {/* Coluna 3: Contato */}
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Contato</h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{contactPhone}</li>
                <li className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{contactEmail}</li>
                <li className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{contactAddress}</li>
                {contactWebsite && <li className="flex items-center gap-1.5"><Globe className="w-3 h-3" /><a href={contactWebsite} className="hover:text-white transition-colors">{contactWebsite.replace(/^https?:\/\//, "")}</a></li>}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500">
              © {copyrightYear} {footerName}. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-gray-500">
              <a href="/" className="hover:text-gray-300 transition-colors">Política de Privacidade</a>
              <a href="/" className="hover:text-gray-300 transition-colors">Termos de Uso</a>
              <a href="/" className="hover:text-gray-300 transition-colors">Acessibilidade</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL DE DETALHE DO SERVIÇO
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border-gray-200">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <button
                onClick={() => setSelectedService(null)}
                className="mt-1 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex-1">
                <DialogTitle className="text-xl text-gray-900">{selectedService?.name}</DialogTitle>
                {selectedService?.category && (
                  <span className="inline-block text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 mt-1">
                    {selectedService.category}
                  </span>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {selectedService?.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{selectedService.description}</p>
            )}

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3">
              {selectedService?.slaResponseHours && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Clock className="w-3.5 h-3.5" />Prazo de Resposta
                  </div>
                  <p className="font-semibold text-gray-900">{selectedService.slaResponseHours} horas</p>
                </div>
              )}
              {selectedService?.slaConclusionHours && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Clock className="w-3.5 h-3.5" />Prazo de Conclusão
                  </div>
                  <p className="font-semibold text-gray-900">{selectedService.slaConclusionHours} horas</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Shield className="w-3.5 h-3.5" />Nível de Acesso
                </div>
                <p className="font-semibold text-gray-900">
                  {secrecyLabels[selectedService?.secrecyLevel]?.label ?? "Público"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />Aprovação
                </div>
                <p className="font-semibold text-gray-900">
                  {selectedService?.requiresApproval ? "Necessária" : "Automática"}
                </p>
              </div>
            </div>

            {/* Special requirements */}
            {(selectedService?.requiresSelfie || selectedService?.requiresGeolocation) && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <h4 className="font-semibold text-amber-700 text-sm mb-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />Requisitos Especiais
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedService.requiresSelfie && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-amber-700">
                      <Camera className="w-4 h-4" />Este serviço requer captura de selfie para identificação
                    </span>
                  )}
                  {selectedService.requiresGeolocation && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-amber-700">
                      <MapPin className="w-4 h-4" />Este serviço requer confirmação de localização
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Fields */}
            {detail?.fields && (detail.fields as any[]).length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FormInput className="w-4 h-4 text-blue-600" />
                  Informações Necessárias
                  <span className="text-xs font-normal text-gray-500">
                    ({(detail.fields as any[]).length} campo{(detail.fields as any[]).length !== 1 ? "s" : ""})
                  </span>
                </h4>
                <div className="space-y-2">
                  {(detail.fields as any[]).map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{f.label}</span>
                        {f.helpText && <p className="text-xs text-gray-500 mt-0.5">{f.helpText}</p>}
                      </div>
                      <ReqBadge r={f.requirement} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {detail?.documents && (detail.documents as any[]).length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  Documentos Necessários
                  <span className="text-xs font-normal text-gray-500">
                    ({(detail.documents as any[]).length} documento{(detail.documents as any[]).length !== 1 ? "s" : ""})
                  </span>
                </h4>
                <div className="space-y-2">
                  {(detail.documents as any[]).map((d: any) => (
                    <div key={d.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{d.name}</span>
                          {d.description && <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            Formatos: {d.acceptedFormats} · Máx: {d.maxSizeMb}MB
                          </p>
                        </div>
                      </div>
                      <ReqBadge r={d.requirement} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {selectedService?.serviceMode === "external" && selectedService?.externalUrl ? (
              <div className="p-4 rounded-xl bg-emerald-700 text-white">
                <h4 className="font-semibold mb-1">Serviço Externo</h4>
                <p className="text-sm text-emerald-100 mb-3">
                  Este serviço é prestado em um portal externo. Você será redirecionado ao clicar no botão abaixo.
                </p>
                <a href={selectedService.externalUrl} target="_blank" rel="noopener noreferrer">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors">
                    Acessar Serviço Externo <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-blue-700 text-white">
                <h4 className="font-semibold mb-1">Pronto para solicitar?</h4>
                <p className="text-sm text-blue-100 mb-3">
                  Preencha o formulário online e receba o número de protocolo (NUP) imediatamente.
                </p>
                <a href={`/servico/${selectedService?.id}`}>
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors">
                    Iniciar Solicitação <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
