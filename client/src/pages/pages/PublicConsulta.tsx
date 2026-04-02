import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  GitBranch,
  Loader2,
  Lock,
  MessageSquare,
  Scale,
  Search,
  Shield,
  User,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  open: { label: "Aberto", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Clock },
  in_analysis: { label: "Em Análise", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: Clock },
  pending_docs: { label: "Pendente de Documentos", color: "text-orange-700", bg: "bg-orange-50 border-orange-200", icon: Clock },
  in_progress: { label: "Em Andamento", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Clock },
  concluded: { label: "Concluído", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
  archived: { label: "Arquivado", color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: Clock },
  received: { label: "Recebida", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Clock },
  answered: { label: "Respondida", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
};

const ACTION_ICONS: Record<string, any> = {
  forward: ArrowRight,
  return: ArrowLeft,
  assign: User,
  conclude: CheckCircle2,
  archive: FileText,
  reopen: Clock,
  comment: MessageSquare,
};

const ACTION_COLORS: Record<string, string> = {
  forward: "bg-blue-100 text-blue-700 border-blue-200",
  return: "bg-orange-100 text-orange-700 border-orange-200",
  assign: "bg-purple-100 text-purple-700 border-purple-200",
  conclude: "bg-green-100 text-green-700 border-green-200",
  archive: "bg-gray-100 text-gray-600 border-gray-200",
  reopen: "bg-yellow-100 text-yellow-700 border-yellow-200",
  comment: "bg-slate-100 text-slate-600 border-slate-200",
};

const ENTITY_ICONS: Record<string, any> = {
  protocol: ClipboardList,
  adminProcess: Scale,
  officialDocument: FileText,
  ombudsman: BookOpen,
  process: Scale,
  document: FileText,
};

const ENTITY_LABELS: Record<string, string> = {
  protocol: "Protocolo",
  adminProcess: "Processo Administrativo",
  officialDocument: "Documento Oficial",
  ombudsman: "Manifestação de Ouvidoria",
  process: "Processo Administrativo",
  document: "Documento Oficial",
};

// ─── Componente: Linha do Tempo de Tramitação ─────────────────────────────────
function TramitationTimeline({ nup }: { nup: string }) {
  const { data: tramitations, isLoading } = trpc.caius.public.getTramitations.useQuery(
    { nup },
    { enabled: !!nup, retry: false }
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando histórico de tramitação...
      </div>
    );
  }

  if (!tramitations || tramitations.length === 0) {
    return (
      <div className="py-3 text-sm text-gray-400 italic">
        Nenhuma tramitação registrada até o momento.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {tramitations.map((t, idx) => {
        const ActionIcon = ACTION_ICONS[t.action] ?? GitBranch;
        const colorClass = ACTION_COLORS[t.action] ?? "bg-gray-100 text-gray-600 border-gray-200";
        const isLast = idx === tramitations.length - 1;
        return (
          <div key={t.id} className="flex gap-3">
            {/* Linha vertical */}
            <div className="flex flex-col items-center">
              <div className={cn("h-7 w-7 rounded-full border flex items-center justify-center flex-shrink-0 mt-1", colorClass)}>
                <ActionIcon className="h-3.5 w-3.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>
            {/* Conteúdo */}
            <div className={cn("pb-4 flex-1", isLast ? "" : "")}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", colorClass)}>
                  {t.actionLabel}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(t.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {(t.fromSector || t.toSector) && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600">
                  {t.fromSector && (
                    <span className="bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{t.fromSector}</span>
                  )}
                  {t.fromSector && t.toSector && (
                    <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                  {t.toSector && (
                    <span className="bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 text-blue-700">{t.toSector}</span>
                  )}
                </div>
              )}
              {t.dispatch && (
                <div
                  className="mt-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded p-2 leading-relaxed prose prose-xs max-w-none [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-xs [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:italic"
                  dangerouslySetInnerHTML={{ __html: t.dispatch }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente: Card de Resultado ────────────────────────────────────────────
function ResultCard({ result }: { result: { entity: string; data: any } }) {
  const EntityIcon = ENTITY_ICONS[result.entity] ?? ClipboardList;
  const statusCfg = STATUS_CONFIG[(result.data as any).status] ?? STATUS_CONFIG.open;
  const StatusIcon = statusCfg.icon;
  const isProtocol = result.entity === "protocol";
  const nup = (result.data as any).nup as string;

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            <EntityIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">{ENTITY_LABELS[result.entity] ?? "Registro"}</p>
            <CardTitle className="text-sm font-semibold text-gray-900 leading-snug">
              {(result.data as any).subject ?? (result.data as any).title ?? "Registro encontrado"}
            </CardTitle>
          </div>
          <Badge variant="outline" className={cn("text-xs flex-shrink-0", statusCfg.bg, statusCfg.color, "border")}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusCfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(result.data as any).isConfidential ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <Lock className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">Este registro é sigiloso. Informações restritas.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">NUP</p>
                <p className="font-mono text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-1 inline-block">
                  {nup}
                </p>
              </div>
              {(result.data as any).type && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tipo</p>
                  <p className="text-gray-800 capitalize text-xs">{(result.data as any).type}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">Data de Abertura</p>
                <p className="text-gray-800 text-xs">
                  {new Date((result.data as any).createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {(result.data as any).updatedAt && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Última Atualização</p>
                  <p className="text-gray-800 text-xs">
                    {new Date((result.data as any).updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>

            {/* Histórico de Tramitação — apenas para protocolos */}
            {isProtocol && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Histórico de Tramitação</p>
                </div>
                <TramitationTimeline nup={nup} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Busca por NUP ────────────────────────────────────────────────────────────
function NupSearch() {
  const [nupInput, setNupInput] = useState("");
  const [searchNup, setSearchNup] = useState("");

  const { data: result, isLoading, error } = trpc.caius.public.lookupNup.useQuery(
    { nup: searchNup },
    { enabled: !!searchNup, retry: false }
  );

  const handleSearch = () => {
    if (nupInput.trim()) setSearchNup(nupInput.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={nupInput}
          onChange={(e) => setNupInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Ex: PMI-2026-000001"
          className="font-mono text-sm flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
        />
        <Button
          onClick={handleSearch}
          disabled={!nupInput.trim() || isLoading}
          className="gap-2 bg-blue-700 hover:bg-blue-800 text-white"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Consultar
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        O NUP é fornecido no momento do registro do protocolo ou manifestação. Formato: PMI-AAAA-NNNNNN
      </p>

      {searchNup && !isLoading && (
        <>
          {error || !result ? (
            <Card className="bg-white border border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                <ClipboardList className="h-10 w-10 text-gray-300" />
                <p className="text-gray-700 font-medium">NUP não encontrado</p>
                <p className="text-sm text-gray-500">Verifique o número e tente novamente</p>
              </CardContent>
            </Card>
          ) : (
            <ResultCard result={result} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Busca por CPF/CNPJ ───────────────────────────────────────────────────────
function CpfCnpjSearch() {
  const [cpfInput, setCpfInput] = useState("");
  const [searchCpf, setSearchCpf] = useState("");

  const { data: results, isLoading, error } = trpc.caius.public.lookupByCpfCnpj.useQuery(
    { cpfCnpj: searchCpf },
    { enabled: !!searchCpf, retry: false }
  );

  const handleSearch = () => {
    if (cpfInput.trim()) setSearchCpf(cpfInput.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={cpfInput}
          onChange={(e) => setCpfInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Ex: 000.000.000-00 ou 00.000.000/0001-00"
          className="font-mono text-sm flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
        />
        <Button
          onClick={handleSearch}
          disabled={!cpfInput.trim() || isLoading}
          className="gap-2 bg-blue-700 hover:bg-blue-800 text-white"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Informe o CPF (pessoa física) ou CNPJ (pessoa jurídica) para listar todos os protocolos e manifestações vinculados.
      </p>

      {searchCpf && !isLoading && (
        <>
          {error || !results || results.length === 0 ? (
            <Card className="bg-white border border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                <User className="h-10 w-10 text-gray-300" />
                <p className="text-gray-700 font-medium">Nenhum registro encontrado</p>
                <p className="text-sm text-gray-500">Verifique o CPF/CNPJ e tente novamente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 font-medium">
                {results.length} registro{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
              </p>
              {results.map((r, i) => (
                <ResultCard key={i} result={r} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function PublicConsulta() {
  return (
    <div className="light min-h-screen flex flex-col" style={{ background: "#f8fafc", color: "#1e293b" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-700 flex items-center justify-center">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Consulta Pública</p>
              <p className="text-[10px] text-gray-500">Acompanhamento de Protocolos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/central-cidadao">
              <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-3.5 w-3.5" />
                Central do Cidadão
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm" className="gap-1.5 bg-blue-700 hover:bg-blue-800 text-white">
                Acessar plataforma
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-start pt-12 px-6 pb-16">
        <div className="w-full max-w-2xl space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-700 flex items-center justify-center shadow-lg">
                <Search className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Consultar Protocolo</h1>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Acompanhe o andamento dos seus protocolos, manifestações de ouvidoria e processos administrativos
            </p>
          </div>

          {/* Search Tabs */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <Tabs defaultValue="nup">
                <TabsList className="w-full mb-5 bg-gray-100">
                  <TabsTrigger value="nup" className="flex-1 gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                    <ClipboardList className="h-4 w-4" />
                    Buscar por NUP
                  </TabsTrigger>
                  <TabsTrigger value="cpf" className="flex-1 gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                    <User className="h-4 w-4" />
                    Buscar por CPF/CNPJ
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="nup">
                  <NupSearch />
                </TabsContent>
                <TabsContent value="cpf">
                  <CpfCnpjSearch />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Info box */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Privacidade e Segurança</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Esta consulta exibe apenas informações públicas. Registros sigilosos são protegidos e não têm seu conteúdo exibido.
                Para informações detalhadas, entre em contato com o setor responsável informando o NUP.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-5">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            Plataforma Pública Omnichannel de Atendimento e Gestão Administrativa
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link href="/central-cidadao" className="hover:text-gray-700 transition-colors">Central do Cidadão</Link>
            <Link href="/estrutura-administrativa" className="hover:text-gray-700 transition-colors">Estrutura Administrativa</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
