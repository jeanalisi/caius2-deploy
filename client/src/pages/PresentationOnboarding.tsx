import React, { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, X,
  CheckCircle2, ArrowRight, UserCheck, MessageSquare, ClipboardList,
  Bot, Shield, BarChart3, Inbox, Settings, LogIn, Eye, Send,
  FileText, Bell, Search, Tag, Users, Star, Zap, Building2,
  BookOpen, AlertCircle, Clock, Lock, Headphones, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Slide definitions ────────────────────────────────────────────────────────

const slides = [
  // ── Slide 1: Boas-vindas ──────────────────────────────────────────────────
  {
    id: 1,
    type: "cover",
    title: "Bem-vindo ao CAIUS",
    subtitle: "Guia de integração para novos servidores — tudo que você precisa saber para começar",
    bg: "from-blue-950 via-slate-900 to-slate-950",
    accent: "text-blue-400",
    content: (
      <div className="flex flex-col items-center gap-6 text-center max-w-2xl">
        <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <UserCheck className="w-10 h-10 text-blue-400" />
        </div>
        <p className="text-slate-300 text-lg leading-relaxed">
          O CAIUS é a plataforma de atendimento digital da Prefeitura de Itabaiana-PB.
          Este guia vai te apresentar as ferramentas que você usará no dia a dia para
          atender cidadãos, gerenciar protocolos e colaborar com sua equipe.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { label: "Tempo estimado", value: "~20 minutos", color: "bg-blue-500/20 border-blue-500/30 text-blue-300" },
            { label: "Nível", value: "Iniciante", color: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" },
            { label: "Módulos", value: "8 tópicos", color: "bg-purple-500/20 border-purple-500/30 text-purple-300" },
          ].map((b) => (
            <div key={b.label} className={cn("flex items-center gap-2 rounded-full border px-4 py-2 text-sm", b.color)}>
              <span className="text-slate-400">{b.label}:</span>
              <span className="font-semibold">{b.value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // ── Slide 2: Primeiro Acesso ──────────────────────────────────────────────
  {
    id: 2,
    type: "feature",
    title: "Primeiro Acesso ao Sistema",
    subtitle: "Como fazer login e configurar seu perfil",
    bg: "from-indigo-950 via-slate-900 to-slate-900",
    accent: "text-indigo-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-indigo-300 font-semibold text-sm uppercase tracking-wide mb-1">Como Entrar</p>
          {[
            { step: "1", label: "Acesse o sistema", desc: "Abra o navegador e acesse o endereço fornecido pelo TI", color: "bg-indigo-500/20 border-indigo-500/30" },
            { step: "2", label: "Clique em Entrar", desc: "Use o botão de login com a conta institucional", color: "bg-blue-500/20 border-blue-500/30" },
            { step: "3", label: "Autentique-se", desc: "Informe suas credenciais fornecidas pelo gestor", color: "bg-purple-500/20 border-purple-500/30" },
            { step: "4", label: "Configure seu perfil", desc: "Adicione foto, nome de exibição e setor", color: "bg-emerald-500/20 border-emerald-500/30" },
            { step: "5", label: "Defina seu PIN", desc: "Crie um PIN de 6 dígitos para assinatura digital", color: "bg-amber-500/20 border-amber-500/30" },
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
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <p className="text-amber-300 font-semibold text-sm uppercase tracking-wide">Importante</p>
            </div>
            {[
              "Nunca compartilhe sua senha com colegas",
              "Faça logout ao sair do computador",
              "Use apenas dispositivos autorizados pela prefeitura",
              "Reporte qualquer acesso suspeito ao TI imediatamente",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center gap-3">
            <Headphones className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">Suporte Técnico</p>
              <p className="text-slate-400 text-xs">Em caso de problemas de acesso, entre em contato com o setor de TI da prefeitura.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 3: Inbox / Atendimento ──────────────────────────────────────────
  {
    id: 3,
    type: "feature",
    title: "Inbox — Caixa de Atendimento",
    subtitle: "Onde você receberá e responderá as mensagens dos cidadãos",
    bg: "from-blue-950 via-slate-900 to-slate-900",
    accent: "text-blue-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-3 flex-1">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3">
            <p className="text-blue-300 font-semibold text-sm uppercase tracking-wide">Estrutura do Inbox</p>
            {[
              { icon: Inbox, label: "Conversas Abertas", desc: "Atendimentos ativos aguardando resposta" },
              { icon: Clock, label: "Fila de Espera", desc: "Cidadãos aguardando atribuição de atendente" },
              { icon: CheckCircle2, label: "Resolvidas", desc: "Conversas encerradas com sucesso" },
              { icon: Tag, label: "Por Etiqueta", desc: "Filtre por assunto, urgência ou setor" },
              { icon: Users, label: "Minha Equipe", desc: "Veja as conversas dos colegas do seu setor" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{item.label}</p>
                  <p className="text-slate-400 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
            <p className="text-emerald-300 font-semibold text-sm uppercase tracking-wide">Como Atender</p>
            {[
              "Clique em uma conversa para abri-la",
              "Leia o histórico completo antes de responder",
              "Use respostas rápidas para mensagens frequentes",
              "Adicione notas internas visíveis apenas para a equipe",
              "Transfira para outro setor se necessário",
              "Encerre a conversa após resolver o atendimento",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">Notificações</p>
              <p className="text-slate-400 text-xs">Ative as notificações do navegador para ser avisado sobre novas mensagens em tempo real.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 4: Protocolos ───────────────────────────────────────────────────
  {
    id: 4,
    type: "feature",
    title: "Gestão de Protocolos",
    subtitle: "Como criar, tramitar e responder protocolos de atendimento",
    bg: "from-emerald-950 via-slate-900 to-slate-900",
    accent: "text-emerald-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-emerald-300 font-semibold text-sm uppercase tracking-wide mb-1">Ciclo do Protocolo</p>
          {[
            { step: "1", label: "Receber", desc: "Via bot, atendimento ou abertura manual", color: "bg-blue-500/20 border-blue-500/30" },
            { step: "2", label: "Analisar", desc: "Leia a solicitação e verifique documentos", color: "bg-amber-500/20 border-amber-500/30" },
            { step: "3", label: "Tramitar", desc: "Encaminhe para o setor responsável se necessário", color: "bg-purple-500/20 border-purple-500/30" },
            { step: "4", label: "Responder", desc: "Registre a resposta oficial ao cidadão", color: "bg-emerald-500/20 border-emerald-500/30" },
            { step: "5", label: "Concluir", desc: "Marque como resolvido e notifique o cidadão", color: "bg-cyan-500/20 border-cyan-500/30" },
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
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
            <p className="text-emerald-300 font-semibold text-sm uppercase tracking-wide">Boas Práticas</p>
            {[
              "Sempre registre despachos antes de tramitar",
              "Respeite os prazos definidos por tipo de serviço",
              "Anexe documentos relevantes ao protocolo",
              "Use linguagem clara e objetiva nas respostas",
              "Notifique o cidadão em cada atualização importante",
              "Nunca encerre um protocolo sem resposta registrada",
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

  // ── Slide 5: Assinatura Digital ───────────────────────────────────────────
  {
    id: 5,
    type: "feature",
    title: "Assinatura Digital de Documentos",
    subtitle: "Como assinar documentos oficiais com validade jurídica",
    bg: "from-amber-950 via-slate-900 to-slate-900",
    accent: "text-amber-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-amber-300 font-semibold text-sm uppercase tracking-wide mb-1">Como Assinar</p>
          {[
            { step: "1", label: "Acesse o documento", desc: "Vá em Documentos → Assinatura Digital", color: "bg-amber-500/20 border-amber-500/30" },
            { step: "2", label: "Revise o conteúdo", desc: "Leia o documento completo antes de assinar", color: "bg-blue-500/20 border-blue-500/30" },
            { step: "3", label: "Permita localização", desc: "O sistema captura suas coordenadas GPS", color: "bg-emerald-500/20 border-emerald-500/30" },
            { step: "4", label: "Informe seu PIN", desc: "Digite o PIN de 6 dígitos cadastrado", color: "bg-purple-500/20 border-purple-500/30" },
            { step: "5", label: "Confirme", desc: "A assinatura é registrada com IP e localização", color: "bg-rose-500/20 border-rose-500/30" },
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
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
            <p className="text-amber-300 font-semibold text-sm uppercase tracking-wide">O que é registrado</p>
            {[
              { label: "Identidade", desc: "Nome completo e matrícula do servidor" },
              { label: "Data e Hora", desc: "Timestamp exato da assinatura (BRT)" },
              { label: "Endereço IP", desc: "IP do dispositivo utilizado" },
              { label: "Localização", desc: "Coordenadas GPS capturadas no ato" },
              { label: "Certificadora", desc: "Município de Itabaiana-PB — CNPJ: 09.072.430/0001-93" },
            ].map((r) => (
              <div key={r.label} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-semibold text-sm">{r.label}: </span>
                  <span className="text-slate-400 text-sm">{r.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">Atenção</p>
              <p className="text-slate-400 text-xs">A assinatura digital tem validade jurídica. Nunca assine documentos sem ler o conteúdo completo.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 6: Chatbot e Automação ──────────────────────────────────────────
  {
    id: 6,
    type: "feature",
    title: "Chatbot e Automação",
    subtitle: "O assistente virtual cuida do atendimento inicial — você foca nos casos complexos",
    bg: "from-purple-950 via-slate-900 to-slate-900",
    accent: "text-purple-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-start">
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-3">
            <p className="text-purple-300 font-semibold text-sm uppercase tracking-wide">O que o Bot faz automaticamente</p>
            {[
              "Recepciona o cidadão com saudação personalizada",
              "Apresenta o menu de serviços disponíveis",
              "Coleta dados e documentos necessários",
              "Abre protocolos com NUP automático",
              "Informa status de protocolos existentes",
              "Transfere para você quando necessário",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-3">
            <p className="text-blue-300 font-semibold text-sm uppercase tracking-wide">Quando você entra em ação</p>
            {[
              { trigger: "Solicitação complexa", desc: "Que exige análise humana ou decisão técnica" },
              { trigger: "Cidadão insatisfeito", desc: "Quando o bot não conseguiu resolver" },
              { trigger: "Transferência manual", desc: "Quando o cidadão pede atendente humano" },
              { trigger: "Documentação incompleta", desc: "Quando precisa orientar pessoalmente" },
            ].map((t) => (
              <div key={t.trigger} className="flex items-start gap-2">
                <Headphones className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-semibold text-sm">{t.trigger}: </span>
                  <span className="text-slate-400 text-sm">{t.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
            <Zap className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">Dica de Produtividade</p>
              <p className="text-slate-400 text-xs">O bot já coletou os dados básicos — ao assumir o atendimento, você terá todas as informações disponíveis.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 7: cAIus — Agente de IA ────────────────────────────────────────
  {
    id: 7,
    type: "feature",
    title: "cAIus — Seu Assistente de IA",
    subtitle: "Inteligência artificial integrada para ajudar você a atender melhor e mais rápido",
    bg: "from-violet-950 via-slate-900 to-slate-900",
    accent: "text-violet-400",
    content: (
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl items-center">
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3">
            <p className="text-violet-300 font-semibold text-sm uppercase tracking-wide">O que o cAIus pode fazer por você</p>
            {[
              "Sugerir respostas para mensagens dos cidadãos",
              "Resumir conversas longas em segundos",
              "Buscar informações na base de conhecimento municipal",
              "Classificar automaticamente o assunto do atendimento",
              "Analisar o sentimento do cidadão na conversa",
              "Gerar rascunhos de respostas oficiais",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3">
            <p className="text-violet-300 font-semibold text-sm uppercase tracking-wide">Como usar</p>
            {[
              { step: "1", label: "Abra uma conversa", desc: "Clique no ícone do cAIus na barra lateral" },
              { step: "2", label: "Faça sua pergunta", desc: "Descreva o que precisa de ajuda" },
              { step: "3", label: "Revise a sugestão", desc: "Sempre revise antes de enviar ao cidadão" },
              { step: "4", label: "Ajuste se necessário", desc: "Adapte o tom e o conteúdo conforme o caso" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 text-xs font-bold flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <span className="text-white font-semibold text-sm">{s.label}: </span>
                  <span className="text-slate-400 text-sm">{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">Lembre-se</p>
              <p className="text-slate-400 text-xs">O cAIus é um assistente — a decisão final é sempre sua. Revise tudo antes de enviar.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // ── Slide 8: Dicas e Boas Práticas ────────────────────────────────────────
  {
    id: 8,
    type: "feature",
    title: "Dicas para o Dia a Dia",
    subtitle: "Boas práticas para um atendimento de qualidade",
    bg: "from-slate-950 via-slate-900 to-cyan-950",
    accent: "text-cyan-400",
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
        {[
          {
            icon: Clock,
            title: "Agilidade",
            color: "border-blue-500/20 bg-blue-500/5 text-blue-300",
            items: [
              "Responda em até 2 horas em horário comercial",
              "Use respostas rápidas para perguntas frequentes",
              "Monitore a fila de espera regularmente",
              "Priorize atendimentos com maior tempo de espera",
            ],
          },
          {
            icon: MessageSquare,
            title: "Comunicação",
            color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
            items: [
              "Use linguagem clara, simples e respeitosa",
              "Evite jargões técnicos com o cidadão",
              "Confirme o entendimento antes de encerrar",
              "Sempre informe o próximo passo ao cidadão",
            ],
          },
          {
            icon: FileText,
            title: "Documentação",
            color: "border-amber-500/20 bg-amber-500/5 text-amber-300",
            items: [
              "Registre todas as ações no protocolo",
              "Anexe documentos recebidos imediatamente",
              "Mantenha o histórico completo e organizado",
              "Use despachos para justificar decisões",
            ],
          },
          {
            icon: Users,
            title: "Trabalho em Equipe",
            color: "border-purple-500/20 bg-purple-500/5 text-purple-300",
            items: [
              "Use notas internas para comunicar com colegas",
              "Transfira com contexto completo ao encaminhar",
              "Respeite as filas e distribuição de atendimentos",
              "Compartilhe boas práticas com a equipe",
            ],
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

  // ── Slide 9: Encerramento ─────────────────────────────────────────────────
  {
    id: 9,
    type: "closing",
    title: "Você está pronto!",
    subtitle: "Bem-vindo à equipe de atendimento digital da Prefeitura de Itabaiana-PB",
    bg: "from-slate-950 via-slate-900 to-blue-950",
    accent: "text-blue-400",
    content: (
      <div className="flex flex-col items-center gap-8 text-center max-w-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {[
            { value: "Inbox", label: "Atenda cidadãos", icon: MessageSquare },
            { value: "NUP", label: "Gerencie protocolos", icon: ClipboardList },
            { value: "PIN", label: "Assine documentos", icon: Shield },
            { value: "cAIus", label: "Use a IA a seu favor", icon: Zap },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col items-center gap-2">
              <stat.icon className="w-6 h-6 text-blue-400" />
              <p className="text-white font-bold text-lg">{stat.value}</p>
              <p className="text-slate-400 text-xs text-center leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-6 space-y-3 w-full">
          <div className="flex items-center gap-2 justify-center">
            <Star className="w-5 h-5 text-amber-400" />
            <p className="text-white font-semibold">Próximos Passos</p>
          </div>
          {[
            "Acesse o sistema e configure seu perfil",
            "Defina seu PIN de assinatura digital",
            "Explore o Inbox e familiarize-se com a interface",
            "Converse com seu gestor sobre as filas do seu setor",
            "Em caso de dúvidas, consulte o manual ou o suporte",
          ].map((f) => (
            <div key={f} className="flex items-start gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-300 text-sm">{f}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 w-full">
          <p className="text-slate-400 text-sm">
            <strong className="text-white">Suporte:</strong> Em caso de dúvidas técnicas, entre em contato com o setor de TI.
            Para dúvidas operacionais, fale com seu gestor imediato.
          </p>
        </div>
      </div>
    ),
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PresentationOnboarding() {
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
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-slate-300 text-sm font-medium">Onboarding do Servidor — CAIUS</span>
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
          <button
            key={s.id}
            onClick={() => goTo(i, i > current ? "next" : "prev")}
            className={cn(
              "flex-1 h-1 rounded-full transition-all duration-300 cursor-pointer",
              i < current ? "bg-blue-500" : i === current ? "bg-blue-400" : "bg-slate-700 hover:bg-slate-600"
            )}
            title={s.title}
          />
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
            {slide.type === "cover" ? (
              <h1 className={cn("text-5xl font-black tracking-tight mb-3", slide.accent)}>{slide.title}</h1>
            ) : (
              <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
            )}
            {slide.subtitle && <p className="text-slate-400 text-base leading-relaxed">{slide.subtitle}</p>}
          </div>
          <div className="flex items-center justify-center w-full max-w-5xl overflow-auto">
            {slide.content}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800/60 bg-slate-950/80 backdrop-blur-sm flex-shrink-0">
        <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 bg-transparent gap-2" onClick={prev} disabled={current === 0}>
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>
        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <button key={s.id} onClick={() => goTo(i, i > current ? "next" : "prev")}
              className={cn("rounded-full transition-all duration-200", i === current ? "w-6 h-2 bg-blue-400" : "w-2 h-2 bg-slate-600 hover:bg-slate-500")}
            />
          ))}
        </div>
        {current < total - 1 ? (
          <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2" onClick={next}>
            Próximo <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" className="border-blue-500/40 text-blue-300 hover:text-white hover:border-blue-400 bg-transparent gap-2" onClick={() => navigate("/dashboard")}>
            Ir para o Sistema <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
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
