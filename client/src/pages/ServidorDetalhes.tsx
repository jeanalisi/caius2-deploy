/**
 * ServidorDetalhes — Página pública de detalhes de um servidor público
 * Exibe foto, cargo, bio, contatos e link externo
 * Sempre renderizado em tema claro (área pública)
 */
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Mail, Phone, ExternalLink, UserCircle,
  Building2, BookOpen, Scale, Briefcase, MapPin,
} from "lucide-react";
import { Link, useParams } from "wouter";

export default function ServidorDetalhes() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);

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
  const error = !isLoading && !servidor ? true : null;

  const { data: orgUnit } = trpc.orgUnits.publicById.useQuery(
    { id: servidor?.orgUnitId ?? 0 },
    { enabled: !!servidor?.orgUnitId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-slate-200 animate-pulse mx-auto mb-4" />
          <div className="h-4 bg-slate-200 rounded animate-pulse w-48 mx-auto mb-2" />
          <div className="h-3 bg-slate-200 rounded animate-pulse w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !servidor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
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

  // Formata o nome em Title Case
  const nomeFormatado = servidor.name
    .toLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/estrutura-administrativa">
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Estrutura Administrativa</span>
            </Button>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-600 truncate">{nomeFormatado}</span>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Faixa de cor no topo */}
          <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-800" />

          {/* Foto e info básica */}
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-6">
              {/* Foto */}
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-slate-200 flex items-center justify-center shrink-0">
                {servidor.photoUrl ? (
                  <img
                    src={servidor.photoUrl}
                    alt={nomeFormatado}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-14 h-14 text-slate-400" />
                )}
              </div>

              {/* Nome e cargo */}
              <div className="flex-1 min-w-0 pt-2 sm:pt-0">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">{nomeFormatado}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-medium">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {servidor.cargo}
                  </Badge>
                  {servidor.matricula && (
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Mat. {servidor.matricula}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Unidade organizacional */}
            {orgUnit && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Unidade Organizacional</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{(orgUnit as any).name}</p>
                </div>
              </div>
            )}

            {/* Fundamento legal */}
            {servidor.cargoLei && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-700 font-medium">Fundamento Legal</p>
                  <p className="text-sm text-amber-800">{servidor.cargoLei}</p>
                </div>
              </div>
            )}

            {/* Resumo profissional */}
            {servidor.bio && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-700">Resumo Profissional</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-4 border border-slate-200">
                  {servidor.bio}
                </p>
              </div>
            )}

            {/* Contatos e link externo */}
            {(servidor.email || servidor.phone || (servidor as any).address || servidor.externalLink) && (
              <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Contato</h2>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                  {servidor.email && (
                    <a
                      href={`mailto:${servidor.email}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors group text-sm"
                    >
                      <Mail className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                      <span className="text-slate-700 group-hover:text-blue-700">{servidor.email}</span>
                    </a>
                  )}
                  {servidor.phone && (
                    <a
                      href={`tel:${servidor.phone.replace(/\D/g, "")}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-green-50 hover:border-green-300 transition-colors group text-sm"
                    >
                      <Phone className="w-4 h-4 text-slate-400 group-hover:text-green-500" />
                      <span className="text-slate-700 group-hover:text-green-700">{servidor.phone}</span>
                    </a>
                  )}
                  {(servidor as any).address && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-700">{(servidor as any).address}</span>
                    </div>
                  )}
                  {servidor.externalLink && (
                    <a
                      href={servidor.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 transition-colors group text-sm"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-purple-500" />
                      <span className="text-slate-700 group-hover:text-purple-700 truncate max-w-xs">
                        {servidor.externalLink.replace(/^https?:\/\//, "")}
                      </span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            Informações públicas conforme Lei de Acesso à Informação (Lei nº 12.527/2011)
          </p>
          <Link href="/estrutura-administrativa">
            <Button variant="ghost" size="sm" className="mt-3 gap-1.5 text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-3.5 h-3.5" />
              Ver toda a estrutura administrativa
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
