/**
 * WorkflowPanel — Painel de Workflow vinculado a entidades da Gestão Pública
 * Exibe o workflow ativo, etapas, progresso e permite avançar/concluir etapas.
 * Uso: <WorkflowPanel entityType="protocol" entityId={id} nup={nup} />
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GitBranch, Play, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Plus, ArrowRight, Circle, Loader2, RefreshCw,
} from "lucide-react";

type EntityType = "protocol" | "process" | "document" | "ombudsman";

interface WorkflowPanelProps {
  entityType: EntityType;
  entityId: number;
  nup?: string;
  compact?: boolean;
}

const STEP_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  pending: { label: "Pendente", color: "bg-gray-100 text-gray-600 border-gray-300", icon: Circle },
  in_progress: { label: "Em Andamento", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Clock },
  completed: { label: "Concluída", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle2 },
  skipped: { label: "Pulada", color: "bg-gray-100 text-gray-500 border-gray-200", icon: ChevronRight },
  rejected: { label: "Rejeitada", color: "bg-red-100 text-red-700 border-red-300", icon: AlertTriangle },
};

const INSTANCE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Em Andamento", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  suspended: { label: "Suspenso", color: "bg-yellow-100 text-yellow-700" },
  overdue: { label: "Atrasado", color: "bg-orange-100 text-orange-700" },
};

export function WorkflowPanel({ entityType, entityId, nup, compact = false }: WorkflowPanelProps) {
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [advanceNotes, setAdvanceNotes] = useState("");
  const [advanceStatus, setAdvanceStatus] = useState<"completed" | "rejected" | "skipped">("completed");

  const utils = trpc.useUtils();

  // Buscar instâncias de workflow para esta entidade
  const { data: instances = [], isLoading: loadingInstances, refetch } = trpc.workflow.instances.listByEntityWithSteps.useQuery(
    { entityType, entityId },
    { retry: false }
  );

  // Buscar workflows disponíveis para iniciar
  const { data: workflows = [] } = trpc.workflow.definitions.list.useQuery(
    { status: "active" },
    { enabled: startDialogOpen }
  );

  const startMutation = trpc.workflow.instances.start.useMutation({
    onSuccess: () => {
      toast.success("Workflow iniciado com sucesso!");
      setStartDialogOpen(false);
      setSelectedWorkflowId("");
      utils.workflow.instances.listByEntityWithSteps.invalidate({ entityType, entityId });
    },
    onError: (e: { message: string }) => toast.error(`Erro ao iniciar workflow: ${e.message}`),
  });

  const advanceMutation = trpc.workflow.instances.advance.useMutation({
    onSuccess: () => {
      toast.success("Etapa avançada com sucesso!");
      setAdvanceDialogOpen(false);
      setAdvanceNotes("");
      utils.workflow.instances.listByEntityWithSteps.invalidate({ entityType, entityId });
    },
    onError: (e: { message: string }) => toast.error(`Erro ao avançar etapa: ${e.message}`),
  });

  const activeInstance = (instances as any[]).find((i: any) => i.status === "active" || i.status === "overdue");
  const allInstances = instances as any[];

  const handleStart = () => {
    if (!selectedWorkflowId) {
      toast.error("Selecione um workflow para iniciar.");
      return;
    }
    startMutation.mutate({
      workflowId: parseInt(selectedWorkflowId),
      entityType,
      entityId,
      nup,
    });
  };

  const handleAdvance = () => {
    if (!activeInstance) return;
    const currentStep = (activeInstance.steps as any[])?.find((s: any) => s.status === "in_progress");
    if (!currentStep) {
      toast.error("Nenhuma etapa em andamento encontrada.");
      return;
    }
    advanceMutation.mutate({
      instanceId: activeInstance.id,
      notes: advanceNotes.trim() || undefined,
    });
  };

  if (loadingInstances) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando workflow...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Workflow
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-6 w-6 p-0">
                <RefreshCw className="h-3 w-3" />
              </Button>
              {!activeInstance && (
                <Button size="sm" variant="outline" onClick={() => setStartDialogOpen(true)} className="h-6 text-xs px-2">
                  <Plus className="h-3 w-3 mr-1" />
                  Iniciar
                </Button>
              )}
              {activeInstance && (
                <Button size="sm" variant="default" onClick={() => setAdvanceDialogOpen(true)} className="h-6 text-xs px-2">
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Avançar
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allInstances.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <GitBranch className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p>Nenhum workflow iniciado.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStartDialogOpen(true)}
                className="mt-2 text-xs"
              >
                <Play className="w-3 h-3 mr-1" />
                Iniciar Workflow
              </Button>
            </div>
          ) : (
            allInstances.map((instance: any) => {
              const statusCfg = INSTANCE_STATUS_CONFIG[instance.status] ?? INSTANCE_STATUS_CONFIG.active;
              const steps = (instance.steps as any[]) ?? [];
              const completedCount = steps.filter((s: any) => s.status === "completed").length;
              const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

              return (
                <div key={instance.id} className="border rounded-lg p-3 space-y-3">
                  {/* Header da instância */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{instance.workflowName ?? `Workflow #${instance.id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        Iniciado em {new Date(instance.startedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge className={cn("text-xs", statusCfg.color)}>
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Barra de progresso */}
                  {steps.length > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{completedCount}/{steps.length} etapas</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Lista de etapas */}
                  {!compact && steps.length > 0 && (
                    <div className="space-y-1.5">
                      {steps.map((step: any, idx: number) => {
                        const cfg = STEP_STATUS_CONFIG[step.status] ?? STEP_STATUS_CONFIG.pending;
                        const Icon = cfg.icon;
                        return (
                          <div key={step.id} className="flex items-center gap-2">
                            <div className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                              cfg.color
                            )}>
                              <Icon className="w-2.5 h-2.5" />
                            </div>
                            <span className={cn(
                              "text-xs flex-1",
                              step.status === "in_progress" ? "font-medium text-foreground" : "text-muted-foreground"
                            )}>
                              {step.stepName ?? `Etapa ${idx + 1}`}
                            </span>
                            {step.status === "in_progress" && (
                              <Badge className="text-[10px] bg-blue-100 text-blue-700 h-4 px-1">Atual</Badge>
                            )}
                            {step.dueAt && step.status !== "completed" && (
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(step.dueAt).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Dialog: Iniciar Workflow */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              Iniciar Workflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Selecione o Workflow <span className="text-red-500">*</span></Label>
              <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um workflow..." />
                </SelectTrigger>
                <SelectContent>
                  {(workflows as any[]).length === 0 ? (
                    <SelectItem value="_none" disabled>Nenhum workflow ativo disponível</SelectItem>
                  ) : (
                    (workflows as any[]).map((wf: any) => (
                      <SelectItem key={wf.id} value={String(wf.id)}>
                        {wf.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {(workflows as any[]).length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Crie e ative workflows em <strong>Administração → Fluxos</strong>.
                </p>
              )}
            </div>
            {nup && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">NUP: </span>
                <span className="font-mono font-medium">{nup}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleStart}
              disabled={startMutation.isPending || !selectedWorkflowId}
            >
              {startMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Iniciando...</>
              ) : (
                <><Play className="w-3.5 h-3.5 mr-1.5" />Iniciar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Avançar Etapa */}
      <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              Avançar Etapa do Workflow
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {activeInstance && (() => {
              const currentStep = (activeInstance.steps as any[])?.find((s: any) => s.status === "in_progress");
              return currentStep ? (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
                  <p className="text-blue-700 font-medium">Etapa atual:</p>
                  <p className="text-blue-900">{currentStep.stepName}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma etapa em andamento.</p>
              );
            })()}
            <div className="space-y-1">
              <Label>Resultado da Etapa</Label>
              <Select value={advanceStatus} onValueChange={(v) => setAdvanceStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Concluída com sucesso</SelectItem>
                  <SelectItem value="rejected">Rejeitada / Devolvida</SelectItem>
                  <SelectItem value="skipped">Pulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione observações sobre esta etapa..."
                value={advanceNotes}
                onChange={(e) => setAdvanceNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvanceDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAdvance}
              disabled={advanceMutation.isPending}
            >
              {advanceMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Avançando...</>
              ) : (
                <><ArrowRight className="w-3.5 h-3.5 mr-1.5" />Confirmar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
