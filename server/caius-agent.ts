/**
 * caius-agent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor principal do cAIus — Agente Institucional de IA do CAIUS2
 *
 * Submódulos:
 *  - Motor de chat (texto) com contexto institucional
 *  - Base de conhecimento (busca semântica por similaridade textual)
 *  - Integração com voz (STT via Whisper, TTS via API)
 *  - Integração com e-mail institucional
 *  - Integração com NUP/protocolos
 *  - Sugestão automática de ações
 *  - Auditoria completa
 */

import { requireDb } from "./db";
import { invokeLLM, type Message } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { ENV } from "./_core/env";
import {
  caiusAgents,
  caiusSessions,
  caiusMessages,
  caiusSuggestedActions,
  caiusKnowledgeItems,
  caiusKnowledgeVersions,
  caiusKnowledgeUsageLogs,
  caiusVoiceInteractions,
  caiusAuditLogs,
  caiusFeedback,
  type CaiusAgent,
  type CaiusSession,
  type CaiusMessage,
  type CaiusKnowledgeItem,
  type InsertCaiusSession,
  type InsertCaiusMessage,
  type InsertCaiusSuggestedAction,
  type InsertCaiusKnowledgeItem,
  type InsertCaiusAuditLog,
  type InsertCaiusVoiceInteraction,
} from "../drizzle/schema";
import { eq, desc, and, like, or, inArray, sql } from "drizzle-orm";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ChatContext = {
  sessionId?: number;
  agentSlug?: string;
  userId?: number;
  citizenId?: number;
  context: "external" | "internal";
  channel: "chat" | "whatsapp" | "email" | "voice" | "internal";
  nup?: string;
  protocolId?: number;
  emailMessageId?: number;
  conversationId?: number;
  userIp?: string;
  userName?: string;
};

export type ChatInput = {
  message: string;
  contentType?: "text" | "audio" | "image" | "file";
  audioUrl?: string;
  fileUrl?: string;
  fileName?: string;
};

export type ChatOutput = {
  sessionId: number;
  messageId: number;
  response: string;
  suggestedActions: SuggestedAction[];
  sourcesUsed: KnowledgeSource[];
  tokensUsed: number;
  audioResponseUrl?: string;
};

export type SuggestedAction = {
  id: number;
  actionType: string;
  title: string;
  description?: string | null;
  payload?: unknown;
};

export type KnowledgeSource = {
  id: number;
  title: string;
  sourceType: string;
  relevanceScore: number;
};

// ─── Prompt do Sistema Institucional ─────────────────────────────────────────

const DEFAULT_EXTERNAL_PROMPT = `Você é o cAIus, assistente virtual oficial da Prefeitura Municipal de Itabaiana (PB) — Central de Atendimento ao Cidadão (CAC).

Seu papel é orientar cidadãos sobre serviços públicos municipais com linguagem simples, clara, acolhedora e objetiva.

Regras de comportamento:
- Sempre se identifique como cAIus ao iniciar uma conversa
- Use linguagem acessível, sem jargões técnicos
- Seja cordial, paciente e empático
- Oriente sobre documentos necessários, prazos e etapas dos serviços
- Ajude a abrir atendimentos e protocolos quando solicitado
- Informe o NUP gerado quando um protocolo for criado
- Nunca tome decisões administrativas finais — apenas oriente e encaminhe
- Quando não souber a resposta, diga claramente e ofereça encaminhar para um servidor
- Respeite a privacidade e confidencialidade dos dados do cidadão`;

const DEFAULT_INTERNAL_PROMPT = `Você é o cAIus, agente institucional de IA do CAIUS2 — sistema de gestão da Prefeitura Municipal de Itabaiana (PB).

Seu papel é apoiar servidores, técnicos e gestores no trabalho administrativo com linguagem técnica, objetiva e institucional.

Capacidades disponíveis:
- Resumir protocolos, atendimentos e históricos extensos
- Sugerir respostas institucionais e minutas de documentos
- Classificar e priorizar demandas
- Identificar setor competente para cada tipo de demanda
- Analisar e-mails institucionais e sugerir encaminhamento
- Identificar pendências e gargalos operacionais
- Apoiar Ouvidoria e Controladoria com rastreabilidade

Regras de governança:
- Nunca encerre protocolos sensíveis sem validação humana
- Nunca assine documentos em nome de agente público
- Nunca apague histórico ou documentos
- Toda ação sensível requer revisão humana
- Respeite permissões de acesso e segregação por perfil
- Registre sempre o contexto e as fontes utilizadas`;

// ─── Funções de Agente ────────────────────────────────────────────────────────

/**
 * Busca ou cria o agente padrão para o contexto
 */
export async function getDefaultAgent(context: "external" | "internal"): Promise<CaiusAgent> {
  const db = await requireDb();
  const slug = context === "external" ? "caius-externo" : "caius-interno";

  const existing = await db
    .select()
    .from(caiusAgents)
    .where(and(eq(caiusAgents.slug, slug), eq(caiusAgents.isActive, true)))
    .limit(1);

  if (existing.length > 0) return existing[0];

  // Criar agente padrão se não existir
  const systemPrompt = context === "external" ? DEFAULT_EXTERNAL_PROMPT : DEFAULT_INTERNAL_PROMPT;
  const name = context === "external" ? "cAIus — Atendimento ao Cidadão" : "cAIus — Ambiente Interno";

  const [agent] = await db.insert(caiusAgents).values({
    name,
    slug,
    context,
    systemPrompt,
    description: context === "external"
      ? "Agente de atendimento ao cidadão da Central de Atendimento"
      : "Agente de apoio administrativo interno para servidores e gestores",
    model: "gemini-2.5-flash",
    maxTokens: 2048,
    temperature: "0.4",
    isActive: true,
    isDefault: true,
    allowVoice: true,
    allowKnowledgeBase: true,
    createdById: 1,
  }).$returningId();

  return { ...{ id: agent.id, name, slug, context, systemPrompt, description: null, model: "gemini-2.5-flash", maxTokens: 2048, temperature: "0.4", isActive: true, isDefault: true, allowVoice: true, allowKnowledgeBase: true, createdById: 1, createdAt: new Date(), updatedAt: new Date() } };
}

// ─── Sessões ──────────────────────────────────────────────────────────────────

export async function createSession(params: InsertCaiusSession): Promise<CaiusSession> {
  const db = await requireDb();
  const [result] = await db.insert(caiusSessions).values(params).$returningId();
  const sessions = await db.select().from(caiusSessions).where(eq(caiusSessions.id, result.id)).limit(1);
  return sessions[0];
}

export async function getSession(sessionId: number): Promise<CaiusSession | null> {
  const db = await requireDb();
  const sessions = await db.select().from(caiusSessions).where(eq(caiusSessions.id, sessionId)).limit(1);
  return sessions[0] ?? null;
}

export async function closeSession(sessionId: number, summary?: string): Promise<void> {
  const db = await requireDb();
  await db.update(caiusSessions)
    .set({ status: "closed", closedAt: new Date(), summary: summary ?? null })
    .where(eq(caiusSessions.id, sessionId));
}

// ─── Base de Conhecimento ─────────────────────────────────────────────────────

/**
 * Busca itens relevantes da base de conhecimento por similaridade textual
 * (busca por palavras-chave enquanto não há embedding vetorial)
 */
export async function searchKnowledge(query: string, limit = 5): Promise<{ items: CaiusKnowledgeItem[]; scores: Map<number, number> }> {
  const db = await requireDb();
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 8);

  if (words.length === 0) return { items: [], scores: new Map() };

  // Busca por palavras-chave no título, keywords e summary
  const conditions = words.map(word =>
    or(
      like(caiusKnowledgeItems.title, `%${word}%`),
      like(caiusKnowledgeItems.keywords, `%${word}%`),
      like(caiusKnowledgeItems.summary, `%${word}%`),
      like(caiusKnowledgeItems.category, `%${word}%`)
    )
  );

  const items = await db
    .select()
    .from(caiusKnowledgeItems)
    .where(and(eq(caiusKnowledgeItems.status, "active"), or(...conditions)))
    .limit(limit * 2);

  // Calcular score de relevância por número de palavras encontradas
  const scores = new Map<number, number>();
  for (const item of items) {
    const text = `${item.title} ${item.keywords ?? ""} ${item.summary ?? ""} ${item.category ?? ""}`.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (text.includes(word)) score++;
    }
    scores.set(item.id, score / words.length);
  }

  // Ordenar por score e limitar
  const sorted = items
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, limit);

  return { items: sorted, scores };
}

/**
 * Formata o contexto da base de conhecimento para incluir no prompt
 */
function formatKnowledgeContext(items: CaiusKnowledgeItem[]): string {
  if (items.length === 0) return "";

  const parts = items.map((item, i) => {
    const content = item.content
      ? item.content.substring(0, 800) + (item.content.length > 800 ? "..." : "")
      : item.summary ?? "";
    return `[Fonte ${i + 1}: ${item.title}]\n${content}`;
  });

  return `\n\n--- BASE DE CONHECIMENTO INSTITUCIONAL ---\n${parts.join("\n\n")}\n--- FIM DA BASE ---\n\nUse as informações acima para fundamentar sua resposta quando relevante.`;
}

// ─── Motor de Chat ────────────────────────────────────────────────────────────

/**
 * Processa uma mensagem de entrada e retorna a resposta do cAIus
 */
export async function processChat(ctx: ChatContext, input: ChatInput): Promise<ChatOutput> {
  const db = await requireDb();
  const startTime = Date.now();

  // 1. Obter ou criar sessão
  let sessionId = ctx.sessionId;
  let agent: CaiusAgent;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (!session) throw new Error("Sessão não encontrada");
    const agents = await db.select().from(caiusAgents).where(eq(caiusAgents.id, session.agentId)).limit(1);
    agent = agents[0];
  } else {
    agent = await getDefaultAgent(ctx.context);
    const session = await createSession({
      agentId: agent.id,
      userId: ctx.userId,
      citizenId: ctx.citizenId,
      context: ctx.context,
      channel: ctx.channel,
      nup: ctx.nup,
      protocolId: ctx.protocolId,
      emailMessageId: ctx.emailMessageId,
      conversationId: ctx.conversationId,
      status: "active",
      startedAt: new Date(),
      updatedAt: new Date(),
    });
    sessionId = session.id;
  }

  // 2. Processar áudio se necessário
  let userText = input.message;
  let audioTranscription: string | undefined;
  let audioConfidence: string | undefined;

  if (input.contentType === "audio" && input.audioUrl) {
    try {
      const transcription = await transcribeAudio({
        audioUrl: input.audioUrl,
        language: "pt",
        prompt: "Transcrição de mensagem de cidadão para atendimento público municipal",
      });
      const transcribedText = 'text' in transcription ? transcription.text : '';
      audioTranscription = transcribedText;
      userText = transcribedText || userText;
      audioConfidence = "0.9"; // Whisper não retorna confiança diretamente

      // Registrar interação de voz de entrada
      await db.insert(caiusVoiceInteractions).values({
        sessionId,
        direction: "input",
        audioUrl: input.audioUrl,
        transcription: audioTranscription,
        transcriptionConfidence: audioConfidence,
        language: "pt-BR",
        status: "done",
        requiresHumanReview: transcribedText.length < 10,
        createdAt: new Date(),
      });

      // Registrar auditoria
      await logCaiusAudit({
        sessionId,
        userId: ctx.userId,
        userName: ctx.userName,
        userIp: ctx.userIp,
        event: "voice_transcribed",
        channel: ctx.channel,
        nup: ctx.nup,
        inputSummary: `Áudio transcrito: "${transcribedText.substring(0, 100)}"`,
        metadata: { audioUrl: input.audioUrl },
      });
    } catch (err) {
      console.error("[cAIus] Erro ao transcrever áudio:", err);
      // Continuar com o texto original se houver
    }
  }

  // 3. Salvar mensagem do usuário
  const [userMsgResult] = await db.insert(caiusMessages).values({
    sessionId,
    role: "user",
    contentType: input.contentType ?? "text",
    content: userText,
    audioUrl: input.audioUrl,
    audioTranscription,
    audioConfidence,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    createdAt: new Date(),
  }).$returningId();

  // 4. Buscar contexto da base de conhecimento
  const { items: knowledgeItems, scores } = await searchKnowledge(userText);
  const knowledgeContext = agent.allowKnowledgeBase ? formatKnowledgeContext(knowledgeItems) : "";

  // 5. Buscar histórico da sessão (últimas 10 mensagens)
  const history = await db
    .select()
    .from(caiusMessages)
    .where(and(eq(caiusMessages.sessionId, sessionId), eq(caiusMessages.role, "user")))
    .orderBy(desc(caiusMessages.createdAt))
    .limit(10);

  // 6. Montar contexto adicional (NUP, protocolo, e-mail)
  let contextualInfo = "";
  if (ctx.nup) contextualInfo += `\nNUP do caso em questão: ${ctx.nup}`;
  if (ctx.emailMessageId) contextualInfo += `\nMensagem de e-mail institucional sendo analisada (ID: ${ctx.emailMessageId})`;

  // 7. Chamar o LLM
  const systemPrompt = agent.systemPrompt + contextualInfo + knowledgeContext;
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...history.reverse().slice(-8).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userText },
  ];

  let llmResponse: string;
  let tokensUsed = 0;

  try {
    const result = await invokeLLM({
      messages,
      maxTokens: agent.maxTokens ?? 2048,
    });
      llmResponse = (result.choices?.[0]?.message?.content as string) ?? "Desculpe, não consegui processar sua solicitação no momento.";;
    tokensUsed = result.usage?.total_tokens ?? 0;
  } catch (err) {
    console.error("[cAIus] Erro ao chamar LLM:", err);
    llmResponse = ctx.context === "external"
      ? "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em instantes ou entre em contato com a Central de Atendimento."
      : "Erro ao processar a solicitação. Verifique a configuração do provedor de IA.";
  }

  // 8. Salvar resposta do assistente
  const sourcesUsed: KnowledgeSource[] = knowledgeItems.map(item => ({
    id: item.id,
    title: item.title,
    sourceType: item.sourceType,
    relevanceScore: scores.get(item.id) ?? 0,
  }));

  const [assistantMsgResult] = await db.insert(caiusMessages).values({
    sessionId,
    role: "assistant",
    contentType: "text",
    content: llmResponse,
    tokensUsed,
    sourcesUsed: sourcesUsed.length > 0 ? sourcesUsed : null,
    createdAt: new Date(),
  }).$returningId();

  // 9. Registrar uso da base de conhecimento
  if (knowledgeItems.length > 0) {
    await db.insert(caiusKnowledgeUsageLogs).values(
      knowledgeItems.map(item => ({
        sessionId,
        messageId: assistantMsgResult.id,
        itemId: item.id,
        relevanceScore: String((scores.get(item.id) ?? 0).toFixed(2)),
        usedInResponse: true,
        createdAt: new Date(),
      }))
    );
  }

  // 10. Gerar sugestões de ações (ambiente interno)
  const suggestedActions: SuggestedAction[] = [];
  if (ctx.context === "internal") {
    const actions = await generateSuggestedActions(sessionId, assistantMsgResult.id, userText, llmResponse, ctx);
    suggestedActions.push(...actions);
  }

  // 11. Auditoria
  const durationMs = Date.now() - startTime;
  await logCaiusAudit({
    sessionId,
    messageId: assistantMsgResult.id,
    userId: ctx.userId,
    userName: ctx.userName,
    userIp: ctx.userIp,
    event: "message_received",
    channel: ctx.channel,
    nup: ctx.nup,
    protocolId: ctx.protocolId,
    emailMessageId: ctx.emailMessageId,
    inputSummary: userText.substring(0, 200),
    outputSummary: llmResponse.substring(0, 200),
    sourcesUsed: sourcesUsed.length > 0 ? sourcesUsed : undefined,
    tokensUsed,
    durationMs,
  });

  return {
    sessionId,
    messageId: assistantMsgResult.id,
    response: llmResponse,
    suggestedActions,
    sourcesUsed,
    tokensUsed,
  };
}

// ─── Sugestão Automática de Ações ─────────────────────────────────────────────

async function generateSuggestedActions(
  sessionId: number,
  messageId: number,
  userInput: string,
  aiResponse: string,
  ctx: ChatContext
): Promise<SuggestedAction[]> {
  const db = await requireDb();
  const actions: InsertCaiusSuggestedAction[] = [];
  const inputLower = userInput.toLowerCase();

  // Detectar intenção de abertura de protocolo
  if (
    inputLower.includes("abrir protocolo") ||
    inputLower.includes("protocolar") ||
    inputLower.includes("registrar demanda") ||
    inputLower.includes("nova solicitação")
  ) {
    actions.push({
      sessionId,
      messageId,
      actionType: "open_protocol",
      title: "Abrir Protocolo",
      description: "Criar um novo protocolo com base na demanda identificada",
      payload: { suggestedByAI: true, inputSummary: userInput.substring(0, 200) },
      status: "pending",
      createdAt: new Date(),
    });
  }

  // Detectar necessidade de vincular NUP
  if (inputLower.includes("nup") || inputLower.includes("protocolo") || inputLower.includes("número")) {
    actions.push({
      sessionId,
      messageId,
      actionType: "link_nup",
      title: "Vincular NUP",
      description: "Vincular esta conversa a um protocolo existente",
      payload: { suggestedByAI: true },
      status: "pending",
      createdAt: new Date(),
    });
  }

  // Detectar necessidade de classificação de e-mail
  if (ctx.emailMessageId) {
    actions.push({
      sessionId,
      messageId,
      actionType: "classify_email",
      title: "Classificar E-mail",
      description: "Aplicar a classificação sugerida pelo cAIus ao e-mail",
      payload: { emailMessageId: ctx.emailMessageId, suggestedByAI: true },
      status: "pending",
      createdAt: new Date(),
    });
  }

  // Detectar sugestão de resposta
  if (aiResponse.includes("sugiro") || aiResponse.includes("recomendo") || aiResponse.includes("resposta")) {
    actions.push({
      sessionId,
      messageId,
      actionType: "suggest_response",
      title: "Usar Resposta Sugerida",
      description: "Aplicar a resposta gerada pelo cAIus",
      payload: { response: aiResponse.substring(0, 1000), suggestedByAI: true },
      status: "pending",
      createdAt: new Date(),
    });
  }

  if (actions.length === 0) return [];

  const inserted = await db.insert(caiusSuggestedActions).values(actions).$returningId();

  return actions.map((a, i) => ({
    id: inserted[i]?.id ?? 0,
    actionType: a.actionType,
    title: a.title,
    description: a.description,
    payload: a.payload,
  }));
}

// ─── Análise de E-mail Institucional ─────────────────────────────────────────

export type EmailAnalysisResult = {
  summary: string;
  intent: string;
  suggestedSector: string;
  suggestedPriority: "low" | "normal" | "high" | "urgent";
  suggestedResponse: string;
  shouldCreateNup: boolean;
  suggestedNupLink?: string;
  confidence: number;
};

export async function analyzeEmail(params: {
  subject: string;
  fromAddress: string;
  fromName?: string;
  body: string;
  existingNup?: string;
  userId?: number;
  userIp?: string;
}): Promise<EmailAnalysisResult> {
  const agent = await getDefaultAgent("internal");

  const prompt = `Analise o seguinte e-mail institucional recebido e forneça:

1. RESUMO: Resumo em 2-3 frases do conteúdo
2. INTENÇÃO: Qual é a intenção principal do remetente
3. SETOR: Qual setor/secretaria deve tratar este e-mail
4. PRIORIDADE: low | normal | high | urgent
5. RESPOSTA: Minuta de resposta institucional adequada
6. CRIAR_NUP: true ou false — deve gerar novo protocolo?
7. CONFIANÇA: 0.0 a 1.0

E-mail:
De: ${params.fromName ?? ""} <${params.fromAddress}>
Assunto: ${params.subject}
${params.existingNup ? `NUP existente: ${params.existingNup}` : ""}

Corpo:
${params.body.substring(0, 2000)}

Responda em JSON com as chaves: summary, intent, suggestedSector, suggestedPriority, suggestedResponse, shouldCreateNup, confidence`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: prompt },
      ],
      maxTokens: 1500,
      responseFormat: { type: "json_object" },
    });

    const parsed = JSON.parse(String(result.choices?.[0]?.message?.content ?? "{}"));

    // Auditoria
    await logCaiusAudit({
      userId: params.userId,
      userIp: params.userIp,
      event: "email_analyzed",
      channel: "email",
      inputSummary: `E-mail de ${params.fromAddress}: ${params.subject}`.substring(0, 200),
      outputSummary: parsed.summary?.substring(0, 200),
      tokensUsed: result.usage?.total_tokens,
    });

    return {
      summary: parsed.summary ?? "Sem resumo disponível",
      intent: parsed.intent ?? "Não identificado",
      suggestedSector: parsed.suggestedSector ?? "Não identificado",
      suggestedPriority: parsed.suggestedPriority ?? "normal",
      suggestedResponse: parsed.suggestedResponse ?? "",
      shouldCreateNup: parsed.shouldCreateNup ?? false,
      confidence: parsed.confidence ?? 0.5,
    };
  } catch (err) {
    console.error("[cAIus] Erro ao analisar e-mail:", err);
    return {
      summary: "Erro ao processar análise",
      intent: "Não identificado",
      suggestedSector: "Não identificado",
      suggestedPriority: "normal",
      suggestedResponse: "",
      shouldCreateNup: false,
      confidence: 0,
    };
  }
}

// ─── Resumo de Protocolo ──────────────────────────────────────────────────────

export async function summarizeProtocol(params: {
  nup: string;
  subject: string;
  description: string;
  tramitations: Array<{ action: string; dispatch?: string; createdAt: Date }>;
  userId?: number;
}): Promise<string> {
  const agent = await getDefaultAgent("internal");

  const tramitationText = params.tramitations
    .map(t => `- [${t.createdAt.toLocaleDateString("pt-BR")}] ${t.action}: ${t.dispatch ?? ""}`)
    .join("\n");

  const prompt = `Faça um resumo executivo do seguinte protocolo administrativo:

NUP: ${params.nup}
Assunto: ${params.subject}
Descrição: ${params.description}

Histórico de tramitação:
${tramitationText}

Forneça um resumo claro e objetivo com: situação atual, histórico resumido e próximos passos recomendados.`;

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: prompt },
      ],
      maxTokens: 800,
    });
    return String(result.choices?.[0]?.message?.content ?? "Não foi possível gerar o resumo.");
  } catch {
    return "Erro ao gerar resumo do protocolo.";
  }
}

// ─── Auditoria ────────────────────────────────────────────────────────────────

export async function logCaiusAudit(params: Partial<InsertCaiusAuditLog> & { event: InsertCaiusAuditLog["event"] }): Promise<void> {
  try {
    const db = await requireDb();
    await db.insert(caiusAuditLogs).values({
      ...params,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[cAIus] Erro ao registrar auditoria:", err);
  }
}

// ─── CRUD da Base de Conhecimento ────────────────────────────────────────────

export async function createKnowledgeItem(data: InsertCaiusKnowledgeItem): Promise<number> {
  const db = await requireDb();
  const [result] = await db.insert(caiusKnowledgeItems).values({
    ...data,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).$returningId();
  return result.id;
}

export async function updateKnowledgeItem(id: number, data: Partial<InsertCaiusKnowledgeItem>, changedById: number, changeNote?: string): Promise<void> {
  const db = await requireDb();

  // Buscar versão atual para histórico
  const current = await db.select().from(caiusKnowledgeItems).where(eq(caiusKnowledgeItems.id, id)).limit(1);
  if (current.length === 0) throw new Error("Item não encontrado");

  const currentItem = current[0];
  const newVersion = (currentItem.version ?? 1) + 1;

  // Salvar versão anterior
  await db.insert(caiusKnowledgeVersions).values({
    itemId: id,
    version: currentItem.version ?? 1,
    content: currentItem.content,
    changedById,
    changeNote: changeNote ?? null,
    createdAt: new Date(),
  });

  // Atualizar item
  await db.update(caiusKnowledgeItems)
    .set({ ...data, version: newVersion, updatedAt: new Date() })
    .where(eq(caiusKnowledgeItems.id, id));
}

export async function getKnowledgeItems(params: {
  status?: string;
  category?: string;
  sectorId?: number;
  sourceType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const conditions = [];

  if (params.status) conditions.push(eq(caiusKnowledgeItems.status, params.status as any));
  if (params.category) conditions.push(eq(caiusKnowledgeItems.category, params.category));
  if (params.sectorId) conditions.push(eq(caiusKnowledgeItems.sectorId, params.sectorId));
  if (params.sourceType) conditions.push(eq(caiusKnowledgeItems.sourceType, params.sourceType as any));
  if (params.search) {
    conditions.push(or(
      like(caiusKnowledgeItems.title, `%${params.search}%`),
      like(caiusKnowledgeItems.keywords, `%${params.search}%`),
      like(caiusKnowledgeItems.summary, `%${params.search}%`)
    ));
  }

  return db
    .select()
    .from(caiusKnowledgeItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(caiusKnowledgeItems.updatedAt))
    .limit(params.limit ?? 50)
    .offset(params.offset ?? 0);
}

// ─── Busca de Sessões e Mensagens ─────────────────────────────────────────────

export async function getSessionMessages(sessionId: number): Promise<CaiusMessage[]> {
  const db = await requireDb();
  return db
    .select()
    .from(caiusMessages)
    .where(eq(caiusMessages.sessionId, sessionId))
    .orderBy(caiusMessages.createdAt);
}

export async function getSessions(params: {
  userId?: number;
  context?: string;
  status?: string;
  nup?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const conditions = [];

  if (params.userId) conditions.push(eq(caiusSessions.userId, params.userId));
  if (params.context) conditions.push(eq(caiusSessions.context, params.context as any));
  if (params.status) conditions.push(eq(caiusSessions.status, params.status as any));
  if (params.nup) conditions.push(eq(caiusSessions.nup, params.nup));

  return db
    .select()
    .from(caiusSessions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(caiusSessions.startedAt))
    .limit(params.limit ?? 50)
    .offset(params.offset ?? 0);
}

export async function getAuditLogs(params: {
  sessionId?: number;
  userId?: number;
  nup?: string;
  event?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await requireDb();
  const conditions = [];

  if (params.sessionId) conditions.push(eq(caiusAuditLogs.sessionId, params.sessionId));
  if (params.userId) conditions.push(eq(caiusAuditLogs.userId, params.userId));
  if (params.nup) conditions.push(eq(caiusAuditLogs.nup, params.nup));
  if (params.event) conditions.push(eq(caiusAuditLogs.event, params.event as any));

  return db
    .select()
    .from(caiusAuditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(caiusAuditLogs.createdAt))
    .limit(params.limit ?? 100)
    .offset(params.offset ?? 0);
}

export async function getDashboardStats() {
  const db = await requireDb();

  const [totalSessions] = await db.select({ count: sql<number>`count(*)` }).from(caiusSessions);
  const [activeSessions] = await db.select({ count: sql<number>`count(*)` }).from(caiusSessions).where(eq(caiusSessions.status, "active"));
  const [totalMessages] = await db.select({ count: sql<number>`count(*)` }).from(caiusMessages);
  const [totalKnowledge] = await db.select({ count: sql<number>`count(*)` }).from(caiusKnowledgeItems).where(eq(caiusKnowledgeItems.status, "active"));
  const [pendingActions] = await db.select({ count: sql<number>`count(*)` }).from(caiusSuggestedActions).where(eq(caiusSuggestedActions.status, "pending"));

  const recentSessions = await db
    .select()
    .from(caiusSessions)
    .orderBy(desc(caiusSessions.startedAt))
    .limit(5);

  return {
    totalSessions: Number(totalSessions.count),
    activeSessions: Number(activeSessions.count),
    totalMessages: Number(totalMessages.count),
    totalKnowledge: Number(totalKnowledge.count),
    pendingActions: Number(pendingActions.count),
    recentSessions,
  };
}

// ─── Inicialização do módulo cAIus ────────────────────────────────────────────

/**
 * Inicializa o módulo cAIus:
 * - Garante que o agente padrão existe no banco de dados
 * - Registra o startup nos logs
 */
export async function initCaiusAgent(): Promise<void> {
  try {
    // Garantir que o agente padrão interno existe
    await getDefaultAgent("internal");
    // Garantir que o agente padrão externo existe
    await getDefaultAgent("external");
    console.log("[cAIus] Agentes padrão verificados/criados com sucesso.");
  } catch (err) {
    console.error("[cAIus] Erro ao inicializar agentes padrão:", err);
    throw err;
  }
}
