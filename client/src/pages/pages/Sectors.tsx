import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function CreateSectorDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const { data: sectors } = trpc.caius.sectors.list.useQuery();
  const [parentId, setParentId] = useState<number | undefined>();

  const create = trpc.caius.sectors.create.useMutation({
    onSuccess: () => {
      toast.success("Setor criado com sucesso");
      setOpen(false);
      setForm({ name: "", code: "", description: "" });
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Novo Setor</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Criar Setor
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome do setor" className="mt-1" />
            </div>
            <div>
              <Label>Código *</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Ex: SECOM, SEFIN" className="mt-1 uppercase" />
            </div>
            <div className="col-span-2">
              <Label>Setor Pai (opcional)</Label>
              <Select value={parentId?.toString() ?? "none"} onValueChange={(v) => setParentId(v && v !== "none" ? Number(v) : undefined)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum (setor raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (setor raiz)</SelectItem>
                  {sectors?.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="mt-1" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => create.mutate({ ...form, parentId })}
            disabled={!form.name || !form.code || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Setor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Sectors() {
  const utils = trpc.useUtils();
  const { data: sectors, isLoading } = trpc.caius.sectors.list.useQuery();

  const updateSector = trpc.caius.sectors.update.useMutation({
    onSuccess: () => { toast.success("Setor atualizado"); utils.caius.sectors.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteSector = trpc.caius.sectors.delete.useMutation({
    onSuccess: () => { toast.success("Setor removido"); utils.caius.sectors.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <OmniLayout title="Setores">
      <div className="p-6 space-y-5">
        <div className="flex justify-end">
          <CreateSectorDialog onCreated={() => utils.caius.sectors.list.invalidate()} />
        </div>

        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : !sectors?.length ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">Nenhum setor cadastrado</p>
                    </td>
                  </tr>
                ) : (
                  sectors.map((sector) => (
                    <tr key={sector.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-muted text-muted-foreground rounded px-2 py-0.5 uppercase">{sector.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{sector.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground line-clamp-1">{sector.description ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sector.isActive}
                            onCheckedChange={(v) => updateSector.mutate({ id: sector.id, isActive: v })}
                          />
                          <span className={cn("text-xs", sector.isActive ? "text-green-400" : "text-muted-foreground")}>
                            {sector.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { if (confirm("Remover setor?")) deleteSector.mutate({ id: sector.id }); }}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
