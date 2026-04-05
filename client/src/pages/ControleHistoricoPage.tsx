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
import { Clock, Search } from "lucide-react";

const docTypeLabels: Record<string, string> = {
  oficio: "Ofício",
  memorando: "Memorando",
  decreto: "Decreto",
  lei: "Lei",
  diario_oficial: "Diário Oficial",
  contrato: "Contrato",
  portaria: "Portaria",
};

export default function ControleHistoricoPage() {
  const [search, setSearch] = useState("");
  const [filterControlId, setFilterControlId] = useState<number | undefined>(undefined);

  const { data: controls } = trpc.controle.configuracao.list.useQuery();
  const { data: history, isLoading } = trpc.controle.historico.list.useQuery({
    controlId: filterControlId,
    limit: 200,
  });

  const filtered = (history ?? []).filter((h) => {
    if (!search) return true;
    return (
      h.formattedNumber?.toLowerCase().includes(search.toLowerCase()) ||
      h.documentDescription?.toLowerCase().includes(search.toLowerCase()) ||
      h.userName?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Histórico de Emissões</h1>
        <p className="text-sm text-muted-foreground mt-1">Registro completo de todos os números emitidos</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por número, descrição ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          onValueChange={(v) => setFilterControlId(v === "all" ? undefined : Number(v))}
        >
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
            <Clock className="w-4 h-4 text-primary" />
            {filtered.length} emissões encontradas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Nenhuma emissão encontrada</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
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
                      <Badge variant="outline" className="text-xs">
                        {docTypeLabels[h.documentType ?? ""] ?? h.documentType ?? "—"}
                      </Badge>
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
