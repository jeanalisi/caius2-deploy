import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Bot, Plus, Pencil, Trash2, Play, Pause, ArrowRight, MessageSquare,
  Users, GitBranch, CheckCircle2, XCircle, Zap, Settings, ChevronDown,
  ChevronUp, List, Hash, Info, AlertCircle, Loader2, Sparkles,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type NodeType = "menu" | "message" | "collect" | "transfer" | "protocol" | "end";

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  menu: "Menu de Opções",
  message: "Mensagem",
  collect: "Coletar Dado",
  transfer: "Transferir para Atendente",
  protocol: "Abrir Protocolo",
  end: "Encerrar",
};

const NODE_TYPE_ICONS: Record<NodeType, React.ReactNode> = {
  menu: <List className="w-4 h-4" />,
  message: <MessageSquare className="w-4 h-4" />,
  collect: <Hash className="w-4 h-4" />,
  transfer: <Users className="w-4 h-4" />,
  protocol: <CheckCircle2 className="w-4 h-4" />,
  end: <XCircle className="w-4 h-4" />,
};

const NODE_TYPE_COLORS: Record<NodeType, string> = {
  menu: "bg-blue-100 text-blue-700 border-blue-200",
  message: "bg-gray-100 text-gray-700 border-gray-200",
  collect: "bg-yellow-100 text-yellow-700 border-yellow-200",
  transfer: "bg-purple-100 text-purple-700 border-purple-200",
  protocol: "bg-green-100 text-green-700 border-green-200",
  end: "bg-red-100 text-red-700 border-red-200",
};

const PROTOCOL_TYPES = [
  { value: "request", label: "Requerimento" },
  { value: "complaint", label: "Reclamação" },
  { value: "information", label: "Solicitação de Informação" },
  { value: "suggestion", label: "Sugestão" },
  { value: "praise", label: "Elogio" },
  { value: "ombudsman", label: "Ouvidoria" },
  { value: "esic", label: "e-SIC" },
];

const COLLECT_FIELDS = [
  { value: "requesterName", label: "Nome Completo" },
  { value: "requesterCpf", label: "CPF" },
  { value: "requesterEmail", label: "E-mail" },
  { value: "requesterPhone", label: "Telefone" },
  { value: "subject", label: "Assunto" },
  { value: "description", label: "Descrição" },
];

// ─── Componente de Nó ─────────────────────────────────────────────────────────

function NodeCard({
  node,
  allNodes,
  onEdit,
  onDelete,
}: {
  node: any;
  allNodes: any[];
  onEdit: (node: any) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const options = (node.options as { label: string; nextNodeId: number }[]) ?? [];
  const nextNode = allNodes.find((n) => n.id === node.nextNodeId);

  return (
    <div className={`rounded-xl border-2 p-4 ${NODE_TYPE_COLORS[node.nodeType as NodeType] ?? "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">{NODE_TYPE_ICONS[node.nodeType as NodeType]}</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{node.title}</p>
            <p className="text-xs opacity-70">{NODE_TYPE_LABELS[node.nodeType as NodeType]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-600 hover:text-red-700"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-xs font-medium opacity-60 mb-1">Mensagem enviada ao usuário:</p>
            <p className="text-xs whitespace-pre-wrap">{node.message}</p>
          </div>

          {node.nodeType === "menu" && options.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium opacity-60">Opções do menu:</p>
              {options.map((opt, i) => {
                const targetNode = allNodes.find((n) => n.id === opt.nextNodeId);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs bg-white/60 rounded-lg px-3 py-1.5">
                    <span className="font-bold">{i + 1}.</span>
                    <span className="flex-1">{opt.label}</span>
                    {targetNode && (
                      <span className="flex items-center gap-1 opacity-60">
                        <ArrowRight className="w-3 h-3" />
                        {targetNode.title}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {node.nodeType === "collect" && node.collectField && (
            <p className="text-xs bg-white/60 rounded-lg px-3 py-1.5">
              <span className="font-medium">Campo coletado:</span>{" "}
              {COLLECT_FIELDS.find((f) => f.value === node.collectField)?.label ?? node.collectField}
            </p>
          )}

          {node.nodeType === "protocol" && (
            <p className="text-xs bg-white/60 rounded-lg px-3 py-1.5">
              <span className="font-medium">Tipo de protocolo:</span>{" "}
              {PROTOCOL_TYPES.find((t) => t.value === node.protocolType)?.label ?? node.protocolType}
            </p>
          )}

          {nextNode && node.nodeType !== "menu" && (
            <p className="text-xs bg-white/60 rounded-lg px-3 py-1.5 flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              <span className="font-medium">Próximo nó:</span> {nextNode.title}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dialog de Edição de Nó ───────────────────────────────────────────────────

function NodeDialog({
  open,
  onClose,
  node,
  flowId,
  allNodes,
  sectors,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  node: any | null;
  flowId: number;
  allNodes: any[];
  sectors: any[];
  onSave: () => void;
}) {
  const isEdit = !!node;
  const [form, setForm] = useState<any>(
    node ?? {
      flowId,
      nodeType: "menu",
      title: "",
      message: "",
      collectField: null,
      transferSectorId: null,
      protocolType: "request",
      protocolSubject: "",
      nextNodeId: null,
      options: [],
      sortOrder: 0,
    }
  );
  const [options, setOptions] = useState<{ label: string; nextNodeId: number | null }[]>(
    node?.options ?? []
  );

  const createMutation = trpc.chatbot.createNode.useMutation({
    onSuccess: () => { toast.success("Nó criado!"); onSave(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.chatbot.updateNode.useMutation({
    onSuccess: () => { toast.success("Nó atualizado!"); onSave(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    const data = {
      ...form,
      options: form.nodeType === "menu" ? options : null,
    };
    if (isEdit) {
      updateMutation.mutate({ id: node.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const otherNodes = allNodes.filter((n) => !isEdit || n.id !== node?.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Nó" : "Novo Nó"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo e Título */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo do Nó</Label>
              <Select
                value={form.nodeType}
                onValueChange={(v) => setForm({ ...form, nodeType: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(NODE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título Interno</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Menu Principal"
              />
            </div>
          </div>

          {/* Mensagem */}
          <div className="space-y-1.5">
            <Label>
              Mensagem enviada ao usuário
              {form.nodeType === "protocol" && (
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  Use {"{{nup}}"} para inserir o número do protocolo
                </span>
              )}
              {form.nodeType === "collect" && (
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  Use {"{{requesterName}}"} etc. para dados já coletados
                </span>
              )}
            </Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Texto que será enviado ao usuário..."
              rows={4}
            />
          </div>

          {/* Campos específicos por tipo */}
          {form.nodeType === "menu" && (
            <div className="space-y-3">
              <Label>Opções do Menu</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-500 w-5">{i + 1}.</span>
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[i] = { ...newOpts[i]!, label: e.target.value };
                      setOptions(newOpts);
                    }}
                    placeholder="Texto da opção"
                    className="flex-1"
                  />
                  <Select
                    value={opt.nextNodeId?.toString() ?? "none"}
                    onValueChange={(v) => {
                      const newOpts = [...options];
                      newOpts[i] = { ...newOpts[i]!, nextNodeId: v === "none" ? null : Number(v) };
                      setOptions(newOpts);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Próximo nó..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      {otherNodes.map((n) => (
                        <SelectItem key={n.id} value={n.id.toString()}>
                          {n.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 shrink-0"
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOptions([...options, { label: "", nextNodeId: null }])}
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Opção
              </Button>
            </div>
          )}

          {form.nodeType === "collect" && (
            <div className="space-y-1.5">
              <Label>Campo a Coletar</Label>
              <Select
                value={form.collectField ?? "none"}
                onValueChange={(v) => setForm({ ...form, collectField: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {COLLECT_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.nodeType === "transfer" && (
            <div className="space-y-1.5">
              <Label>Setor de Destino</Label>
              <Select
                value={form.transferSectorId?.toString() ?? "none"}
                onValueChange={(v) =>
                  setForm({ ...form, transferSectorId: v === "none" ? null : Number(v) })
                }
              >
                <SelectTrigger><SelectValue placeholder="Selecione o setor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Qualquer atendente —</SelectItem>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.nodeType === "protocol" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de Protocolo</Label>
                <Select
                  value={form.protocolType ?? "request"}
                  onValueChange={(v) => setForm({ ...form, protocolType: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROTOCOL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Assunto do Protocolo
                  <span className="ml-1 text-xs text-gray-400">(use {"{{subject}}"})</span>
                </Label>
                <Input
                  value={form.protocolSubject ?? ""}
                  onChange={(e) => setForm({ ...form, protocolSubject: e.target.value })}
                  placeholder="{{subject}}"
                />
              </div>
            </div>
          )}

          {/* Próximo nó (para tipos que não são menu) */}
          {form.nodeType !== "menu" && form.nodeType !== "end" && (
            <div className="space-y-1.5">
              <Label>Próximo Nó (após este)</Label>
              <Select
                value={form.nextNodeId?.toString() ?? "none"}
                onValueChange={(v) =>
                  setForm({ ...form, nextNodeId: v === "none" ? null : Number(v) })
                }
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Encerrar fluxo —</SelectItem>
                  {otherNodes.map((n) => (
                    <SelectItem key={n.id} value={n.id.toString()}>{n.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Ordem */}
          <div className="space-y-1.5">
            <Label>Ordem de Exibição</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              className="w-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Salvar Alterações" : "Criar Nó"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Wizard de Criação Rápida ─────────────────────────────────────────────────

function QuickCreateWizard({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [orgName, setOrgName] = useState("Prefeitura");
  const [accountId, setAccountId] = useState<number | null>(null);
  const { data: accounts } = trpc.accounts.list.useQuery();
  const { data: sectors } = trpc.chatbot.listSectors.useQuery();

  const createMutation = trpc.chatbot.createDefaultFlow.useMutation({
    onSuccess: () => {
      toast.success("Fluxo padrão criado com sucesso! Ative-o para começar a usar.");
      onCreated();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Criar Fluxo Padrão Automaticamente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">O que será criado:</p>
            <ul className="space-y-1 text-xs">
              <li>✅ Menu principal com 4 opções</li>
              <li>✅ Coleta de nome, CPF e assunto</li>
              <li>✅ Abertura automática de protocolo NUP</li>
              <li>✅ Transferência para atendente</li>
              <li>✅ Mensagens de encerramento</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <Label>Nome da Organização</Label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex: Prefeitura de São Paulo"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Conta WhatsApp (opcional)</Label>
            <Select
              value={accountId?.toString() ?? "none"}
              onValueChange={(v) => setAccountId(v === "none" ? null : Number(v))}
            >
              <SelectTrigger><SelectValue placeholder="Todas as contas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todas as contas</SelectItem>
                {(accounts ?? [])
                  .filter((a: any) => a.channel === "whatsapp")
                  .map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Se não selecionar, o fluxo será aplicado a todas as contas WhatsApp.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() =>
              createMutation.mutate({
                orgName,
                accountId,
                sectors: (sectors ?? []).map((s: any) => ({ id: s.id, name: s.name })),
              })
            }
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Sparkles className="w-4 h-4 mr-2" />
            Criar Fluxo Padrão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Painel de Edição de Fluxo ────────────────────────────────────────────────

function FlowEditor({ flowId, onBack }: { flowId: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data: flow, isLoading: flowLoading } = trpc.chatbot.getFlow.useQuery({ id: flowId });
  const { data: nodes, isLoading: nodesLoading } = trpc.chatbot.listNodes.useQuery({ flowId });
  const { data: sectors } = trpc.chatbot.listSectors.useQuery();
  const { data: stats } = trpc.chatbot.getSessionStats.useQuery({ flowId });

  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<any | null>(null);

  const updateFlowMutation = trpc.chatbot.updateFlow.useMutation({
    onSuccess: () => { toast.success("Fluxo atualizado!"); utils.chatbot.getFlow.invalidate({ id: flowId }); },
    onError: (e) => toast.error(e.message),
  });

  const setActiveMutation = trpc.chatbot.setFlowActive.useMutation({
    onSuccess: () => {
      toast.success(flow?.isActive ? "Fluxo desativado." : "Fluxo ativado! O bot está funcionando.");
      utils.chatbot.getFlow.invalidate({ id: flowId });
      utils.chatbot.listFlows.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMutation = trpc.chatbot.deactivateFlow.useMutation({
    onSuccess: () => {
      toast.success("Fluxo desativado.");
      utils.chatbot.getFlow.invalidate({ id: flowId });
      utils.chatbot.listFlows.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteNodeMutation = trpc.chatbot.deleteNode.useMutation({
    onSuccess: () => { toast.success("Nó removido!"); utils.chatbot.listNodes.invalidate({ flowId }); },
    onError: (e) => toast.error(e.message),
  });

  const setRootMutation = trpc.chatbot.updateFlow.useMutation({
    onSuccess: () => { toast.success("Nó raiz definido!"); utils.chatbot.getFlow.invalidate({ id: flowId }); },
  });

  if (flowLoading || nodesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!flow) return null;

  const allNodes = nodes ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            ← Voltar
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{flow.name}</h2>
            {flow.description && (
              <p className="text-sm text-gray-500">{flow.description}</p>
            )}
          </div>
          {flow.isActive ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <Play className="w-3 h-3 mr-1" /> Ativo
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500">
              <Pause className="w-3 h-3 mr-1" /> Inativo
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {flow.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => deactivateMutation.mutate({ flowId })}
              disabled={deactivateMutation.isPending}
            >
              <Pause className="w-4 h-4 mr-1" /> Desativar Bot
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setActiveMutation.mutate({ flowId, accountId: flow.accountId ?? null })}
              disabled={setActiveMutation.isPending || !flow.rootNodeId}
            >
              <Play className="w-4 h-4 mr-1" /> Ativar Bot
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => { setEditingNode(null); setNodeDialogOpen(true); }}
          >
            <Plus className="w-4 h-4 mr-1" /> Novo Nó
          </Button>
        </div>
      </div>

      {/* Alerta se não tem nó raiz */}
      {!flow.rootNodeId && allNodes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Nó raiz não definido</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Defina qual nó será o primeiro a ser exibido ao usuário clicando em "Definir como Raiz" em um dos nós abaixo.
            </p>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-gray-700" },
            { label: "Ativas", value: stats.active, color: "text-blue-600" },
            { label: "Concluídas", value: stats.completed, color: "text-green-600" },
            { label: "Transferidas", value: stats.transferred, color: "text-purple-600" },
            { label: "Expiradas", value: stats.expired, color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Configurações do fluxo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configurações do Fluxo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nó Raiz (primeiro nó)</Label>
              <Select
                value={flow.rootNodeId?.toString() ?? "none"}
                onValueChange={(v) =>
                  setRootMutation.mutate({
                    id: flowId,
                    rootNodeId: v === "none" ? null : Number(v),
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum —</SelectItem>
                  {allNodes.map((n) => (
                    <SelectItem key={n.id} value={n.id.toString()}>{n.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Timeout da Sessão (minutos)</Label>
              <Input
                type="number"
                defaultValue={flow.sessionTimeoutMinutes}
                className="h-8 text-xs"
                onBlur={(e) =>
                  updateFlowMutation.mutate({
                    id: flowId,
                    sessionTimeoutMinutes: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem de Timeout</Label>
              <Input
                defaultValue={flow.timeoutMessage ?? ""}
                className="h-8 text-xs"
                placeholder="Sessão expirada. Envie uma mensagem para recomeçar."
                onBlur={(e) =>
                  updateFlowMutation.mutate({
                    id: flowId,
                    timeoutMessage: e.target.value || null,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de nós */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Nós do Fluxo ({allNodes.length})
        </h3>

        {allNodes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4">Nenhum nó criado ainda.</p>
            <Button
              variant="outline"
              onClick={() => { setEditingNode(null); setNodeDialogOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-1" /> Criar Primeiro Nó
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allNodes.map((node) => (
              <div key={node.id} className="relative">
                {flow.rootNodeId === node.id && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0.5">Raiz</Badge>
                  </div>
                )}
                <NodeCard
                  node={node}
                  allNodes={allNodes}
                  onEdit={(n) => { setEditingNode(n); setNodeDialogOpen(true); }}
                  onDelete={(id) => {
                    if (confirm("Remover este nó?")) deleteNodeMutation.mutate({ id });
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de edição */}
      {nodeDialogOpen && (
        <NodeDialog
          open={nodeDialogOpen}
          onClose={() => { setNodeDialogOpen(false); setEditingNode(null); }}
          node={editingNode}
          flowId={flowId}
          allNodes={allNodes}
          sectors={sectors ?? []}
          onSave={() => utils.chatbot.listNodes.invalidate({ flowId })}
        />
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function ChatbotAdmin() {
  const utils = trpc.useUtils();
  const { data: flows, isLoading } = trpc.chatbot.listFlows.useQuery();
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [newFlowOpen, setNewFlowOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");

  const createFlowMutation = trpc.chatbot.createFlow.useMutation({
    onSuccess: (flow) => {
      toast.success("Fluxo criado!");
      utils.chatbot.listFlows.invalidate();
      if (flow) setSelectedFlowId(flow.id);
      setNewFlowOpen(false);
      setNewFlowName("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteFlowMutation = trpc.chatbot.deleteFlow.useMutation({
    onSuccess: () => { toast.success("Fluxo removido!"); utils.chatbot.listFlows.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (selectedFlowId) {
    return (
      <div className="p-6">
        <FlowEditor flowId={selectedFlowId} onBack={() => setSelectedFlowId(null)} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-600" />
            Chatbot WhatsApp
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure fluxos automatizados para atendimento via WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setWizardOpen(true)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Criar Fluxo Padrão
          </Button>
          <Button onClick={() => setNewFlowOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Fluxo
          </Button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Como funciona o Chatbot</p>
          <p className="text-xs">
            Quando uma mensagem chega no WhatsApp, o bot intercepta automaticamente e guia o usuário
            pelo fluxo configurado. Ao final, pode abrir um protocolo NUP automaticamente ou
            transferir para um atendente. Apenas um fluxo pode estar ativo por conta WhatsApp.
          </p>
        </div>
      </div>

      {/* Lista de fluxos */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (flows ?? []).length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum fluxo configurado</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Crie um fluxo de chatbot para automatizar o atendimento via WhatsApp com menus,
            coleta de dados e abertura automática de protocolos.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => setWizardOpen(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Criar Fluxo Padrão
            </Button>
            <Button variant="outline" onClick={() => setNewFlowOpen(true)}>
              Criar do Zero
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(flows ?? []).map((flow: any) => (
            <Card
              key={flow.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
              onClick={() => setSelectedFlowId(flow.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{flow.name}</CardTitle>
                    {flow.description && (
                      <CardDescription className="text-xs mt-0.5 line-clamp-2">
                        {flow.description}
                      </CardDescription>
                    )}
                  </div>
                  {flow.isActive ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">
                      <Play className="w-3 h-3 mr-1" /> Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400 shrink-0">
                      Inativo
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Timeout: {flow.sessionTimeoutMinutes}min
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remover o fluxo "${flow.name}"?`)) {
                          deleteFlowMutation.mutate({ id: flow.id });
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog novo fluxo manual */}
      <Dialog open={newFlowOpen} onOpenChange={setNewFlowOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Fluxo de Chatbot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Fluxo</Label>
              <Input
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                placeholder="Ex: Atendimento Geral"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFlowOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createFlowMutation.mutate({ name: newFlowName })}
              disabled={!newFlowName.trim() || createFlowMutation.isPending}
            >
              {createFlowMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Fluxo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wizard */}
      <QuickCreateWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={() => utils.chatbot.listFlows.invalidate()}
      />
    </div>
  );
}
