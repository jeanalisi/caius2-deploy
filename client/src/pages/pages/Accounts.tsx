import OmniLayout from "@/components/OmniLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  Instagram,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Channel = "whatsapp" | "instagram" | "email";

const CHANNEL_INFO = {
  whatsapp: {
    label: "WhatsApp",
    icon: "WA",
    description: "Conecte via QR Code do WhatsApp Web",
    color: "channel-whatsapp",
  },
  instagram: {
    label: "Instagram",
    icon: "IG",
    description: "Conecte via autorização OAuth do Instagram",
    color: "channel-instagram",
  },
  email: {
    label: "E-mail",
    icon: "EM",
    description: "Conecte via IMAP/SMTP institucional",
    color: "channel-email",
  },
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    connected: { label: "Conectado", className: "bg-green-500/10 text-green-400 border-green-500/20" },
    connecting: { label: "Conectando...", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    disconnected: { label: "Desconectado", className: "bg-muted/50 text-muted-foreground border-border" },
    error: { label: "Erro", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  };
  const info = map[status] ?? map.disconnected;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border", info.className)}>
      {info.label}
    </span>
  );
}

// ── WhatsApp QR Dialog ────────────────────────────────────────────────────────
function WhatsAppQRDialog({ accountId, onClose }: { accountId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data, refetch } = trpc.accounts.getQrCode.useQuery({ accountId }, { refetchInterval: 3000 });
  const connect = trpc.accounts.connectWhatsApp.useMutation({
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    connect.mutate({ accountId });
  }, [accountId]);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Conectar WhatsApp
        </DialogTitle>
        <DialogDescription>
          Abra o WhatsApp no seu celular, vá em Dispositivos Conectados e escaneie o QR Code abaixo.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-4 py-4">
        {data?.status === "connected" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-16 w-16 text-green-400" />
            <p className="text-sm font-medium text-foreground">WhatsApp conectado com sucesso!</p>
          </div>
        ) : data?.qrCode ? (
          <div className="rounded-xl border border-border p-3 bg-white">
            <img src={data.qrCode} alt="QR Code WhatsApp" className="h-56 w-56" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
          </div>
        )}
        {data?.status !== "connected" && (
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </Button>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {data?.status === "connected" ? "Fechar" : "Cancelar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Add Account Dialog ────────────────────────────────────────────────────────
function AddAccountDialog({
  channel,
  onClose,
}: {
  channel: Channel;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: "",
    identifier: "",
    imapHost: "",
    imapPort: "993",
    imapUser: "",
    imapPassword: "",
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPassword: "",
    smtpSecure: false,
  });

  const create = trpc.accounts.create.useMutation({
    onSuccess: () => {
      utils.accounts.list.invalidate();
      toast.success("Conta criada com sucesso!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.name || !form.identifier) {
      toast.error("Preencha o nome e identificador");
      return;
    }
    create.mutate({
      channel,
      name: form.name,
      identifier: form.identifier,
      ...(channel === "email" && {
        imapHost: form.imapHost,
        imapPort: parseInt(form.imapPort),
        imapUser: form.imapUser,
        imapPassword: form.imapPassword,
        smtpHost: form.smtpHost,
        smtpPort: parseInt(form.smtpPort),
        smtpUser: form.smtpUser,
        smtpPassword: form.smtpPassword,
        smtpSecure: form.smtpSecure,
      }),
    });
  };

  const info = CHANNEL_INFO[channel];

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Adicionar conta {info.label}</DialogTitle>
        <DialogDescription>{info.description}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da conta</Label>
            <Input
              placeholder="Ex: Suporte Principal"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {channel === "whatsapp" ? "Número (com DDD)" : channel === "instagram" ? "@handle" : "E-mail"}
            </Label>
            <Input
              placeholder={
                channel === "whatsapp" ? "+55 11 99999-9999" : channel === "instagram" ? "@empresa" : "suporte@empresa.com"
              }
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            />
          </div>
        </div>

        {channel === "instagram" && (
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Autorização OAuth</p>
            <p className="text-xs text-muted-foreground">
              Após criar a conta, você será redirecionado para autorizar o acesso ao Instagram Business.
            </p>
            <Button variant="outline" size="sm" className="gap-2 mt-2" onClick={() => {
              window.open("https://developers.facebook.com/apps", "_blank");
            }}>
              <ExternalLink className="h-3.5 w-3.5" />
              Configurar no Facebook Developers
            </Button>
          </div>
        )}

        {channel === "email" && (
          <Tabs defaultValue="imap">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="imap">IMAP (Receber)</TabsTrigger>
              <TabsTrigger value="smtp">SMTP (Enviar)</TabsTrigger>
            </TabsList>
            <TabsContent value="imap" className="space-y-3 pt-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Servidor IMAP</Label>
                  <Input placeholder="imap.gmail.com" value={form.imapHost} onChange={(e) => setForm({ ...form, imapHost: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Porta</Label>
                  <Input placeholder="993" value={form.imapPort} onChange={(e) => setForm({ ...form, imapPort: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Usuário</Label>
                <Input placeholder="suporte@empresa.com" value={form.imapUser} onChange={(e) => setForm({ ...form, imapUser: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha / App Password</Label>
                <Input type="password" placeholder="••••••••" value={form.imapPassword} onChange={(e) => setForm({ ...form, imapPassword: e.target.value })} />
              </div>
            </TabsContent>
            <TabsContent value="smtp" className="space-y-3 pt-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Servidor SMTP</Label>
                  <Input placeholder="smtp.gmail.com" value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Porta</Label>
                  <Input placeholder="587" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Usuário</Label>
                <Input placeholder="suporte@empresa.com" value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha / App Password</Label>
                <Input type="password" placeholder="••••••••" value={form.smtpPassword} onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.smtpSecure} onCheckedChange={(v) => setForm({ ...form, smtpSecure: v })} />
                <Label className="text-xs">Usar SSL/TLS</Label>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={create.isPending} className="gap-2">
          {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Criar conta
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Accounts() {
  const utils = trpc.useUtils();
  const { data: accounts, isLoading } = trpc.accounts.list.useQuery();
  const [addChannel, setAddChannel] = useState<Channel | null>(null);
  const [qrAccountId, setQrAccountId] = useState<number | null>(null);

  const deleteAccount = trpc.accounts.delete.useMutation({
    onSuccess: () => { utils.accounts.list.invalidate(); toast.success("Conta removida"); },
    onError: (e) => toast.error(e.message),
  });

  const testEmail = trpc.accounts.testEmail.useMutation({
    onSuccess: (data) => {
      if (data.imap && data.smtp) {
        toast.success("✅ Conexão IMAP e SMTP verificadas com sucesso!");
      } else {
        if (!data.imap) toast.error(`❌ IMAP falhou: ${data.imapError ?? "Erro desconhecido"}`);
        if (!data.smtp) toast.error(`❌ SMTP falhou: ${data.smtpError ?? "Erro desconhecido"}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const disconnect = trpc.accounts.disconnectWhatsApp.useMutation({
    onSuccess: () => { utils.accounts.list.invalidate(); toast.success("WhatsApp desconectado"); },
  });

  const byChannel = {
    whatsapp: accounts?.filter((a) => a.channel === "whatsapp") ?? [],
    instagram: accounts?.filter((a) => a.channel === "instagram") ?? [],
    email: accounts?.filter((a) => a.channel === "email") ?? [],
  };

  return (
    <OmniLayout title="Gerenciar Contas">
      <div className="p-6 space-y-6">
        {(["whatsapp", "instagram", "email"] as Channel[]).map((channel) => {
          const info = CHANNEL_INFO[channel];
          const channelAccounts = byChannel[channel];
          return (
            <Card key={channel} className="border-border bg-card/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold", info.color)}>
                      {info.icon}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{info.label}</CardTitle>
                      <CardDescription className="text-xs">{info.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 h-8 text-xs"
                    onClick={() => setAddChannel(channel)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {channelAccounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 border border-dashed border-border rounded-lg">
                    <WifiOff className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Nenhuma conta {info.label} conectada</p>
                    <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => setAddChannel(channel)}>
                      <Plus className="h-3 w-3" /> Adicionar conta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {channelAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                      >
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold shrink-0", info.color)}>
                          {info.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
                            <StatusBadge status={account.status} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{account.identifier}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {channel === "whatsapp" && (
                            <>
                              {account.status !== "connected" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => setQrAccountId(account.id)}
                                >
                                  <QrCode className="h-3 w-3" />
                                  Conectar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                                  onClick={() => disconnect.mutate({ accountId: account.id })}
                                >
                                  <WifiOff className="h-3 w-3" />
                                  Desconectar
                                </Button>
                              )}
                            </>
                          )}
                          {channel === "email" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => testEmail.mutate({ accountId: account.id })}
                              disabled={testEmail.isPending}
                            >
                              {testEmail.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              Testar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteAccount.mutate({ id: account.id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialogs */}
      <Dialog open={!!addChannel} onOpenChange={(open) => !open && setAddChannel(null)}>
        {addChannel && (
          <AddAccountDialog channel={addChannel} onClose={() => setAddChannel(null)} />
        )}
      </Dialog>

      <Dialog open={!!qrAccountId} onOpenChange={(open) => !open && setQrAccountId(null)}>
        {qrAccountId && (
          <WhatsAppQRDialog accountId={qrAccountId} onClose={() => setQrAccountId(null)} />
        )}
      </Dialog>
    </OmniLayout>
  );
}
