import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Building2 } from "lucide-react";

const unitTypeLabels: Record<string, string> = {
  secretaria: "Secretaria",
  setor: "Setor",
  gabinete: "Gabinete",
  departamento: "Departamento",
  coordenacao: "Coordenação",
  outro: "Outro",
};

const schema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  acronym: z.string().optional(),
  type: z.enum(["secretaria", "setor", "gabinete", "departamento", "coordenacao", "outro"]),
  parentId: z.coerce.number().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ControleUnidadesPage() {
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: units, isLoading } = trpc.controle.unidades.list.useQuery();

  const createMutation = trpc.controle.unidades.create.useMutation({
    onSuccess: () => {
      toast.success("Unidade criada");
      utils.controle.unidades.list.invalidate();
      setShowCreate(false);
      form.reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.controle.unidades.update.useMutation({
    onSuccess: () => {
      toast.success("Unidade atualizada");
      utils.controle.unidades.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const form = useForm<FormData>({ resolver: zodResolver(schema) as any, defaultValues: { type: "setor" } });
  const editForm = useForm<Partial<FormData>>({ resolver: zodResolver(schema.partial()) as any });

  const editingUnit = units?.find((u) => u.id === editingId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Unidades Organizacionais</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as unidades vinculadas aos controles de numeração</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Unidade
        </Button>
      </div>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !units || units.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhuma unidade cadastrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade Pai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((u) => {
                  const parent = units.find((p) => p.id === u.parentId);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {u.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.acronym ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{unitTypeLabels[u.type] ?? u.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{parent?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.active ? "default" : "secondary"} className="text-xs">
                          {u.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(u.id);
                            editForm.reset({
                              name: u.name,
                              acronym: u.acronym ?? "",
                              type: u.type as FormData["type"],
                              parentId: u.parentId ?? undefined,
                            });
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Unidade Organizacional</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input {...form.register("name")} placeholder="Ex: Secretaria Municipal de Finanças" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sigla (opcional)</Label>
                <Input {...form.register("acronym")} placeholder="Ex: SEMFIN" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select defaultValue="setor" onValueChange={(v) => form.setValue("type", v as FormData["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(unitTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Unidade Pai (opcional)</Label>
              <Select onValueChange={(v) => form.setValue("parentId", v ? Number(v) : undefined)}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Nenhuma (raiz)</SelectItem>
                  {(units ?? []).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar — {editingUnit?.name}</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit((d) => updateMutation.mutate({ id: editingId!, ...d }))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input {...editForm.register("name")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sigla</Label>
                <Input {...editForm.register("acronym")} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  defaultValue={editingUnit?.type}
                  onValueChange={(v) => editForm.setValue("type", v as FormData["type"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(unitTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
