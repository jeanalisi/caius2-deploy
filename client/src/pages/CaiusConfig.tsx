/**
 * CaiusConfig.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Configurações do cAIus — Agente Institucional de IA
 *
 * Abas:
 *  1. Agentes — perfis de instrução e comportamento
 *  2. Base de Conhecimento — documentos e fontes
 *  3. Ações Sugeridas — revisão e aplicação de ações da IA
 *  4. Dashboard — estatísticas e painel de uso
 *  5. Auditoria — trilha completa de eventos
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BookOpen,
  Zap,
  Settings,
  BarChart3,
  Shield,
  Plus,
  RefreshCw,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  FileText,
  Link,
  HelpCircle,
  AlertCircle,
  Brain,
  Bot,
} from "lucide-react";

// ─── Aba: Base de Conhecimento ────────────────────────────────────────────────
function KnowledgeTab() {
  const { data: sources, isLoading, refetch } = trpc.caiusAgent.knowledge.list.useQuery({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    sourceType: "text" as "text" | "link" | "faq" | "regulation" | "manual" | "flow" | "template" | "document",
    content: "",
    linkUrl: "",
    tags: "",
    status: "active" as "draft" | "active" | "archived" | "revoked",
  });

  const createMutation = trpc.caiusAgent.knowledge.create.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setForm({ title: "", sourceType: "text", content: "", linkUrl: "", tags: "", status: "active" });
      refetch();
    },
  });

  const updateMutation = trpc.caiusAgent.knowledge.update.useMutation({ onSuccess: () => refetch() });

  const typeLabel: Record<string, string> = {
    text: "Texto", link: "URL", faq: "FAQ", regulation: "Regulamento",
    manual: "Manual", flow: "Fluxo", template: "Modelo", document: "Documento",
  };
  const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    text: FileText, link: Link, faq: HelpCircle, regulation: AlertCircle,
    manual: BookOpen, flow: Zap, template: FileText, document: FileText,
  };

  const handleCreate = () => {
    const tagsArray = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : undefined;
    createMutation.mutate({
      title: form.title,
      sourceType: form.sourceType,
      content: form.content || undefined,
      linkUrl: form.linkUrl || undefined,
      tags: tagsArray,
      status: form.status,
    });
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-medium">Base de Conhecimento</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Documentos, FAQs e procedimentos usados pelo cAIus</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova Fonte
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>}
        {sources?.map((src: any) => {
          const Icon = typeIcon[src.sourceType] ?? FileText;
          const isActive = src.status === "active";
          return (
            <Card key={src.id} className={`border-border/60 ${!isActive ? "opacity-50" : ""}`}>
              <CardContent className="p-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{src.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] h-4">{typeLabel[src.sourceType] ?? src.sourceType}</Badge>
                      {Array.isArray(src.tags) && src.tags.filter(Boolean).map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[10px] h-4">{t.trim()}</Badge>
                      ))}
                    </div>
                    {src.linkUrl && <p className="text-xs text-muted-foreground truncate mt-0.5">{src.linkUrl}</p>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => updateMutation.mutate({ id: src.id, status: isActive ? "archived" : "active" })}
                >
                  {isActive ? "Arquivar" : "Ativar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {!isLoading && (!sources || sources.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma fonte cadastrada ainda.</p>
            <Button size="sm" className="mt-3 bg-violet-600 hover:bg-violet-700" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar primeira fonte
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Fonte de Conhecimento</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" placeholder="Ex: Procedimento de Alvará de Construção" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.sourceType} onValueChange={v => setForm(f => ({ ...f, sourceType: v as typeof form.sourceType }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="link">URL</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                  <SelectItem value="regulation">Regulamento</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="flow">Fluxo</SelectItem>
                  <SelectItem value="template">Modelo</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.sourceType === "link" ? (
              <div>
                <label className="text-sm font-medium">URL *</label>
                <Input value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))} className="mt-1" placeholder="https://..." />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">Conteúdo *</label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} className="mt-1 text-xs" placeholder="Cole o conteúdo aqui..." />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Tags (separadas por vírgula)</label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="mt-1" placeholder="alvará, construção, licença" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.title || createMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Adicionar Fonte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Aba: Ações Sugeridas ─────────────────────────────────────────────────────
function ActionsTab() {
  const { data: actions, isLoading, refetch } = trpc.caiusAgent.actions.list.useQuery({ status: "pending" });
  // Aprovação e rejeição usam o endpoint `review` com status diferente
  const reviewMutation = trpc.caiusAgent.actions.review.useMutation({ onSuccess: () => refetch() });

  const actionTypeLabel: Record<string, string> = {
    create_protocol: "Criar Protocolo",
    update_protocol: "Atualizar Protocolo",
    assign_ticket: "Atribuir Ticket",
    send_email: "Enviar E-mail",
    schedule_meeting: "Agendar Reunião",
    escalate: "Escalar Atendimento",
    close_ticket: "Fechar Ticket",
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-medium">Ações Sugeridas pela IA</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Revise e aprove ou rejeite as ações propostas pelo cAIus</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>}
        {actions?.map((action: any) => (
          <Card key={action.id} className="border-border/60">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{action.title}</p>
                    <Badge variant="outline" className="text-[10px] h-4 mt-0.5">{actionTypeLabel[action.actionType] ?? action.actionType}</Badge>
                    {action.description && <p className="text-xs text-muted-foreground mt-1">{action.description}</p>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => reviewMutation.mutate({ id: action.id, status: "approved" })}
                    disabled={reviewMutation.isPending}
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" /> Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => reviewMutation.mutate({ id: action.id, status: "rejected" })}
                    disabled={reviewMutation.isPending}
                  >
                    <ThumbsDown className="w-3 h-3 mr-1" /> Rejeitar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!actions || actions.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma ação pendente de revisão.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Aba: Dashboard ───────────────────────────────────────────────────────────
function DashboardTab() {
  // stats está em trpc.caiusAgent.dashboard.stats, não em trpc.caiusAgent.stats
  const { data: stats, isLoading } = trpc.caiusAgent.dashboard.stats.useQuery();
  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ minHeight: 0 }}>
      <div className="p-4 border-b shrink-0">
        <h3 className="font-medium">Dashboard cAIus</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Estatísticas de uso e desempenho do agente</p>
      </div>
      <div className="p-4 space-y-4">
        {isLoading && <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>}
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total de Sessões", value: (stats as any).totalSessions ?? 0, icon: Brain, color: "violet" },
                { label: "Mensagens Trocadas", value: (stats as any).totalMessages ?? 0, icon: Bot, color: "blue" },
                { label: "Ações Sugeridas", value: (stats as any).totalActions ?? 0, icon: Zap, color: "amber" },
                { label: "Fontes na Base", value: (stats as any).totalKnowledgeSources ?? 0, icon: BookOpen, color: "green" },
              ].map(stat => (
                <Card key={stat.label} className="border-border/60">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sessões Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {(stats as any)?.recentSessions && (stats as any).recentSessions.length > 0 ? (
                  <div className="space-y-2">
                    {(stats as any).recentSessions.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">Sessão #{s.id} — {s.channel}</p>
                          <p className="text-xs text-muted-foreground">{new Date(s.startedAt).toLocaleString("pt-BR")}</p>
                        </div>
                        <Badge variant="outline" className={s.status === "active" ? "text-green-600" : "text-gray-500"}>
                          {s.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma sessão recente.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Aba: Auditoria ───────────────────────────────────────────────────────────
function AuditTab() {
  const { data: logs, isLoading, refetch } = trpc.caiusAgent.audit.list.useQuery({ limit: 100 });
  const eventLabel: Record<string, string> = {
    session_started: "Sessão iniciada",
    session_closed: "Sessão encerrada",
    message_sent: "Mensagem enviada",
    message_received: "Resposta gerada",
    voice_transcribed: "Áudio transcrito",
    voice_synthesized: "Voz sintetizada",
    knowledge_queried: "Base consultada",
    knowledge_used: "Fonte utilizada",
    action_suggested: "Ação sugerida",
    action_approved: "Ação aprovada",
    action_rejected: "Ação rejeitada",
    action_applied: "Ação aplicada",
    email_analyzed: "E-mail analisado",
    protocol_linked: "Protocolo vinculado",
    nup_linked: "NUP vinculado",
    error_occurred: "Erro registrado",
  };
  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-medium">Trilha de Auditoria — cAIus</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Registro completo de eventos e ações da IA</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>}
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left p-3 font-medium">Data/Hora</th>
              <th className="text-left p-3 font-medium">Evento</th>
              <th className="text-left p-3 font-medium">Usuário</th>
              <th className="text-left p-3 font-medium">Canal</th>
              <th className="text-left p-3 font-medium">NUP</th>
              <th className="text-left p-3 font-medium">Resumo</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log: any) => (
              <tr key={log.id} className="border-b hover:bg-muted/30">
                <td className="p-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString("pt-BR")}</td>
                <td className="p-3">
                  <Badge variant="outline" className="text-[10px]">{eventLabel[log.event] ?? log.event}</Badge>
                </td>
                <td className="p-3">{log.userName ?? `#${log.userId ?? "-"}`}</td>
                <td className="p-3">{log.channel ?? "-"}</td>
                <td className="p-3 font-mono">{log.nup ?? "-"}</td>
                <td className="p-3 max-w-xs truncate text-muted-foreground">{log.outputSummary ?? log.inputSummary ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && (!logs || logs.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum evento registrado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Aba: Agentes ─────────────────────────────────────────────────────────────
function AgentsTab() {
  const { data: agents, isLoading, refetch } = trpc.caiusAgent.agents.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const defaultForm = {
    name: "", slug: "", description: "", systemPrompt: "",
    context: "both" as "external" | "internal" | "both",
    allowVoice: true, allowKnowledgeBase: true,
  };
  const [form, setForm] = useState(defaultForm);
  const createMutation = trpc.caiusAgent.agents.create.useMutation({
    onSuccess: () => { setShowForm(false); setForm(defaultForm); refetch(); },
  });
  // Ativar/desativar usa `update` com `isActive`, não existe `toggle`
  const updateMutation = trpc.caiusAgent.agents.update.useMutation({ onSuccess: () => refetch() });

  const contextLabel: Record<string, string> = { external: "Cidadão", internal: "Servidor", both: "Ambos" };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-medium">Agentes cAIus</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Perfis de instrução e comportamento do agente</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-3.5 h-3.5 mr-1" /> Novo Agente
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>}
        {agents?.map((agent: any) => (
          <Card key={agent.id} className={`border-border/60 ${!agent.isActive ? "opacity-50" : ""}`}>
            <CardContent className="p-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{agent.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px] h-4 font-mono">{agent.slug}</Badge>
                    <Badge variant="secondary" className="text-[10px] h-4">{contextLabel[agent.context] ?? agent.context}</Badge>
                    {agent.isDefault && <Badge className="text-[10px] h-4 bg-violet-600">Padrão</Badge>}
                  </div>
                  {agent.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{agent.description}</p>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs shrink-0"
                onClick={() => updateMutation.mutate({ id: agent.id, isActive: !agent.isActive })}
                disabled={agent.isDefault || updateMutation.isPending}
              >
                {agent.isActive ? "Desativar" : "Ativar"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {!isLoading && (!agents || agents.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum agente configurado. Os agentes padrão são criados automaticamente.</p>
          </div>
        )}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Novo Agente cAIus</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Slug *</label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="ex: caius-saude" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Contexto</label>
              <Select value={form.context} onValueChange={v => setForm(f => ({ ...f, context: v as typeof form.context }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">Externo (Cidadão)</SelectItem>
                  <SelectItem value="internal">Interno (Servidor)</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Prompt do Sistema *</label>
              <Textarea value={form.systemPrompt} onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))} rows={6} className="mt-1 font-mono text-xs" placeholder="Instruções de comportamento do agente..." />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || !form.slug || !form.systemPrompt || createMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Criar Agente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function CaiusConfig() {
  return (
    <OmniLayout title="Configurações do cAIus" fullHeight>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <Tabs defaultValue="agents" className="flex flex-col flex-1" style={{ minHeight: 0 }}>
          <div className="border-b px-4 shrink-0">
            <TabsList className="h-10 bg-transparent border-0 p-0 gap-1">
              {[
                { value: "agents", label: "Agentes", icon: Bot },
                { value: "knowledge", label: "Base de Conhecimento", icon: BookOpen },
                { value: "actions", label: "Ações Sugeridas", icon: Zap },
                { value: "dashboard", label: "Dashboard", icon: BarChart3 },
                { value: "audit", label: "Auditoria", icon: Shield },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-violet-600 data-[state=active]:text-violet-700 rounded-none h-10 px-3 text-xs gap-1.5"
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex-1" style={{ minHeight: 0, overflow: "hidden" }}>
            <TabsContent value="agents" className="h-full m-0"><AgentsTab /></TabsContent>
            <TabsContent value="knowledge" className="h-full m-0"><KnowledgeTab /></TabsContent>
            <TabsContent value="actions" className="h-full m-0"><ActionsTab /></TabsContent>
            <TabsContent value="dashboard" className="h-full m-0"><DashboardTab /></TabsContent>
            <TabsContent value="audit" className="h-full m-0"><AuditTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </OmniLayout>
  );
}
