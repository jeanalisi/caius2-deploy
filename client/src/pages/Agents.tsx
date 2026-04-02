import OmniLayout from "@/components/OmniLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Loader2, Shield, Users, UserPlus, Mail, Copy, Check, Search,
  LayoutDashboard, Inbox, MessageSquare, Ticket, ClipboardList, Scale,
  FileText, BookOpen, PenLine, TrendingUp, Globe, MapPin, Library,
  Activity, MailOpen, Bot, Sparkles, Workflow, Wifi, Building2, BarChart3,
  ShieldCheck, Tag, Settings2, FormInput, Paperclip, Monitor, HelpCircle,
  GitBranch, Briefcase, Upload, Shield as ShieldIcon, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const PROFILE_LABELS: Record<string, string> = {
  citizen: "Cidadão",
  attendant: "Atendente",
  sector_server: "Servidor de Setor",
  analyst: "Analista",
  manager: "Gestor",
  authority: "Autoridade",
  admin: "Administrador",
};

// ─── Definição completa dos itens de menu agrupados ──────────────────────────
const MENU_GROUPS = [
  {
    group: "Atendimento",
    items: [
      { key: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "/inbox", label: "Inbox Unificado", icon: Inbox },
      { key: "/conversations", label: "Conversas", icon: MessageSquare },
      { key: "/tickets", label: "Tickets", icon: Ticket },
      { key: "/queue", label: "Fila de Atendimento", icon: Users },
    ],
  },
  {
    group: "Gestão Pública",
    items: [
      { key: "/protocols", label: "Protocolos (NUP)", icon: ClipboardList },
      { key: "/processes", label: "Processos Adm.", icon: Scale },
      { key: "/documents", label: "Documentos Oficiais", icon: FileText },
      { key: "/document-signatures", label: "Assinaturas Digitais", icon: ShieldIcon },
      { key: "/sign-external-pdf", label: "Assinar PDF Externo", icon: Upload },
      { key: "/ombudsman", label: "Ouvidoria", icon: BookOpen },
      { key: "/templates", label: "Modelos de Documentos", icon: PenLine },
      { key: "/executive-dashboard", label: "Dashboard Executivo", icon: TrendingUp },
      { key: "/ouvidoria-admin", label: "Ouvidoria / e-SIC", icon: Globe },
      { key: "/geo-monitor", label: "Geo Monitor", icon: MapPin },
      { key: "/knowledge-base", label: "Base de Conhecimento", icon: Library },
    ],
  },
  {
    group: "Canais",
    items: [
      { key: "/channel-health", label: "Saúde dos Canais", icon: Activity },
      { key: "/email-institucional", label: "E-mail Institucional", icon: MailOpen },
      { key: "/chatbot", label: "Chatbot WhatsApp", icon: Bot },
      { key: "/atendimento", label: "Webchat Cidadão", icon: MessageSquare },
      { key: "/caius", label: "cAIus — Agente de IA", icon: Sparkles },
    ],
  },
  {
    group: "Administração",
    items: [
      { key: "/workflow", label: "Fluxos", icon: Workflow },
      { key: "/accounts", label: "Contas Conectadas", icon: Wifi },
      { key: "/agents", label: "Agentes e Usuários", icon: Users },
      { key: "/sectors", label: "Setores", icon: Building2 },
      { key: "/reports", label: "Relatórios", icon: BarChart3 },
      { key: "/audit", label: "Auditoria", icon: ShieldCheck },
      { key: "/ai-settings", label: "Integrações de IA", icon: Sparkles },
      { key: "/tags", label: "Tags", icon: Tag },
    ],
  },
  {
    group: "Configurações",
    items: [
      { key: "/service-types", label: "Tipos de Atendimento", icon: Settings2 },
      { key: "/form-builder", label: "Construtor de Formulários", icon: FormInput },
      { key: "/attachments", label: "Gestão de Anexos", icon: Paperclip },
      { key: "/institutional", label: "Config. Institucional", icon: Building2 },
      { key: "/online-sessions", label: "Sessões Online", icon: Monitor },
      { key: "/context-help", label: "Ajuda Contextual", icon: HelpCircle },
    ],
  },
  {
    group: "Estrutura Org.",
    items: [
      { key: "/org-structure", label: "Estrutura Organizacional", icon: GitBranch },
      { key: "/positions", label: "Cargos e Funções", icon: Briefcase },
      { key: "/org-invites", label: "Convites e Lotações", icon: Mail },
    ],
  },
];

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

// ─── Dialog de Permissões de Menu ────────────────────────────────────────────
function MenuPermissionsDialog({
  user,
  open,
  onClose,
}: {
  user: any;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: perms, isLoading } = trpc.users.getMenuPermissions.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: open && !!user }
  );

  const setPermMutation = trpc.users.setMenuPermission.useMutation({
    onSuccess: () => utils.users.getMenuPermissions.invalidate({ userId: user?.id }),
    onError: (e) => toast.error(e.message),
  });

  // Admins têm acesso total — mostrar aviso
  const isAdmin = user?.role === "admin";

  // Determina se um item está habilitado:
  // - Se não há registro, padrão = true (acesso liberado)
  const isEnabled = (key: string) => {
    if (!perms) return true;
    if (key in perms) return (perms as Record<string, boolean>)[key];
    return true;
  };

  const handleToggle = (key: string, value: boolean) => {
    if (isAdmin) return; // admins sempre têm acesso total
    setPermMutation.mutate({ userId: user.id, menuKey: key, enabled: value });
  };

  // Habilitar/desabilitar grupo inteiro
  const handleGroupToggle = (items: { key: string }[], value: boolean) => {
    if (isAdmin) return;
    items.forEach(item => {
      setPermMutation.mutate({ userId: user.id, menuKey: item.key, enabled: value });
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Permissões de Menu — {user?.name ?? user?.email ?? "Usuário"}
          </DialogTitle>
        </DialogHeader>

        {isAdmin && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary font-medium">
            Administradores têm acesso irrestrito a todos os itens de menu.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-5 pb-2">
              {MENU_GROUPS.map(({ group, items }) => {
                const allEnabled = items.every(i => isEnabled(i.key));
                const someEnabled = items.some(i => isEnabled(i.key));
                return (
                  <Card key={group} className="border-border/60">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
                        {group}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {items.filter(i => isEnabled(i.key)).length}/{items.length} habilitados
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isAdmin || setPermMutation.isPending}
                          onClick={() => handleGroupToggle(items, !allEnabled)}
                        >
                          {allEnabled ? "Desabilitar todos" : "Habilitar todos"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 pt-0">
                      <div className="grid grid-cols-1 gap-1">
                        {items.map(({ key, label, icon: Icon }) => (
                          <div
                            key={key}
                            className={cn(
                              "flex items-center justify-between rounded-md px-3 py-2 transition-colors",
                              isEnabled(key) ? "bg-muted/30" : "bg-muted/10 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm">{label}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{key}</span>
                            </div>
                            <Switch
                              checked={isEnabled(key)}
                              disabled={isAdmin || setPermMutation.isPending}
                              onCheckedChange={(v) => handleToggle(key, v)}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Agents() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>(defaultInviteForm);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [permUser, setPermUser] = useState<any>(null);

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
                  <div className="col-span-3">Usuário</div>
                  <div className="col-span-2">Função</div>
                  <div className="col-span-2">É Agente</div>
                  <div className="col-span-2">Disponível</div>
                  <div className="col-span-2">Último acesso</div>
                  <div className="col-span-1">Menu</div>
                </div>
                {filteredUsers.map((user) => (
                  <div key={user.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-accent/30 transition-colors">
                    <div className="col-span-3 flex items-center gap-2.5">
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
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Gerenciar permissões de menu"
                        onClick={() => setPermUser(user)}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Permissões de Menu */}
      <MenuPermissionsDialog
        user={permUser}
        open={!!permUser}
        onClose={() => setPermUser(null)}
      />

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
