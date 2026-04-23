/**
 * Organograma — Hierarquia Visual da Estrutura Administrativa
 * Exibe a árvore de unidades organizacionais com cargos e servidores
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building2, ChevronDown, ChevronRight, Users, UserCircle2,
  Search, ZoomIn, ZoomOut, Maximize2, ExternalLink, Mail, Phone,
  GitBranch, Download
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrgMember {
  id: number;
  name: string;
  cargo?: string;
  cargoLei?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  externalLink?: string;
}

interface OrgNode {
  id: number;
  name: string;
  acronym?: string;
  type: string;
  level: number;
  description?: string;
  members: OrgMember[];
  children: OrgNode[];
}

// ─── Color map by unit type ───────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  prefeitura:        { bg: "bg-amber-950/60",   border: "border-amber-500",   badge: "bg-amber-500/20 text-amber-300",   text: "text-amber-300" },
  gabinete:          { bg: "bg-violet-950/60",  border: "border-violet-500",  badge: "bg-violet-500/20 text-violet-300", text: "text-violet-300" },
  procuradoria:      { bg: "bg-rose-950/60",    border: "border-rose-500",    badge: "bg-rose-500/20 text-rose-300",     text: "text-rose-300" },
  controladoria:     { bg: "bg-orange-950/60",  border: "border-orange-500",  badge: "bg-orange-500/20 text-orange-300", text: "text-orange-300" },
  secretaria:        { bg: "bg-blue-950/60",    border: "border-blue-500",    badge: "bg-blue-500/20 text-blue-300",     text: "text-blue-300" },
  superintendencia:  { bg: "bg-cyan-950/60",    border: "border-cyan-500",    badge: "bg-cyan-500/20 text-cyan-300",     text: "text-cyan-300" },
  secretaria_executiva: { bg: "bg-teal-950/60", border: "border-teal-500",    badge: "bg-teal-500/20 text-teal-300",     text: "text-teal-300" },
  diretoria:         { bg: "bg-indigo-950/60",  border: "border-indigo-400",  badge: "bg-indigo-500/20 text-indigo-300", text: "text-indigo-300" },
  departamento:      { bg: "bg-sky-950/60",     border: "border-sky-400",     badge: "bg-sky-500/20 text-sky-300",       text: "text-sky-300" },
  coordenacao:       { bg: "bg-emerald-950/60", border: "border-emerald-400", badge: "bg-emerald-500/20 text-emerald-300",text: "text-emerald-300" },
  gerencia:          { bg: "bg-green-950/60",   border: "border-green-400",   badge: "bg-green-500/20 text-green-300",   text: "text-green-300" },
  assessoria:        { bg: "bg-pink-950/60",    border: "border-pink-400",    badge: "bg-pink-500/20 text-pink-300",     text: "text-pink-300" },
  default:           { bg: "bg-zinc-900/60",    border: "border-zinc-600",    badge: "bg-zinc-700/50 text-zinc-300",     text: "text-zinc-300" },
};

function getColors(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.default;
}

// ─── Member Card ──────────────────────────────────────────────────────────────
function MemberCard({ member }: { member: OrgMember }) {
  return (
    <Link href={`/servidor/${member.id}`}>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-white/5 hover:border-white/15">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <UserCircle2 className="w-5 h-5 text-white/40" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/90 truncate leading-tight">{member.name}</p>
          {(member.cargo || member.cargoLei) && (
            <p className="text-[10px] text-white/50 truncate leading-tight mt-0.5">
              {member.cargoLei || member.cargo}
            </p>
          )}
        </div>
        <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-white/60 flex-shrink-0 transition-colors" />
      </div>
    </Link>
  );
}

// ─── Org Node Card ────────────────────────────────────────────────────────────
function OrgNodeCard({
  node,
  depth = 0,
  search,
}: {
  node: OrgNode;
  depth?: number;
  search: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showMembers, setShowMembers] = useState(false);
  const colors = getColors(node.type);
  const hasChildren = node.children.length > 0;
  const hasMembers = node.members.length > 0;

  // Filter by search
  const matchesSearch = !search ||
    node.name.toLowerCase().includes(search.toLowerCase()) ||
    node.acronym?.toLowerCase().includes(search.toLowerCase()) ||
    node.members.some((m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.cargo?.toLowerCase().includes(search.toLowerCase())
    );

  if (!matchesSearch && !search) return null;

  const typeLabel: Record<string, string> = {
    prefeitura: "Prefeitura", gabinete: "Gabinete", procuradoria: "Procuradoria",
    controladoria: "Controladoria", secretaria: "Secretaria", superintendencia: "Superintendência",
    secretaria_executiva: "Sec. Executiva", diretoria: "Diretoria", departamento: "Departamento",
    coordenacao: "Coordenação", gerencia: "Gerência", assessoria: "Assessoria",
    supervisao: "Supervisão", setor: "Setor", nucleo: "Núcleo", unidade: "Unidade",
  };

  return (
    <div className={`relative ${depth > 0 ? "ml-6 mt-3" : "mt-4"}`}>
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute -left-4 top-6 w-4 h-px bg-white/15" />
      )}
      {depth > 0 && (
        <div className="absolute -left-4 -top-3 bottom-6 w-px bg-white/10" />
      )}

      {/* Node card */}
      <div className={`rounded-xl border ${colors.bg} ${colors.border} backdrop-blur-sm shadow-lg overflow-hidden`}>
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="flex-shrink-0">
            <Building2 className={`w-4 h-4 ${colors.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {node.acronym && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${colors.badge}`}>
                  {node.acronym}
                </span>
              )}
              <span className="text-sm font-semibold text-white/90 leading-tight">{node.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${colors.badge} border-current/20`}>
                {typeLabel[node.type] ?? node.type}
              </span>
              {hasMembers && (
                <button
                  className="text-[10px] text-white/50 hover:text-white/80 flex items-center gap-1 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setShowMembers((s) => !s); }}
                >
                  <Users className="w-3 h-3" />
                  {node.members.length} servidor{node.members.length !== 1 ? "es" : ""}
                </button>
              )}
              {hasChildren && (
                <span className="text-[10px] text-white/40 flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {node.children.length} subunidade{node.children.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          {(hasChildren || hasMembers) && (
            <div className="flex-shrink-0 text-white/40">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          )}
        </div>

        {/* Members panel */}
        {showMembers && hasMembers && (
          <div className="px-4 pb-3 border-t border-white/10 pt-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2 font-medium">Servidores</p>
            <div className="space-y-1.5">
              {node.members.map((m) => (
                <MemberCard key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="relative pl-2">
          {/* Vertical connector */}
          <div className="absolute left-2 top-0 bottom-3 w-px bg-white/10" />
          {node.children.map((child) => (
            <OrgNodeCard key={child.id} node={child} depth={depth + 1} search={search} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Organograma() {
  const { data: tree = [], isLoading } = trpc.orgUnits.orgChartPublic.useQuery();
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 10, 150)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 10, 50)), []);
  const handleReset = useCallback(() => setZoom(100), []);

  // Stats
  const totalUnits = (tree as OrgNode[]).reduce(function count(acc: number, n: OrgNode): number {
    return acc + 1 + n.children.reduce(count, 0);
  }, 0);
  const totalMembers = (tree as OrgNode[]).reduce(function countM(acc: number, n: OrgNode): number {
    return acc + n.members.length + n.children.reduce(countM, 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground leading-tight">Organograma</h1>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? "Carregando..." : `${totalUnits} unidades · ${totalMembers} servidores`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm w-56"
                  placeholder="Buscar unidade ou servidor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 border border-border rounded-lg px-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <button
                  className="text-xs text-muted-foreground w-10 text-center hover:text-foreground transition-colors"
                  onClick={handleReset}
                >
                  {zoom}%
                </button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
                <Link href="/estrutura-administrativa">
                  <Maximize2 className="w-3.5 h-3.5" />
                  Estrutura
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-7xl mx-auto px-4 pt-3">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries({
            gabinete: "Gabinete",
            secretaria: "Secretaria",
            procuradoria: "Procuradoria",
            controladoria: "Controladoria",
            superintendencia: "Superintendência",
            diretoria: "Diretoria",
            assessoria: "Assessoria",
          }).map(([type, label]) => {
            const c = getColors(type);
            return (
              <span key={type} className={`text-[10px] px-2 py-0.5 rounded-full border ${c.badge} border-current/20`}>
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Tree */}
      <div className="max-w-7xl mx-auto px-4 pb-12 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Carregando organograma...
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", transition: "transform 0.2s" }}
          >
            {(tree as OrgNode[]).map((node) => (
              <OrgNodeCard key={node.id} node={node} depth={0} search={search} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
