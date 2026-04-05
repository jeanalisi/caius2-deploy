import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldCheck, Search } from "lucide-react";

const actionLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  control_updated: { label: "Controle Atualizado", variant: "secondary" },
  control_activated: { label: "Controle Ativado", variant: "default" },
  control_deactivated: { label: "Controle Desativado", variant: "destructive" },
  manual_number_change: { label: "Ajuste Manual", variant: "outline" },
  permission_updated: { label: "Permissão Alterada", variant: "secondary" },
};

export default function ControleAuditoriaPage() {
  const [search, setSearch] = useState("");
  const [filterControlId, setFilterControlId] = useState<number | undefined>(undefined);

  const { data: controls } = trpc.controle.configuracao.list.useQuery();
  const { data: logs, isLoading } = trpc.controle.auditoria.list.useQuery({
    controlId: filterControlId,
    limit: 300,
  });

  const filtered = (logs ?? []).filter((l) => {
    if (!search) return true;
    return (
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.justification?.toLowerCase().includes(search.toLowerCase()) ||
      l.userName?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
        <p className="text-sm text-muted-foreground mt-1">Registro de todas as alterações administrativas nos controles de numeração</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por ação, justificativa ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select onValueChange={(v) => setFilterControlId(v === "all" ? undefined : Number(v))}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por controle..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os controles</SelectItem>
            {(controls ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {filtered.length} registros de auditoria
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Nenhum registro encontrado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Controle</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Valor Anterior</TableHead>
                  <TableHead>Novo Valor</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const actionCfg = actionLabels[l.action] ?? { label: l.action, variant: "secondary" as const };
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Badge variant={actionCfg.variant} className="text-xs whitespace-nowrap">
                          {actionCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.controlName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{l.userName ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{l.previousValue ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{l.newValue ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{l.justification ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {l.createdAt ? new Date(l.createdAt).toLocaleString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
