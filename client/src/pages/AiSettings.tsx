import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PROVIDER_CONFIG: Record<string, { label: string; color: string; models: string[] }> = {
  openai: { label: "OpenAI", color: "text-green-400", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  gemini: { label: "Google Gemini", color: "text-blue-400", models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"] },
  anthropic: { label: "Anthropic Claude", color: "text-orange-400", models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"] },
  other: { label: "Outro", color: "text-muted-foreground", models: [] },
};

function AddProviderDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    provider: "openai" as any,
    name: "",
    apiKey: "",
    model: "",
    retainHistory: false,
  });
  const [showKey, setShowKey] = useState(false);

  const add = trpc.caius.ai.addProvider.useMutation({
    onSuccess: () => {
      toast.success("Provedor de IA adicionado com sucesso");
      setOpen(false);
      setForm({ provider: "openai", name: "", apiKey: "", model: "", retainHistory: false });
      onAdded();
    },
    onError: (e) => toast.error(e.message),
  });

  const providerCfg = PROVIDER_CONFIG[form.provider];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Adicionar Provedor</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Adicionar Provedor de IA
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Provedor</Label>
            <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v as any, model: "" }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDER_CONFIG).map(([v, c]) => (
                  <SelectItem key={v} value={v}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nome de Identificação</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: GPT-4o Principal" className="mt-1" />
          </div>
          <div>
            <Label>Chave de API *</Label>
            <div className="relative mt-1">
              <Input
                type={showKey ? "text" : "password"}
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">A chave é armazenada de forma criptografada</p>
          </div>
          {providerCfg.models.length > 0 && (
            <div>
              <Label>Modelo</Label>
              <Select value={form.model} onValueChange={(v) => setForm((f) => ({ ...f, model: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar modelo" /></SelectTrigger>
                <SelectContent>
                  {providerCfg.models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch checked={form.retainHistory} onCheckedChange={(v) => setForm((f) => ({ ...f, retainHistory: v }))} />
            <div>
              <Label>Reter Histórico de Conversas</Label>
              <p className="text-xs text-muted-foreground">Enviar histórico de mensagens para contexto</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            onClick={() => add.mutate(form)}
            disabled={!form.name || !form.apiKey || add.isPending}
          >
            {add.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Adicionar Provedor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AiSettings() {
  const utils = trpc.useUtils();
  const { data: providers, isLoading } = trpc.caius.ai.providers.useQuery();
  const { data: usageLogs } = trpc.caius.ai.usageLogs.useQuery({ limit: 20 });

  const remove = trpc.caius.ai.removeProvider.useMutation({
    onSuccess: () => { toast.success("Provedor removido"); utils.caius.ai.providers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <OmniLayout title="Integrações de IA">
      <div className="p-6 space-y-6">
        {/* Header info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Assistente de IA integrado ao CAIUS</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O CAIUS possui IA nativa para sugestão de respostas, redação de documentos e classificação de protocolos.
                Adicione provedores externos (OpenAI, Gemini) para usar modelos específicos ou com chave própria.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Providers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Provedores Configurados</h2>
            <AddProviderDialog onAdded={() => utils.caius.ai.providers.invalidate()} />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !providers?.length ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <Brain className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Nenhum provedor externo configurado</p>
                <p className="text-xs text-muted-foreground/70">O CAIUS usará a IA nativa da plataforma</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider: any) => {
                const cfg = PROVIDER_CONFIG[provider.provider] ?? PROVIDER_CONFIG.other;
                return (
                  <Card key={provider.id} className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Brain className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-semibold">{provider.name}</CardTitle>
                            <p className={cn("text-xs", cfg.color)}>{cfg.label}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { if (confirm("Remover provedor?")) remove.mutate({ id: provider.id }); }}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      {provider.model && (
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Modelo: </span>
                          <span className="font-mono text-foreground">{provider.model}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-green-400" />
                        <span className="text-green-400">Ativo</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Usage logs */}
        {usageLogs && usageLogs.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-4">Histórico de Uso da IA</h2>
            <Card className="bg-card border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ação</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">NUP</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prompt (resumo)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usageLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-primary">{log.action}</span>
                        </td>
                        <td className="px-4 py-3">
                          {log.nup ? (
                            <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5">{log.nup}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{log.prompt}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </OmniLayout>
  );
}
