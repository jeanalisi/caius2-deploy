/**
 * Estrutura Administrativa — Portal Público do Cidadão
 * Lei Complementar nº 010/2025 — Itabaiana/PB
 *
 * Exibe a hierarquia administrativa completa com órgãos, secretarias,
 * competências, cargos e serviços vinculados.
 * Sempre renderizado em tema claro (área pública).
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ChevronDown, ChevronRight, Search, ArrowLeft,
  Users, Briefcase, Scale, FileText, Globe, Info,
  MapPin, ExternalLink, BookOpen, Shield, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

// ── Competências institucionais por sigla ──────────────────────────────────────
const COMPETENCIAS: Record<string, { finalidade: string; competencias: string[]; fundamento: string }> = {
  GABPRE: {
    finalidade: "Assistência e assessoramento direto ao Prefeito Municipal.",
    competencias: [
      "Assistência e assessoramento ao Prefeito Municipal",
      "Relações com o Poder Legislativo",
      "Organização e publicação de atos normativos",
      "Cerimonial e agenda institucional",
      "Correspondência oficial e representação institucional",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 8º",
  },
  GABVICE: {
    finalidade: "Assessoramento ao Vice-Prefeito e substituição do Prefeito quando necessário.",
    competencias: [
      "Assessoramento ao Vice-Prefeito",
      "Substituição do Prefeito nos impedimentos legais",
      "Coordenação de projetos especiais delegados pelo Prefeito",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 9º",
  },
  PGM: {
    finalidade: "Representação judicial e extrajudicial do Município e orientação jurídica.",
    competencias: [
      "Representação judicial e extrajudicial do Município",
      "Orientação jurídica aos órgãos da Administração",
      "Elaboração de pareceres jurídicos",
      "Controle de constitucionalidade e legalidade dos atos administrativos",
      "Cobrança da dívida ativa municipal",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 10",
  },
  CGM: {
    finalidade: "Auditoria interna, controle de gestão, transparência e promoção da integridade.",
    competencias: [
      "Auditoria interna e controle de gestão",
      "Transparência e acesso à informação",
      "Ouvidoria municipal",
      "Promoção da integridade e combate à corrupção",
      "Controle preventivo e corretivo dos atos administrativos",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 11",
  },
  SCC: {
    finalidade: "Assessoramento ao Chefe do Poder Executivo e articulação político-administrativa.",
    competencias: [
      "Assessoramento ao Chefe do Poder Executivo",
      "Articulação político-administrativa",
      "Acompanhamento de projetos de lei",
      "Coordenação das relações intergovernamentais",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 12",
  },
  SEPLAN: {
    finalidade: "Gestão de pessoal, patrimônio, protocolo, tecnologia e planejamento estratégico.",
    competencias: [
      "Gestão de pessoal e recursos humanos",
      "Patrimônio público municipal",
      "Protocolo e documentação oficial",
      "Tecnologia da informação",
      "Planejamento estratégico e gestão orçamentária",
      "Licitações e contratos",
      "Almoxarifado central",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 13",
  },
  SEFIN: {
    finalidade: "Política fiscal, tributária, financeira, arrecadação e contabilidade.",
    competencias: [
      "Política fiscal e tributária",
      "Arrecadação municipal",
      "Dívida ativa",
      "Contabilidade pública",
      "Alvarás e licenças fiscais",
      "Controle financeiro e orçamentário",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 14",
  },
  SEMAS: {
    finalidade: "Política de assistência social, proteção social e programas sociais.",
    competencias: [
      "Política de assistência social",
      "Proteção social básica e especial",
      "Programas sociais federais e municipais",
      "Juventude, esporte e lazer",
      "Gestão do CRAS e CREAS",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 15",
  },
  SEDEC: {
    finalidade: "Desenvolvimento econômico, inovação, turismo e geração de emprego.",
    competencias: [
      "Desenvolvimento econômico local",
      "Inovação e empreendedorismo",
      "Turismo municipal",
      "Geração de emprego e renda",
      "Apoio ao comércio e indústria",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 16",
  },
  SECULT: {
    finalidade: "Política cultural, patrimônio histórico e promoção da cultura municipal.",
    competencias: [
      "Política cultural municipal",
      "Patrimônio histórico e cultural",
      "Eventos e manifestações culturais",
      "Bibliotecas e equipamentos culturais",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 17",
  },
  SEMAGRI: {
    finalidade: "Agricultura, desenvolvimento rural e segurança alimentar.",
    competencias: [
      "Política agrícola municipal",
      "Desenvolvimento rural sustentável",
      "Segurança alimentar e nutricional",
      "Apoio ao agricultor familiar",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 18",
  },
  SEDUC: {
    finalidade: "Educação básica, gestão escolar e políticas educacionais municipais.",
    competencias: [
      "Educação infantil e ensino fundamental",
      "Gestão da rede escolar municipal",
      "Transporte escolar",
      "Merenda escolar",
      "Programas de alfabetização e inclusão",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 19",
  },
  SEINFRA: {
    finalidade: "Infraestrutura urbana, obras públicas e serviços de manutenção.",
    competencias: [
      "Obras públicas e infraestrutura",
      "Pavimentação e manutenção de vias",
      "Iluminação pública",
      "Serviços de limpeza urbana",
      "Fiscalização de obras",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 20",
  },
  SESAU: {
    finalidade: "Saúde pública, atenção básica e gestão do SUS municipal.",
    competencias: [
      "Atenção básica à saúde",
      "Gestão das unidades de saúde",
      "Vigilância sanitária e epidemiológica",
      "Programas de saúde preventiva",
      "Farmácia básica municipal",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 21",
  },
  SEMAM: {
    finalidade: "Meio ambiente, sustentabilidade e recursos hídricos.",
    competencias: [
      "Política ambiental municipal",
      "Licenciamento ambiental",
      "Recursos hídricos e saneamento",
      "Educação ambiental",
      "Fiscalização ambiental",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 22",
  },
  SETRANS: {
    finalidade: "Transportes, estradas vicinais e rodovias municipais.",
    competencias: [
      "Manutenção de estradas vicinais",
      "Transporte público municipal",
      "Gestão da frota municipal",
      "Infraestrutura de transportes",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 23",
  },
  SEMOB: {
    finalidade: "Mobilidade urbana, trânsito e segurança viária.",
    competencias: [
      "Planejamento de mobilidade urbana",
      "Fiscalização de trânsito",
      "Sinalização viária",
      "Segurança no espaço público",
      "Educação para o trânsito",
    ],
    fundamento: "Lei Complementar nº 010/2025, Art. 24",
  },
};

// Competências comuns a todas as secretarias (Art. 63)
const COMPETENCIAS_COMUNS = [
  "Assessoramento aos Conselhos Municipais de sua área",
  "Elaboração da proposta orçamentária setorial",
  "Participação em planos, programas e projetos intersetoriais",
  "Gestão de recursos humanos no âmbito da secretaria",
  "Promoção e acompanhamento de convênios relativos à sua área",
];

const TYPE_LABELS: Record<string, string> = {
  prefeitura: "Prefeitura", gabinete: "Gabinete", procuradoria: "Procuradoria",
  controladoria: "Controladoria", secretaria: "Secretaria", superintendencia: "Superintendência",
  secretaria_executiva: "Sec. Executiva", diretoria: "Diretoria", departamento: "Departamento",
  coordenacao: "Coordenação", gerencia: "Gerência", supervisao: "Supervisão",
  secao: "Seção", setor: "Setor", nucleo: "Núcleo", assessoria: "Assessoria",
  unidade: "Unidade", junta: "Junta", tesouraria: "Tesouraria", ouvidoria: "Ouvidoria",
};

const TYPE_COLORS: Record<string, string> = {
  prefeitura: "bg-purple-100 text-purple-700 border-purple-200",
  gabinete: "bg-blue-100 text-blue-700 border-blue-200",
  secretaria: "bg-indigo-100 text-indigo-700 border-indigo-200",
  superintendencia: "bg-cyan-100 text-cyan-700 border-cyan-200",
  procuradoria: "bg-amber-100 text-amber-700 border-amber-200",
  controladoria: "bg-orange-100 text-orange-700 border-orange-200",
  diretoria: "bg-green-100 text-green-700 border-green-200",
  departamento: "bg-teal-100 text-teal-700 border-teal-200",
  coordenacao: "bg-sky-100 text-sky-700 border-sky-200",
  gerencia: "bg-violet-100 text-violet-700 border-violet-200",
};

type OrgNode = {
  id: number;
  name: string;
  acronym?: string | null;
  type: string;
  level: number;
  description?: string | null;
  legalBasis?: string | null;
  isActive: boolean;
  children: OrgNode[];
};

function OrgTreeNode({
  node,
  depth = 0,
  onSelect,
  selectedId,
}: {
  node: OrgNode;
  depth?: number;
  onSelect: (node: OrgNode) => void;
  selectedId: number | null;
}) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;
  const typeColor = TYPE_COLORS[node.type] ?? "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className={cn("select-none", depth > 0 && "ml-4 border-l border-slate-200 pl-3")}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors group",
          isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50",
        )}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Building2 className={cn("w-4 h-4 shrink-0", isSelected ? "text-blue-600" : "text-slate-400")} />
        <span className={cn("text-sm font-medium flex-1 truncate", isSelected ? "text-blue-700" : "text-slate-800")}>
          {node.name}
          {node.acronym && (
            <span className="ml-1.5 text-xs text-slate-500 font-normal">({node.acronym})</span>
          )}
        </span>
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0", typeColor)}>
          {TYPE_LABELS[node.type] ?? node.type}
        </span>
      </div>
      {open && hasChildren && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <OrgTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function flattenTree(nodes: OrgNode[]): OrgNode[] {
  const result: OrgNode[] = [];
  function walk(n: OrgNode) { result.push(n); n.children.forEach(walk); }
  nodes.forEach(walk);
  return result;
}

export default function EstruturaAdministrativa() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrgNode | null>(null);
  const [activeTab, setActiveTab] = useState<"competencias" | "cargos" | "usuarios" | "servicos">("competencias");

  const { data: tree = [], isLoading } = trpc.orgUnits.treePublic.useQuery();
  const { data: positions = [] } = trpc.orgUnits.positionsPublic.useQuery(
    selected ? { orgUnitId: selected.id } : undefined,
    { enabled: !!selected }
  );

  const allNodes = useMemo(() => flattenTree(tree as OrgNode[]), [tree]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree as OrgNode[];
    const q = search.toLowerCase();
    function filterNode(n: OrgNode): OrgNode | null {
      const match = n.name.toLowerCase().includes(q) || (n.acronym ?? "").toLowerCase().includes(q);
      const filteredChildren = n.children.map(filterNode).filter(Boolean) as OrgNode[];
      if (match || filteredChildren.length > 0) return { ...n, children: filteredChildren };
      return null;
    }
    return (tree as OrgNode[]).map(filterNode).filter(Boolean) as OrgNode[];
  }, [tree, search]);

  const competencias = selected?.acronym ? COMPETENCIAS[selected.acronym] : null;

  return (
    <div className="light min-h-screen flex flex-col bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Estrutura Administrativa</h1>
              <p className="text-xs text-slate-500">Município de Itabaiana — Lei Complementar nº 010/2025</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/central-cidadao">
              <Button variant="outline" size="sm" className="gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50">
                <ArrowLeft className="w-3.5 h-3.5" />
                Central do Cidadão
              </Button>
            </Link>
            <Link href="/consulta">
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <FileText className="w-3.5 h-3.5" />
                Consultar Protocolo
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6" style={{height: 'calc(100vh - 80px)', overflow: 'hidden'}}>
        {/* Sidebar — Árvore Hierárquica */}
        <aside className="w-80 shrink-0 flex flex-col gap-3 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-blue-500"
              placeholder="Buscar órgão, secretaria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-slate-200 p-2 space-y-0.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <Building2 className="w-8 h-8 opacity-30" />
                <p className="text-sm">Nenhuma unidade encontrada</p>
              </div>
            ) : (
              filteredTree.map((node) => (
                <OrgTreeNode
                  key={node.id}
                  node={node as OrgNode}
                  depth={0}
                  onSelect={setSelected}
                  selectedId={selected?.id ?? null}
                />
              ))
            )}
          </div>

          {/* Estatísticas */}
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Estrutura</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{allNodes.length}</p>
                <p className="text-[10px] text-slate-500">Unidades</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-indigo-600">17</p>
                <p className="text-[10px] text-slate-500">Secretarias</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main — Detalhes da Unidade */}
        <main className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
              <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Building2 className="w-10 h-10 text-blue-300" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-600">Selecione uma unidade</p>
                <p className="text-sm text-slate-400 mt-1">
                  Clique em qualquer órgão, secretaria ou setor na árvore ao lado para ver suas informações.
                </p>
              </div>
              {/* Competências comuns */}
              <div className="mt-4 max-w-lg w-full bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-700">Competências Comuns às Secretarias</p>
                  <span className="text-[10px] text-slate-400 ml-auto">Art. 63 — Lei 010/2025</span>
                </div>
                <ul className="space-y-1.5">
                  {COMPETENCIAS_COMUNS.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header da unidade */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                      {selected.acronym && (
                        <span className="text-sm font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                          {selected.acronym}
                        </span>
                      )}
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded border",
                        TYPE_COLORS[selected.type] ?? "bg-slate-100 text-slate-700 border-slate-200"
                      )}>
                        {TYPE_LABELS[selected.type] ?? selected.type}
                      </span>
                      {!selected.isActive && (
                        <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded">
                          Inativa
                        </span>
                      )}
                    </div>
                    {selected.description && (
                      <p className="text-sm text-slate-600 mt-1">{selected.description}</p>
                    )}
                    {selected.legalBasis && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {selected.legalBasis}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-200">
                  {[
                    { key: "competencias", label: "Competências", icon: Shield },
                    { key: "cargos", label: "Cargos", icon: Briefcase },
                    { key: "usuarios", label: "Usuários Vinculados", icon: Users },
                    { key: "servicos", label: "Serviços", icon: Globe },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as any)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                        activeTab === key
                          ? "border-blue-600 text-blue-700 bg-blue-50/50"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* Tab: Competências */}
                  {activeTab === "competencias" && (
                    <div className="space-y-4">
                      {competencias ? (
                        <>
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Finalidade Institucional</p>
                            <p className="text-sm text-slate-700">{competencias.finalidade}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                              <Shield className="w-4 h-4 text-blue-500" />
                              Competências Legais
                            </p>
                            <ul className="space-y-2">
                              {competencias.competencias.map((c, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium">
                                    {i + 1}
                                  </span>
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                            <p className="text-xs text-slate-500">Fundamento legal: <span className="font-medium text-slate-600">{competencias.fundamento}</span></p>
                          </div>
                          {/* Competências comuns */}
                          <div className="border-t border-slate-100 pt-4">
                            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                              <Star className="w-4 h-4 text-amber-500" />
                              Competências Comuns (Art. 63)
                            </p>
                            <ul className="space-y-1.5">
                              {COMPETENCIAS_COMUNS.map((c, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                  {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          {selected.description ? (
                            <div className="space-y-3">
                              <Info className="w-8 h-8 mx-auto opacity-30" />
                              <p className="text-sm text-slate-600">{selected.description}</p>
                              <p className="text-xs text-slate-400">
                                Competência institucional derivada da unidade superior ou definida em regimento interno.
                              </p>
                            </div>
                          ) : (
                            <>
                              <Info className="w-8 h-8 mx-auto opacity-30 mb-2" />
                              <p className="text-sm">Competências definidas em regimento interno ou derivadas da unidade superior.</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Cargos */}
                  {activeTab === "cargos" && (
                    <div>
                      {(positions as any[]).length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <Briefcase className="w-8 h-8 mx-auto opacity-30 mb-2" />
                          <p className="text-sm">Nenhum cargo cadastrado para esta unidade.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(positions as any[]).map((pos) => (
                            <div key={pos.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                <Briefcase className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800">{pos.name}</p>
                                {pos.code && <p className="text-xs text-slate-500 font-mono">{pos.code}</p>}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">
                                  {pos.level?.replace(/_/g, " ") ?? "—"}
                                </Badge>
                                {pos.canSign && (
                                  <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                                    Assina
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Usuários */}
                  {activeTab === "usuarios" && (
                    <div className="text-center py-8 text-slate-400">
                      <Users className="w-8 h-8 mx-auto opacity-30 mb-2" />
                      <p className="text-sm font-medium text-slate-600">Dados funcionais públicos</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                        A exibição de usuários vinculados está sujeita às regras de transparência e privacidade (LGPD).
                        Apenas dados funcionais institucionais autorizados são exibidos publicamente.
                      </p>
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-sm mx-auto">
                        <p className="text-xs text-amber-700">
                          Para consultar ocupantes de cargos, acesse a plataforma interna com suas credenciais institucionais.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tab: Serviços */}
                  {activeTab === "servicos" && (
                    <div className="text-center py-8 text-slate-400">
                      <Globe className="w-8 h-8 mx-auto opacity-30 mb-2" />
                      <p className="text-sm font-medium text-slate-600">Serviços desta unidade</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Os serviços vinculados a esta unidade serão exibidos aqui quando configurados pelo administrador.
                      </p>
                      <Link href="/central-cidadao">
                        <Button variant="outline" size="sm" className="mt-4 gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver todos os serviços
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Subunidades */}
              {selected.children.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Unidades Subordinadas ({selected.children.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selected.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => setSelected(child as OrgNode)}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                      >
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{child.name}</p>
                          <p className="text-xs text-slate-400">{TYPE_LABELS[child.type] ?? child.type}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
