import { useState } from "react";
import OmniLayout from "@/components/OmniLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Paperclip,
  Plus,
  Trash2,
  FileText,
  Image,
  Film,
  File,
  Settings2,
  HardDrive,
} from "lucide-react";

const MIME_TYPES = [
  { value: "application/pdf", label: "PDF" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/gif", label: "GIF" },
  { value: "image/webp", label: "WebP" },
  { value: "video/mp4", label: "MP4" },
  { value: "video/webm", label: "WebM" },
  { value: "application/msword", label: "DOC" },
  { value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "DOCX" },
  { value: "application/vnd.ms-excel", label: "XLS" },
  { value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "XLSX" },
  { value: "text/plain", label: "TXT" },
  { value: "application/zip", label: "ZIP" },
];

function getMimeIcon(mime: string) {
  if (mime.startsWith("image/")) return Image;
  if (mime.startsWith("video/")) return Film;
  if (mime.includes("pdf")) return FileText;
  return File;
}

type ConfigForm = {
  name: string;
  description: string;
  acceptedTypes: string[];
  maxFileSizeMb: string;
  maxTotalSizeMb: string;
  minCount: string;
  maxCount: string;
  isRequired: boolean;
};

const defaultConfigForm: ConfigForm = {
  name: "",
  description: "",
  acceptedTypes: [],
  maxFileSizeMb: "10",
  maxTotalSizeMb: "50",
  minCount: "0",
  maxCount: "10",
  isRequired: false,
};

export default function AttachmentsManager() {
  const [configOpen, setConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState<ConfigForm>(defaultConfigForm);

  const { data: configs = [], refetch: refetchConfigs } = trpc.attachments.listConfigs.useQuery({});

  const createConfig = trpc.attachments.createConfig.useMutation({
    onSuccess: () => { toast.success("Configuração criada!"); refetchConfigs(); setConfigOpen(false); setConfigForm(defaultConfigForm); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteConfig = trpc.attachments.deleteConfig.useMutation({
    onSuccess: () => { toast.success("Configuração removida."); refetchConfigs(); },
    onError: (e: any) => toast.error(e.message),
  });

  function toggleMimeType(mime: string) {
    setConfigForm(f => ({
      ...f,
      acceptedTypes: f.acceptedTypes.includes(mime)
        ? f.acceptedTypes.filter(m => m !== mime)
        : [...f.acceptedTypes, mime],
    }));
  }

  function handleCreateConfig() {
    createConfig.mutate({
      name: configForm.name,
      description: configForm.description || undefined,
      acceptedTypes: configForm.acceptedTypes.length > 0 ? configForm.acceptedTypes : undefined,
      maxFileSizeMb: Number(configForm.maxFileSizeMb) || 10,
      maxTotalSizeMb: Number(configForm.maxTotalSizeMb) || 50,
      minCount: Number(configForm.minCount) || 0,
      maxCount: Number(configForm.maxCount) || 10,
      isRequired: configForm.isRequired,
    });
  }

  function formatBytes(mb: number) {
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
  }

  return (
    <OmniLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Gerenciamento de Anexos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure regras de anexos por tipo de atendimento: formatos aceitos, tamanhos máximos e obrigatoriedade.
            </p>
          </div>
          <Button onClick={() => { setConfigForm(defaultConfigForm); setConfigOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Configuração
          </Button>
        </div>

        <Tabs defaultValue="configs">
          <TabsList>
            <TabsTrigger value="configs" className="gap-1.5">
              <Settings2 className="w-3.5 h-3.5" /> Configurações
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-1.5">
              <HardDrive className="w-3.5 h-3.5" /> Informações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configs" className="mt-6">
            {configs.length === 0 && (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma configuração de anexo criada.</p>
                <p className="text-sm mt-1">Crie configurações para controlar quais arquivos podem ser enviados.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {configs.map((config: any) => (
                <Card key={config.id} className="border-border hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm">{config.name}</CardTitle>
                        {config.description && (
                          <CardDescription className="text-xs mt-0.5 line-clamp-2">{config.description}</CardDescription>
                        )}
                      </div>
                      {config.isRequired && (
                        <Badge variant="outline" className="text-xs text-red-400 border-red-400/30 shrink-0">Obrigatório</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Limits */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-3 h-3" />
                        <span>Máx. arquivo: {formatBytes(config.maxFileSizeMb)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-3 h-3" />
                        <span>Total: {formatBytes(config.maxTotalSizeMb)}</span>
                      </div>
                      <div>Qtd: {config.minCount}–{config.maxCount} arquivo(s)</div>
                    </div>

                    {/* Accepted types */}
                    {config.acceptedTypes && config.acceptedTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {config.acceptedTypes.slice(0, 5).map((mime: string) => {
                          const Icon = getMimeIcon(mime);
                          const label = MIME_TYPES.find(m => m.value === mime)?.label ?? mime.split("/")[1]?.toUpperCase();
                          return (
                            <span key={mime} className="flex items-center gap-1 text-xs bg-muted/50 text-muted-foreground rounded px-1.5 py-0.5 border border-border">
                              <Icon className="w-3 h-3" /> {label}
                            </span>
                          );
                        })}
                        {config.acceptedTypes.length > 5 && (
                          <span className="text-xs text-muted-foreground">+{config.acceptedTypes.length - 5}</span>
                        )}
                      </div>
                    )}
                    {(!config.acceptedTypes || config.acceptedTypes.length === 0) && (
                      <p className="text-xs text-muted-foreground">Todos os tipos aceitos</p>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive gap-1.5"
                      onClick={() => deleteConfig.mutate({ id: config.id })}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="info" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Como funciona o sistema de anexos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>Os anexos são armazenados no serviço de armazenamento em nuvem (S3) e vinculados a entidades como protocolos, processos, documentos e manifestações de ouvidoria.</p>
                <div className="space-y-2">
                  <h4 className="text-foreground font-medium">Entidades suportadas:</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Protocolos (protocol)</li>
                    <li>Processos Administrativos (process)</li>
                    <li>Documentos Oficiais (document)</li>
                    <li>Manifestações de Ouvidoria (ombudsman)</li>
                    <li>Conversas (conversation)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-foreground font-medium">Configurações de anexo:</h4>
                  <p>Crie configurações para definir regras específicas por tipo de atendimento ou formulário. As configurações controlam:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Tipos de arquivo aceitos (PDF, imagens, vídeos, documentos)</li>
                    <li>Tamanho máximo por arquivo e total</li>
                    <li>Quantidade mínima e máxima de arquivos</li>
                    <li>Obrigatoriedade do envio</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Configuração de Anexo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={configForm.name} onChange={e => setConfigForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Documentos de Identificação" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={configForm.description} onChange={e => setConfigForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Descreva quais documentos devem ser enviados..." />
            </div>
            <div className="space-y-2">
              <Label>Tipos de Arquivo Aceitos</Label>
              <div className="grid grid-cols-3 gap-2">
                {MIME_TYPES.map(mt => {
                  const Icon = getMimeIcon(mt.value);
                  const selected = configForm.acceptedTypes.includes(mt.value);
                  return (
                    <button
                      key={mt.value}
                      onClick={() => toggleMimeType(mt.value)}
                      className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs transition-colors ${
                        selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" /> {mt.label}
                    </button>
                  );
                })}
              </div>
              {configForm.acceptedTypes.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum selecionado = todos os tipos aceitos</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tamanho máx. por arquivo (MB)</Label>
                <Input type="number" value={configForm.maxFileSizeMb} onChange={e => setConfigForm(f => ({ ...f, maxFileSizeMb: e.target.value }))} min="1" />
              </div>
              <div className="space-y-1.5">
                <Label>Tamanho total máximo (MB)</Label>
                <Input type="number" value={configForm.maxTotalSizeMb} onChange={e => setConfigForm(f => ({ ...f, maxTotalSizeMb: e.target.value }))} min="1" />
              </div>
              <div className="space-y-1.5">
                <Label>Qtd. mínima de arquivos</Label>
                <Input type="number" value={configForm.minCount} onChange={e => setConfigForm(f => ({ ...f, minCount: e.target.value }))} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Qtd. máxima de arquivos</Label>
                <Input type="number" value={configForm.maxCount} onChange={e => setConfigForm(f => ({ ...f, maxCount: e.target.value }))} min="1" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <Label>Envio Obrigatório</Label>
              <Switch checked={configForm.isRequired} onCheckedChange={v => setConfigForm(f => ({ ...f, isRequired: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateConfig} disabled={!configForm.name || createConfig.isPending}>
              Criar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
