import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Hash,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  Building2,
  FileText,
  BookOpen,
  Gavel,
  ScrollText,
  Newspaper,
  Handshake,
  ClipboardList,
} from "lucide-react";

type DocType =
  | "oficio"
  | "memorando"
  | "decreto"
  | "lei"
  | "diario_oficial"
  | "contrato"
  | "portaria";

const docTypeConfig: Record<DocType, { label: string; color: string; icon: React.ReactNode }> = {
  oficio: { label: "Ofício", color: "#3b82f6", icon: <FileText className="w-5 h-5" /> },
  memorando: { label: "Memorando", color: "#8b5cf6", icon: <BookOpen className="w-5 h-5" /> },
  decreto: { label: "Decreto", color: "#ef4444", icon: <Gavel className="w-5 h-5" /> },
  lei: { label: "Lei", color: "#f59e0b", icon: <ScrollText className="w-5 h-5" /> },
  diario_oficial: { label: "Diário Oficial", color: "#10b981", icon: <Newspaper className="w-5 h-5" /> },
  contrato: { label: "Contrato Administrativo", color: "#6366f1", icon: <Handshake className="w-5 h-5" /> },
  portaria: { label: "Portaria", color: "#f97316", icon: <ClipboardList className="w-5 h-5" /> },
};

const useSchema = z.object({
  controlId: z.coerce.number().min(1, "Selecione um controle"),
  documentDescription: z.string().min(3, "Descrição obrigatória (mínimo 3 caracteres)"),
});
type UseFormData = z.infer<typeof useSchema>;

interface Props {
  documentType: DocType;
}

function ControleDocumentoEmissao({ documentType }: Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const config = docTypeConfig[documentType];

  const [selectedControlId, setSelectedControlId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<UseFormData | null>(null);
  const [lastUsed, setLastUsed] = useState<{ number: number; formattedNumber: string } | null>(null);

  const { data: controls, isLoading: loadingControls } = trpc.controle.configuracao.list.useQuery();
  const filteredControls = (controls ?? []).filter(
    (c) => c.documentType === documentType && c.active
  );

  const { data: preview } = trpc.controle.numeracao.previewNumber.useQuery(
    { controlId: selectedControlId! },
    { enabled: !!selectedControlId }
  );

  const { data: history, isLoading: loadingHistory } = trpc.controle.historico.list.useQuery(
    { controlId: selectedControlId ?? undefined, limit: 20 },
    { enabled: !!selectedControlId }
  );

  const useMutation = trpc.controle.numeracao.useNumber.useMutation({
    onSuccess: (data) => {
      setLastUsed({ number: data.number, formattedNumber: data.formattedNumber });
      utils.controle.historico.list.invalidate();
      utils.controle.numeracao.previewNumber.invalidate({ controlId: selectedControlId! });
      utils.controle.dashboard.stats.invalidate();
      toast.success(`Número emitido: ${data.formattedNumber}`);
      reset();
      setShowConfirm(false);
      setPendingData(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setShowConfirm(false);
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UseFormData>({
    resolver: zodResolver(useSchema) as any,
  });

  const onSubmit = (data: UseFormData) => {
    setPendingData(data);
    setShowConfirm(true);
  };

  const confirmUse = () => {
    if (!pendingData) return;
    useMutation.mutate({ ...pendingData, documentType });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ background: config.color }}
        >
          {config.icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{config.label}</h2>
          <p className="text-sm text-muted-foreground">Emissão de número sequencial</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2 border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" />
              Solicitar Número
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingControls ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : filteredControls.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nenhum controle ativo para este tipo documental.
                </p>
                <p className="text-xs text-muted-foreground">
                  Solicite ao administrador que crie um controle em Configuração de Controles.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Controle de Numeração</Label>
                  <Select
                    onValueChange={(v) => {
                      setSelectedControlId(Number(v));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o controle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredControls.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name} — {c.unitName ?? "Sem unidade"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" {...register("controlId")} value={selectedControlId ?? ""} />
                  {errors.controlId && (
                    <p className="text-xs text-destructive">{errors.controlId.message}</p>
                  )}
                </div>

                {selectedControlId && preview && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Hash className="w-4 h-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Próximo número</p>
                      <p className="text-lg font-bold text-primary">{preview.formattedNumber}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Descrição do Documento</Label>
                  <Textarea
                    {...register("documentDescription")}
                    placeholder="Ex: Ofício de solicitação de informações à SEMFIN..."
                    rows={3}
                  />
                  {errors.documentDescription && (
                    <p className="text-xs text-destructive">{errors.documentDescription.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedControlId || useMutation.isPending}
                  style={{ background: config.color }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Emitir Número
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Last used + info */}
        <div className="space-y-4">
          {lastUsed && (
            <Card className="border border-green-500/30 bg-green-500/5 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-semibold text-green-600">Número emitido!</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{lastUsed.formattedNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Emitido por {user?.name} em {new Date().toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Controles Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredControls.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium">{c.name}</span>
                  <Badge variant="outline" className="text-xs">
                    #{c.nextNumber}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico */}
      {selectedControlId && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Histórico de Emissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : !history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma emissão registrada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-semibold text-primary">{h.formattedNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {h.documentDescription}
                      </TableCell>
                      <TableCell className="text-sm">{h.userName ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {h.usedAt ? new Date(h.usedAt).toLocaleString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Emissão de Número</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Hash className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Número a ser emitido</p>
                <p className="text-xl font-bold text-primary">{preview?.formattedNumber}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta ação é <strong>irreversível</strong>. O número será registrado permanentemente no histórico.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
            <Button onClick={confirmUse} disabled={useMutation.isPending}>
              {useMutation.isPending ? "Emitindo..." : "Confirmar Emissão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Página principal com abas por tipo documental ────────────────────────────
export default function ControleDocumentoPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: myPerms } = trpc.controle.permissoes.getMyPermissions.useQuery();

  const permMap: Record<DocType, keyof NonNullable<typeof myPerms>> = {
    oficio: "canAccessOficios",
    memorando: "canAccessMemorandos",
    decreto: "canAccessDecretos",
    lei: "canAccessLeis",
    diario_oficial: "canAccessDiarioOficial",
    contrato: "canAccessContratos",
    portaria: "canAccessPortarias",
  };

  const accessibleTypes = (Object.keys(docTypeConfig) as DocType[]).filter((t) => {
    if (isAdmin) return true;
    return myPerms?.[permMap[t]];
  });

  const [activeType, setActiveType] = useState<DocType>(accessibleTypes[0] ?? "oficio");

  if (accessibleTypes.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 py-20 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Sem permissões</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Você não tem acesso a nenhum tipo documental. Solicite ao administrador que configure suas permissões em Administração → Agentes e Usuários.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Emissão de Números</h1>
        <p className="text-sm text-muted-foreground mt-1">Selecione o tipo documental para emitir o próximo número sequencial</p>
      </div>

      {/* Type selector */}
      <div className="flex flex-wrap gap-2">
        {accessibleTypes.map((type) => {
          const cfg = docTypeConfig[type];
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                isActive
                  ? "text-white border-transparent shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              }`}
              style={isActive ? { background: cfg.color, borderColor: cfg.color } : {}}
            >
              {cfg.icon}
              {cfg.label}
            </button>
          );
        })}
      </div>

      <ControleDocumentoEmissao documentType={activeType} />
    </div>
  );
}
