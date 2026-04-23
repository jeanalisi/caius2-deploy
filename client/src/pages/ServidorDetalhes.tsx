/**
 * ServidorDetalhes — Perfil Público do Servidor
 * Design moderno com capa, avatar, seções de contato, bio e base legal.
 * Sempre renderizado em tema claro (área pública).
 */
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Mail, Phone, MapPin, ExternalLink, UserCircle2,
  Building2, BookOpen, Scale, Briefcase, Share2, Copy, Check,
  Globe, ChevronRight,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

// ─── Mapa de cores por tipo de unidade ────────────────────────────────────────
const UNIT_COLORS: Record<string, { from: string; to: string; badge: string }> = {
  prefeitura:       { from: "from-amber-700",   to: "to-amber-900",   badge: "bg-amber-100 text-amber-800 border-amber-200" },
  gabinete:         { from: "from-violet-700",  to: "to-violet-900",  badge: "bg-violet-100 text-violet-800 border-violet-200" },
  procuradoria:     { from: "from-rose-700",    to: "to-rose-900",    badge: "bg-rose-100 text-rose-800 border-rose-200" },
  controladoria:    { from: "from-orange-700",  to: "to-orange-900",  badge: "bg-orange-100 text-orange-800 border-orange-200" },
  secretaria:       { from: "from-blue-700",    to: "to-blue-900",    badge: "bg-blue-100 text-blue-800 border-blue-200" },
  superintendencia: { from: "from-cyan-700",    to: "to-cyan-900",    badge: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  secretaria_executiva: { from: "from-teal-700", to: "to-teal-900",   badge: "bg-teal-100 text-teal-800 border-teal-200" },
  diretoria:        { from: "from-indigo-700",  to: "to-indigo-900",  badge: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  departamento:     { from: "from-sky-700",     to: "to-sky-900",     badge: "bg-sky-100 text-sky-800 border-sky-200" },
  coordenacao:      { from: "from-emerald-700", to: "to-emerald-900", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  gerencia:         { from: "from-green-700",   to: "to-green-900",   badge: "bg-green-100 text-green-800 border-green-200" },
  assessoria:       { from: "from-pink-700",    to: "to-pink-900",    badge: "bg-pink-100 text-pink-800 border-pink-200" },
  default:          { from: "from-slate-700",   to: "to-slate-900",   badge: "bg-slate-100 text-slate-800 border-slate-200" },
};

const TYPE_LABELS: Record<string, string> = {
  prefeitura: "Prefeitura", gabinete: "Gabinete", procuradoria: "Procuradoria",
  controladoria: "Controladoria", secretaria: "Secretaria", superintendencia: "Superintendência",
  secretaria_executiva: "Sec. Executiva", diretoria: "Diretoria", departamento: "Departamento",
  coordenacao: "Coordenação", gerencia: "Gerência", assessoria: "Assessoria",
  supervisao: "Supervisão", setor: "Setor", nucleo: "Núcleo", unidade: "Unidade",
};

function getUnitColors(type?: string) {
  return UNIT_COLORS[type ?? ""] ?? UNIT_COLORS.default;
}

// ─── Skeleton de carregamento ─────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-40 bg-slate-200 animate-pulse" />
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16 mb-6">
          <div className="w-32 h-32 rounded-2xl bg-slate-300 animate-pulse border-4 border-white shadow-lg shrink-0" />
          <div className="flex-1 pt-2 space-y-2 pb-2">
            <div className="h-6 bg-slate-200 rounded animate-pulse w-56" />
            <div className="h-4 bg-slate-200 rounded animate-pulse w-40" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Cartão de contato ────────────────────────────────────────────────────────
function ContactCard({
  icon: Icon,
  label,
  value,
  href,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
  colorClass: string;
}) {
  const inner = (
    <div className={`flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all group ${href ? "cursor-pointer hover:border-slate-300" : ""}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-800 break-all leading-snug">{value}</p>
      </div>
      {href && <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 mt-1 transition-colors" />}
    </div>
  );

  if (href) {
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return inner;
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ServidorDetalhes() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const [copied, setCopied] = useState(false);

  // Tenta buscar em orgMembers primeiro, depois em publicServants
  const { data: orgMember, isLoading: loadingMember } = trpc.orgMembers.byIdPublic.useQuery(
    { id },
    { enabled: id > 0 }
  );
  const { data: publicServant, isLoading: loadingServant } = trpc.publicServants.byIdPublic.useQuery(
    { id },
    { enabled: id > 0 && !orgMember }
  );

  const servidor = orgMember ?? publicServant ?? null;
  const isLoading = loadingMember || (loadingServant && !orgMember);

  const { data: orgUnit } = trpc.orgUnits.publicById.useQuery(
    { id: servidor?.orgUnitId ?? 0 },
    { enabled: !!servidor?.orgUnitId }
  );

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: nomeFormatado, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copiado!");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) return <ProfileSkeleton />;

  if (!servidor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
            <UserCircle2 className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Servidor não encontrado</h2>
          <p className="text-slate-500 text-sm mb-6">
            Este servidor pode não estar disponível publicamente ou o endereço está incorreto.
          </p>
          <Link href="/estrutura-administrativa">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar à Estrutura Administrativa
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Title Case com suporte a caracteres acentuados do português
  const nomeFormatado = servidor.name
    .toLowerCase()
    .split(" ")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const unitType = (orgUnit as any)?.type ?? "default";
  const colors = getUnitColors(unitType);
  const unitLabel = TYPE_LABELS[unitType] ?? unitType;

  const hasContacts = servidor.email || servidor.phone || (servidor as any).address || servidor.externalLink;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Barra de navegação ──────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
            <Link href="/central-cidadao">
              <span className="hover:text-slate-800 transition-colors cursor-pointer hidden sm:inline">Central do Cidadão</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block shrink-0" />
            <Link href="/estrutura-administrativa">
              <span className="hover:text-slate-800 transition-colors cursor-pointer hidden sm:inline">Estrutura Administrativa</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block shrink-0" />
            <span className="text-slate-800 font-medium truncate">{nomeFormatado}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-slate-500 hover:text-slate-800 h-8"
              onClick={handleShare}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-xs">{copied ? "Copiado!" : "Compartilhar"}</span>
            </Button>
            <Link href="/estrutura-administrativa">
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Capa com gradiente + Avatar integrado ──────────────────────────── */}
      <div className={`bg-gradient-to-br ${colors.from} ${colors.to} relative`} style={{ paddingBottom: "5rem" }}>
        {/* Padrão decorativo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full border-2 border-white" />
          <div className="absolute top-12 right-20 w-20 h-20 rounded-full border border-white" />
          <div className="absolute bottom-8 left-12 w-24 h-24 rounded-full border-2 border-white" />
        </div>
        {/* Brasão / ícone da prefeitura */}
        <div className="absolute bottom-8 right-6 opacity-15 pointer-events-none">
          <Building2 className="w-20 h-20 text-white" />
        </div>
        {/* Espaço da capa */}
        <div className="h-36 sm:h-44" />
        {/* Avatar e nome sobrepostos na parte inferior da capa */}
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl shrink-0 overflow-hidden bg-slate-200">
              {servidor.photoUrl ? (
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${servidor.photoUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center top",
                  }}
                  role="img"
                  aria-label={nomeFormatado}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserCircle2 className="w-16 h-16 text-slate-400" />
                </div>
              )}
            </div>
            {/* Nome, cargo e badges — texto branco sobre a capa */}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-2xl font-bold text-white leading-tight drop-shadow">{nomeFormatado}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {servidor.cargo && (
                  <Badge className="bg-white/20 text-white border-white/30 font-medium text-xs px-2.5 py-1 gap-1 backdrop-blur-sm">
                    <Briefcase className="w-3 h-3" />
                    {servidor.cargo}
                  </Badge>
                )}
                {orgUnit && (
                  <Badge variant="outline" className="font-medium text-xs px-2.5 py-1 gap-1 border border-white/30 text-white bg-white/10">
                    <Building2 className="w-3 h-3" />
                    {unitLabel}
                  </Badge>
                )}
                {servidor.matricula && (
                  <span className="text-xs font-mono text-white/70 bg-white/10 border border-white/20 px-2 py-0.5 rounded-md">
                    Mat. {servidor.matricula}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo principal ──────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="mb-6" />

        {/* ── Grid de conteúdo ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Coluna lateral — unidade e base legal */}
          <div className="lg:col-span-1 space-y-4">

            {/* Unidade organizacional */}
            {orgUnit && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Unidade</p>
                <Link href="/estrutura-administrativa">
                  <div className="flex items-start gap-3 cursor-pointer group">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${colors.from} ${colors.to}`}>
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 leading-snug transition-colors">
                        {(orgUnit as any).name}
                      </p>
                      {(orgUnit as any).acronym && (
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{(orgUnit as any).acronym}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 mt-0.5 transition-colors" />
                  </div>
                </Link>
              </div>
            )}

            {/* Base legal */}
            {servidor.cargoLei && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Scale className="w-3 h-3" />
                  Base Legal
                </p>
                <p className="text-sm text-amber-800 leading-relaxed">{servidor.cargoLei}</p>
              </div>
            )}

            {/* Aviso LAI */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Informações públicas divulgadas em cumprimento à{" "}
                <span className="font-medium">Lei de Acesso à Informação</span>{" "}
                (Lei nº 12.527/2011).
              </p>
            </div>
          </div>

          {/* Coluna principal — bio e contatos */}
          <div className="lg:col-span-2 space-y-4">

            {/* Resumo profissional */}
            {servidor.bio ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-700">Resumo Profissional</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {servidor.bio}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-5 flex flex-col items-center justify-center text-center gap-2 min-h-[100px]">
                <BookOpen className="w-6 h-6 text-slate-200" />
                <p className="text-sm text-slate-400">Resumo profissional não cadastrado.</p>
              </div>
            )}

            {/* Informações de contato */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5 text-green-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-700">Informações de Contato</h2>
              </div>

              {hasContacts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servidor.email && (
                    <ContactCard
                      icon={Mail}
                      label="E-mail institucional"
                      value={servidor.email}
                      href={`mailto:${servidor.email}`}
                      colorClass="bg-blue-50 text-blue-600"
                    />
                  )}
                  {servidor.phone && (
                    <ContactCard
                      icon={Phone}
                      label="Telefone"
                      value={servidor.phone}
                      href={`tel:${servidor.phone.replace(/\D/g, "")}`}
                      colorClass="bg-green-50 text-green-600"
                    />
                  )}
                  {(servidor as any).address && (
                    <ContactCard
                      icon={MapPin}
                      label="Endereço"
                      value={(servidor as any).address}
                      colorClass="bg-orange-50 text-orange-600"
                    />
                  )}
                  {servidor.externalLink && (
                    <ContactCard
                      icon={Globe}
                      label="Link externo"
                      value={servidor.externalLink.replace(/^https?:\/\//, "")}
                      href={servidor.externalLink}
                      colorClass="bg-purple-50 text-purple-600"
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                  <Mail className="w-8 h-8 text-slate-200" />
                  <p className="text-sm text-slate-400">Nenhuma informação de contato cadastrada.</p>
                </div>
              )}
            </div>

            {/* Ações rápidas */}
            <div className="flex flex-wrap gap-2">
              <Link href="/estrutura-administrativa">
                <Button variant="outline" size="sm" className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50">
                  <Building2 className="w-3.5 h-3.5" />
                  Ver Estrutura Administrativa
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50"
                onClick={handleShare}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Link copiado!" : "Copiar link do perfil"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
