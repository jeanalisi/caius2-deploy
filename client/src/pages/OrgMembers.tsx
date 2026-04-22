/**
 * OrgMembers.tsx — Gestão de Membros da Estrutura Administrativa
 * Painel administrativo para cadastro, edição e exclusão de membros públicos.
 * Suporta cadastro manual com nome, cargo, matrícula e fotografia.
 * Lei Complementar nº 010/2025 — Itabaiana/PB
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Users, Plus, Pencil, Trash2, Search, UserCircle,
  Upload, Building2, RefreshCw, Download, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Cargos previstos na Lei 010/2025 ──────────────────────────────────────────
const CARGOS_LEI = [
  "Prefeito",
  "Vice-Prefeito",
  "Secretário Municipal",
  "Secretário-Chefe de Gabinete",
  "Procurador Geral do Município",
  "Controlador Geral do Município",
  "Superintendente Executivo",
  "Secretário Executivo",
  "Ouvidor Municipal",
  "Tesoureiro Geral",
  "Diretor",
  "Coordenador",
  "Gerente",
  "Supervisor",
  "Chefe de Seção",
  "Chefe de Setor",
  "Assessor Técnico",
  "Assessor Especial",
];

type Member = {
  id: number;
  orgUnitId: number;
  name: string;
  matricula?: string | null;
  cargo: string;
  cargoLei?: string | null;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
};

type OrgUnit = {
  id: number;
  name: string;
  acronym?: string | null;
  type: string;
};

const EMPTY_FORM = {
  orgUnitId: 0,
  name: "",
  matricula: "",
  cargo: "",
  cargoLei: "",
  photoUrl: "",
  email: "",
  phone: "",
  isPublic: true,
};

export default function OrgMembers() {
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState<number | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const { data: units = [] } = trpc.orgUnits.list.useQuery({ isActive: true });
  const { data: members = [], isLoading } = trpc.orgMembers.list.useQuery(
    filterUnit ? { orgUnitId: filterUnit } : {},
  );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = trpc.orgMembers.create.useMutation({
    onSuccess: () => {
      utils.orgMembers.list.invalidate();
      toast.success("Membro cadastrado com sucesso!");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.orgMembers.update.useMutation({
    onSuccess: () => {
      utils.orgMembers.list.invalidate();
      toast.success("Membro atualizado com sucesso!");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.orgMembers.delete.useMutation({
    onSuccess: () => {
      utils.orgMembers.list.invalidate();
      toast.success("Membro removido.");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const seedMutation = trpc.orgMembers.seedFromPayroll.useMutation({
    onSuccess: (res) => {
      utils.orgMembers.list.invalidate();
      toast.success(`Seed concluído! ${res.inserted} inseridos, ${res.skipped} ignorados.`);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setPhotoPreview(null);
    setDialogOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({
      orgUnitId: m.orgUnitId,
      name: m.name,
      matricula: m.matricula ?? "",
      cargo: m.cargo,
      cargoLei: m.cargoLei ?? "",
      photoUrl: m.photoUrl ?? "",
      email: m.email ?? "",
      phone: m.phone ?? "",
      isPublic: m.isPublic,
    });
    setPhotoPreview(m.photoUrl ?? null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setPhotoPreview(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPhotoPreview(url);
      setForm((f) => ({ ...f, photoUrl: url }));
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!form.orgUnitId || form.orgUnitId === 0) {
      toast.error("Selecione a unidade organizacional.");
      return;
    }
    if (!form.name.trim() || !form.cargo.trim()) {
      toast.error("Nome e cargo são obrigatórios.");
      return;
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        orgUnitId: form.orgUnitId,
        name: form.name,
        matricula: form.matricula || undefined,
        cargo: form.cargo,
        cargoLei: form.cargoLei || undefined,
        photoUrl: form.photoUrl || null,
        email: form.email || null,
        phone: form.phone || undefined,
        isPublic: form.isPublic,
      });
    } else {
      createMutation.mutate({
        orgUnitId: form.orgUnitId,
        name: form.name,
        matricula: form.matricula || undefined,
        cargo: form.cargo,
        cargoLei: form.cargoLei || undefined,
        photoUrl: form.photoUrl || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        isPublic: form.isPublic,
      });
    }
  }

  // ── Filtragem local ────────────────────────────────────────────────────────
  const filtered = (members as Member[]).filter((m) => {
    if (search) {
      const q = search.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.cargo.toLowerCase().includes(q)) return false;
    }
    if (filterActive !== null && m.isActive !== filterActive) return false;
    return true;
  });

  const unitMap: Record<number, OrgUnit> = {};
  (units as OrgUnit[]).forEach((u) => { unitMap[u.id] = u; });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Membros da Estrutura Administrativa</h1>
            <p className="text-sm text-slate-500">Lei Complementar nº 010/2025 — Itabaiana/PB</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-slate-600"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            <Download className="w-4 h-4" />
            {seedMutation.isPending ? "Importando..." : "Importar da Folha"}
          </Button>
          <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Novo Membro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={filterUnit?.toString() ?? "all"}
          onValueChange={(v) => setFilterUnit(v === "all" ? null : Number(v))}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todas as unidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as unidades</SelectItem>
            {(units as OrgUnit[]).map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.acronym ? `[${u.acronym}] ` : ""}{u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterActive === null ? "all" : filterActive ? "active" : "inactive"}
          onValueChange={(v) => setFilterActive(v === "all" ? null : v === "active")}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500 ml-auto">{filtered.length} membro(s)</span>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Users className="w-12 h-12 mx-auto opacity-20 mb-3" />
          <p className="text-base font-medium text-slate-500">Nenhum membro encontrado</p>
          <p className="text-sm mt-1">Clique em "Novo Membro" para cadastrar ou "Importar da Folha" para importar automaticamente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <div
              key={m.id}
              className={cn(
                "bg-white rounded-xl border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow",
                m.isActive ? "border-slate-200" : "border-slate-200 opacity-60"
              )}
            >
              {/* Foto */}
              <div className="flex items-center gap-3">
                {m.photoUrl ? (
                  <img
                    src={m.photoUrl}
                    alt={m.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 shadow shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border-2 border-slate-100">
                    <UserCircle className="w-8 h-8 text-blue-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                  {m.matricula && <p className="text-xs text-slate-400 font-mono">Mat. {m.matricula}</p>}
                </div>
              </div>

              {/* Cargo */}
              <div className="space-y-1">
                <p className="text-xs text-slate-600 font-medium truncate">{m.cargo}</p>
                {m.cargoLei && (
                  <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">
                    {m.cargoLei}
                  </Badge>
                )}
              </div>

              {/* Unidade */}
              {unitMap[m.orgUnitId] && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {unitMap[m.orgUnitId].acronym
                      ? `[${unitMap[m.orgUnitId].acronym}] ${unitMap[m.orgUnitId].name}`
                      : unitMap[m.orgUnitId].name}
                  </span>
                </div>
              )}

              {/* Status + ações */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  {m.isPublic ? (
                    <Badge variant="outline" className="text-[10px] border-green-200 text-green-700 bg-green-50 gap-1">
                      <Eye className="w-2.5 h-2.5" /> Público
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500 gap-1">
                      <EyeOff className="w-2.5 h-2.5" /> Privado
                    </Badge>
                  )}
                  {!m.isActive && (
                    <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-red-50">
                      Inativo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(m)}>
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteId(m.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Criar / Editar */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Membro" : "Novo Membro"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Foto */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden bg-slate-50"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <Upload className="w-6 h-6" />
                    <span className="text-[10px]">Foto</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <div className="w-full">
                <Label className="text-xs text-slate-500">Ou informe a URL da foto</Label>
                <Input
                  className="mt-1"
                  placeholder="https://..."
                  value={form.photoUrl}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, photoUrl: e.target.value }));
                    setPhotoPreview(e.target.value || null);
                  }}
                />
              </div>
            </div>

            {/* Unidade */}
            <div>
              <Label>Unidade Organizacional *</Label>
              <Select
                value={form.orgUnitId ? form.orgUnitId.toString() : ""}
                onValueChange={(v) => setForm((f) => ({ ...f, orgUnitId: Number(v) }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent>
                  {(units as OrgUnit[]).map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.acronym ? `[${u.acronym}] ` : ""}{u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome */}
            <div>
              <Label>Nome Completo *</Label>
              <Input
                className="mt-1"
                placeholder="Nome do servidor..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Matrícula */}
            <div>
              <Label>Matrícula</Label>
              <Input
                className="mt-1"
                placeholder="Número de matrícula..."
                value={form.matricula}
                onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))}
              />
            </div>

            {/* Cargo (livre) */}
            <div>
              <Label>Cargo (conforme folha) *</Label>
              <Input
                className="mt-1"
                placeholder="Ex: Diretor de Tecnologia da Informação"
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              />
            </div>

            {/* Cargo Lei */}
            <div>
              <Label>Cargo (Lei 010/2025)</Label>
              <Select
                value={form.cargoLei || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, cargoLei: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o cargo da Lei..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Não informado —</SelectItem>
                  {CARGOS_LEI.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div>
              <Label>E-mail institucional</Label>
              <Input
                className="mt-1"
                type="email"
                placeholder="servidor@itabaiana.pb.gov.br"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            {/* Visibilidade */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-700">Exibir publicamente</p>
                <p className="text-xs text-slate-400">Visível na página pública /estrutura-administrativa</p>
              </div>
              <Switch
                checked={form.isPublic}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isPublic: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Salvar Alterações" : "Cadastrar Membro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar exclusão */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja remover este membro? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
