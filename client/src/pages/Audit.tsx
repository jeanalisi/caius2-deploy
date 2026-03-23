import OmniLayout from "@/components/OmniLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Activity,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useState } from "react";

const ENTITY_LABELS: Record<string, string> = {
  protocol: "Protocolo",
  tramitation: "Tramitação",
  officialDocument: "Documento",
  adminProcess: "Processo",
  ombudsman: "Ouvidoria",
  sector: "Setor",
  aiProvider: "Provedor IA",
  ai: "IA",
  user: "Usuário",
};

const ACTION_COLORS: Record<string, string> = {
  create: "text-green-400",
  update: "text-blue-400",
  delete: "text-red-400",
  sign: "text-purple-400",
  ai: "text-primary",
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(key) || action.includes(key)) return color;
  }
  return "text-muted-foreground";
}

export default function Audit() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const { data: logs, isLoading } = trpc.caius.audit.list.useQuery({
    entity: entityFilter || undefined,
    limit: 200,
  });

  const filtered = logs?.filter((log: any) =>
    !search ||
    log.action?.includes(search.toLowerCase()) ||
    log.nup?.includes(search) ||
    log.userName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OmniLayout title="Auditoria">
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por NUP, ação, usuário..." className="pl-9" />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data/Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuário</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entidade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">NUP</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : !filtered?.length ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">Nenhum registro de auditoria</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-foreground">{log.userName ?? "Sistema"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-mono font-medium", getActionColor(log.action))}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {ENTITY_LABELS[log.entity] ?? log.entity}
                          {log.entityId ? ` #${log.entityId}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.nup ? (
                          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">
                            {log.nup}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.aiAssisted ? (
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <span className="text-xs text-muted-foreground/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground font-mono">{log.ipAddress ?? "—"}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </OmniLayout>
  );
}
