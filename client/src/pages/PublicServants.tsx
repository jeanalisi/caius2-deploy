/**
 * PublicServants — Gerenciamento de Servidores Públicos
 * Permite cadastro manual, edição, upload de foto e vinculação a cargos/unidades
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Plus, Edit, Trash2, Search, Upload, Loader2,
  Building2, Briefcase, Eye, EyeOff, Camera, UserCircle2,
  Mail, Phone, MapPin, FileText
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Servant Dialog ────────────────────────────────────────────────────────────
function ServantDialog({
  open,
  onClose,
  editServant,
}: {
  open: boolean;
  onClose: () => void;
  editServant?: any;
}) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const uploadPhotoMutation = trpc.publicServants.uploadPhoto.useMutation();
  const [form, setForm] = useState({
    name: editServant?.name ?? "",
    matricula: editServant?.matricula ?? "",
    orgUnitId: editServant?.orgUnitId ? String(editServant.orgUnitId) : "",
    positionId: editServant?.positionId ? String(editServant.positionId) : "",
    photoUrl: editServant?.photoUrl ?? "",
    isPublic: editServant?.isPublic !== false,
    legalBasis: editServant?.legalBasis ?? "LC 010/2025",
    email: editServant?.email ?? "",
    phone: editServant?.phone ?? "",
    address: editServant?.address ?? "",
    bio: editServant?.bio ?? "",
  });

  const { data: orgUnits = [] } = trpc.orgUnits.list.useQuery({ isActive: true });
  const { data: positions = [] } = trpc.positions.list.useQuery({ isActive: true });

  const filteredPositions = form.orgUnitId
    ? (positions as any[]).filter((p) => String(p.orgUnitId) === form.orgUnitId)
    : positions as any[];

  const create = trpc.publicServants.create.useMutation({
    onSuccess: () => {
      toast.success("Servidor cadastrado com sucesso!");
      utils.publicServants.listAdmin.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.publicServants.update.useMutation({
    onSuccess: () => {
      toast.success("Servidor atualizado!");
      utils.publicServants.listAdmin.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto deve ter no máximo 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64Data = btoa(binary);
      const { url } = await uploadPhotoMutation.mutateAsync({
        base64Data,
        mimeType: file.type || "image/jpeg",
        servantId: editServant?.id,
      });
      setForm((f) => ({ ...f, photoUrl: url }));
      toast.success("Foto enviada!");
    } catch {
      toast.error("Erro ao enviar foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!form.orgUnitId) { toast.error("Selecione a unidade organizacional."); return; }

    const payload = {
      name: form.name.trim(),
      matricula: form.matricula.trim() || undefined,
      orgUnitId: Number(form.orgUnitId),
      positionId: form.positionId ? Number(form.positionId) : undefined,
      photoUrl: form.photoUrl || undefined,
      isPublic: form.isPublic,
      legalBasis: form.legalBasis.trim() || undefined,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      bio: form.bio.trim() || null,
    };

    if (editServant) {
      update.mutate({ id: editServant.id, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editServant ? "Editar Servidor" : "Cadastrar Servidor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Foto */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-12 h-12 text-muted-foreground" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="w-3.5 h-3.5" />
              {form.photoUrl ? "Trocar Foto" : "Enviar Foto"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file);
              }}
            />
            {form.photoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive h-6 text-xs"
                onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))}
              >
                Remover foto
              </Button>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label>Nome Completo *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: João da Silva Santos"
            />
          </div>

          {/* Matrícula */}
          <div className="space-y-1.5">
            <Label>Matrícula</Label>
            <Input
              value={form.matricula}
              onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))}
              placeholder="Ex: 12345"
            />
          </div>

          {/* Unidade */}
          <div className="space-y-1.5">
            <Label>Unidade Organizacional *</Label>
            <Select
              value={form.orgUnitId || "none"}
              onValueChange={(v) => setForm((f) => ({ ...f, orgUnitId: v === "none" ? "" : v, positionId: "" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade..." />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-56">
                  <SelectItem value="none">— Selecione a unidade —</SelectItem>
                  {(orgUnits as any[]).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.acronym ? `[${u.acronym}] ` : ""}{u.name}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          {/* Cargo */}
          <div className="space-y-1.5">
            <Label>Cargo</Label>
            <Select
              value={form.positionId || "none"}
              onValueChange={(v) => setForm((f) => ({ ...f, positionId: v === "none" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo..." />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-48">
                  <SelectItem value="none">— Sem cargo definido —</SelectItem>
                  {filteredPositions.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="servidor@itabaiana.pb.gov.br"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(83) 9 9999-9999"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Endereço</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Ex: Rua João Pessoa, 1, Centro, Itabaiana/PB"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Biografia / Descrição</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Breve descrição sobre o servidor..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Base Legal */}
          <div className="space-y-1.5">
            <Label>Base Legal</Label>
            <Input
              value={form.legalBasis}
              onChange={(e) => setForm((f) => ({ ...f, legalBasis: e.target.value }))}
              placeholder="Ex: LC 010/2025"
            />
          </div>

          {/* Público */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Exibir publicamente</p>
              <p className="text-xs text-muted-foreground">Visível na página pública da Estrutura Administrativa</p>
            </div>
            <Switch
              checked={form.isPublic}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isPublic: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {editServant ? "Salvar Alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PublicServants() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [filterOrgUnit, setFilterOrgUnit] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editServant, setEditServant] = useState<any>(null);

  const { data: servants = [], isLoading } = trpc.publicServants.listAdmin.useQuery({});
  const { data: orgUnits = [] } = trpc.orgUnits.list.useQuery({ isActive: true });

  const deleteServant = trpc.publicServants.delete.useMutation({
    onSuccess: () => {
      toast.success("Servidor desativado.");
      utils.publicServants.listAdmin.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (servants as any[]).filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.matricula?.includes(search);
    const matchUnit = filterOrgUnit === "all" || String(s.orgUnitId) === filterOrgUnit;
    return matchSearch && matchUnit;
  });

  if (!isAdmin) {
    return (
      <OmniLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </OmniLayout>
    );
  }

  return (
    <OmniLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Servidores Públicos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cadastro e gerenciamento de servidores vinculados à estrutura administrativa
              {(servants as any[]).length > 0 && (
                <span className="ml-2 text-primary">· {(servants as any[]).length} servidores</span>
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Novo Servidor
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border/30">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou matrícula..."
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Select value={filterOrgUnit} onValueChange={setFilterOrgUnit}>
            <SelectTrigger className="w-60 h-8 text-sm">
              <SelectValue placeholder="Filtrar por unidade..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              {(orgUnits as any[]).map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.acronym ? `[${u.acronym}] ` : ""}{u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search || filterOrgUnit !== "all"
                  ? "Nenhum servidor encontrado com os filtros aplicados."
                  : "Nenhum servidor cadastrado ainda."}
              </p>
              {!search && filterOrgUnit === "all" && (
                <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowCreate(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar primeiro servidor
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((servant: any) => (
                <Card key={servant.id} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-0">
                    {/* Photo */}
                    <div className="relative h-40 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
                      {servant.photoUrl ? (
                        <img
                          src={servant.photoUrl}
                          alt={servant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserCircle2 className="w-20 h-20 text-muted-foreground/20" />
                      )}
                      {/* Visibility badge */}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={servant.isPublic ? "default" : "secondary"}
                          className="text-[10px] gap-0.5 px-1.5 py-0.5"
                        >
                          {servant.isPublic ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                          {servant.isPublic ? "Público" : "Privado"}
                        </Badge>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-1.5">
                      <p className="text-sm font-semibold text-foreground leading-tight">{servant.name}</p>
                      {servant.positionName && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Briefcase className="w-3 h-3 shrink-0" />
                          <span className="truncate">{servant.positionName}</span>
                        </div>
                      )}
                      {servant.orgUnitName && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{servant.orgUnitName}</span>
                        </div>
                      )}
                      {servant.matricula && (
                        <p className="text-[10px] font-mono text-muted-foreground">Mat. {servant.matricula}</p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/30">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs gap-1"
                          onClick={() => setEditServant(servant)}
                        >
                          <Edit className="w-3 h-3" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Desativar "${servant.name}"?`)) {
                              deleteServant.mutate({ id: servant.id });
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {showCreate && (
        <ServantDialog open={showCreate} onClose={() => setShowCreate(false)} />
      )}
      {editServant && (
        <ServantDialog open={!!editServant} onClose={() => setEditServant(null)} editServant={editServant} />
      )}
    </OmniLayout>
  );
}
