/**
 * CAIUS — Widget de Webchat para a Central do Cidadão
 *
 * Botão flutuante no canto inferior direito que abre uma janela de chat.
 * O cidadão pode conversar com o bot ou com um atendente humano.
 * Toda a comunicação é via tRPC (polling a cada 3s para novas mensagens).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Loader2, Bot, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

// ─── Formulário de identificação ─────────────────────────────────────────────

function IdentificationForm({
  onSubmit,
  loading,
}: {
  onSubmit: (info: VisitorInfo) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <div>
        <p className="text-sm text-gray-600 mb-3">
          Para iniciar o atendimento, informe seus dados:
        </p>
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Seu nome *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={128}
            className="text-sm"
          />
          <Input
            placeholder="E-mail (opcional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={320}
            className="text-sm"
          />
          <Input
            placeholder="Telefone (opcional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={32}
            className="text-sm"
          />
        </div>
      </div>
      <Button type="submit" disabled={loading || !name.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Iniciando...</>
        ) : (
          "Iniciar Atendimento"
        )}
      </Button>
    </form>
  );
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.direction === "inbound";
  const time = new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="w-4 h-4 text-blue-600" />
        </div>
      )}
      <div className={cn("max-w-[78%]", isUser ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
        {!isUser && msg.senderName && (
          <span className="text-[10px] text-gray-400 ml-1">{msg.senderName}</span>
        )}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-blue-600 text-white rounded-tr-sm"
              : "bg-gray-100 text-gray-800 rounded-tl-sm",
            msg.isOptimistic && "opacity-70"
          )}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-gray-400 px-1">{time}</span>
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function WebchatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    sessionStorage.getItem("caius_webchat_token")
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [nup, setNup] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("bot");
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef(0);

  // Mutações tRPC
  const startMutation = trpc.webchat.start.useMutation();
  const sendMutation = trpc.webchat.send.useMutation();

  // Polling de mensagens (a cada 3s quando a sessão existe)
  const { data: messagesData } = trpc.webchat.messages.useQuery(
    { sessionToken: sessionToken! },
    {
      enabled: !!sessionToken,
      refetchInterval: isOpen ? 3000 : 10000,
      refetchIntervalInBackground: false,
    }
  );

  // Polling de status da sessão
  const { data: statusData } = trpc.webchat.status.useQuery(
    { sessionToken: sessionToken! },
    {
      enabled: !!sessionToken,
      refetchInterval: isOpen ? 5000 : 30000,
    }
  );

  // Sincronizar mensagens do servidor
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

    // Detectar novas mensagens para o badge de não lidas
    if (!isOpen && serverMessages.length > lastMessageCountRef.current) {
      setHasUnread(true);
    }
    lastMessageCountRef.current = serverMessages.length;
  }, [messagesData, isOpen]);

  // Sincronizar status
  useEffect(() => {
    if (statusData) {
      setSessionStatus(statusData.status);
      if (statusData.nup) setNup(statusData.nup);
    }
  }, [statusData]);

  // Scroll automático para o final
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Limpar badge ao abrir
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleStartSession = useCallback(async (info: VisitorInfo) => {
    try {
      const result = await startMutation.mutateAsync({
        visitorName: info.name,
        visitorEmail: info.email,
        visitorPhone: info.phone,
        referrerUrl: window.location.href,
      });
      sessionStorage.setItem("caius_webchat_token", result.sessionToken);
      setSessionToken(result.sessionToken);
    } catch (err) {
      console.error("[WebchatWidget] Erro ao iniciar sessão:", err);
    }
  }, [startMutation]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !sessionToken || isSending) return;

    const text = inputText.trim();
    setInputText("");
    setIsSending(true);

    // Mensagem otimista
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
      const result = await sendMutation.mutateAsync({
        sessionToken,
        content: text,
      });

      if (result.nup) setNup(result.nup);
      if (result.status) setSessionStatus(result.status);

      // Adicionar respostas do bot imediatamente
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
      // Remover mensagem otimista em caso de erro
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      console.error("[WebchatWidget] Erro ao enviar mensagem:", err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [inputText, sessionToken, isSending, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusLabel: Record<string, string> = {
    bot: "Atendimento automático",
    waiting: "Aguardando atendente",
    active: "Em atendimento",
    closed: "Atendimento encerrado",
    abandoned: "Sessão expirada",
  };

  const statusColor: Record<string, string> = {
    bot: "bg-blue-500",
    waiting: "bg-amber-500",
    active: "bg-green-500",
    closed: "bg-gray-400",
    abandoned: "bg-gray-400",
  };

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Tooltip */}
        {!isOpen && (
          <div className="bg-white shadow-lg rounded-xl px-3 py-2 text-sm text-gray-700 border border-gray-200 animate-bounce-slow">
            Fale conosco!
          </div>
        )}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className={cn(
            "w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200",
            "bg-blue-600 hover:bg-blue-700 text-white",
            isOpen && "rotate-0"
          )}
          aria-label={isOpen ? "Fechar chat" : "Abrir chat"}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  !
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Janela de chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">Atendimento ao Cidadão</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("w-2 h-2 rounded-full", sessionToken ? statusColor[sessionStatus] ?? "bg-blue-400" : "bg-gray-300")} />
                <span className="text-xs text-blue-100">
                  {sessionToken ? (statusLabel[sessionStatus] ?? "Conectado") : "Clique para iniciar"}
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-blue-200 hover:text-white transition-colors">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* NUP badge */}
          {nup && (
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-700 flex items-center gap-1.5">
              <span className="font-medium">Protocolo:</span>
              <span className="font-mono font-semibold">{nup}</span>
            </div>
          )}

          {/* Corpo */}
          {!sessionToken ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 bg-blue-50 border-b border-blue-100">
                <p className="text-sm text-blue-800 font-medium">Bem-vindo ao Atendimento Digital!</p>
                <p className="text-xs text-blue-600 mt-1">
                  Converse com nossa equipe ou com o assistente automático. Você receberá um número de protocolo (NUP) para acompanhar seu atendimento.
                </p>
              </div>
              <IdentificationForm
                onSubmit={handleStartSession}
                loading={startMutation.isPending}
              />
            </div>
          ) : (
            <>
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Aguardando mensagens...</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-3 flex gap-2">
                {sessionStatus === "closed" ? (
                  <div className="flex-1 text-center text-sm text-gray-500 py-2">
                    Atendimento encerrado.{" "}
                    <button
                      className="text-blue-600 underline"
                      onClick={() => {
                        sessionStorage.removeItem("caius_webchat_token");
                        setSessionToken(null);
                        setMessages([]);
                        setNup(null);
                        setSessionStatus("bot");
                      }}
                    >
                      Novo atendimento
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      ref={inputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua mensagem..."
                      disabled={isSending}
                      className="text-sm flex-1"
                      maxLength={4096}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputText.trim() || isSending}
                      size="icon"
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
