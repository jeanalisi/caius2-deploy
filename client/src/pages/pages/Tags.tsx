import OmniLayout from "@/components/OmniLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#a16207",
];

export default function Tags() {
  const utils = trpc.useUtils();
  const { data: tags, isLoading } = trpc.tags.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#6366f1" });

  const create = trpc.tags.create.useMutation({
    onSuccess: () => {
      utils.tags.list.invalidate();
      toast.success("Tag criada!");
      setCreateOpen(false);
      setForm({ name: "", color: "#6366f1" });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.tags.delete.useMutation({
    onSuccess: () => { utils.tags.list.invalidate(); toast.success("Tag removida"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <OmniLayout title="Tags">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Organize conversas com etiquetas coloridas</p>
          <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nova Tag
          </Button>
        </div>

        <Card className="border-border bg-card/50">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !tags || tags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Tag className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma tag criada ainda</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 rounded-full border px-3 py-1.5 bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                    style={{ borderColor: `${tag.color}40` }}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ background: tag.color }} />
                    <span className="text-sm font-medium text-foreground">{tag.name}</span>
                    <button
                      onClick={() => remove.mutate({ id: tag.id })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input
                placeholder="Ex: Urgente, VIP, Suporte..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    className="h-7 w-7 rounded-full border-2 transition-all"
                    style={{
                      background: color,
                      borderColor: form.color === color ? "white" : "transparent",
                      transform: form.color === color ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
            {form.name && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Pré-visualização:</span>
                <div
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1"
                  style={{ borderColor: `${form.color}40`, background: `${form.color}15` }}
                >
                  <div className="h-2 w-2 rounded-full" style={{ background: form.color }} />
                  <span className="text-xs font-medium" style={{ color: form.color }}>{form.name}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!form.name) { toast.error("Informe o nome da tag"); return; }
                create.mutate({ name: form.name, color: form.color });
              }}
              disabled={create.isPending}
              className="gap-2"
            >
              {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Criar Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OmniLayout>
  );
}
