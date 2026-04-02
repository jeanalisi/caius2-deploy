import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { TRPCError } from "@trpc/server";
import {
  workflowDefinitions,
  workflowSteps,
  workflowStepRules,
  workflowTransitions,
  workflowInstances,
  workflowInstanceSteps,
  workflowDeadlines,
  workflowEvents,
} from "../drizzle/schema";
import { eq, and, desc, asc, lt, isNull } from "drizzle-orm";

// ─── Helpers
async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  return db;
}

// ─── WorkflowRuleEngine ────────────────────────────────────────────────────────
function evaluateRule(
  rule: { field: string | null; operator: string | null; value: string | null },
  context: Record<string, unknown>
): boolean {
  if (!rule.field || !rule.operator) return true;
  const actual = context[rule.field];
  const expected = rule.value;
  switch (rule.operator) {
    case "eq": return String(actual) === String(expected);
    case "neq": return String(actual) !== String(expected);
    case "gt": return Number(actual) > Number(expected);
    case "lt": return Number(actual) < Number(expected);
    case "contains": return String(actual).includes(String(expected));
    case "exists": return actual !== undefined && actual !== null;
    default: return true;
  }
}

// ─── WorkflowSlaMonitor ────────────────────────────────────────────────────────
async function checkOverdueDeadlines() {
  const db = await requireDb();
  const now = new Date();
  const overdue = await db
    .select()
    .from(workflowDeadlines)
    .where(and(lt(workflowDeadlines.dueAt, now), eq(workflowDeadlines.isOverdue, false), isNull(workflowDeadlines.resolvedAt)));

  for (const deadline of overdue) {
    await db
      .update(workflowDeadlines)
      .set({ isOverdue: true })
      .where(eq(workflowDeadlines.id, deadline.id));

    await db
      .update(workflowInstances)
      .set({ status: "overdue" })
      .where(eq(workflowInstances.id, deadline.instanceId));
  }
  return overdue.length;
}

// ─── Router ────────────────────────────────────────────────────────────────────
export const workflowRouter = router({
  // ── Definitions ──────────────────────────────────────────────────────────────
  definitions: router({
    list: protectedProcedure
      .input(z.object({ serviceTypeId: z.number().optional(), status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const db = await requireDb();
        const conditions: ReturnType<typeof eq>[] = [];
        if (input?.serviceTypeId) conditions.push(eq(workflowDefinitions.serviceTypeId, input.serviceTypeId));
        if (input?.status === "active") conditions.push(eq(workflowDefinitions.isActive, true));
        const rows = await db
          .select()
          .from(workflowDefinitions)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(workflowDefinitions.createdAt));
        return rows;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const [def] = await db
          .select()
          .from(workflowDefinitions)
          .where(eq(workflowDefinitions.id, input.id));
        if (!def) throw new Error("Workflow não encontrado");

        const steps = await db
          .select()
          .from(workflowSteps)
          .where(eq(workflowSteps.workflowId, input.id))
          .orderBy(asc(workflowSteps.stepOrder));

        const transitions = await db
          .select()
          .from(workflowTransitions)
          .where(eq(workflowTransitions.workflowId, input.id));

        const stepIds = steps.map((s) => s.id);
        const rules = stepIds.length
          ? await db
              .select()
              .from(workflowStepRules)
              .where(eq(workflowStepRules.stepId, stepIds[0]))
          : [];

        return { ...def, steps, transitions, rules };
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          serviceTypeId: z.number().optional(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        const [result] = await db.insert(workflowDefinitions).values({
          name: input.name,
          description: input.description,
          serviceTypeId: input.serviceTypeId,
          isDefault: input.isDefault ?? false,
          createdById: ctx.user.id,
        });
        return { id: (result as { insertId: number }).insertId };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          serviceTypeId: z.number().optional(),
          isActive: z.boolean().optional(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await requireDb();
        const { id, ...data } = input;
        await db.update(workflowDefinitions).set(data).where(eq(workflowDefinitions.id, id));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db.update(workflowDefinitions).set({ isActive: false }).where(eq(workflowDefinitions.id, input.id));
        return { success: true };
      }),
  }),

  // ── Steps ─────────────────────────────────────────────────────────────────────
  steps: router({
    upsert: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(),
          workflowId: z.number(),
          name: z.string().min(1),
          description: z.string().optional(),
          stepOrder: z.number(),
          stepType: z.enum(["start", "task", "decision", "approval", "notification", "document", "end"]).optional(),
          responsibleRole: z.string().optional(),
          responsibleOrgUnitId: z.number().optional(),
          slaHours: z.number().optional(),
          isRequired: z.boolean().optional(),
          generateDocument: z.boolean().optional(),
          documentTemplateId: z.number().optional(),
          requiresSignature: z.boolean().optional(),
          sendNotification: z.boolean().optional(),
          notificationTemplate: z.string().optional(),
          positionX: z.number().optional(),
          positionY: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await requireDb();
        const { id, ...data } = input;
        if (id) {
          await db.update(workflowSteps).set(data).where(eq(workflowSteps.id, id));
          return { id };
        }
        const [result] = await db.insert(workflowSteps).values(data);
        return { id: (result as { insertId: number }).insertId };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db.delete(workflowSteps).where(eq(workflowSteps.id, input.id));
        return { success: true };
      }),

    updatePositions: protectedProcedure
      .input(
        z.array(z.object({ id: z.number(), positionX: z.number(), positionY: z.number() }))
      )
      .mutation(async ({ input }) => {
        const db = await requireDb();
        for (const step of input) {
          await db
            .update(workflowSteps)
            .set({ positionX: step.positionX, positionY: step.positionY })
            .where(eq(workflowSteps.id, step.id));
        }
        return { success: true };
      }),
  }),

  // ── Transitions ───────────────────────────────────────────────────────────────
  transitions: router({
    upsert: protectedProcedure
      .input(
        z.object({
          id: z.number().optional(),
          workflowId: z.number(),
          fromStepId: z.number(),
          toStepId: z.number(),
          label: z.string().optional(),
          condition: z.string().optional(),
          isDefault: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await requireDb();
        const { id, ...data } = input;
        if (id) {
          await db.update(workflowTransitions).set(data).where(eq(workflowTransitions.id, id));
          return { id };
        }
        const [result] = await db.insert(workflowTransitions).values(data);
        return { id: (result as { insertId: number }).insertId };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db.delete(workflowTransitions).where(eq(workflowTransitions.id, input.id));
        return { success: true };
      }),
  }),

  // ── Instances (WorkflowExecutionService) ─────────────────────────────────────
  instances: router({
    start: protectedProcedure
      .input(
        z.object({
          workflowId: z.number(),
          entityType: z.string(),
          entityId: z.number(),
          nup: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();

        // Get first step
        const [firstStep] = await db
          .select()
          .from(workflowSteps)
          .where(eq(workflowSteps.workflowId, input.workflowId))
          .orderBy(asc(workflowSteps.stepOrder))
          .limit(1);

        const [result] = await db.insert(workflowInstances).values({
          workflowId: input.workflowId,
          entityType: input.entityType,
          entityId: input.entityId,
          nup: input.nup,
          currentStepId: firstStep?.id ?? null,
          status: "active",
          startedById: ctx.user.id,
        });
        const instanceId = (result as { insertId: number }).insertId;

        // Create instance steps for all workflow steps
        const allSteps = await db
          .select()
          .from(workflowSteps)
          .where(eq(workflowSteps.workflowId, input.workflowId))
          .orderBy(asc(workflowSteps.stepOrder));

        for (const step of allSteps) {
          const dueAt = step.slaHours
            ? new Date(Date.now() + step.slaHours * 3600 * 1000)
            : null;

          await db.insert(workflowInstanceSteps).values({
            instanceId,
            stepId: step.id,
            status: step.id === firstStep?.id ? "in_progress" : "pending",
            dueAt: dueAt ?? undefined,
          });

          if (dueAt) {
            await db.insert(workflowDeadlines).values({
              instanceId,
              instanceStepId: step.id,
              dueAt,
            });
          }
        }

        // Log event
        await db.insert(workflowEvents).values({
          instanceId,
          eventType: "workflow.started",
          toStepId: firstStep?.id,
          performedById: ctx.user.id,
        });

        return { instanceId };
      }),

    advance: protectedProcedure
      .input(
        z.object({
          instanceId: z.number(),
          transitionId: z.number().optional(),
          notes: z.string().optional(),
          context: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();

        const [instance] = await db
          .select()
          .from(workflowInstances)
          .where(eq(workflowInstances.id, input.instanceId));

        if (!instance) throw new Error("Instância não encontrada");
        if (instance.status !== "active") throw new Error("Workflow não está ativo");

        const fromStepId = instance.currentStepId;

        // Find next transition
        let transition = null;
        if (input.transitionId) {
          const [t] = await db
            .select()
            .from(workflowTransitions)
            .where(eq(workflowTransitions.id, input.transitionId));
          transition = t;
        } else if (fromStepId) {
          const [t] = await db
            .select()
            .from(workflowTransitions)
            .where(
              and(
                eq(workflowTransitions.workflowId, instance.workflowId),
                eq(workflowTransitions.fromStepId, fromStepId),
                eq(workflowTransitions.isDefault, true)
              )
            )
            .limit(1);
          transition = t;
        }

        const toStepId = transition?.toStepId ?? null;

        // Check rules if context provided
        if (fromStepId && input.context) {
          const rules = await db
            .select()
            .from(workflowStepRules)
            .where(and(eq(workflowStepRules.stepId, fromStepId), eq(workflowStepRules.ruleType, "exit")));

          for (const rule of rules) {
            if (!evaluateRule(rule, input.context)) {
              throw new Error(`Regra de saída não satisfeita: ${rule.field} ${rule.operator} ${rule.value}`);
            }
          }
        }

        // Mark current step as completed
        if (fromStepId) {
          await db
            .update(workflowInstanceSteps)
            .set({ status: "completed", completedAt: new Date() })
            .where(
              and(
                eq(workflowInstanceSteps.instanceId, input.instanceId),
                eq(workflowInstanceSteps.stepId, fromStepId)
              )
            );
        }

        // Check if we reached the end
        const isEnd = !toStepId;
        if (isEnd) {
          await db
            .update(workflowInstances)
            .set({ status: "completed", completedAt: new Date(), currentStepId: null })
            .where(eq(workflowInstances.id, input.instanceId));
        } else {
          // Mark next step as in_progress
          await db
            .update(workflowInstanceSteps)
            .set({ status: "in_progress", startedAt: new Date() })
            .where(
              and(
                eq(workflowInstanceSteps.instanceId, input.instanceId),
                eq(workflowInstanceSteps.stepId, toStepId)
              )
            );

          await db
            .update(workflowInstances)
            .set({ currentStepId: toStepId })
            .where(eq(workflowInstances.id, input.instanceId));
        }

        // Log event
        await db.insert(workflowEvents).values({
          instanceId: input.instanceId,
          eventType: isEnd ? "workflow.completed" : "workflow.step.changed",
          fromStepId: fromStepId ?? undefined,
          toStepId: toStepId ?? undefined,
          performedById: ctx.user.id,
          notes: input.notes,
        });

        return { success: true, completed: isEnd, toStepId };
      }),

    cancel: protectedProcedure
      .input(z.object({ instanceId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await requireDb();
        await db
          .update(workflowInstances)
          .set({ status: "cancelled" })
          .where(eq(workflowInstances.id, input.instanceId));

        await db.insert(workflowEvents).values({
          instanceId: input.instanceId,
          eventType: "workflow.cancelled",
          performedById: ctx.user.id,
          notes: input.reason,
        });

        return { success: true };
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const [instance] = await db
          .select()
          .from(workflowInstances)
          .where(eq(workflowInstances.id, input.id));
        if (!instance) throw new Error("Instância não encontrada");

        const steps = await db
          .select()
          .from(workflowInstanceSteps)
          .where(eq(workflowInstanceSteps.instanceId, input.id));

        const events = await db
          .select()
          .from(workflowEvents)
          .where(eq(workflowEvents.instanceId, input.id))
          .orderBy(desc(workflowEvents.createdAt));

        return { ...instance, steps, events };
      }),

    listByEntity: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        return db
          .select()
          .from(workflowInstances)
          .where(
            and(
              eq(workflowInstances.entityType, input.entityType),
              eq(workflowInstances.entityId, input.entityId)
            )
          )
          .orderBy(desc(workflowInstances.createdAt));
      }),

    listByEntityWithSteps: protectedProcedure
      .input(z.object({ entityType: z.string(), entityId: z.number() }))
      .query(async ({ input }) => {
        const db = await requireDb();
        const instances = await db
          .select()
          .from(workflowInstances)
          .where(
            and(
              eq(workflowInstances.entityType, input.entityType),
              eq(workflowInstances.entityId, input.entityId)
            )
          )
          .orderBy(desc(workflowInstances.createdAt));
        const result = [];
        for (const inst of instances) {
          const [wfDef] = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.id, inst.workflowId)).limit(1);
          const instanceSteps = await db
            .select()
            .from(workflowInstanceSteps)
            .where(eq(workflowInstanceSteps.instanceId, inst.id))
            .orderBy(asc(workflowInstanceSteps.id));
          const enrichedSteps = [];
          for (const is of instanceSteps) {
            const [step] = await db.select().from(workflowSteps).where(eq(workflowSteps.id, is.stepId)).limit(1);
            enrichedSteps.push({ ...is, stepName: step?.name ?? `Etapa ${is.stepId}` });
          }
          result.push({ ...inst, workflowName: wfDef?.name ?? `Workflow #${inst.workflowId}`, steps: enrichedSteps });
        }
        return result;
      }),

    listActive: protectedProcedure.query(async () => {
      const db = await requireDb();
      return db
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.status, "active"))
        .orderBy(desc(workflowInstances.createdAt))
        .limit(100);
    }),
  }),

  // ── SLA Monitor ───────────────────────────────────────────────────────────────
  sla: router({
    checkOverdue: protectedProcedure.mutation(async () => {
      const count = await checkOverdueDeadlines();
      return { overdueCount: count };
    }),

    listOverdue: protectedProcedure.query(async () => {
      const db = await requireDb();
      return db
        .select()
        .from(workflowDeadlines)
        .where(and(eq(workflowDeadlines.isOverdue, true), isNull(workflowDeadlines.resolvedAt)))
        .orderBy(asc(workflowDeadlines.dueAt))
        .limit(100);
    }),

    resolve: protectedProcedure
      .input(z.object({ deadlineId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await requireDb();
        await db
          .update(workflowDeadlines)
          .set({ resolvedAt: new Date() })
          .where(eq(workflowDeadlines.id, input.deadlineId));
        return { success: true };
      }),
  }),
});
