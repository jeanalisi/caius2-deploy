/**
 * CaiusAgent.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo cAIus — Agente Institucional de IA do CAIUS2
 *
 * Abas:
 *  1. Chat — conversa com o agente (texto + voz)
 *  2. Sessões — histórico de conversas
 *  3. Base de Conhecimento — gestão de documentos e fontes
 *  4. Ações Sugeridas — revisão e aplicação de ações da IA
 *  5. Agentes — configuração de perfis de instrução
 *  6. Auditoria — trilha completa de eventos
 *  7. Dashboard — estatísticas e painel de uso
 */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { OmniLayout } from "@/components/OmniLayout";
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
  Bot,
  Send,
  Mic,
  MicOff,
  MessageSquare,
  BookOpen,
  Zap,
  Settings,
  BarChart3,
  Shield,
  Plus,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Loader2,
  FileText,
  Link,
  HelpCircle,
  AlertCircle,
  User,
  Brain,
} from "lucide-react";

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type Message = {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  contentType?: string;
  createdAt?: string;
  sourcesUsed?: Array<{ id: number; title: string; relevanceScore: number }>;
  tokensUsed?: number;
};

type SuggestedAction = {
  id: number;
  actionType: string;
  title: string;
  description?: string | null;
  status: string;
};

// ─── Componente: Chat ─────────────────────────────────────────────────────────

function ChatTab() {
  const [sessionId, setSessionId] = useState<number | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showSources, setShowSources] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMutation = trpc.caiusAgent.chat.send.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages(prev => [
        ...prev,
        {
          id: data.messageId,
          role: "assistant",
          content: data.response,
          sourcesUsed: data.sourcesUsed,
          tokensUsed: data.tokensUsed,
        },
      ]);
    },
  });

  const feedbackMutation = trpc.caiusAgent.feedback.submit.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    sendMutation.mutate({
      sessionId,
      context: "internal",
      channel: "chat",
      message: userMessage,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = (messageId: number, rating: "positive" | "negative") => {
    if (!sessionId) return;
    feedbackMutation.mutate({ sessionId, messageId, rating });
  };

  const startNewSession = () => {
    setSessionId(undefined);
    setMessages([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-violet-50 to-blue-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">cAIus — Ambiente Interno</p>
            <p className="text-xs text-muted-foreground">
              {sessionId ? `Sessão #${sessionId}` : "Nova conversa"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={startNewSession}>
          <Plus className="w-3 h-3 mr-1" /> Nova Sessão
        </Button>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
            <Brain className="w-12 h-12 text-violet-300" />
            <div>
              <p className="font-medium text-base">Olá! Sou o cAIus.</p>
              <p className="text-sm mt-1">Posso ajudar com resumos, classificações, minutas, análise de e-mails e muito mais.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-md">
              {[
                "Resumir um protocolo",
                "Sugerir resposta institucional",
                "Classificar e-mail",
                "Identificar setor competente",
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="text-xs border rounded-lg p-2 hover:bg-violet-50 hover:border-violet-300 transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "user" ? "bg-blue-100" : "bg-violet-100"
            }`}>
              {msg.role === "user"
                ? <User className="w-3.5 h-3.5 text-blue-600" />
                : <Bot className="w-3.5 h-3.5 text-violet-600" />
              }
            </div>
            <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-white border shadow-sm rounded-tl-sm"
              }`}>
                {msg.content}
              </div>

              {/* Fontes usadas */}
              {msg.role === "assistant" && msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                <button
                  onClick={() => setShowSources(showSources === i ? null : i)}
                  className="text-xs text-violet-600 hover:underline flex items-center gap-1"
                >
                  <BookOpen className="w-3 h-3" />
                  {msg.sourcesUsed.length} fonte(s) utilizada(s)
                </button>
              )}
              {showSources === i && msg.sourcesUsed && (
                <div className="text-xs bg-violet-50 border border-violet-200 rounded-lg p-2 space-y-1">
                  {msg.sourcesUsed.map(s => (
                    <div key={s.id} className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-violet-500" />
                      <span>{s.title}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {Math.round(s.relevanceScore * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback */}
              {msg.role === "assistant" && msg.id && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleFeedback(msg.id!, "positive")}
                    className="p-1 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id!, "negative")}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                  {msg.tokensUsed && (
                    <span className="text-[10px] text-muted-foreground ml-1">{msg.tokensUsed} tokens</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {sendMutation.isPending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <div className="bg-white border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white shrink-0">
        {sendMutation.isError && (
          <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Erro ao enviar mensagem. Tente novamente.
          </p>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            className="resize-none min-h-[44px] max-h-32 text-sm"
            rows={1}
          />
          <div className="flex flex-col gap-1">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecording(!isRecording)}
              className={isRecording ? "border-red-500 text-red-500" : ""}
              title="Entrada por voz (em breve)"
              disabled
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Sessões ──────────────────────────────────────────────────────

function SessionsTab() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const { data: sessions, isLoading, refetch } = trpc.caiusAgent.sessions.list.useQuery({ limit: 50 });
  const { data: messages } = trpc.caiusAgent.chat.history.useQuery(
    { sessionId: selectedSession! },
    { enabled: !!selectedSession }
  );
  const closeMutation = trpc.caiusAgent.sessions.close.useMutation({ onSuccess: () => refetch() });

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    closed: "bg-gray-100 text-gray-600",
    archived: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="flex h-full" style={{ minHeight: 0 }}>
      {/* Lista */}
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-medium text-sm">Sessões</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>}
          {sessions?.map(session => (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session.id)}
              className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${selectedSession === session.id ? "bg-violet-50 border-l-2 border-l-violet-500" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Sessão #{session.id}</span>
                <Badge className={`text-[10px] ${statusColor[session.status] ?? ""}`} variant="outline">
                  {session.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{session.title ?? session.channel}</p>
              {session.nup && <p className="text-[10px] text-violet-600 mt-0.5">NUP: {session.nup}</p>}
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(session.startedAt).toLocaleString("pt-BR")}
              </p>
            </button>
          ))}
          {!isLoading && (!sessions || sessions.length === 0) && (
            <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma sessão encontrada</div>
          )}
        </div>
      </div>

      {/* Detalhe */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedSession ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecione uma sessão para ver o histórico</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 border-b flex items-center justify-between shrink-0">
              <span className="font-medium text-sm">Histórico da Sessão #{selectedSession}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeMutation.mutate({ id: selectedSession })}
                disabled={closeMutation.isPending}
              >
                Encerrar Sessão
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages?.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border shadow-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Componente: Base de Conhecimento ────────────────────────────────────────

function KnowledgeTab() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "", sourceType: "text" as const, content: "", summary: "",
    category: "", keywords: "", status: "draft" as const,
  });

  const { data: items, isLoading, refetch } = trpc.caiusAgent.knowledge.list.useQuery({ search: search || undefined, limit: 100 });
  const createMutation = trpc.caiusAgent.knowledge.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); resetForm(); } });
  const updateMutation = trpc.caiusAgent.knowledge.update.useMutation({ onSuccess: () => { refetch(); setShowForm(false); setEditingId(null); resetForm(); } });
  const deleteMutation = trpc.caiusAgent.knowledge.delete.useMutation({ onSuccess: () => refetch() });

  const resetForm = () => setForm({ title: "", sourceType: "text", content: "", summary: "", category: "", keywords: "", status: "draft" });

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const sourceTypeLabel: Record<string, string> = {
    document: "Documento", text: "Texto", link: "Link", faq: "FAQ",
    regulation: "Regulamento", manual: "Manual", flow: "Fluxo", template: "Modelo",
  };

  const statusColor: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    archived: "bg-gray-100 text-gray-600",
    revoked: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Cabeçalho */}
      <div className="p-4 border-b flex items-center gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar na base de conhecimento..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4 mr-1" /> Novo Item
        </Button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <div className="text-center text-sm text-muted-foreground py-8">Carregando...</div>}
        <div className="grid gap-3">
          {items?.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                      <span className="font-medium text-sm truncate">{item.title}</span>
                    </div>
                    {item.summary && <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{sourceTypeLabel[item.sourceType] ?? item.sourceType}</Badge>
                      <Badge className={`text-[10px] ${statusColor[item.status] ?? ""}`} variant="outline">{item.status}</Badge>
                      {item.category && <Badge variant="outline" className="text-[10px]">{item.category}</Badge>}
                      <span className="text-[10px] text-muted-foreground ml-auto">v{item.version}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setForm({
                          title: item.title,
                          sourceType: item.sourceType,
                          content: item.content ?? "",
                          summary: item.summary ?? "",
                          category: item.category ?? "",
                          keywords: item.keywords ?? "",
                          status: item.status,
                        });
                        setEditingId(item.id);
                        setShowForm(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => deleteMutation.mutate({ id: item.id })}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && (!items || items.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum item na base de conhecimento.</p>
              <p className="text-xs mt-1">Adicione documentos, FAQs e regulamentos para enriquecer as respostas do cAIus.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de formulário */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Item" : "Novo Item da Base de Conhecimento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do documento ou informação" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tipo de Fonte</label>
                <Select value={form.sourceType} onValueChange={v => setForm(f => ({ ...f, sourceType: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceTypeLabel).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Resumo</label>
              <Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Breve descrição do conteúdo" className="mt-1" rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Conteúdo</label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Conteúdo completo do documento ou informação" className="mt-1" rows={6} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Saúde, Educação, IPTU..." className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Palavras-chave</label>
                <Input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="Separadas por vírgula" className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title || createMutation.isPending || updateMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingId ? "Salvar Alterações" : "Criar Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente: Ações Sugeridas ──────────────────────────────────────────────

function ActionsTab() {
  const { data: actions, isLoading, refetch } = trpc.caiusAgent.actions.list.useQuery({ status: "pending", limit: 100 });
  const reviewMutation = trpc.caiusAgent.actions.review.useMutation({ onSuccess: () => refetch() });
  const applyMutation = trpc.caiusAgent.actions.apply.useMutation({ onSuccess: () => refetch() });

  const actionTypeLabel: Record<string, string> = {
    open_protocol: "Abrir Protocolo",
    link_nup: "Vincular NUP",
    assign_sector: "Atribuir Setor",
    suggest_response: "Resposta Sugerida",
    classify_email: "Classificar E-mail",
    summarize: "Resumir",
    identify_service: "Identificar Serviço",
    set_priority: "Definir Prioridade",
    request_document: "Solicitar Documento",
    escalate: "Escalar",
    close_protocol: "Encerrar Protocolo",
    other: "Outro",
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-medium">Ações Sugeridas pelo cAIus</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Revise e aprove as ações recomendadas pela IA</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && <div className="text-center text-sm text-muted-foreground py-8">Carregando...</div>}
        {actions?.map(action => (
          <Card key={action.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-sm">{action.title}</span>
                    <Badge variant="outline" className="text-[10px]">{actionTypeLabel[action.actionType] ?? action.actionType}</Badge>
                  </div>
                  {action.description && <p className="text-xs text-muted-foreground">{action.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">Sessão #{action.sessionId}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => reviewMutation.mutate({ id: action.id, status: "approved" })}
                    disabled={reviewMutation.isPending}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => reviewMutation.mutate({ id: action.id, status: "rejected" })}
                    disabled={reviewMutation.isPending}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
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

// ─── Componente: Dashboard ────────────────────────────────────────────────────

function DashboardTab() {
  const { data: stats, isLoading, refetch } = trpc.caiusAgent.dashboard.stats.useQuery();

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ minHeight: 0 }}>
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <h3 className="font-medium">Painel de Uso do cAIus</h3>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
        </Button>
      </div>
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-8">Carregando estatísticas...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total de Sessões", value: stats?.totalSessions ?? 0, icon: MessageSquare, color: "text-blue-600 bg-blue-50" },
                { label: "Sessões Ativas", value: stats?.activeSessions ?? 0, icon: Zap, color: "text-green-600 bg-green-50" },
                { label: "Mensagens", value: stats?.totalMessages ?? 0, icon: Bot, color: "text-violet-600 bg-violet-50" },
                { label: "Base de Conhecimento", value: stats?.totalKnowledge ?? 0, icon: BookOpen, color: "text-amber-600 bg-amber-50" },
                { label: "Ações Pendentes", value: stats?.pendingActions ?? 0, icon: Clock, color: "text-orange-600 bg-orange-50" },
              ].map(stat => (
                <Card key={stat.label}>
                  <CardContent className="p-4">
                    <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString("pt-BR")}</p>
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
                {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentSessions.map((s: any) => (
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

// ─── Componente: Auditoria ────────────────────────────────────────────────────

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
            {logs?.map(log => (
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

// ─── Componente: Agentes ──────────────────────────────────────────────────────

function AgentsTab() {
  const { data: agents, isLoading, refetch } = trpc.caiusAgent.agents.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", slug: "", context: "internal" as const,
    systemPrompt: "", description: "", model: "gemini-2.5-flash",
    maxTokens: 2048, temperature: "0.4",
    allowVoice: true, allowKnowledgeBase: true,
  });
  const createMutation = trpc.caiusAgent.agents.create.useMutation({ onSuccess: () => { refetch(); setShowForm(false); } });
  const updateMutation = trpc.caiusAgent.agents.update.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-medium">Configuração de Agentes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Perfis de instrução e comportamento do cAIus</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4 mr-1" /> Novo Agente
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && <div className="text-center text-sm text-muted-foreground py-8">Carregando...</div>}
        {agents?.map(agent => (
          <Card key={agent.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-violet-500" />
                    <span className="font-medium text-sm">{agent.name}</span>
                    {agent.isDefault && <Badge className="text-[10px] bg-violet-100 text-violet-700">Padrão</Badge>}
                    <Badge variant="outline" className={`text-[10px] ${agent.isActive ? "text-green-600" : "text-gray-500"}`}>
                      {agent.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{agent.description}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">Contexto: {agent.context}</Badge>
                    <Badge variant="outline" className="text-[10px]">Modelo: {agent.model}</Badge>
                    <Badge variant="outline" className="text-[10px]">Max tokens: {agent.maxTokens}</Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMutation.mutate({ id: agent.id, isActive: !agent.isActive })}
                >
                  {agent.isActive ? "Desativar" : "Ativar"}
                </Button>
              </div>
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
              <Select value={form.context} onValueChange={v => setForm(f => ({ ...f, context: v as any }))}>
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
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.slug || !form.systemPrompt || createMutation.isPending} className="bg-violet-600 hover:bg-violet-700">
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

export default function CaiusAgent() {
  return (
    <OmniLayout title="cAIus — Agente Institucional de IA" fullHeight>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <Tabs defaultValue="chat" className="flex flex-col flex-1" style={{ minHeight: 0 }}>
          <div className="border-b px-4 shrink-0">
            <TabsList className="h-10 bg-transparent border-0 p-0 gap-1">
              {[
                { value: "chat", label: "Chat", icon: Bot },
                { value: "sessions", label: "Sessões", icon: MessageSquare },
                { value: "knowledge", label: "Base de Conhecimento", icon: BookOpen },
                { value: "actions", label: "Ações Sugeridas", icon: Zap },
                { value: "agents", label: "Agentes", icon: Settings },
                { value: "audit", label: "Auditoria", icon: Shield },
                { value: "dashboard", label: "Dashboard", icon: BarChart3 },
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
            <TabsContent value="chat" className="h-full m-0"><ChatTab /></TabsContent>
            <TabsContent value="sessions" className="h-full m-0"><SessionsTab /></TabsContent>
            <TabsContent value="knowledge" className="h-full m-0"><KnowledgeTab /></TabsContent>
            <TabsContent value="actions" className="h-full m-0"><ActionsTab /></TabsContent>
            <TabsContent value="agents" className="h-full m-0"><AgentsTab /></TabsContent>
            <TabsContent value="audit" className="h-full m-0"><AuditTab /></TabsContent>
            <TabsContent value="dashboard" className="h-full m-0"><DashboardTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </OmniLayout>
  );
}
