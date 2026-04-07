/**
 * CAIUS — Envio em Massa WhatsApp
 * Importação de planilha + disparo em massa com controle de campanha.
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Send, Upload, Play, Pause, X, Trash2, RefreshCw,
  Users, CheckCircle2, XCircle, Clock, FileSpreadsheet,
  Plus, Eye, MessageSquare, Zap
} from "lucide-react";

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  running: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  running: "bg-blue-100 text-blue-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const RECIPIENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkCampaigns() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    accountId: "",
    message: "",
    delaySeconds: "3",
    scheduledAt: "",
    fileBase64: "",
    fileMime: "",
    fileName: "",
  });

  // Queries
  const { data: campaigns, refetch } = trpc.bulk.list.useQuery(undefined, { refetchInterval: 5000 });
  const { data: accounts } = trpc.accounts.list.useQuery();
  const { data: detail, refetch: refetchDetail } = trpc.bulk.byId.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId, refetchInterval: 3000 }
  );

  // Mutations
  const createMut = trpc.bulk.create.useMutation({
    onSuccess: (d) => {
      toast.success(`Campanha criada — ${d.totalCount} destinatários importados.`);
      setShowCreate(false);
      resetForm();
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const startMut = trpc.bulk.start.useMutation({
    onSuccess: () => { toast.success("Campanha iniciada"); refetch(); refetchDetail(); },
    onError: (e) => toast.error(e.message),
  });

  const pauseMut = trpc.bulk.pause.useMutation({
    onSuccess: () => { toast.success("Campanha pausada"); refetch(); refetchDetail(); },
  });

  const cancelMut = trpc.bulk.cancel.useMutation({
    onSuccess: () => { toast.success("Campanha cancelada"); refetch(); refetchDetail(); },
  });

  const deleteMut = trpc.bulk.delete.useMutation({
    onSuccess: () => {
      toast.success("Campanha excluída");
      setSelectedId(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Helpers
  const resetForm = () => setForm({ name: "", accountId: "", message: "", delaySeconds: "3", scheduledAt: "", fileBase64: "", fileMime: "", fileName: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1] ?? "";
      setForm(f => ({ ...f, fileBase64: base64, fileMime: file.type, fileName: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!form.name || !form.accountId || !form.message) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (!form.fileBase64) {
      toast.error("Importe uma planilha com os destinatários");
      return;
    }
    createMut.mutate({
      name: form.name,
      accountId: Number(form.accountId),
      message: form.message,
      delaySeconds: Number(form.delaySeconds),
      scheduledAt: form.scheduledAt || undefined,
      fileBase64: form.fileBase64,
      fileMime: form.fileMime,
    });
  };

  // WhatsApp accounts only
  const waAccounts = accounts?.filter(a => a.channel === "whatsapp") ?? [];

  const selectedCampaign = detail?.campaign;
  const recipients = detail?.recipients ?? [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="w-6 h-6 text-green-600" />
              Envio em Massa — WhatsApp
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Importe uma planilha (.xlsx/.csv) e dispare mensagens personalizadas para múltiplos contatos.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Campanha
          </Button>
        </div>

        {/* Dica de uso */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-green-700 mt-0.5 shrink-0" />
              <div className="text-sm text-green-800">
                <strong>Formato da planilha:</strong> colunas <code className="bg-green-100 px-1 rounded">telefone</code> (obrigatório),{" "}
                <code className="bg-green-100 px-1 rounded">nome</code> (opcional) e{" "}
                <code className="bg-green-100 px-1 rounded">mensagem</code> (opcional — substitui a mensagem padrão).
                Use <code className="bg-green-100 px-1 rounded">{"{nome}"}</code> na mensagem para personalizar com o nome do contato.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout split */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Lista de campanhas */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Campanhas</h2>
              <Button variant="ghost" size="sm" onClick={() => refetch()}><RefreshCw className="w-3.5 h-3.5" /></Button>
            </div>

            {!campaigns || campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhuma campanha criada</p>
              </div>
            ) : (
              campaigns.map(c => (
                <Card
                  key={c.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedId === c.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-tight">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[c.status] ?? ""}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.totalCount} contatos</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" />{c.sentCount ?? 0} enviados</span>
                      {(c.failedCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" />{c.failedCount} falhas</span>
                      )}
                    </div>
                    {c.status === "running" && (
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${c.totalCount > 0 ? Math.round(((c.sentCount ?? 0) / c.totalCount) * 100) : 0}%` }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Detalhe da campanha */}
          <div className="lg:col-span-3">
            {!selectedCampaign ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                <Eye className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Selecione uma campanha para ver os detalhes</p>
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{selectedCampaign.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Criada em {new Date(selectedCampaign.createdAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[selectedCampaign.status] ?? ""}`}>
                      {STATUS_LABELS[selectedCampaign.status] ?? selectedCampaign.status}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(selectedCampaign.status === "draft" || selectedCampaign.status === "paused") && (
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700"
                        onClick={() => startMut.mutate({ id: selectedCampaign.id })}
                        disabled={startMut.isPending}>
                        <Play className="w-3.5 h-3.5" />
                        {selectedCampaign.status === "paused" ? "Retomar" : "Iniciar Disparo"}
                      </Button>
                    )}
                    {selectedCampaign.status === "running" && (
                      <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => pauseMut.mutate({ id: selectedCampaign.id })}
                        disabled={pauseMut.isPending}>
                        <Pause className="w-3.5 h-3.5" />
                        Pausar
                      </Button>
                    )}
                    {(selectedCampaign.status === "running" || selectedCampaign.status === "paused") && (
                      <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => cancelMut.mutate({ id: selectedCampaign.id })}
                        disabled={cancelMut.isPending}>
                        <X className="w-3.5 h-3.5" />
                        Cancelar
                      </Button>
                    )}
                    {selectedCampaign.status !== "running" && (
                      <Button size="sm" variant="ghost" className="gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto"
                        onClick={() => deleteMut.mutate({ id: selectedCampaign.id })}
                        disabled={deleteMut.isPending}>
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{selectedCampaign.totalCount}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{selectedCampaign.sentCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Enviados</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">{selectedCampaign.failedCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Falhas</p>
                    </div>
                  </div>

                  {/* Mensagem */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Mensagem padrão</p>
                    <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-wrap border">
                      {selectedCampaign.message}
                    </div>
                  </div>

                  {/* Destinatários */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Destinatários ({recipients.length})
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
                      {recipients.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum destinatário</p>
                      ) : (
                        recipients.map(r => (
                          <div key={r.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-slate-50">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${RECIPIENT_STATUS_COLORS[r.status] ?? ""}`}>
                                {r.status === "pending" ? <Clock className="w-3 h-3" /> : r.status === "sent" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              </span>
                              <span className="font-medium truncate">{r.name || r.phone}</span>
                              {r.name && <span className="text-muted-foreground truncate">{r.phone}</span>}
                            </div>
                            {r.sentAt && (
                              <span className="text-muted-foreground shrink-0 ml-2">
                                {new Date(r.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                            {r.errorMessage && (
                              <span className="text-red-500 truncate ml-2 max-w-32" title={r.errorMessage}>
                                {r.errorMessage}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog: Nova Campanha */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Nova Campanha em Massa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da campanha *</Label>
              <Input placeholder="Ex: Aviso de manutenção — Abril 2026"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Conta WhatsApp *</Label>
              <Select value={form.accountId} onValueChange={v => setForm(f => ({ ...f, accountId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {waAccounts.length === 0 ? (
                    <SelectItem value="_none" disabled>Nenhuma conta WhatsApp conectada</SelectItem>
                  ) : (
                    waAccounts.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name} — {a.identifier}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Mensagem padrão *</Label>
              <Textarea
                placeholder={"Olá {nome}, informamos que...\n\nUse {nome} para personalizar com o nome do contato."}
                rows={4}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Use <code>{"{nome}"}</code> para inserir o nome do contato automaticamente.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Intervalo entre envios (seg)</Label>
                <Input type="number" min={1} max={60} value={form.delaySeconds}
                  onChange={e => setForm(f => ({ ...f, delaySeconds: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Agendamento (opcional)</Label>
                <Input type="datetime-local" value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Planilha de destinatários *</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5 ${form.fileName ? "border-green-400 bg-green-50" : ""}`}
                onClick={() => fileRef.current?.click()}
              >
                {form.fileName ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <FileSpreadsheet className="w-5 h-5" />
                    <span className="text-sm font-medium">{form.fileName}</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="w-6 h-6 mx-auto mb-1" />
                    <p className="text-sm">Clique para importar planilha (.xlsx, .xls, .csv)</p>
                    <p className="text-xs mt-1">Colunas: <strong>telefone</strong>, nome (opcional), mensagem (opcional)</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending} className="gap-2">
              {createMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
