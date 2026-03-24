/**
 * ChatCidadao — Página dedicada de atendimento ao cidadão via Webchat
 *
 * Rota pública: /atendimento
 * Interface completa de chat sem necessidade de navegar pela Central do Cidadão.
 * Inclui header institucional, área de mensagens, input e painel lateral com
 * informações do protocolo e status do atendimento.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useOrgConfig } from "@/hooks/useOrgConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Send, Loader2, Bot, User, Shield, Copy,
  CheckCircle2, ExternalLink, ArrowLeft, Clock, Phone, Mail,
  ChevronRight, Info, RefreshCw, X,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: number | string;
  direction: "inbound" | "outbound";
  content: string;
  senderName: string | null;
  createdAt: Date;
  isOptimistic?: boolean;
}

interface VisitorInfo {
  name: string;
  email?: string;
  phone?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formata texto com markdown básico:
 * **negrito**, *itálico*, `código`, \n para quebra de linha
 */
function formatBotText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.direction === "inbound";
  const isSystem = msg.senderName === "Sistema";
  const time = new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm",
            isSystem ? "bg-green-100" : "bg-blue-100"
          )}
        >
          {isSystem ? (
            <Shield className="w-4 h-4 text-green-600" />
          ) : (
            <Bot className="w-4 h-4 text-blue-600" />
          )}
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] md:max-w-[65%]",
          isUser ? "items-end" : "items-start",
          "flex flex-col gap-1"
        )}
      >
        {!isUser && msg.senderName && (
          <span className="text-[11px] text-gray-400 ml-1 font-medium">{msg.senderName}</span>
        )}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
            isUser
              ? "bg-blue-600 text-white rounded-tr-sm"
              : "bg-white text-gray-800 rounded-tl-sm border border-gray-100",
            msg.isOptimistic && "opacity-60"
          )}
        >
          {isUser ? msg.content : formatBotText(msg.content)}
        </div>
        <span className="text-[10px] text-gray-400 px-1">{time}</span>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

/** Indicador de "digitando..." para o bot */
function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4 justify-start">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
        <Bot className="w-4 h-4 text-blue-600" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// ─── Formulário de identificação ─────────────────────────────────────────────

function IdentificationStep({
  onSubmit,
  loading,
  orgName,
}: {
  onSubmit: (info: VisitorInfo) => void;
  loading: boolean;
  orgName: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Ícone e título */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Atendimento Online</h2>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Converse com nossa equipe ou com o assistente automático da{" "}
            <span className="font-medium text-gray-700">{orgName}</span>.
            Você receberá um número de protocolo (NUP) para acompanhar seu atendimento.
          </p>
        </div>

        {/* Benefícios */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Clock, label: "Atendimento 24h", color: "text-blue-600 bg-blue-50" },
            { icon: Shield, label: "Protocolo NUP", color: "text-green-600 bg-green-50" },
            { icon: CheckCircle2, label: "Rastreável", color: "text-purple-600 bg-purple-50" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-600 text-center font-medium leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Ex: Maria da Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={128}
              className="h-11 bg-white border-gray-200 focus:border-blue-400"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-mail <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="seu@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={320}
                  className="h-11 pl-9 bg-white border-gray-200 focus:border-blue-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Telefone <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="(00) 00000-0000"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={32}
                  className="h-11 pl-9 bg-white border-gray-200 focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Iniciando atendimento...
              </>
            ) : (
              <>
                <MessageSquare className="w-5 h-5 mr-2" />
                Iniciar Atendimento
              </>
            )}
          </Button>

          <p className="text-center text-xs text-gray-400">
            Ao iniciar, você concorda com nossa política de privacidade.
            Seus dados são protegidos pela LGPD.
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Painel lateral de informações ───────────────────────────────────────────

function InfoPanel({
  nup,
  sessionStatus,
  visitorName,
  onNewChat,
}: {
  nup: string | null;
  sessionStatus: string;
  visitorName: string;
  onNewChat: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!nup) return;
    navigator.clipboard.writeText(nup).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    bot: { label: "Atendimento automático", color: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-500" },
    waiting: { label: "Aguardando atendente", color: "text-amber-700 bg-amber-50 border-amber-200", dot: "bg-amber-500 animate-pulse" },
    active: { label: "Em atendimento humano", color: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500" },
    closed: { label: "Atendimento encerrado", color: "text-gray-600 bg-gray-50 border-gray-200", dot: "bg-gray-400" },
    abandoned: { label: "Sessão expirada", color: "text-gray-600 bg-gray-50 border-gray-200", dot: "bg-gray-400" },
  };

  const sc = statusConfig[sessionStatus] ?? statusConfig.bot;

  return (
    <div className="flex flex-col gap-4">
      {/* Cidadão */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{visitorName}</p>
            <p className="text-xs text-gray-400">Cidadão</p>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium", sc.color)}>
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", sc.dot)} />
          {sc.label}
        </div>
      </div>

      {/* NUP */}
      {nup && (
        <div className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-green-600" />
            <p className="text-sm font-semibold text-gray-800">Número do Protocolo</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-green-800 text-sm tracking-wide">{nup}</span>
            <button
              onClick={handleCopy}
              className="text-green-600 hover:text-green-800 transition-colors flex-shrink-0"
              title="Copiar NUP"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <a
            href={`/consulta?nup=${encodeURIComponent(nup)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Acompanhar protocolo online
          </a>
        </div>
      )}

      {/* Informações */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Como funciona?</p>
            <p>O assistente automático irá guiá-lo pelo atendimento. Ao final, você receberá um NUP para acompanhar sua solicitação.</p>
          </div>
        </div>
      </div>

      {/* Novo atendimento */}
      {(sessionStatus === "closed" || sessionStatus === "abandoned") && (
        <Button
          variant="outline"
          onClick={onNewChat}
          className="w-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <RefreshCw className="w-4 h-4" />
          Novo Atendimento
        </Button>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ChatCidadao() {
  const orgConfig = useOrgConfig();

  // Estado da sessão
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    sessionStorage.getItem("caius_webchat_token")
  );
  const [visitorName, setVisitorName] = useState<string>(() =>
    sessionStorage.getItem("caius_webchat_name") ?? ""
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [nup, setNup] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("bot");
  const [showInfo, setShowInfo] = useState(false); // painel lateral no mobile

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);

  // Mutações tRPC
  const startMutation = trpc.webchat.start.useMutation();
  const sendMutation = trpc.webchat.send.useMutation();

  // Polling de mensagens
  const { data: messagesData } = trpc.webchat.messages.useQuery(
    { sessionToken: sessionToken! },
    {
      enabled: !!sessionToken,
      refetchInterval: 3000,
      refetchIntervalInBackground: false,
    }
  );

  // Polling de status
  const { data: statusData } = trpc.webchat.status.useQuery(
    { sessionToken: sessionToken! },
    {
      enabled: !!sessionToken,
      refetchInterval: 5000,
    }
  );

  // Sincronizar mensagens
  useEffect(() => {
    if (!messagesData) return;
    const serverMessages: ChatMessage[] = messagesData.map((m) => ({
      id: m.id,
      direction: m.direction as "inbound" | "outbound",
      content: m.content ?? "",
      senderName: m.senderName,
      createdAt: m.createdAt,
    }));
    setMessages(serverMessages);
    lastMessageCountRef.current = serverMessages.length;
  }, [messagesData]);

  // Sincronizar status
  useEffect(() => {
    if (statusData) {
      setSessionStatus(statusData.status);
      if (statusData.nup) setNup(statusData.nup);
    }
  }, [statusData]);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  // Foco no input ao carregar
  useEffect(() => {
    if (sessionToken) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [sessionToken]);

  const handleStartSession = useCallback(
    async (info: VisitorInfo) => {
      try {
        const result = await startMutation.mutateAsync({
          visitorName: info.name,
          visitorEmail: info.email,
          visitorPhone: info.phone,
          referrerUrl: window.location.href,
        });
        sessionStorage.setItem("caius_webchat_token", result.sessionToken);
        sessionStorage.setItem("caius_webchat_name", info.name);
        setSessionToken(result.sessionToken);
        setVisitorName(info.name);
      } catch (err) {
        console.error("[ChatCidadao] Erro ao iniciar sessão:", err);
      }
    },
    [startMutation]
  );

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !sessionToken || isSending) return;

    const text = inputText.trim();
    setInputText("");
    setIsSending(true);
    setIsBotTyping(true);

    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      direction: "inbound",
      content: text,
      senderName: null,
      createdAt: new Date(),
      isOptimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const result = await sendMutation.mutateAsync({ sessionToken, content: text });

      if (result.nup) setNup(result.nup);
      if (result.status) setSessionStatus(result.status);

      if (result.botReplies.length > 0) {
        const botMessages: ChatMessage[] = result.botReplies.map((reply, i) => ({
          id: `bot-${Date.now()}-${i}`,
          direction: "outbound" as const,
          content: reply,
          senderName: "Bot CAIUS",
          createdAt: new Date(),
        }));
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticId),
          optimisticMsg,
          ...botMessages,
        ]);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      console.error("[ChatCidadao] Erro ao enviar mensagem:", err);
    } finally {
      setIsSending(false);
      setIsBotTyping(false);
      inputRef.current?.focus();
    }
  }, [inputText, sessionToken, isSending, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    sessionStorage.removeItem("caius_webchat_token");
    sessionStorage.removeItem("caius_webchat_name");
    setSessionToken(null);
    setVisitorName("");
    setMessages([]);
    setNup(null);
    setSessionStatus("bot");
  };

  const isClosed = sessionStatus === "closed" || sessionStatus === "abandoned";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <a href="/central-cidadao" className="flex items-center gap-3 flex-shrink-0">
            {orgConfig.logoUrl ? (
              <img
                src={orgConfig.logoUrl}
                alt={orgConfig.orgName}
                className="h-9 w-auto object-contain"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <p className="font-bold text-gray-900 text-sm leading-tight">{orgConfig.orgName}</p>
              <p className="text-[11px] text-gray-500">Atendimento ao Cidadão</p>
            </div>
          </a>

          {/* Separador */}
          <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1" />

          {/* Título da página */}
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold text-gray-800 text-sm">Chat Online</span>
          </div>

          {/* Status (desktop) */}
          {sessionToken && (
            <div className="hidden md:flex items-center gap-2 ml-auto">
              {nup && (
                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 font-mono text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  {nup}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  sessionStatus === "active" && "border-green-200 text-green-700 bg-green-50",
                  sessionStatus === "waiting" && "border-amber-200 text-amber-700 bg-amber-50",
                  sessionStatus === "bot" && "border-blue-200 text-blue-700 bg-blue-50",
                  (sessionStatus === "closed" || sessionStatus === "abandoned") && "border-gray-200 text-gray-600 bg-gray-50"
                )}
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full mr-1.5",
                  sessionStatus === "active" && "bg-green-500",
                  sessionStatus === "waiting" && "bg-amber-500 animate-pulse",
                  sessionStatus === "bot" && "bg-blue-500",
                  (sessionStatus === "closed" || sessionStatus === "abandoned") && "bg-gray-400"
                )} />
                {{
                  bot: "Automático",
                  waiting: "Aguardando",
                  active: "Em atendimento",
                  closed: "Encerrado",
                  abandoned: "Expirado",
                }[sessionStatus] ?? "Conectado"}
              </Badge>
            </div>
          )}

          {/* Botão info mobile */}
          {sessionToken && (
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="md:hidden ml-auto p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Informações do atendimento"
            >
              {showInfo ? <X className="w-5 h-5 text-gray-600" /> : <Info className="w-5 h-5 text-gray-600" />}
            </button>
          )}

          {/* Link voltar */}
          <a
            href="/central-cidadao"
            className={cn(
              "flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0",
              sessionToken ? "hidden md:flex" : "ml-auto"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Central do Cidadão</span>
          </a>
        </div>
      </header>

      {/* ─── Corpo principal ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex max-w-6xl mx-auto w-full">

        {/* Área de chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {!sessionToken ? (
            /* Formulário de identificação */
            <IdentificationStep
              onSubmit={handleStartSession}
              loading={startMutation.isPending}
              orgName={orgConfig.orgName}
            />
          ) : (
            <>
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-0">
                {messages.length === 0 && !isBotTyping && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-16">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-blue-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">Aguardando mensagens...</p>
                    <p className="text-xs text-gray-400 mt-1">O assistente irá responder em instantes.</p>
                  </div>
                )}

                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}

                {isBotTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 bg-white px-4 py-4">
                {isClosed ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-2">
                    <p className="text-sm text-gray-500">Atendimento encerrado.</p>
                    <Button
                      onClick={handleNewChat}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Iniciar novo atendimento
                    </Button>
                    {nup && (
                      <a
                        href={`/consulta?nup=${encodeURIComponent(nup)}`}
                        className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Consultar protocolo {nup}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-3 max-w-3xl mx-auto">
                    <Input
                      ref={inputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua mensagem..."
                      disabled={isSending}
                      className="flex-1 h-12 bg-gray-50 border-gray-200 focus:border-blue-400 rounded-xl text-sm"
                      maxLength={4096}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputText.trim() || isSending}
                      className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0 shadow-md"
                      size="icon"
                    >
                      {isSending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                )}
                <p className="text-center text-[10px] text-gray-400 mt-2">
                  Pressione Enter para enviar · Shift+Enter para nova linha
                </p>
              </div>
            </>
          )}
        </div>

        {/* ─── Painel lateral (desktop sempre visível / mobile toggle) ──────── */}
        {sessionToken && (
          <aside
            className={cn(
              "w-72 flex-shrink-0 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto",
              "hidden md:block", // desktop: sempre visível
              showInfo && "!block fixed inset-0 z-50 bg-white w-full md:relative md:w-72 md:inset-auto" // mobile: overlay
            )}
          >
            {/* Fechar no mobile */}
            {showInfo && (
              <div className="flex items-center justify-between mb-4 md:hidden">
                <p className="font-semibold text-gray-800">Informações do Atendimento</p>
                <button onClick={() => setShowInfo(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            )}

            <InfoPanel
              nup={nup}
              sessionStatus={sessionStatus}
              visitorName={visitorName}
              onNewChat={handleNewChat}
            />

            {/* Links rápidos */}
            <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Links Úteis</p>
              <div className="space-y-1">
                {[
                  { label: "Consultar Protocolo", href: "/consulta" },
                  { label: "Central do Cidadão", href: "/central-cidadao" },
                  { label: "Estrutura Administrativa", href: "/estrutura-administrativa" },
                ].map(({ label, href }) => (
                  <a
                    key={href}
                    href={href}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
                  >
                    <span>{label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ─── Rodapé ──────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200 py-4 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <p>
            © {new Date().getFullYear()} {orgConfig.orgName} — Todos os direitos reservados
          </p>
          <div className="flex items-center gap-4">
            <a href="/consulta" className="hover:text-gray-600 transition-colors">Consultar Protocolo</a>
            <a href="/central-cidadao" className="hover:text-gray-600 transition-colors">Central do Cidadão</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
