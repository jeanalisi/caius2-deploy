import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  MessageSquare,
  Bot,
  ClipboardList,
  Shield,
  Send,
  BarChart3,
  Users,
  Globe,
  Workflow,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Wifi,
  Mail,
  Instagram,
  Phone,
  FileText,
  Lock,
  MapPin,
  TrendingUp,
  BookOpen,
  Building2,
  Zap,
  Star,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Slide definitions ────────────────────────────────────────────────────────

interface Slide {
  id: number;
  type: "cover" | "overview" | "feature" | "stats" | "closing";
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  bg: string;
  accent: string;
}

const slides: Slide[] = [
  // ── Slide 1: Capa ──────────────────────────────────────────────────────────
  {
    id: 1,
    type: "cover",
    title: "CAIUS",
    subtitle: "Central de Atendimento Integrado Unificado e Sustentável",
    bg: "from-slate-950 via-slate-900 to-slate-800",
    accent: "text-emerald-400",
    content: (
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-slate-300 text-xl max-w-2xl leading-relaxed">
            Plataforma omnichannel de atendimento ao cidadão para a{" "}
            <span className="text-white font-semibold">Prefeitura de Itabaiana-PB</span>
          </p>
          <p className="text-slate-500 text-base">CNPJ: 09.072.430/0001-93</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          {["WhatsApp", "WebChat", "E-mail", "Instagram", "IA Generativa"].map((tag) => (
            <Badge key={tag} variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 px-4 py-1.5 text-sm">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 2: Visão Geral ───────────────────────────────────────────────────
  {
    id: 2,
    type: "overview",
    title: "Uma plataforma, todos os canais",
    subtitle: "O CAIUS unifica o atendimento público em um único sistema inteligente",
    bg: "from-slate-900 via-slate-900 to-slate-800",
    accent: "text-blue-400",
    content: (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
        {[
          { icon: MessageSquare, label: "Atendimento Omnichannel", desc: "WhatsApp, WebChat, E-mail, Instagram em uma única caixa de entrada", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
          { icon: Bot, label: "Chatbot Inteligente", desc: "Fluxos automatizados com coleta de dados e abertura de protocolos", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
          { icon: ClipboardList, label: "Gestão de Protocolos", desc: "NUP, tramitação, prazos e histórico completo de atendimentos", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          { icon: Shield, label: "Assinatura Digital", desc: "Chancela eletrônica com certificação municipal e geolocalização", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
          { icon: Send, label: "Envio em Massa", desc: "Campanhas WhatsApp com planilha, personalização e controle de envio", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
          { icon: BarChart3, label: "Relatórios e Analytics", desc: "Dashboard executivo com métricas de atendimento em tempo real", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
          { icon: Globe, label: "Ouvidoria / e-SIC", desc: "Gestão de manifestações, LAI e transparência pública integrada", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
          { icon: Sparkles, label: "cAIus — Agente de IA", desc: "Assistente inteligente para atendentes com base de conhecimento", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
        ].map((item) => (
          <div key={item.label} className={cn("rounded-xl border p-4 flex flex-col gap-2", item.color)}>
            <item.icon className="w-6 h-6" />
            <p className="text-white font-semibold text-sm leading-tight">{item.label}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    ),
  },

  // ── Slide 3: Atendimento Omnichannel ──────────────────────────────────────
  {
    id: 3,
    type: "feature",
    title: "Atendimento Omnichannel",
    subtitle: "Todos os canais em uma única caixa de entrada unificada",
    bg: "from-blue-950 via-slate-900 to-slate-900",
    accent: "text-blue-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-center">
        {/* Canais */}
        <div className="flex flex-col gap-3 flex-1">
          {[
            { icon: Phone, label: "WhatsApp Business", desc: "Mensagens, mídia, localização e documentos", color: "text-green-400 bg-green-500/10 border-green-500/20" },
            { icon: Globe, label: "WebChat (Navegador)", desc: "Widget embutível no portal da prefeitura", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
            { icon: Mail, label: "E-mail Institucional", desc: "Integração com caixas de e-mail institucionais", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
            { icon: Instagram, label: "Instagram", desc: "Direct messages e comentários integrados", color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
          ].map((c) => (
            <div key={c.label} className={cn("flex items-center gap-3 rounded-xl border p-3", c.color)}>
              <c.icon className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">{c.label}</p>
                <p className="text-slate-400 text-xs">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Features */}
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3">
            <p className="text-blue-300 font-semibold text-sm uppercase tracking-wide">Recursos do Inbox</p>
            {[
              "Inbox unificado com filtros por canal e agente",
              "Transferência de atendimento entre agentes",
              "Fila de atendimento com distribuição automática",
              "Histórico completo de conversas por cidadão",
              "Tags, notas internas e marcação de prioridade",
              "Tickets de suporte integrados",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 4: Chatbot ──────────────────────────────────────────────────────
  {
    id: 4,
    type: "feature",
    title: "Chatbot Inteligente",
    subtitle: "Fluxos automatizados para WhatsApp e WebChat com o mesmo motor",
    bg: "from-purple-950 via-slate-900 to-slate-900",
    accent: "text-purple-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        {/* Fluxo visual */}
        <div className="flex flex-col gap-2 flex-1">
          <p className="text-purple-300 font-semibold text-sm uppercase tracking-wide mb-1">Fluxo de Atendimento</p>
          {[
            { step: "1", label: "Saudação", desc: "Mensagem de boas-vindas personalizada", color: "bg-purple-500/20 border-purple-500/30" },
            { step: "2", label: "Menu de Serviços", desc: "Lista de tipos de atendimento disponíveis", color: "bg-blue-500/20 border-blue-500/30" },
            { step: "3", label: "Coleta de Dados", desc: "Campos dinâmicos por tipo de atendimento", color: "bg-emerald-500/20 border-emerald-500/30" },
            { step: "4", label: "Upload de Documentos", desc: "Solicitação de arquivos exigidos pelo serviço", color: "bg-amber-500/20 border-amber-500/30" },
            { step: "5", label: "Abertura de Protocolo", desc: "Geração automática de NUP com número único", color: "bg-rose-500/20 border-rose-500/30" },
            { step: "6", label: "Transferência Humana", desc: "Encaminhamento ao atendente quando necessário", color: "bg-cyan-500/20 border-cyan-500/30" },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-3">
              <div className={cn("w-7 h-7 rounded-full border flex items-center justify-center text-white text-xs font-bold flex-shrink-0", s.color)}>
                {s.step}
              </div>
              <div className={cn("flex-1 rounded-lg border p-2.5", s.color)}>
                <span className="text-white font-semibold text-sm">{s.label}</span>
                <span className="text-slate-400 text-xs ml-2">{s.desc}</span>
              </div>
              {i < 5 && <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0 rotate-90 absolute" style={{ display: "none" }} />}
            </div>
          ))}
        </div>
        {/* Destaques */}
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-3">
            <p className="text-purple-300 font-semibold text-sm uppercase tracking-wide">Motor Unificado</p>
            {[
              "Mesmo fluxo para WhatsApp e WebChat",
              "Editor visual de fluxos (nós e conexões)",
              "Coleta dinâmica de campos por tipo de serviço",
              "Validação automática (CPF, e-mail, telefone)",
              "Consulta de NUP existente pelo cidadão",
              "Rate limiting configurável por conta",
              "Personalização com variáveis {nome}, {nup}",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 5: Protocolos ───────────────────────────────────────────────────
  {
    id: 5,
    type: "feature",
    title: "Gestão de Protocolos (NUP)",
    subtitle: "Numeração Única de Protocolo com tramitação completa e rastreabilidade",
    bg: "from-emerald-950 via-slate-900 to-slate-900",
    accent: "text-emerald-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
            <p className="text-emerald-300 font-semibold text-sm uppercase tracking-wide">Ciclo de Vida do Protocolo</p>
            {[
              { status: "Aberto", desc: "Criado pelo cidadão via bot ou atendente", color: "bg-blue-500/20 text-blue-300" },
              { status: "Em Análise", desc: "Atribuído a setor ou agente responsável", color: "bg-amber-500/20 text-amber-300" },
              { status: "Em Tramitação", desc: "Encaminhado entre unidades com histórico", color: "bg-purple-500/20 text-purple-300" },
              { status: "Aguardando Cidadão", desc: "Pendente de resposta ou documentação", color: "bg-orange-500/20 text-orange-300" },
              { status: "Concluído", desc: "Resolvido com resposta registrada", color: "bg-emerald-500/20 text-emerald-300" },
            ].map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <Badge className={cn("text-xs px-2 py-0.5 rounded-full border-0", s.color)}>{s.status}</Badge>
                <p className="text-slate-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
            <p className="text-emerald-300 font-semibold text-sm uppercase tracking-wide">Recursos</p>
            {[
              "Geração automática de NUP sequencial por tipo",
              "Tramitação entre setores com prazo e responsável",
              "Exportação de protocolo em PDF com histórico",
              "Consulta pública pelo cidadão via portal",
              "Notificações automáticas por WhatsApp/e-mail",
              "Anexos e documentos vinculados ao protocolo",
              "Relatórios de SLA e tempo médio de resposta",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 6: Assinatura Digital ───────────────────────────────────────────
  {
    id: 6,
    type: "feature",
    title: "Assinatura Digital",
    subtitle: "Chancela eletrônica com validade jurídica e certificação municipal",
    bg: "from-amber-950 via-slate-900 to-slate-900",
    accent: "text-amber-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
            <p className="text-amber-300 font-semibold text-sm uppercase tracking-wide">Unidade Certificadora</p>
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4 text-center">
              <p className="text-white font-bold text-base">Município de Itabaiana-PB</p>
              <p className="text-slate-400 text-sm mt-1">CNPJ: 09.072.430/0001-93</p>
            </div>
            <div className="space-y-2">
              {[
                { icon: Lock, label: "PIN de 6 dígitos", desc: "Autenticação segura do signatário" },
                { icon: MapPin, label: "Geolocalização", desc: "Coordenadas GPS capturadas no ato" },
                { icon: Wifi, label: "Endereço IP", desc: "Registrado e exibido na chancela" },
                { icon: FileText, label: "Chancela em PDF", desc: "Página de assinaturas + faixa lateral" },
              ].map((i) => (
                <div key={i.label} className="flex items-center gap-3">
                  <i.icon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="text-white text-sm font-semibold">{i.label}</span>
                    <span className="text-slate-400 text-xs ml-2">{i.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
            <p className="text-amber-300 font-semibold text-sm uppercase tracking-wide">Funcionalidades</p>
            {[
              "Múltiplos signatários por documento",
              "Ordem de assinatura configurável",
              "Link de assinatura para signatários externos",
              "Verificação pública por código de acesso",
              "Suporte a documentos PDF existentes",
              "Fontes Unicode (caracteres especiais do PT-BR)",
              "Faixa lateral vertical nas páginas originais",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 7: Documentos Oficiais ─────────────────────────────────────────
  {
    id: 7,
    type: "feature",
    title: "Documentos Oficiais e Controle de Numeração",
    subtitle: "Emissão, tramitação e controle de documentos institucionais com numeração automática",
    bg: "from-teal-950 via-slate-900 to-slate-900",
    accent: "text-teal-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-5 space-y-3">
            <p className="text-teal-300 font-semibold text-sm uppercase tracking-wide">Documentos Oficiais</p>
            {[
              "Criação de documentos com modelos pré-definidos",
              "Editor de texto com variáveis automáticas",
              "Assinatura digital integrada (chancela municipal)",
              "Tramitação entre setores com histórico",
              "Exportação em PDF com cabeçalho institucional",
              "Vinculação a protocolos e processos",
              "Controle de versões e revisões",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-5 space-y-3">
            <p className="text-teal-300 font-semibold text-sm uppercase tracking-wide">Controle de Numeração</p>
            {[
              { n: "1", t: "Configurar Séries", d: "Defina prefixo, ano e sequência por unidade" },
              { n: "2", t: "Emitir Número", d: "Geração automática sequencial e única" },
              { n: "3", t: "Vincular Documento", d: "Associe ao ofício, portaria ou memorando" },
              { n: "4", t: "Registrar Histórico", d: "Trilha completa de emissões por setor" },
              { n: "5", t: "Auditar", d: "Relatório de numeração com filtros avançados" },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 text-xs font-bold flex-shrink-0">
                  {s.n}
                </div>
                <div>
                  <span className="text-white font-semibold text-sm">{s.t}</span>
                  <span className="text-slate-400 text-xs ml-2">{s.d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 8: Ouvidoria e Processos ────────────────────────────────────────
  {
    id: 8,
    type: "feature",
    title: "Ouvidoria, e-SIC e Processos",
    subtitle: "Gestão completa de manifestações, LAI e processos administrativos",
    bg: "from-orange-950 via-slate-900 to-slate-900",
    accent: "text-orange-400",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
        {[
          {
            icon: BookOpen,
            title: "Ouvidoria",
            color: "border-orange-500/20 bg-orange-500/5 text-orange-300",
            items: [
              "Reclamações, sugestões e elogios",
              "Prazos automáticos por tipo",
              "Respostas com histórico completo",
              "Relatórios de manifestações",
              "Portal público de acompanhamento",
            ],
          },
          {
            icon: FileText,
            title: "e-SIC (LAI)",
            color: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
            items: [
              "Pedidos de acesso à informação",
              "Controle de prazos legais (20 dias)",
              "Recursos e instâncias recursais",
              "Relatórios de transparência",
              "Exportação para órgãos de controle",
            ],
          },
          {
            icon: Scale,
            title: "Processos Adm.",
            color: "border-violet-500/20 bg-violet-500/5 text-violet-300",
            items: [
              "Abertura e tramitação de processos",
              "Prazos e notificações automáticas",
              "Despachos e documentos vinculados",
              "Histórico de movimentações",
              "Exportação de processo em PDF",
            ],
          },
        ].map((m) => (
          <div key={m.title} className={cn("rounded-xl border p-5 space-y-3", m.color)}>
            <div className="flex items-center gap-2">
              <m.icon className="w-5 h-5" />
              <p className="text-white font-bold text-base">{m.title}</p>
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

  // ── Slide 9: Analytics e IA ───────────────────────────────────────────────
  {
    id: 9,
    type: "stats",
    title: "Analytics, IA e Automação",
    subtitle: "Inteligência artificial integrada em todos os módulos do sistema",
    bg: "from-violet-950 via-slate-900 to-slate-900",
    accent: "text-violet-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <p className="text-violet-300 font-semibold text-sm uppercase tracking-wide">cAIus — Agente de IA</p>
            </div>
            {[
              "Assistente inteligente para atendentes",
              "Base de conhecimento municipal integrada",
              "Sugestões automáticas de resposta",
              "Resumo automático de conversas longas",
              "Classificação automática de assuntos",
              "Análise de sentimento das mensagens",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <p className="text-cyan-300 font-semibold text-sm uppercase tracking-wide">Dashboard Executivo</p>
            </div>
            {[
              "Conversas por canal em tempo real",
              "SLA e tempo médio de atendimento",
              "Ranking de agentes por performance",
              "Mapa de calor de atendimentos (Geo Monitor)",
              "Relatórios exportáveis em PDF/Excel",
              "Indicadores de satisfação do cidadão",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 10: Encerramento ────────────────────────────────────────────────
  {
    id: 10,
    type: "closing",
    title: "CAIUS",
    subtitle: "Transformando o atendimento público de Itabaiana-PB",
    bg: "from-slate-950 via-slate-900 to-emerald-950",
    accent: "text-emerald-400",
    content: (
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {[
            { value: "4+", label: "Canais integrados", icon: Wifi },
            { value: "10+", label: "Módulos ativos", icon: Zap },
            { value: "100%", label: "Municipalizado", icon: Building2 },
            { value: "24/7", label: "Chatbot ativo", icon: Bot },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col items-center gap-2">
              <stat.icon className="w-6 h-6 text-emerald-400" />
              <p className="text-white font-bold text-2xl">{stat.value}</p>
              <p className="text-slate-400 text-xs text-center leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6 space-y-2 w-full">
          <div className="flex items-center gap-2 justify-center">
            <Star className="w-5 h-5 text-amber-400" />
            <p className="text-white font-semibold">Prefeitura Municipal de Itabaiana-PB</p>
          </div>
          <p className="text-slate-400 text-sm">CNPJ: 09.072.430/0001-93</p>
          <p className="text-slate-500 text-xs mt-2">
            Sistema desenvolvido para modernizar e digitalizar o atendimento ao cidadão,
            garantindo eficiência, transparência e acessibilidade nos serviços públicos municipais.
          </p>
        </div>
      </div>
    ),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SystemPresentation() {
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
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 300);
    },
    [animating, total]
  );

  const next = useCallback(() => goTo(current + 1, "next"), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1, "prev"), [current, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        if (isFullscreen) setIsFullscreen(false);
        else navigate("/dashboard");
      } else if (e.key === "f" || e.key === "F") {
        setIsFullscreen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, isFullscreen, navigate]);

  // Fullscreen API
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
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col bg-slate-950 text-white overflow-hidden",
        isFullscreen ? "fixed inset-0 z-50" : "min-h-screen"
      )}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-slate-300 text-sm font-medium">Apresentação do Sistema CAIUS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">
            {current + 1} / {total}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:text-white"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:text-white"
            onClick={() => navigate("/dashboard")}
            title="Fechar apresentação (Esc)"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      <div className="flex gap-1 px-6 py-2 bg-slate-950/60 flex-shrink-0">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i, i > current ? "next" : "prev")}
            className={cn(
              "flex-1 h-1 rounded-full transition-all duration-300 cursor-pointer",
              i < current
                ? "bg-emerald-500"
                : i === current
                ? "bg-emerald-400"
                : "bg-slate-700 hover:bg-slate-600"
            )}
            title={s.title}
          />
        ))}
      </div>

      {/* ── Slide area ──────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br transition-all duration-300",
            slide.bg,
            animating
              ? direction === "next"
                ? "opacity-0 translate-x-8"
                : "opacity-0 -translate-x-8"
              : "opacity-100 translate-x-0"
          )}
        />

        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/[0.02] blur-3xl" />
        </div>

        <div
          className={cn(
            "relative z-10 flex flex-col items-center justify-center h-full px-8 py-6 transition-all duration-300",
            animating
              ? direction === "next"
                ? "opacity-0 translate-y-4"
                : "opacity-0 -translate-y-4"
              : "opacity-100 translate-y-0"
          )}
        >
          {/* Slide header */}
          <div className="text-center mb-6 max-w-3xl">
            {slide.type === "cover" ? (
              <h1 className={cn("text-6xl font-black tracking-tight mb-3", slide.accent)}>
                {slide.title}
              </h1>
            ) : (
              <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
            )}
            {slide.subtitle && (
              <p className="text-slate-400 text-base leading-relaxed">{slide.subtitle}</p>
            )}
          </div>

          {/* Slide content */}
          <div className="flex items-center justify-center w-full max-w-5xl overflow-auto">
            {slide.content}
          </div>
        </div>
      </div>

      {/* ── Navigation controls ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60 bg-slate-950/80 backdrop-blur-sm flex-shrink-0">
        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 bg-transparent gap-2"
          onClick={prev}
          disabled={current === 0}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        {/* Slide dots */}
        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i, i > current ? "next" : "prev")}
              className={cn(
                "rounded-full transition-all duration-200",
                i === current ? "w-6 h-2 bg-emerald-400" : "w-2 h-2 bg-slate-600 hover:bg-slate-500"
              )}
            />
          ))}
        </div>

        {current < total - 1 ? (
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            onClick={next}
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            className="border-emerald-500/40 text-emerald-300 hover:text-white hover:border-emerald-400 bg-transparent gap-2"
            onClick={() => navigate("/dashboard")}
          >
            Ir para o Sistema
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* ── Keyboard hint ───────────────────────────────────────────────── */}
      <div className="absolute bottom-16 right-6 text-slate-600 text-xs hidden md:flex items-center gap-1">
        <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-500 text-xs">←</kbd>
        <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-500 text-xs">→</kbd>
        <span className="ml-1">navegar</span>
        <span className="mx-2 text-slate-700">|</span>
        <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-500 text-xs">F</kbd>
        <span className="ml-1">tela cheia</span>
      </div>
    </div>
  );
}
