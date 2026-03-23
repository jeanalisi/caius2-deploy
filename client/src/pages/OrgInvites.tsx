import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Mail, Plus, Send, X, RefreshCw, Users, Building2,
  Clock, CheckCircle, XCircle, Loader2, Copy, Link, History
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PROFILE_LABELS: Record<string, string> = {
  citizen: "Cidadão", attendant: "Atendente", sector_server: "Servidor de Setor",
  analyst: "Analista", manager: "Gestor", authority: "Autoridade", admin: "Administrador",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: Clock },
  accepted: { label: "Aceito", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: CheckCircle },
  expired: { label: "Expirado", color: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: XCircle },
};

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    email: "", name: "", orgUnitId: "", positionId: "",
    systemProfile: "attendant", notes: "", expiresInDays: 7,
  });
  const [createdInvite, setCreatedInvite] = useState<any>(null);

  const { data: orgUnits } = trpc.orgUnits.list.useQuery({ isActive: true });
  const { data: positions } = trpc.positions.list.useQuery({ isActive: true });

  const create = trpc.orgInvites.create.useMutation({
    onSuccess: (data) => {
      toast.success("Convite criado com sucesso!");
      setCreatedInvite(data);
      utils.orgInvites.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.email || !form.orgUnitId) return toast.error("E-mail e unidade são obrigatórios.");
    create.mutate({
      email: form.email,
      name: form.name || undefined,
      orgUnitId: Number(form.orgUnitId),
      positionId: form.positionId ? Number(form.positionId) : undefined,
      systemProfile: form.systemProfile as any,
      notes: form.notes || undefined,
      expiresInDays: form.expiresInDays,
    });
  };

  const inviteUrl = createdInvite ? `${window.location.origin}${createdInvite.inviteUrl}` : "";

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setCreatedInvite(null); }}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Novo Convite
          </DialogTitle>
        </DialogHeader>

        {createdInvite ? (
          <div className="space-y-4 py-2">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Convite criado com sucesso!</p>
              <p className="text-xs text-muted-foreground mt-1">Compartilhe o link abaixo com o usuário convidado.</p>
            </div>
            <div>
              <Label>Link do Convite</Label>
              <div className="flex gap-2 mt-1">
                <Input value={inviteUrl} readOnly className="text-xs font-mono" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Link copiado!"); }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              O convite expira em {form.expiresInDays} dias.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>E-mail *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@email.com" className="mt-1" />
              </div>
              <div>
                <Label>Nome (opcional)</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Unidade Organizacional *</Label>
              <Select value={form.orgUnitId} onValueChange={v => setForm(f => ({ ...f, orgUnitId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent>
                  {(orgUnits ?? []).map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.acronym ? `[${u.acronym}] ` : ""}{u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cargo (opcional)</Label>
                <Select value={form.positionId} onValueChange={v => setForm(f => ({ ...f, positionId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(positions ?? []).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Perfil do Sistema</Label>
                <Select value={form.systemProfile} onValueChange={v => setForm(f => ({ ...f, systemProfile: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROFILE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expira em (dias)</Label>
                <Input type="number" min={1} max={30} value={form.expiresInDays} onChange={e => setForm(f => ({ ...f, expiresInDays: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações adicionais sobre o convite" className="mt-1 resize-none" rows={2} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { onClose(); setCreatedInvite(null); }}>
            {createdInvite ? "Fechar" : "Cancelar"}
          </Button>
          {!createdInvite && (
            <Button onClick={handleSubmit} disabled={create.isPending} className="gap-1.5">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Criar Convite
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrgInvites() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState("invites");

  const utils = trpc.useUtils();
  const { data: invites, isLoading: loadingInvites } = trpc.orgInvites.list.useQuery({});
  const { data: allocations, isLoading: loadingAlloc } = trpc.userAllocations.list.useQuery({ isActive: true });
  const { data: myAllocations } = trpc.userAllocations.myAllocations.useQuery();

  const cancelMutation = trpc.orgInvites.cancel.useMutation({
    onSuccess: () => { toast.success("Convite cancelado."); utils.orgInvites.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMutation = trpc.userAllocations.deactivate.useMutation({
    onSuccess: () => { toast.success("Lotação encerrada."); utils.userAllocations.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const expireMutation = trpc.orgInvites.expireOld.useMutation({
    onSuccess: (count) => { toast.success(`${count} convite(s) expirado(s).`); utils.orgInvites.list.invalidate(); },
  });

  return (
    <OmniLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Convites & Lotações
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerenciamento de convites por e-mail e lotações de usuários nas unidades
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => expireMutation.mutate()} disabled={expireMutation.isPending} className="gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 ${expireMutation.isPending ? "animate-spin" : ""}`} />
                  Expirar Antigos
                </Button>
                <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Novo Convite
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-6 mt-3 mb-0 w-fit">
            <TabsTrigger value="invites" className="gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Convites
              {invites && <Badge variant="secondary" className="ml-1 text-xs">{invites.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="allocations" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Lotações Ativas
              {allocations && <Badge variant="secondary" className="ml-1 text-xs">{allocations.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-1.5">
              <History className="w-3.5 h-3.5" />
              Minha Lotação
            </TabsTrigger>
          </TabsList>

          {/* Invites Tab */}
          <TabsContent value="invites" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6 py-4">
              {loadingInvites ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (invites ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <Mail className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum convite enviado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(invites ?? []).map(invite => {
                    const status = STATUS_CONFIG[invite.status] ?? STATUS_CONFIG.pending;
                    const StatusIcon = status.icon;
                    return (
                      <Card key={invite.id} className="bg-card/60 border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Mail className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">{invite.name ?? invite.email}</span>
                                  {invite.name && <span className="text-xs text-muted-foreground">{invite.email}</span>}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${status.color}`}>
                                    <StatusIcon className="w-2.5 h-2.5" />
                                    {status.label}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border bg-card/60 border-border/50 text-muted-foreground">
                                    {PROFILE_LABELS[invite.systemProfile]}
                                  </span>
                                  {invite.expiresAt && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Expira: {format(new Date(invite.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isAdmin && invite.status === "pending" && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 gap-1 text-xs"
                                  onClick={() => {
                                    const url = `${window.location.origin}/convite/${invite.token}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success("Link copiado!");
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                  Copiar Link
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                  onClick={() => { if (confirm("Cancelar convite?")) cancelMutation.mutate({ id: invite.id }); }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Allocations Tab */}
          <TabsContent value="allocations" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6 py-4">
              {loadingAlloc ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (allocations ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma lotação ativa.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(allocations ?? []).map(alloc => (
                    <Card key={alloc.id} className="bg-card/60 border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">Usuário #{alloc.userId}</div>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-primary/20 text-primary border-primary/30">
                                  {PROFILE_LABELS[alloc.systemProfile]}
                                </span>
                                {alloc.isPrimary && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                    Lotação Principal
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground">
                                  Desde {format(new Date(alloc.startDate), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </div>
                            </div>
                          </div>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-destructive hover:text-destructive text-xs gap-1"
                              onClick={() => { if (confirm("Encerrar lotação?")) deactivateMutation.mutate({ id: alloc.id }); }}
                            >
                              <X className="w-3 h-3" />
                              Encerrar
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* My Allocation Tab */}
          <TabsContent value="my" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full px-6 py-4">
              {(myAllocations ?? []).length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <Building2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Você não possui lotações ativas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(myAllocations ?? []).map(alloc => (
                    <Card key={alloc.id} className="bg-card/60 border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">Unidade #{alloc.orgUnitId}</div>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-primary/20 text-primary border-primary/30">
                                {PROFILE_LABELS[alloc.systemProfile]}
                              </span>
                              {alloc.isPrimary && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                  Principal
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                Desde {format(new Date(alloc.startDate), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {showCreate && <InviteDialog open={showCreate} onClose={() => setShowCreate(false)} />}
    </OmniLayout>
  );
}
