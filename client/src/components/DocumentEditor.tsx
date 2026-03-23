/**
 * DocumentEditor — Editor de documentos administrativos estilo Word
 * Baseado em TipTap com área de folha centralizada, toolbar completa,
 * modo edição/visualização, variáveis dinâmicas, autosave e exportação.
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus,
  Undo, Redo, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Eye, Edit3, Printer, Download,
  Save, ChevronDown, Type, Highlighter, Subscript as SubIcon,
  Superscript as SupIcon, Trash2, Check, X, Variable,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DocumentVariable {
  key: string;   // e.g. "{{nome_interessado}}"
  label: string; // e.g. "Nome do Interessado"
  value?: string;
}

export interface DocumentEditorProps {
  content?: string;
  value?: string;          // alias for content
  onChange?: (html: string) => void;
  onSave?: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  variables?: DocumentVariable[];
  showToolbar?: boolean;
  compact?: boolean;       // inline mode (no page frame)
  autosaveMs?: number;     // 0 = disabled
  minHeight?: string;      // ignored, kept for compat
  className?: string;
}

// ─── Default variables ───────────────────────────────────────────────────────

const DEFAULT_VARIABLES: DocumentVariable[] = [
  { key: "{{nome_interessado}}", label: "Nome do Interessado" },
  { key: "{{nup}}", label: "NUP" },
  { key: "{{data_atual}}", label: "Data Atual" },
  { key: "{{setor}}", label: "Setor" },
  { key: "{{cargo}}", label: "Cargo" },
  { key: "{{responsavel}}", label: "Responsável" },
  { key: "{{numero_documento}}", label: "Número do Documento" },
  { key: "{{assunto}}", label: "Assunto" },
  { key: "{{secretaria}}", label: "Secretaria" },
  { key: "{{usuario_logado}}", label: "Usuário Logado" },
  { key: "{{unidade_organizacional}}", label: "Unidade Organizacional" },
];

// ─── Toolbar button helper ────────────────────────────────────────────────────

function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            disabled={disabled}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              active && "bg-accent text-accent-foreground font-semibold"
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5 flex-shrink-0" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DocumentEditor({
  content,
  value,
  onChange,
  onSave,
  placeholder = "Digite o conteúdo do documento...",
  readOnly = false,
  variables,
  showToolbar = true,
  compact = false,
  autosaveMs = 0,
  className,
}: DocumentEditorProps) {
  // Support `value` as alias for `content`
  const resolvedContent = value ?? content ?? "";
  const [mode, setMode] = useState<"edit" | "view">(readOnly ? "view" : "edit");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [saved, setSaved] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vars = variables ?? DEFAULT_VARIABLES;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ HTMLAttributes: { class: "max-w-full rounded" } }),
      Subscript,
      Superscript,
    ],
    content,
    editable: mode === "edit",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      if (autosaveMs > 0) {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
          onSave?.(html);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }, autosaveMs);
      }
    },
  });

  // Sync content prop
  useEffect(() => {
    if (editor && resolvedContent !== editor.getHTML()) {
      editor.commands.setContent(resolvedContent || "");
    }
  }, [resolvedContent]);

  // Sync editable mode
  useEffect(() => {
    if (editor) editor.setEditable(mode === "edit");
  }, [mode, editor]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    onSave?.(editor.getHTML());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editor, onSave]);

  const handlePrint = useCallback(() => {
    const html = editor?.getHTML() ?? "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Documento</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 2.5cm; color: #000; }
        h1 { font-size: 16pt; } h2 { font-size: 14pt; } h3 { font-size: 13pt; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #000; padding: 4px 8px; }
        @media print { body { margin: 2cm; } }
      </style>
    </head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  }, [editor]);

  const handleExportHtml = useCallback(() => {
    if (!editor) return;
    const blob = new Blob([editor.getHTML()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documento.html";
    a.click();
    URL.revokeObjectURL(url);
  }, [editor]);

  const insertVariable = useCallback((varKey: string) => {
    editor?.chain().focus().insertContent(varKey).run();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!linkUrl) {
      editor?.chain().focus().unsetLink().run();
    } else {
      editor?.chain().focus().setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  const isEdit = mode === "edit";

  // ─── Toolbar ────────────────────────────────────────────────────────────────
  const toolbar = showToolbar && (
    <div className="border-b border-border bg-card sticky top-0 z-10">
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        {/* Undo / Redo */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer (Ctrl+Z)">
          <Undo className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer (Ctrl+Y)">
          <Redo className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Heading style */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-1 h-7 px-2 rounded text-xs hover:bg-accent transition-colors">
              <Type className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {editor.isActive("heading", { level: 1 }) ? "Título 1"
                  : editor.isActive("heading", { level: 2 }) ? "Título 2"
                  : editor.isActive("heading", { level: 3 }) ? "Título 3"
                  : editor.isActive("heading", { level: 4 }) ? "Título 4"
                  : "Parágrafo"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => editor.chain().focus().setParagraph().run()}>
              <span className="text-sm">Parágrafo</span>
            </DropdownMenuItem>
            {([1, 2, 3, 4] as const).map(l => (
              <DropdownMenuItem key={l} onSelect={() => editor.chain().focus().toggleHeading({ level: l }).run()}>
                <span className={`font-bold text-${l === 1 ? "xl" : l === 2 ? "lg" : l === 3 ? "base" : "sm"}`}>Título {l}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Divider />

        {/* Text formatting */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado (Ctrl+U)">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} title="Subscrito">
          <SubIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} title="Sobrescrito">
          <SupIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Color */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent cursor-pointer transition-colors relative">
                <Type className="h-3.5 w-3.5" />
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  onChange={e => editor.chain().focus().setColor(e.target.value).run()}
                />
              </label>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Cor do Texto</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent cursor-pointer transition-colors relative">
                <Highlighter className="h-3.5 w-3.5" />
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  onChange={e => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
                />
              </label>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Cor de Destaque</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Divider />

        {/* Alignment */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinhar à Esquerda">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinhar à Direita">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justificar">
          <AlignJustify className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista com Marcadores">
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista Numerada">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação">
          <Quote className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha Horizontal">
          <Minus className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />

        {/* Insert */}
        <ToolBtn
          onClick={() => setShowLinkInput(v => !v)}
          active={editor.isActive("link") || showLinkInput}
          title="Inserir Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={insertTable} title="Inserir Tabela">
          <TableIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent cursor-pointer transition-colors">
                <ImageIcon className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const src = ev.target?.result as string;
                      editor.chain().focus().setImage({ src }).run();
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Inserir Imagem</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Variables */}
        {vars.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-1 h-7 px-2 rounded text-xs hover:bg-accent transition-colors">
                <Variable className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Variáveis</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto">
              {vars.map(v => (
                <DropdownMenuItem key={v.key} onSelect={() => insertVariable(v.key)}>
                  <div>
                    <p className="text-sm font-medium">{v.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{v.key}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Divider />

        {/* Mode toggle */}
        <ToolBtn onClick={() => setMode(m => m === "edit" ? "view" : "edit")} active={mode === "view"} title={mode === "edit" ? "Modo Visualização" : "Modo Edição"}>
          {mode === "edit" ? <Eye className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
        </ToolBtn>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1">
          {saved && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-200 gap-1">
              <Check className="h-3 w-3" />Salvo
            </Badge>
          )}
          {onSave && (
            <ToolBtn onClick={handleSave} title="Salvar (Ctrl+S)">
              <Save className="h-3.5 w-3.5" />
            </ToolBtn>
          )}
          <ToolBtn onClick={handlePrint} title="Imprimir">
            <Printer className="h-3.5 w-3.5" />
          </ToolBtn>
          <ToolBtn onClick={handleExportHtml} title="Exportar HTML">
            <Download className="h-3.5 w-3.5" />
          </ToolBtn>
        </div>
      </div>

      {/* Link input row */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border bg-muted/30">
          <LinkIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Input
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="h-7 text-sm flex-1"
            onKeyDown={e => { if (e.key === "Enter") setLink(); if (e.key === "Escape") setShowLinkInput(false); }}
            autoFocus
          />
          <button type="button" onClick={setLink} className="h-7 w-7 flex items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/90">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setShowLinkInput(false)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  // ─── Page frame ──────────────────────────────────────────────────────────────
  const editorContent = (
    <EditorContent
      editor={editor}
      className={cn(
        "prose prose-sm max-w-none focus:outline-none",
        "prose-headings:font-bold prose-headings:text-foreground",
        "prose-p:text-foreground prose-p:leading-relaxed",
        "prose-strong:text-foreground prose-em:text-foreground",
        "prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:pl-4 prose-blockquote:text-muted-foreground",
        "prose-table:border-collapse prose-td:border prose-td:border-border prose-td:p-2 prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted",
        "prose-img:rounded prose-img:max-w-full",
        "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]",
        mode === "view" && "pointer-events-none select-text"
      )}
    />
  );

  if (compact) {
    return (
      <div className={cn("border border-border rounded-lg overflow-hidden bg-card", className)}>
        {toolbar}
        {/* A4 page frame even in compact mode */}
        <div className="bg-muted/20 py-4 px-2 overflow-x-auto">
          <div
            className={cn(
              "mx-auto bg-white dark:bg-card shadow border border-border",
              "w-[210mm] min-h-[297mm]",
              "px-[2.5cm] py-[2.5cm]"
            )}
          >
            {editorContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-muted/20", className)}>
      {toolbar}
      {/* Page area */}
      <div className="flex-1 overflow-y-auto py-8 px-4">
        <div
          className={cn(
            "mx-auto bg-white dark:bg-card shadow-md border border-border",
            "min-h-[297mm] w-[210mm]",
            "px-[2.5cm] py-[2.5cm]",
            mode === "view" && "shadow-lg"
          )}
        >
          {editorContent}
        </div>
      </div>
    </div>
  );
}
