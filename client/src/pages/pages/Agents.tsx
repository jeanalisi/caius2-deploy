import OmniLayout from "@/components/OmniLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Loader2, Shield, Users, UserPlus, Mail, Copy, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const PROFILE_LABELS: Record<string, string> = {
  citizen: "Cidadão",
  attendant: "Atendente",
  sector_server: "Servidor de Setor",
  analyst: "Analista",
  manager: "Gestor",
  authority: "Autoridade",
  admin: "Administrador",
};

interface InviteForm {
  email: string;
  name: string;
  orgUnitId: string;
  positionId: string;
  systemProfile: string;
  notes: string;
  expiresInDays: number;
}

const defaultInviteForm: InviteForm = {
  email: "",
  name: "",
  orgUnitId: "",
  positionId: "",
  systemProfile: "attendant",
  notes: "",
  expiresInDays: 7,
};

export default function Agents() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>(defaultInviteForm);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: orgUnits = [] } = trpc.orgUnits.list.useQuery({});
  const { data: positions = [] } = trpc.positions.list.useQuery({});

  const update = trpc.users.update.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); toast.success("Usuário atualizado"); },
    onError: (e) => toast.error(e.message),
  });

  const createInvite = trpc.orgInvites.create.useMutation({
    onSuccess: (res: any) => {
      const link = `${window.location.origin}/convite/${res.token}`;
      setGeneratedLink(link);
      utils.orgInvites.list.invalidate();
      toast.success("Convite gerado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copiado!");
  };

  const handleSendInvite = () => {
    if (!inviteForm.email) return toast.error("E-mail é obrigatório.");
    if (!inviteForm.orgUnitId) return toast.error("Selecione uma unidade organizacional.");
    createInvite.mutate({
      email: inviteForm.email,
      name: inviteForm.name || undefined,
      orgUnitId: Number(inviteForm.orgUnitId),
      positionId: inviteForm.positionId ? Number(inviteForm.positionId) : undefined,
      systemProfile: inviteForm.systemProfile as any,
      notes: inviteForm.notes || undefined,
      expiresInDays: inviteForm.expiresInDays,
    });
  };

  const filteredUsers = (users ?? []).filter(u =>
    !search ||
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OmniLayout title="Usuários e Agentes">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Users className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Usuários e Agentes</p>
              <p className="text-xs text-muted-foreground">Gerencie permissões e disponibilidade da equipe</p>
            </div>
          </div>
          <Button onClick={() => { setInviteForm(defaultInviteForm); setGeneratedLink(null); setShowInvite(true); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Usuário
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Users Table */}
        <Card className="border-border bg-card/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Users className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {search ? "Nenhum usuário encontrado para a busca." : "Nenhum usuário cadastrado."}
                </p>
                {!search && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowInvite(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Convidar primeiro usuário
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-4">Usuário</div>
                  <div className="col-span-2">Função</div>
                  <div className="col-span-2">É Agente</div>
                  <div className="col-span-2">Disponível</div>
                  <div className="col-span-2">Último acesso</div>
                </div>
                {filteredUsers.map((user) => (
                  <div key={user.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-accent/30 transition-colors">
                    <div className="col-span-4 flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {(user.name ?? "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email ?? "—"}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={user.role}
                        onValueChange={(v) => update.mutate({ id: user.id, role: v as any })}
                      >
                        <SelectTrigger className={cn(
                          "h-7 text-[10px] border rounded-full px-2 w-24",
                          user.role === "admin"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-secondary text-muted-foreground border-border"
                        )}>
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Switch
                        checked={user.isAgent}
                        onCheckedChange={(v) => update.mutate({ id: user.id, isAgent: v })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Switch
                        checked={user.isAvailable}
                        disabled={!user.isAgent}
                        onCheckedChange={(v) => update.mutate({ id: user.id, isAvailable: v })}
                      />
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">
                        {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={(open) => { if (!open) { setShowInvite(false); setGeneratedLink(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Convidar Novo Usuário
            </DialogTitle>
          </DialogHeader>

          {generatedLink ? (
            /* Success state — show link */
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 text-center">
                <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Convite gerado com sucesso!</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Um e-mail foi enviado para <strong>{inviteForm.email}</strong>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Link de Convite</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="text-xs font-mono" />
                  <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Compartilhe este link com o usuário. Expira em {inviteForm.expiresInDays} dia(s).
                </p>
              </div>
              <DialogFooter>
                <Button onClick={() => { setInviteForm(defaultInviteForm); setGeneratedLink(null); }}>
                  Novo Convite
                </Button>
                <Button variant="outline" onClick={() => setShowInvite(false)}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            /* Form state */
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    placeholder="usuario@prefeitura.gov.br"
                    value={inviteForm.email}
                    onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome (opcional)</Label>
                  <Input
                    placeholder="Nome completo"
                    value={inviteForm.name}
                    onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Unidade Organizacional *</Label>
                <Select value={inviteForm.orgUnitId} onValueChange={v => setInviteForm(f => ({ ...f, orgUnitId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(orgUnits as any[]).map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Cargo (opcional)</Label>
                  <Select value={inviteForm.positionId || "none"} onValueChange={v => setInviteForm(f => ({ ...f, positionId: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(positions as any[]).map((p: any) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Perfil de Acesso</Label>
                  <Select value={inviteForm.systemProfile} onValueChange={v => setInviteForm(f => ({ ...f, systemProfile: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROFILE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Validade (dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={inviteForm.expiresInDays}
                    onChange={e => setInviteForm(f => ({ ...f, expiresInDays: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Notas internas..."
                    value={inviteForm.notes}
                    onChange={e => setInviteForm(f => ({ ...f, notes: e.target.value }))}
                    rows={1}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
                <Button onClick={handleSendInvite} disabled={createInvite.isPending}>
                  {createInvite.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>
                  ) : (
                    <><Mail className="h-4 w-4 mr-2" />Enviar Convite</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
