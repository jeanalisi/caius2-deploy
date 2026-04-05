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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Power, Hash, Settings, Search } from "lucide-react";

const docTypeLabels: Record<string, string> = {
  oficio: "Ofício",
  memorando: "Memorando",
  decreto: "Decreto",
  lei: "Lei",
  diario_oficial: "Diário Oficial",
  contrato: "Contrato Administrativo",
  portaria: "Portaria",
};

const formatLabels: Record<string, string> = {
  sequencial: "Sequencial (ex: 0001)",
  ano_sequencial: "Ano/Sequencial (ex: 2025/0001)",
  sequencial_ano: "Sequencial/Ano (ex: 0001/2025)",
};

const controlSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  documentType: z.enum(["oficio", "memorando", "decreto", "lei", "diario_oficial", "contrato", "portaria"]),
  unitId: z.coerce.number().min(1, "Unidade obrigatória"),
  prefix: z.string().optional(),
  numberFormat: z.enum(["sequencial", "ano_sequencial", "sequencial_ano"]),
  digits: z.coerce.number().min(1).max(10),
  referenceYear: z.coerce.number().min(2000).max(2100),
  resetAnnually: z.boolean(),
});
type ControlForm = z.infer<typeof controlSchema>;

const manualSchema = z.object({
  nextNumber: z.coerce.number().min(1, "Número deve ser maior que 0"),
  justification: z.string().min(5, "Justificativa obrigatória (mínimo 5 caracteres)"),
});
type ManualForm = z.infer<typeof manualSchema>;

export default function ControleConfiguracaoPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [manualId, setManualId] = useState<number | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [deactivateJustification, setDeactivateJustification] = useState("");

  const { data: controls, isLoading } = trpc.controle.configuracao.list.useQuery();
  const { data: units } = trpc.controle.unidades.list.useQuery();

  const createMutation = trpc.controle.configuracao.create.useMutation({
    onSuccess: () => {
      toast.success("Controle criado com sucesso");
      utils.controle.configuracao.list.invalidate();
      setShowCreate(false);
      createForm.reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.controle.configuracao.update.useMutation({
    onSuccess: () => {
      toast.success("Controle atualizado");
      utils.controle.configuracao.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const setActiveMutation = trpc.controle.configuracao.setActive.useMutation({
    onSuccess: () => {
      toast.success("Status alterado");
      utils.controle.configuracao.list.invalidate();
      setDeactivateId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const manualMutation = trpc.controle.configuracao.manualSetNumber.useMutation({
    onSuccess: () => {
      toast.success("Número ajustado manualmente");
      utils.controle.configuracao.list.invalidate();
      setManualId(null);
      manualForm.reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const createForm = useForm<ControlForm>({
    resolver: zodResolver(controlSchema) as any,
    defaultValues: {
      numberFormat: "ano_sequencial",
      digits: 4,
      referenceYear: new Date().getFullYear(),
      resetAnnually: true,
    },
  });

  const editForm = useForm<Partial<ControlForm>>({
    resolver: zodResolver(controlSchema.partial()) as any,
  });

  const manualForm = useForm<ManualForm>({
    resolver: zodResolver(manualSchema) as any,
  });

  const filtered = (controls ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      docTypeLabels[c.documentType]?.toLowerCase().includes(search.toLowerCase())
  );

  const editingControl = controls?.find((c) => c.id === editingId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração de Controles</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os controles de numeração por tipo documental</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Controle
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar controles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhum controle encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Próximo Nº</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {docTypeLabels[c.documentType] ?? c.documentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.unitName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatLabels[c.numberFormat] ?? c.numberFormat}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">#{c.nextNumber}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "default" : "secondary"} className="text-xs">
                        {c.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(c.id);
                            editForm.reset({
                              name: c.name,
                              prefix: c.prefix ?? "",
                              numberFormat: c.numberFormat as ControlForm["numberFormat"],
                              digits: c.digits,
                              referenceYear: c.referenceYear,
                              resetAnnually: c.resetAnnually,
                            });
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setManualId(c.id)}
                        >
                          <Hash className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (c.active) {
                              setDeactivateId(c.id);
                            } else {
                              setActiveMutation.mutate({ id: c.id, active: true });
                            }
                          }}
                        >
                          <Power className={`w-3.5 h-3.5 ${c.active ? "text-green-500" : "text-muted-foreground"}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Controle de Numeração</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d as any))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome do Controle</Label>
                <Input {...createForm.register("name")} placeholder="Ex: Ofícios da SEMFIN 2025" />
                {createForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo Documental</Label>
                <Select onValueChange={(v) => createForm.setValue("documentType", v as ControlForm["documentType"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(docTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unidade Organizacional</Label>
                <Select onValueChange={(v) => createForm.setValue("unitId", Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(units ?? []).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prefixo (opcional)</Label>
                <Input {...createForm.register("prefix")} placeholder="Ex: OF, MEM, DEC..." />
              </div>
              <div className="space-y-1.5">
                <Label>Formato de Numeração</Label>
                <Select
                  defaultValue="ano_sequencial"
                  onValueChange={(v) => createForm.setValue("numberFormat", v as ControlForm["numberFormat"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(formatLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dígitos</Label>
                <Input {...createForm.register("digits")} type="number" min={1} max={10} />
              </div>
              <div className="space-y-1.5">
                <Label>Ano de Referência</Label>
                <Input {...createForm.register("referenceYear")} type="number" />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch
                  id="resetAnnually"
                  checked={createForm.watch("resetAnnually")}
                  onCheckedChange={(v) => createForm.setValue("resetAnnually", v)}
                />
                <Label htmlFor="resetAnnually">Reiniciar anualmente</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar Controle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Controle — {editingControl?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((d) => updateMutation.mutate({ id: editingId!, ...d }))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome</Label>
                <Input {...editForm.register("name")} />
              </div>
              <div className="space-y-1.5">
                <Label>Prefixo</Label>
                <Input {...editForm.register("prefix")} />
              </div>
              <div className="space-y-1.5">
                <Label>Formato</Label>
                <Select
                  defaultValue={editingControl?.numberFormat}
                  onValueChange={(v) => editForm.setValue("numberFormat", v as ControlForm["numberFormat"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(formatLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dígitos</Label>
                <Input {...editForm.register("digits")} type="number" min={1} max={10} />
              </div>
              <div className="space-y-1.5">
                <Label>Ano de Referência</Label>
                <Input {...editForm.register("referenceYear")} type="number" />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch
                  id="editResetAnnually"
                  checked={editForm.watch("resetAnnually") ?? editingControl?.resetAnnually}
                  onCheckedChange={(v) => editForm.setValue("resetAnnually", v)}
                />
                <Label htmlFor="editResetAnnually">Reiniciar anualmente</Label>
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

      {/* Manual number dialog */}
      <Dialog open={!!manualId} onOpenChange={() => setManualId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste Manual de Numeração</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={manualForm.handleSubmit((d) => manualMutation.mutate({ id: manualId!, ...d }))}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Próximo Número</Label>
              <Input {...manualForm.register("nextNumber")} type="number" min={1} />
              {manualForm.formState.errors.nextNumber && (
                <p className="text-xs text-destructive">{manualForm.formState.errors.nextNumber.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Justificativa</Label>
              <Textarea {...manualForm.register("justification")} rows={3} placeholder="Motivo do ajuste manual..." />
              {manualForm.formState.errors.justification && (
                <p className="text-xs text-destructive">{manualForm.formState.errors.justification.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setManualId(null)}>Cancelar</Button>
              <Button type="submit" disabled={manualMutation.isPending}>
                {manualMutation.isPending ? "Ajustando..." : "Ajustar Número"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Controle</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação impedirá a emissão de novos números por este controle. Informe a justificativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Justificativa para desativação..."
            value={deactivateJustification}
            onChange={(e) => setDeactivateJustification(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deactivateId) return;
                setActiveMutation.mutate({
                  id: deactivateId,
                  active: false,
                  justification: deactivateJustification,
                });
              }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
