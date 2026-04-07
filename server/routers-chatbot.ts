/**
 * CAIUS — Router tRPC do Chatbot
 * Gerencia fluxos, nós e sessões do chatbot para WhatsApp.
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getFlows,
  getFlowById,
  getNodesByFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  createNode,
  updateNode,
  deleteNode,
  setFlowActive,
  getSessionStats,
} from "./bot-engine";
import { getDb } from "./db";
import { botSessions, botSessionLogs, botNodes, sectors } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// Schema de validação para opções de menu
const botNodeOptionSchema = z.object({
  label: z.string().min(1),
  nextNodeId: z.number().int(),
});

// Schema para criação/atualização de nó
const nodeInputSchema = z.object({
  flowId: z.number().int(),
  nodeType: z.enum(["menu", "message", "collect", "transfer", "protocol", "end", "service_list"]),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  collectField: z.string().max(64).optional().nullable(),
  transferSectorId: z.number().int().optional().nullable(),
  protocolType: z
    .enum(["request", "complaint", "information", "suggestion", "praise", "ombudsman", "esic"])
    .optional()
    .nullable(),
  protocolSubject: z.string().max(512).optional().nullable(),
  protocolServiceTypeId: z.number().int().optional().nullable(),
  nextNodeId: z.number().int().optional().nullable(),
  options: z.array(botNodeOptionSchema).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const chatbotRouter = router({
  // ─── Fluxos ────────────────────────────────────────────────────────────────

  listFlows: protectedProcedure.query(async () => {
    return getFlows();
  }),

  getFlow: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      return getFlowById(input.id);
    }),

  createFlow: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        accountId: z.number().int().optional().nullable(),
        sessionTimeoutMinutes: z.number().int().min(1).max(1440).default(30),
        timeoutMessage: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return createFlow({
        name: input.name,
        description: input.description ?? undefined,
        accountId: input.accountId ?? undefined,
        sessionTimeoutMinutes: input.sessionTimeoutMinutes,
        timeoutMessage: input.timeoutMessage ?? undefined,
        isActive: false,
      });
    }),

  updateFlow: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional().nullable(),
        accountId: z.number().int().optional().nullable(),
        rootNodeId: z.number().int().optional().nullable(),
        sessionTimeoutMinutes: z.number().int().min(1).max(1440).optional(),
        timeoutMessage: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateFlow(id, data as any);
    }),

  deleteFlow: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deleteFlow(input.id);
      return { success: true };
    }),

  setFlowActive: protectedProcedure
    .input(
      z.object({
        flowId: z.number().int(),
        accountId: z.number().int().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      await setFlowActive(input.flowId, input.accountId);
      return { success: true };
    }),

  deactivateFlow: protectedProcedure
    .input(z.object({ flowId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB não disponível");
      const { botFlows } = await import("../drizzle/schema");
      await db
        .update(botFlows)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(botFlows.id, input.flowId));
      return { success: true };
    }),

  // ─── Nós ───────────────────────────────────────────────────────────────────

  listNodes: protectedProcedure
    .input(z.object({ flowId: z.number().int() }))
    .query(async ({ input }) => {
      return getNodesByFlow(input.flowId);
    }),

  createNode: protectedProcedure
    .input(nodeInputSchema)
    .mutation(async ({ input }) => {
      return createNode(input as any);
    }),

  updateNode: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        data: nodeInputSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      return updateNode(input.id, input.data as any);
    }),

  deleteNode: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deleteNode(input.id);
      return { success: true };
    }),

  // ─── Sessões e Estatísticas ────────────────────────────────────────────────

  getSessionStats: protectedProcedure
    .input(z.object({ flowId: z.number().int().optional() }))
    .query(async ({ input }) => {
      return getSessionStats(input.flowId);
    }),

  listSessions: protectedProcedure
    .input(
      z.object({
        flowId: z.number().int().optional(),
        status: z
          .enum(["active", "completed", "expired", "transferred"])
          .optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db
        .select()
        .from(botSessions)
        .orderBy(desc(botSessions.createdAt))
        .limit(input.limit);

      const sessions = await query;

      // Filtrar em JS para evitar complexidade de query dinâmica
      return sessions.filter((s) => {
        if (input.flowId && s.flowId !== input.flowId) return false;
        if (input.status && s.status !== input.status) return false;
        return true;
      });
    }),

  getSessionLogs: protectedProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(botSessionLogs)
        .where(eq(botSessionLogs.sessionId, input.sessionId))
        .orderBy(botSessionLogs.createdAt);
    }),

  // ─── Setores (para seleção no painel) ─────────────────────────────────────

  listSectors: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({ id: sectors.id, name: sectors.name, code: sectors.code })
      .from(sectors)
      .where(eq(sectors.isActive, true))
      .orderBy(sectors.name);
  }),

  // ─── Fluxo padrão pré-configurado (wizard de criação rápida) ──────────────

  createDefaultFlow: protectedProcedure
    .input(
      z.object({
        accountId: z.number().int().nullable(),
        orgName: z.string().default("Prefeitura"),
        sectors: z.array(
          z.object({
            id: z.number().int(),
            name: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB não disponível");

      const { botFlows: botFlowsTable } = await import("../drizzle/schema");

      // 1. Criar o fluxo
      const flowResult = await db.insert(botFlowsTable).values({
        name: `Atendimento ${input.orgName}`,
        description: "Fluxo padrão gerado automaticamente",
        accountId: input.accountId ?? undefined,
        isActive: false,
        sessionTimeoutMinutes: 30,
        timeoutMessage: `Sua sessão expirou por inatividade. Envie qualquer mensagem para recomeçar o atendimento.`,
      });
      const flowId = Number((flowResult[0] as any).insertId);

      // 2. Criar nós do fluxo padrão
      // Nó 1: Boas-vindas + menu principal
      const node1Result = await db.insert(botNodes).values({
        flowId,
        nodeType: "menu",
        title: "Menu Principal",
        message: `Olá! Bem-vindo ao atendimento digital da *${input.orgName}*. 👋\n\nComo posso ajudá-lo hoje?`,
        sortOrder: 1,
        options: [
          { label: "Abrir Solicitação / Protocolo", nextNodeId: 0 }, // será atualizado
          { label: "Informações sobre serviços", nextNodeId: 0 },
          { label: "Falar com atendente", nextNodeId: 0 },
          { label: "Encerrar atendimento", nextNodeId: 0 },
        ],
      });
      const node1Id = Number((node1Result[0] as any).insertId);

      // Nó 2: Coletar nome
      const node2Result = await db.insert(botNodes).values({
        flowId,
        nodeType: "collect",
        title: "Coletar Nome",
        message: "Para abrir um protocolo, preciso de algumas informações.\n\nPor favor, informe seu *nome completo*:",
        collectField: "requesterName",
        sortOrder: 2,
      });
      const node2Id = Number((node2Result[0] as any).insertId);

      // Nó 3: Coletar CPF
      const node3Result = await db.insert(botNodes).values({
        flowId,
        nodeType: "collect",
        title: "Coletar CPF",
        message: "Informe seu *CPF* (apenas números):",
        collectField: "requesterCpf",
        sortOrder: 3,
      });
      const node3Id = Number((node3Result[0] as any).insertId);

      // Nó 4: Coletar assunto
      const node4Result = await db.insert(botNodes).values({
        flowId,
        nodeType: "collect",
        title: "Coletar Assunto",
        message: "Descreva brevemente o *assunto* da sua solicitação:",
        collectField: "subject",
        sortOrder: 4,
      });
      const node4Id = Number((node4Result[0] as any).insertId);

      // Nó 5: Abrir protocolo automaticamente
      const node5Result = await db.insert(botNodes).values({
        flowId,
        nodeType: "protocol",
        title: "Abrir Protocolo",
        message:
          `✅ *Protocolo aberto com sucesso!*\n\n` +
          `📋 *Número do Protocolo (NUP):* {{nup}}\n\n` +
          `Sua solicitação foi registrada e em breve um atendente irá analisá-la.\n\n` +
          `Guarde este número para acompanhar o andamento pelo portal ou informando ao atendente.`,
        protocolType: "request",
        protocolSubject: "{{subject}}",
        sortOrder: 5,
      });
      const node5Id = Number((node5Result[0] as any).insertId);

      // Nó 6: Encerramento após protocolo
      const node6Result = await db.insert(botNodes).values({
        flowId,
        nodeType: "end",
        title: "Encerramento",
        message:
          `Obrigado pelo contato! 😊\n\n` +
          `Se precisar de mais ajuda, é só enviar uma mensagem.\n\n` +
          `*${input.orgName}* — Atendimento Digital`,
        sortOrder: 6,
      });
      const node6Id = Number((node6Result[0] as any).insertId);

      // Nó 7: Lista dinâmica de serviços cadastrados
      const node7Result = await db.insert(botNodes).values({
        flowId,
        nodeType: "service_list",
        title: "Catálogo de Serviços",
        message:
          `📋 *Serviços disponíveis da ${input.orgName}:*\n\n` +
          `{{service_list}}\n\n` +
          `Digite o *número* do serviço desejado para ver mais detalhes.`,
        nextNodeId: 0, // será atualizado para nó de coleta após confirmação
        sortOrder: 7,
      });
      const node7Id = Number((node7Result[0] as any).insertId);

      // Nó 8: Transferência para atendente
      const transferSectorId = input.sectors[0]?.id ?? undefined;
      const node8Result = await db.insert(botNodes).values({
        flowId,
        nodeType: "transfer",
        title: "Transferir para Atendente",
        message:
          `👤 Transferindo você para um de nossos atendentes...\n\n` +
          `Por favor, aguarde. Em breve alguém irá lhe atender.\n\n` +
          `⏱️ *Tempo médio de espera:* até 5 minutos`,
        transferSectorId: transferSectorId ?? undefined,
        sortOrder: 8,
      });
      const node8Id = Number((node8Result[0] as any).insertId);

      // Nó 9: Encerramento voluntário
      const node9Result = await db.insert(botNodes).values({
        flowId,
        nodeType: "end",
        title: "Encerramento Voluntário",
        message:
          `Tudo bem! Encerrando o atendimento.\n\n` +
          `Se precisar de ajuda futuramente, é só nos enviar uma mensagem. 👋\n\n` +
          `*${input.orgName}* — Atendimento Digital`,
        sortOrder: 9,
      });
      const node9Id = Number((node9Result[0] as any).insertId);

      // 3. Atualizar referências entre nós (opções do menu e nextNodeId)
      await db
        .update(botNodes)
        .set({
          options: [
            { label: "Abrir Solicitação / Protocolo", nextNodeId: node2Id },
            { label: "Informações sobre serviços", nextNodeId: node7Id },
            { label: "Falar com atendente", nextNodeId: node8Id },
            { label: "Encerrar atendimento", nextNodeId: node9Id },
          ],
        })
        .where(eq(botNodes.id, node1Id));

      await db
        .update(botNodes)
        .set({ nextNodeId: node3Id })
        .where(eq(botNodes.id, node2Id));

      await db
        .update(botNodes)
        .set({ nextNodeId: node4Id })
        .where(eq(botNodes.id, node3Id));

      await db
        .update(botNodes)
        .set({ nextNodeId: node5Id })
        .where(eq(botNodes.id, node4Id));

      await db
        .update(botNodes)
        .set({ nextNodeId: node6Id })
        .where(eq(botNodes.id, node5Id));

      // Nó 7 (service_list): após confirmação do serviço, inicia coleta de dados para protocolo
      await db
        .update(botNodes)
        .set({ nextNodeId: node2Id })
        .where(eq(botNodes.id, node7Id));

      // 4. Definir nó raiz do fluxo
      await db
        .update(botFlowsTable)
        .set({ rootNodeId: node1Id })
        .where(eq(botFlowsTable.id, flowId));

      return { flowId, rootNodeId: node1Id };
    }),
});
