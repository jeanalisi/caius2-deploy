import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Clock, Search, Building2, X } from "lucide-react";

const docTypeLabels: Record<string, string> = {
  oficio: "Ofício",
  memorando: "Memorando",
  decreto: "Decreto",
  lei: "Lei",
  diario_oficial: "Diário Oficial",
  contrato: "Contrato",
  portaria: "Portaria",
};

const docTypeColors: Record<string, string> = {
  oficio: "bg-blue-100 text-blue-800 border-blue-200",
  memorando: "bg-purple-100 text-purple-800 border-purple-200",
  decreto: "bg-red-100 text-red-800 border-red-200",
  lei: "bg-green-100 text-green-800 border-green-200",
  diario_oficial: "bg-yellow-100 text-yellow-800 border-yellow-200",
  contrato: "bg-orange-100 text-orange-800 border-orange-200",
  portaria: "bg-pink-100 text-pink-800 border-pink-200",
};

export default function ControleHistoricoPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [search, setSearch] = useState("");
  const [filterControlId, setFilterControlId] = useState<number | undefined>(undefined);
  const [filterUnitId, setFilterUnitId] = useState<number | undefined>(undefined);

  // Buscar unidades disponíveis: admins vêem todas, usuários comuns vêem apenas as vinculadas
  const { data: allUnits } = trpc.controle.unidades.list.useQuery();
  const { data: myUnits } = trpc.controle.permissoes.getMyUnits.useQuery();

  const availableUnits = useMemo(() => {
    if (isAdmin) return allUnits ?? [];
    return myUnits ?? [];
  }, [isAdmin, allUnits, myUnits]);

  const { data: controls } = trpc.controle.configuracao.list.useQuery();

  // Filtrar controles pela unidade selecionada
  const filteredControls = useMemo(() => {
    if (!filterUnitId) return controls ?? [];
    return (controls ?? []).filter((c) => c.unitId === filterUnitId);
  }, [controls, filterUnitId]);

  const { data: history, isLoading } = trpc.controle.historico.list.useQuery({
    controlId: filterControlId,
    unitId: filterUnitId,
    limit: 300,
  });

  const filtered = useMemo(() => {
    return (history ?? []).filter((h) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        h.formattedNumber?.toLowerCase().includes(q) ||
        h.documentDescription?.toLowerCase().includes(q) ||
        h.userName?.toLowerCase().includes(q) ||
        h.unitName?.toLowerCase().includes(q) ||
        h.unitAcronym?.toLowerCase().includes(q)
      );
    });
  }, [history, search]);

  const clearFilters = () => {
    setSearch("");
    setFilterControlId(undefined);
    setFilterUnitId(undefined);
  };

  const hasActiveFilters = search || filterControlId || filterUnitId;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Histórico de Emissões</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registro completo de todos os números emitidos
          {!isAdmin && myUnits && myUnits.length > 0 && (
            <span className="ml-1 text-primary font-medium">
              — exibindo apenas suas {myUnits.length} unidade{myUnits.length !== 1 ? "s" : ""} vinculada{myUnits.length !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Busca textual */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por número, descrição, usuário ou unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filtro por unidade organizacional */}
        <Select
          value={filterUnitId ? String(filterUnitId) : "all"}
          onValueChange={(v) => {
            setFilterUnitId(v === "all" ? undefined : Number(v));
            setFilterControlId(undefined); // resetar controle ao mudar unidade
          }}
        >
          <SelectTrigger className="w-64">
            <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filtrar por unidade..." />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todas as unidades</SelectItem>
            {availableUnits.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.acronym ? `${u.acronym} — ` : ""}{u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por controle (restrito à unidade selecionada) */}
        <Select
          value={filterControlId ? String(filterControlId) : "all"}
          onValueChange={(v) => setFilterControlId(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por controle..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os controles</SelectItem>
            {filteredControls.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
                {c.unitAcronym && (
                  <span className="ml-1 text-muted-foreground text-xs">({c.unitAcronym})</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Botão limpar filtros */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="w-3 h-3" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Chips de filtros ativos */}
      {(filterUnitId || filterControlId) && (
        <div className="flex gap-2 flex-wrap">
          {filterUnitId && (() => {
            const unit = availableUnits.find((u) => u.id === filterUnitId);
            return unit ? (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterUnitId(undefined)}>
                <Building2 className="w-3 h-3" />
                {unit.acronym ?? unit.name}
                <X className="w-3 h-3" />
              </Badge>
            ) : null;
          })()}
          {filterControlId && (() => {
            const ctrl = controls?.find((c) => c.id === filterControlId);
            return ctrl ? (
              <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterControlId(undefined)}>
                {ctrl.name}
                <X className="w-3 h-3" />
              </Badge>
            ) : null;
          })()}
        </div>
      )}

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {isLoading ? "Carregando..." : `${filtered.length} emissão${filtered.length !== 1 ? "ões" : ""} encontrada${filtered.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {!isAdmin && myUnits && myUnits.length === 0
                ? "Você não possui unidades organizacionais vinculadas. Solicite ao administrador."
                : "Nenhuma emissão encontrada com os filtros selecionados."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Controle</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono font-semibold text-primary">{h.formattedNumber}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${docTypeColors[h.documentType ?? ""] ?? ""}`}
                      >
                        {docTypeLabels[h.documentType ?? ""] ?? h.documentType ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {h.unitName ? (
                        <span className="text-sm">
                          {h.unitAcronym ? (
                            <span className="font-medium text-foreground">{h.unitAcronym}</span>
                          ) : null}
                          {h.unitAcronym && h.unitName ? (
                            <span className="text-muted-foreground ml-1 text-xs">— {h.unitName}</span>
                          ) : (
                            <span className="text-muted-foreground">{h.unitName}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.controlName ?? "—"}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{h.documentDescription}</TableCell>
                    <TableCell className="text-sm">{h.userName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.usedAt ? new Date(h.usedAt).toLocaleString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
