import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Briefcase, Plus, Edit, Trash2, Search, CheckCircle, Loader2, Shield, PenLine } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const LEVEL_LABELS: Record<string, string> = {
  secretario: "Secretário", secretario_executivo: "Secretário Executivo",
  diretor: "Diretor", coordenador: "Coordenador", gerente: "Gerente",
  supervisor: "Supervisor", chefe: "Chefe", assessor_tecnico: "Assessor Técnico",
  assessor_especial: "Assessor Especial", outro: "Outro",
};

const PROVISION_LABELS: Record<string, string> = {
  comissao: "Comissão", efetivo: "Efetivo", designacao: "Designação", contrato: "Contrato",
};

const LEVEL_COLORS: Record<string, string> = {
  secretario: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  secretario_executivo: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  diretor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  coordenador: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  gerente: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  supervisor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  chefe: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  assessor_tecnico: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  assessor_especial: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  outro: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

function PositionDialog({ open, onClose, editPos }: { open: boolean; onClose: () => void; editPos?: any }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: editPos?.name ?? "",
    code: editPos?.code ?? "",
    level: editPos?.level ?? "outro",
    provisionType: editPos?.provisionType ?? "comissao",
    canSign: editPos?.canSign ?? false,
    canApprove: editPos?.canApprove ?? false,
  });

  const create = trpc.positions.create.useMutation({
    onSuccess: () => { toast.success("Cargo criado!"); utils.positions.list.invalidate(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.positions.update.useMutation({
    onSuccess: () => { toast.success("Cargo atualizado!"); utils.positions.list.invalidate(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error("Nome é obrigatório.");
    if (editPos) update.mutate({ id: editPos.id, ...form as any });
    else create.mutate(form as any);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>{editPos ? "Editar Cargo" : "Novo Cargo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Diretor de Obras" className="mt-1" />
            </div>
            <div>
              <Label>Código</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="Ex: DIR" className="mt-1 font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nível</Label>
              <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Provimento</Label>
              <Select value={form.provisionType} onValueChange={v => setForm(f => ({ ...f, provisionType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVISION_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.canSign} onCheckedChange={v => setForm(f => ({ ...f, canSign: v }))} />
              <Label className="cursor-pointer">Pode Assinar</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.canApprove} onCheckedChange={v => setForm(f => ({ ...f, canApprove: v }))} />
              <Label className="cursor-pointer">Pode Aprovar</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editPos ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Positions() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editPos, setEditPos] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: positions, isLoading } = trpc.positions.list.useQuery({ isActive: true });

  const deleteMutation = trpc.positions.delete.useMutation({
    onSuccess: () => { toast.success("Cargo desativado."); utils.positions.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (positions ?? []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OmniLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Cargos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerenciamento de cargos e funções da estrutura organizacional
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Novo Cargo
            </Button>
          )}
        </div>

        <div className="px-6 py-3 border-b border-border/30">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cargo..." className="pl-9 h-8 text-sm" />
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Briefcase className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum cargo encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(pos => (
                <Card key={pos.id} className="bg-card/60 border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          {pos.code && <div className="text-[10px] font-mono text-primary font-bold">{pos.code}</div>}
                          <div className="text-sm font-medium text-foreground">{pos.name}</div>
                        </div>
                      </div>
                      {isAdmin && !pos.isSeeded && (
                        <div className="flex gap-1">
                          <button onClick={() => setEditPos(pos)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (confirm("Desativar cargo?")) deleteMutation.mutate({ id: pos.id }); }} className="p-1 text-muted-foreground hover:text-destructive rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LEVEL_COLORS[pos.level] ?? ""}`}>
                        {LEVEL_LABELS[pos.level] ?? pos.level}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border bg-card/60 border-border/50 text-muted-foreground">
                        {PROVISION_LABELS[pos.provisionType ?? "comissao"]}
                      </span>
                      {pos.canSign && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-0.5">
                          <PenLine className="w-2.5 h-2.5" />Assina
                        </span>
                      )}
                      {pos.canApprove && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-500/20 text-blue-300 border-blue-500/30 flex items-center gap-0.5">
                          <Shield className="w-2.5 h-2.5" />Aprova
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {showCreate && <PositionDialog open={showCreate} onClose={() => setShowCreate(false)} />}
      {editPos && <PositionDialog open={!!editPos} onClose={() => setEditPos(null)} editPos={editPos} />}
    </OmniLayout>
  );
}
