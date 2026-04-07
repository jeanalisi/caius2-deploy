import React, { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, X,
  CheckCircle2, ArrowRight, MessageSquare, ClipboardList,
  Search, Globe, Smartphone, Mail, Clock, Shield,
  FileText, HelpCircle, Star, MapPin, Phone, Building2,
  UserCheck, Zap, Bell, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const slides = [
  // Slide 1: Capa
  {
    id: 1,
    type: "cover",
    title: "Prefeitura de Itabaiana-PB",
    subtitle: "Conheça os canais digitais de atendimento ao cidadão — rápido, fácil e sem sair de casa",
    bg: "from-blue-950 via-slate-900 to-slate-950",
    accent: "text-blue-400",
    content: (
      <div className="flex flex-col items-center gap-6 text-center max-w-2xl">
        <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Building2 className="w-10 h-10 text-blue-400" />
        </div>
        <p className="text-slate-300 text-lg leading-relaxed">
          A Prefeitura de Itabaiana-PB disponibiliza o <strong className="text-white">CAIUS</strong> — 
          Central de Atendimento Integrado ao Usuário — para que você resolva suas demandas 
          de forma rápida, segura e sem precisar se deslocar.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { label: "WhatsApp", icon: Smartphone, color: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" },
            { label: "WebChat", icon: Globe, color: "bg-blue-500/20 border-blue-500/30 text-blue-300" },
            { label: "E-mail", icon: Mail, color: "bg-amber-500/20 border-amber-500/30 text-amber-300" },
            { label: "Instagram", icon: Star, color: "bg-pink-500/20 border-pink-500/30 text-pink-300" },
          ].map((b) => (
            <div key={b.label} className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-sm", b.color)}>
              <b.icon className="w-4 h-4" />
              <span className="font-semibold">{b.label}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-sm">Atendimento disponível 24h pelo assistente virtual</p>
      </div>
    ),
  },

  // Slide 2: Canais de Atendimento
  {
    id: 2,
    type: "feature",
    title: "Como Falar com a Prefeitura",
    subtitle: "Escolha o canal mais conveniente para você",
    bg: "from-emerald-950 via-slate-900 to-slate-900",
    accent: "text-emerald-400",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        {[
          {
            icon: Smartphone,
            title: "WhatsApp",
            color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
            desc: "Envie mensagem para o número oficial da prefeitura",
            features: ["Disponível 24 horas", "Assistente virtual automático", "Envio de documentos e fotos", "Protocolo gerado na hora"],
          },
          {
            icon: Globe,
            title: "WebChat (Site)",
            color: "border-blue-500/20 bg-blue-500/5 text-blue-300",
            desc: "Acesse o chat diretamente pelo site da prefeitura",
            features: ["Sem precisar de aplicativo", "Funciona em qualquer navegador", "Histórico salvo na sessão", "Atendimento humano disponível"],
          },
          {
            icon: Mail,
            title: "E-mail",
            color: "border-amber-500/20 bg-amber-500/5 text-amber-300",
            desc: "Envie sua solicitação por e-mail institucional",
            features: ["Ideal para solicitações formais", "Anexe documentos facilmente", "Resposta em até 3 dias úteis", "Protocolo enviado por retorno"],
          },
          {
            icon: Star,
            title: "Instagram",
            color: "border-pink-500/20 bg-pink-500/5 text-pink-300",
            desc: "Fale pelo Direct do Instagram oficial da prefeitura",
            features: ["Atendimento pelo Direct", "Assistente virtual integrado", "Encaminhamento automático", "Protocolo gerado automaticamente"],
          },
        ].map((c) => (
          <div key={c.title} className={cn("rounded-xl border p-4 space-y-3", c.color)}>
            <div className="flex items-center gap-2">
              <c.icon className="w-5 h-5" />
              <p className="text-white font-bold">{c.title}</p>
            </div>
            <p className="text-slate-400 text-sm">{c.desc}</p>
            {c.features.map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-xs">{f}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },

  // Slide 3: Como Abrir um Protocolo
  {
    id: 3,
    type: "feature",
    title: "Como Abrir um Protocolo",
    subtitle: "Registre sua solicitação e acompanhe cada etapa do atendimento",
    bg: "from-blue-950 via-slate-900 to-slate-900",
    accent: "text-blue-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-blue-300 font-semibold text-sm uppercase tracking-wide mb-1">Passo a Passo</p>
          {[
            { step: "1", label: "Escolha o canal", desc: "WhatsApp, WebChat, E-mail ou Instagram", color: "bg-blue-500/20 border-blue-500/30" },
            { step: "2", label: "Fale com o assistente", desc: "O bot vai te guiar pelo menu de serviços", color: "bg-indigo-500/20 border-indigo-500/30" },
            { step: "3", label: "Selecione o serviço", desc: "Escolha o tipo de solicitação que precisa", color: "bg-purple-500/20 border-purple-500/30" },
            { step: "4", label: "Informe seus dados", desc: "Nome, CPF e informações da solicitação", color: "bg-emerald-500/20 border-emerald-500/30" },
            { step: "5", label: "Receba o NUP", desc: "Número Único de Protocolo para acompanhar", color: "bg-amber-500/20 border-amber-500/30" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center text-white text-sm font-bold flex-shrink-0", s.color)}>
                {s.step}
              </div>
              <div className={cn("flex-1 rounded-lg border p-3", s.color)}>
                <span className="text-white font-semibold text-sm">{s.label}</span>
                <span className="text-slate-400 text-xs ml-2">{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3">
            <p className="text-blue-300 font-semibold text-sm uppercase tracking-wide">O que é o NUP?</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              O <strong className="text-white">Número Único de Protocolo (NUP)</strong> é o código que identifica 
              sua solicitação. Com ele você pode:
            </p>
            {[
              "Consultar o status da sua solicitação a qualquer hora",
              "Saber em qual setor está sendo analisada",
              "Verificar o prazo previsto para resposta",
              "Receber notificações sobre atualizações",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">Prazo de Resposta</p>
              <p className="text-slate-400 text-xs">Cada tipo de serviço tem um prazo definido. Você será notificado quando houver atualização.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // Slide 4: Consultar Protocolo
  {
    id: 4,
    type: "feature",
    title: "Acompanhe Sua Solicitação",
    subtitle: "Consulte o status do seu protocolo a qualquer momento",
    bg: "from-purple-950 via-slate-900 to-slate-900",
    accent: "text-purple-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-center">
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-3">
            <p className="text-purple-300 font-semibold text-sm uppercase tracking-wide">Como Consultar</p>
            {[
              { icon: Smartphone, label: "Pelo WhatsApp", desc: "Envie seu NUP no chat e o assistente informa o status" },
              { icon: Globe, label: "Pelo Site", desc: "Acesse o portal do cidadão e informe o NUP" },
              { icon: Search, label: "Pelo Código", desc: "Use o código de acesso enviado por e-mail ou SMS" },
            ].map((m) => (
              <div key={m.label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <m.icon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{m.label}</p>
                  <p className="text-slate-400 text-xs">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-3">
            <p className="text-purple-300 font-semibold text-sm uppercase tracking-wide">Status do Protocolo</p>
            {[
              { status: "Aberto", desc: "Sua solicitação foi recebida e registrada", color: "text-blue-400" },
              { status: "Em Análise", desc: "Um servidor está analisando seu pedido", color: "text-amber-400" },
              { status: "Em Tramitação", desc: "Encaminhado para o setor responsável", color: "text-purple-400" },
              { status: "Respondido", desc: "Há uma resposta disponível para você", color: "text-emerald-400" },
              { status: "Concluído", desc: "Sua solicitação foi atendida com sucesso", color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.status} className="flex items-start gap-2">
                <span className={cn("font-bold text-sm flex-shrink-0 w-28", s.color)}>{s.status}</span>
                <span className="text-slate-400 text-sm">{s.desc}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">Notificações Automáticas</p>
              <p className="text-slate-400 text-xs">Você receberá uma mensagem automática sempre que houver atualização no seu protocolo.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // Slide 5: Serviços Disponíveis
  {
    id: 5,
    type: "feature",
    title: "Serviços Disponíveis",
    subtitle: "Veja o que você pode solicitar pelo CAIUS",
    bg: "from-amber-950 via-slate-900 to-slate-900",
    accent: "text-amber-400",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
        {[
          {
            title: "Secretaria de Saúde",
            color: "border-red-500/20 bg-red-500/5 text-red-300",
            items: ["Agendamento de consultas", "Solicitação de medicamentos", "Informações sobre UBS", "Ouvidoria de saúde"],
          },
          {
            title: "Secretaria de Educação",
            color: "border-blue-500/20 bg-blue-500/5 text-blue-300",
            items: ["Matrícula escolar", "Transferência de alunos", "Calendário letivo", "Ouvidoria educacional"],
          },
          {
            title: "Obras e Urbanismo",
            color: "border-amber-500/20 bg-amber-500/5 text-amber-300",
            items: ["Alvará de construção", "Habite-se", "Denúncia de obras irregulares", "Iluminação pública"],
          },
          {
            title: "Tributação e Finanças",
            color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
            items: ["IPTU e ISSQN", "Certidão negativa de débitos", "Parcelamento de dívidas", "Nota fiscal eletrônica"],
          },
          {
            title: "Assistência Social",
            color: "border-purple-500/20 bg-purple-500/5 text-purple-300",
            items: ["Cadastro Único", "Benefícios sociais", "CRAS e CREAS", "Denúncia de vulnerabilidade"],
          },
          {
            title: "Ouvidoria Geral",
            color: "border-slate-500/20 bg-slate-500/5 text-slate-300",
            items: ["Reclamações", "Sugestões", "Elogios", "Denúncias anônimas"],
          },
        ].map((s) => (
          <div key={s.title} className={cn("rounded-xl border p-4 space-y-2", s.color)}>
            <p className="text-white font-bold text-sm">{s.title}</p>
            {s.items.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-xs">{item}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },

  // Slide 6: Assinatura e Documentos
  {
    id: 6,
    type: "feature",
    title: "Documentos com Validade Oficial",
    subtitle: "Documentos emitidos pelo CAIUS têm validade jurídica e podem ser verificados online",
    bg: "from-slate-950 via-slate-900 to-indigo-950",
    accent: "text-indigo-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-center">
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-3">
            <p className="text-indigo-300 font-semibold text-sm uppercase tracking-wide">Documentos Emitidos</p>
            {[
              { icon: FileText, label: "Certidões", desc: "Certidão negativa, de débitos e outras" },
              { icon: ClipboardList, label: "Comprovantes", desc: "Comprovante de protocolo e atendimento" },
              { icon: Shield, label: "Alvarás", desc: "Alvará de funcionamento e construção" },
              { icon: CheckCircle2, label: "Respostas Oficiais", desc: "Respostas formais a solicitações e ouvidoria" },
            ].map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <d.icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{d.label}</p>
                  <p className="text-slate-400 text-xs">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
            <p className="text-emerald-300 font-semibold text-sm uppercase tracking-wide">Como Verificar Autenticidade</p>
            <p className="text-slate-300 text-sm">Todo documento emitido possui um <strong className="text-white">código de verificação</strong> que permite confirmar sua autenticidade:</p>
            {[
              "Acesse o portal de verificação no site da prefeitura",
              "Informe o código impresso no documento",
              "Veja os dados do documento e quem assinou",
              "Confirme que o documento é original e válido",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">Certificado por</p>
              <p className="text-slate-400 text-xs">Município de Itabaiana-PB<br />CNPJ: 09.072.430/0001-93</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // Slide 7: Dicas para o Cidadão
  {
    id: 7,
    type: "feature",
    title: "Dicas para um Atendimento Mais Rápido",
    subtitle: "Prepare-se antes de entrar em contato para agilizar sua solicitação",
    bg: "from-cyan-950 via-slate-900 to-slate-900",
    accent: "text-cyan-400",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        {[
          {
            icon: UserCheck,
            title: "Tenha seus dados em mãos",
            color: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
            items: ["CPF ou RG", "Endereço completo", "Número de telefone atualizado", "E-mail para receber notificações"],
          },
          {
            icon: FileText,
            title: "Prepare os documentos",
            color: "border-blue-500/20 bg-blue-500/5 text-blue-300",
            items: ["Documentos em formato PDF ou foto clara", "Tamanho máximo de 16MB por arquivo", "Imagens sem reflexo ou cortes", "Documentos legíveis e atualizados"],
          },
          {
            icon: HelpCircle,
            title: "Descreva bem sua solicitação",
            color: "border-amber-500/20 bg-amber-500/5 text-amber-300",
            items: ["Seja claro e objetivo", "Informe endereço se for sobre local específico", "Mencione tentativas anteriores", "Inclua datas relevantes"],
          },
          {
            icon: Bell,
            title: "Acompanhe sua solicitação",
            color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
            items: ["Guarde o número do protocolo (NUP)", "Ative notificações no WhatsApp", "Verifique o prazo de resposta", "Entre em contato se o prazo vencer"],
          },
        ].map((m) => (
          <div key={m.title} className={cn("rounded-xl border p-4 space-y-3", m.color)}>
            <div className="flex items-center gap-2">
              <m.icon className="w-4 h-4" />
              <p className="text-white font-bold text-sm">{m.title}</p>
            </div>
            {m.items.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-xs leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },

  // Slide 8: Encerramento
  {
    id: 8,
    type: "closing",
    title: "Itabaiana Digital",
    subtitle: "A Prefeitura de Itabaiana-PB ao seu alcance, a qualquer hora e em qualquer lugar",
    bg: "from-slate-950 via-slate-900 to-blue-950",
    accent: "text-blue-400",
    content: (
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {[
            { value: "24h", label: "Atendimento virtual", icon: Clock },
            { value: "4", label: "Canais integrados", icon: Globe },
            { value: "NUP", label: "Rastreie sua solicitação", icon: Search },
            { value: "100%", label: "Gratuito para o cidadão", icon: Star },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col items-center gap-2">
              <stat.icon className="w-6 h-6 text-blue-400" />
              <p className="text-white font-bold text-lg">{stat.value}</p>
              <p className="text-slate-400 text-xs text-center leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6 space-y-3 w-full text-left">
          <p className="text-white font-semibold text-center mb-2">Como começar agora</p>
          {[
            "Acesse o site da prefeitura e clique em 'Fale Conosco'",
            "Ou envie uma mensagem para o WhatsApp oficial",
            "O assistente virtual irá te guiar pelo atendimento",
            "Guarde o número do protocolo para acompanhar",
          ].map((f) => (
            <div key={f} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 text-sm">{f}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 w-full">
          <p className="text-slate-400 text-sm text-center">
            <strong className="text-white">Prefeitura Municipal de Itabaiana-PB</strong><br />
            CNPJ: 09.072.430/0001-93 · Atendimento digital disponível 24 horas
          </p>
        </div>
      </div>
    ),
  },
];

export default function PresentationCidadao() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [, navigate] = useLocation();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const total = slides.length;
  const slide = slides[current];

  const goTo = useCallback(
    (index: number, dir: "next" | "prev") => {
      if (animating || index < 0 || index >= total) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => { setCurrent(index); setAnimating(false); }, 300);
    },
    [animating, total]
  );

  const next = useCallback(() => goTo(current + 1, "next"), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, "prev"), [current, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") { if (isFullscreen) setIsFullscreen(false); else navigate("/dashboard"); }
      else if (e.key === "f" || e.key === "F") setIsFullscreen((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, isFullscreen, navigate]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative flex flex-col bg-slate-950 text-white overflow-hidden", isFullscreen ? "fixed inset-0 z-50" : "min-h-screen")}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-slate-300 text-sm font-medium">Guia do Cidadão — CAIUS · Itabaiana-PB</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">{current + 1} / {total}</span>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white" onClick={() => navigate("/dashboard")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 px-6 py-2 bg-slate-950/60 flex-shrink-0">
        {slides.map((s, i) => (
          <button key={s.id} onClick={() => goTo(i, i > current ? "next" : "prev")}
            className={cn("flex-1 h-1 rounded-full transition-all duration-300 cursor-pointer",
              i < current ? "bg-blue-500" : i === current ? "bg-blue-400" : "bg-slate-700 hover:bg-slate-600"
            )} title={s.title} />
        ))}
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <div className={cn("absolute inset-0 bg-gradient-to-br transition-all duration-300", slide.bg,
          animating ? direction === "next" ? "opacity-0 translate-x-8" : "opacity-0 -translate-x-8" : "opacity-100 translate-x-0"
        )} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl" />
        </div>
        <div className={cn("relative z-10 flex flex-col items-center justify-center h-full px-8 py-6 transition-all duration-300",
          animating ? direction === "next" ? "opacity-0 translate-y-4" : "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
        )}>
          <div className="text-center mb-6 max-w-3xl">
            {slide.type === "cover"
              ? <h1 className={cn("text-5xl font-black tracking-tight mb-3", slide.accent)}>{slide.title}</h1>
              : <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
            }
            {slide.subtitle && <p className="text-slate-400 text-base leading-relaxed">{slide.subtitle}</p>}
          </div>
          <div className="flex items-center justify-center w-full max-w-5xl overflow-auto">{slide.content}</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60 bg-slate-950/80 backdrop-blur-sm flex-shrink-0">
        <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 bg-transparent gap-2" onClick={prev} disabled={current === 0}>
          <ChevronLeft className="w-4 h-4" />Anterior
        </Button>
        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <button key={s.id} onClick={() => goTo(i, i > current ? "next" : "prev")}
              className={cn("rounded-full transition-all duration-200", i === current ? "w-6 h-2 bg-blue-400" : "w-2 h-2 bg-slate-600 hover:bg-slate-500")} />
          ))}
        </div>
        {current < total - 1
          ? <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2" onClick={next}>Próximo <ChevronRight className="w-4 h-4" /></Button>
          : <Button variant="outline" className="border-blue-500/40 text-blue-300 hover:text-white hover:border-blue-400 bg-transparent gap-2" onClick={() => navigate("/dashboard")}><ArrowRight className="w-4 h-4" /></Button>
        }
      </div>
    </div>
  );
}
