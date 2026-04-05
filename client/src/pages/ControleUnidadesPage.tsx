import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Building2, ExternalLink, Info } from "lucide-react";
import { useLocation } from "wouter";

const ORG_TYPE_LABELS: Record<string, string> = {
  prefeitura: "Prefeitura",
  gabinete: "Gabinete",
  procuradoria: "Procuradoria",
  controladoria: "Controladoria",
  secretaria: "Secretaria",
  superintendencia: "Superintendência",
  secretaria_executiva: "Secretaria Executiva",
  diretoria: "Diretoria",
  departamento: "Departamento",
  coordenacao: "Coordenação",
  gerencia: "Gerência",
  supervisao: "Supervisão",
  secao: "Seção",
  setor: "Setor",
  nucleo: "Núcleo",
  assessoria: "Assessoria",
  unidade: "Unidade",
  junta: "Junta",
  tesouraria: "Tesouraria",
  ouvidoria: "Ouvidoria",
};

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  2: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  3: "bg-green-500/15 text-green-400 border-green-500/20",
  4: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

export default function ControleUnidadesPage() {
  const [, navigate] = useLocation();
  const { data: units, isLoading } = trpc.controle.unidades.list.useQuery();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Unidades Organizacionais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unidades disponíveis para vincular aos controles de numeração de documentos.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate("/org-structure")}
        >
          <ExternalLink className="h-4 w-4" />
          Gerenciar Estrutura Org.
        </Button>
      </div>

      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Integração com Estrutura Organizacional</p>
            <p className="text-muted-foreground mt-0.5">
              As unidades exibidas aqui são as mesmas cadastradas em{" "}
              <button
                className="text-primary underline underline-offset-2 hover:text-primary/80"
                onClick={() => navigate("/org-structure")}
              >
                Estrutura Organizacional
              </button>
              . Para adicionar, editar ou desativar unidades, acesse a página de Estrutura Organizacional.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {isLoading ? "Carregando..." : `${units?.length ?? 0} unidades ativas`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !units?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Building2 className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhuma unidade encontrada.</p>
              <Button variant="outline" size="sm" onClick={() => navigate("/org-structure")}>
                Cadastrar na Estrutura Org.
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nível</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.level && u.level > 1 && (
                        <span className="text-muted-foreground mr-1">
                          {"  ".repeat((u.level ?? 1) - 1)}└
                        </span>
                      )}
                      {u.name}
                    </TableCell>
                    <TableCell>
                      {u.acronym ? (
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{u.acronym}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground capitalize">
                        {ORG_TYPE_LABELS[u.type ?? ""] ?? u.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${LEVEL_COLORS[u.level ?? 1] ?? "bg-muted text-muted-foreground"}`}
                      >
                        Nível {u.level ?? 1}
                      </Badge>
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
