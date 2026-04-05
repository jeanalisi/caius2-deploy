/**
 * KnowledgeBase — Base de Conhecimento interna
 * Artigos, FAQs, categorias e busca semântica
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BookOpen, Plus, Search, Eye, Edit2, Trash2, Star, ThumbsUp,
  ThumbsDown, Tag, Clock, User, ChevronRight, FileText, Globe,
  Lock, Archive, CheckCircle2, MoreHorizontal, Layers,
} from "lucide-react";

const VISIBILITY_CONFIG: Record<string, { label: string; color: string; icon: typeof Globe }> = {
  public: { label: "Público", color: "bg-green-100 text-green-700", icon: Globe },
  internal: { label: "Interno", color: "bg-blue-100 text-blue-700", icon: Lock },
  restricted: { label: "Restrito", color: "bg-orange-100 text-orange-700", icon: Lock },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-600" },
  published: { label: "Publicado", color: "bg-green-100 text-green-700" },
  archived: { label: "Arquivado", color: "bg-red-100 text-red-600" },
};

export default function KnowledgeBase() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", content: "", summary: "", category: "",
    tags: "", visibility: "internal" as "public" | "internal" | "restricted",
    status: "draft" as "draft" | "published" | "archived",
  });

  const { data: articles = [], refetch } = trpc.publicServices.knowledge.articles.list.useQuery({
    search: search || undefined,
    isPublic: undefined,
  });

  const { data: categoriesData = [] } = trpc.publicServices.knowledge.categories.list.useQuery();
  const categories = (categoriesData as any[]).map((c: any) => c.name);

  const upsertArticle = trpc.publicServices.knowledge.articles.upsert.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); setEditing(null); toast.success(editing ? "Artigo atualizado!" : "Artigo criado!"); resetForm(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteArticle = trpc.publicServices.knowledge.articles.markHelpful.useMutation({
    onSuccess: () => { refetch(); toast.success("Artigo removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => setForm({ title: "", content: "", summary: "", category: "", tags: "", visibility: "internal", status: "draft" });

  const openEdit = (a: any) => {
    setForm({
      title: a.title,
      content: a.content ?? "",
      summary: a.summary ?? "",
      category: a.category ?? "",
      tags: (a.tags as string[] ?? []).join(", "),
      visibility: a.visibility ?? "internal",
      status: a.status ?? "draft",
    });
    setEditing(a);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Título é obrigatório"); return; }
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const slug = form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 80) + "-" + Date.now();
    if (editing) {
      await upsertArticle.mutateAsync({ id: editing.id, title: form.title, content: form.content, summary: form.summary, tags, isPublic: form.visibility === "public", isActive: form.status !== "archived", slug });
    } else {
      await upsertArticle.mutateAsync({ title: form.title, content: form.content, summary: form.summary, tags, isPublic: form.visibility === "public", isActive: form.status !== "archived", slug });
    }
  };

  return (
    <OmniLayout title="Base de Conhecimento">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Base de Conhecimento</h1>
            <p className="text-gray-500 text-sm mt-0.5">Artigos, FAQs e documentação interna para a equipe</p>
          </div>
          <Button onClick={() => { resetForm(); setEditing(null); setShowCreate(true); }} className="gap-2">
            <Plus className="w-4 h-4" />Novo Artigo
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: (articles as any[]).length, bg: "bg-white" },
            { label: "Publicados", value: (articles as any[]).filter((a: any) => a.status === "published").length, bg: "bg-green-50" },
            { label: "Rascunhos", value: (articles as any[]).filter((a: any) => a.status === "draft").length, bg: "bg-gray-50" },
            { label: "Categorias", value: (categories as string[]).length, bg: "bg-blue-50" },
          ].map(s => (
            <div key={s.label} className={cn("rounded-xl border border-gray-200 p-4", s.bg)}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar artigos..." className="pl-9" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">Todas as categorias</option>
            {(categories as string[]).map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Articles grid */}
        {(articles as any[]).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">Nenhum artigo encontrado</p>
            <p className="text-sm mt-1">Crie o primeiro artigo da base de conhecimento</p>
            <Button onClick={() => { resetForm(); setEditing(null); setShowCreate(true); }} className="mt-4 gap-2" variant="outline">
              <Plus className="w-4 h-4" />Criar Artigo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(articles as any[]).map((a: any) => {
              const vc = VISIBILITY_CONFIG[a.visibility] ?? VISIBILITY_CONFIG.internal;
              const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.draft;
              const VIcon = vc.icon;
              return (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", sc.color)}>{sc.label}</span>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", vc.color)}>
                        <VIcon className="w-3 h-3" />{vc.label}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewing(a)} className="p-1.5 rounded-lg hover:bg-gray-100"><Eye className="w-3.5 h-3.5 text-gray-500" /></button>
                      <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                      <button onClick={() => { if (confirm("Remover artigo?")) upsertArticle.mutate({ id: a.id, title: a.title, content: a.content ?? "", slug: a.slug ?? a.title, isActive: false }); }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-blue-600" onClick={() => setViewing(a)}>
                    {a.title}
                  </h3>

                  {a.summary && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{a.summary}</p>}

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {a.category && (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">{a.category}</span>
                      )}
                      {(a.tags as string[] ?? []).slice(0, 2).map((t: string) => (
                        <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {a.viewCount > 0 && <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{a.viewCount}</span>}
                      {a.helpfulCount > 0 && <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{a.helpfulCount}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) { setShowCreate(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {editing ? "Editar Artigo" : "Novo Artigo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Título do artigo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resumo</label>
              <Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Breve descrição do artigo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8} placeholder="Escreva o conteúdo do artigo (suporta Markdown)..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none font-mono" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Atendimento" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibilidade</label>
                <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="internal">Interno</option>
                  <option value="public">Público</option>
                  <option value="restricted">Restrito</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separadas por vírgula)</label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="atendimento, protocolo, sla" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditing(null); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={upsertArticle.isPending} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {editing ? "Salvar Alterações" : "Criar Artigo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Sheet */}
      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {viewing && (
            <>
              <SheetHeader className="px-6 py-4 border-b border-border/60 bg-card/60 sticky top-0 z-10">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-5 h-5 text-primary" />
                  {viewing.title}
                </SheetTitle>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {viewing.category && <Badge variant="outline" className="text-xs">{viewing.category}</Badge>}
                  {(viewing.tags as string[] ?? []).map((t: string) => (
                    <Badge key={t} variant="outline" className="text-xs gap-1"><Tag className="w-2.5 h-2.5" />{t}</Badge>
                  ))}
                </div>
              </SheetHeader>
              <div className="p-6 space-y-4">
                {viewing.summary && <p className="text-sm text-muted-foreground italic">{viewing.summary}</p>}
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">{viewing.content}</pre>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                  <span>Criado em {new Date(viewing.createdAt).toLocaleDateString("pt-BR")}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{viewing.viewCount ?? 0} visualizações</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{viewing.helpfulCount ?? 0} útil</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </OmniLayout>
  );
}
