import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  FormInput,
  GitBranch,
  Globe,
  HelpCircle,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Library,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Moon,
  Paperclip,
  PenLine,
  Scale,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
  Ticket,
  TrendingUp,
  Upload,
  Users,
  Wifi,
  Workflow,
  Bot,
  MailOpen,
  Settings,
  Hash,
  ListOrdered,
  BookMarked,
  ExternalLink,
} from "lucide-react";
import React, { useState, useRef, createContext, useContext, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useOrgConfig } from "@/hooks/useOrgConfig";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";
import GlobalSearchResults from "./GlobalSearchResults";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

// ─── Navigation groups ────────────────────────────────────────────────────────
const atendimentoItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inbox", icon: Inbox, label: "Inbox Unificado" },
  { href: "/conversations", icon: MessageSquare, label: "Conversas" },
  { href: "/tickets", icon: Ticket, label: "Tickets" },
  { href: "/queue", icon: Users, label: "Fila de Atendimento" },
];

const caiusItems = [
  { href: "/protocols", icon: ClipboardList, label: "Protocolos (NUP)" },
  { href: "/processes", icon: Scale, label: "Processos Adm." },
  { href: "/documents", icon: FileText, label: "Documentos Oficiais" },
  { href: "/document-signatures", icon: Shield, label: "Assinaturas Digitais" },
  { href: "/sign-external-pdf", icon: Upload, label: "Assinar PDF Externo" },
  { href: "/ombudsman", icon: BookOpen, label: "Ouvidoria" },
  { href: "/templates", icon: PenLine, label: "Modelos de Documentos" },
  { href: "/executive-dashboard", icon: TrendingUp, label: "Dashboard Executivo" },
  { href: "/ouvidoria-admin", icon: Globe, label: "Ouvidoria / e-SIC" },
  { href: "/geo-monitor", icon: MapPin, label: "Geo Monitor" },
  { href: "/knowledge-base", icon: Library, label: "Base de Conhecimento" },
];

const channelItems = [
  { href: "/channel-health", icon: Activity, label: "Saúde dos Canais" },
  { href: "/email-institucional", icon: MailOpen, label: "E-mail Institucional" },
  { href: "/chatbot", icon: Bot, label: "Chatbot WhatsApp" },
  { href: "/bulk-campaigns", icon: Upload, label: "Envio em Massa WhatsApp" },
  { href: "/atendimento", icon: MessageSquare, label: "Webchat Cidadão" },
  { href: "/caius", icon: Sparkles, label: "cAIus — Agente de IA" },
  { href: "/caius-config", icon: Settings, label: "Configurações do cAIus" },
];

const controleItems = [
  { href: "/controle", icon: Hash, label: "Dashboard" },
  { href: "/controle/emitir", icon: ListOrdered, label: "Emitir Número" },
  { href: "/controle/configuracao", icon: Settings, label: "Configuração" },
  { href: "/controle/unidades", icon: Building2, label: "Unidades" },
  { href: "/controle/historico", icon: BookMarked, label: "Histórico" },
  { href: "/controle/auditoria", icon: ShieldCheck, label: "Auditoria" },
];

const adminItems = [
  { href: "/workflow", icon: Workflow, label: "Fluxos" },
  { href: "/accounts", icon: Wifi, label: "Contas Conectadas" },
  { href: "/agents", icon: Users, label: "Agentes e Usuários" },
  { href: "/org-structure", icon: Building2, label: "Estrutura Org." },
  { href: "/reports", icon: BarChart3, label: "Relatórios" },
  { href: "/audit", icon: ShieldCheck, label: "Auditoria" },
  { href: "/ai-settings", icon: Sparkles, label: "Integrações de IA" },
  { href: "/tags", icon: Tag, label: "Tags" },
];

const advancedItems = [
  { href: "/service-types", icon: Settings2, label: "Tipos de Atendimento" },
  { href: "/form-builder", icon: FormInput, label: "Construtor de Formulários" },
  { href: "/attachments", icon: Paperclip, label: "Gestão de Anexos" },
  { href: "/institutional", icon: Building2, label: "Config. Institucional" },
  { href: "/online-sessions", icon: Monitor, label: "Sessões Online" },
  { href: "/context-help", icon: HelpCircle, label: "Ajuda Contextual" },
];

const orgItems = [
  { href: "/org-structure", icon: GitBranch, label: "Estrutura Organizacional" },
  { href: "/positions", icon: Briefcase, label: "Cargos e Funções" },
  { href: "/org-invites", icon: Mail, label: "Convites e Lotações" },
];

interface OmniLayoutProps {
  children: React.ReactNode;
  title?: string;
  fullHeight?: boolean;
}

function NavItem({ href, icon: Icon, label, isActive }: { href: string; icon: any; label: string; isActive: boolean }) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 cursor-pointer",
          isActive
            ? "bg-primary/15 text-primary font-medium border border-primary/20"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/50")} />
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );
}

// ─── Accordion context: only one NavGroup open at a time ─────────────────────
const NavAccordionContext = createContext<{
  openGroup: string | null;
  setOpenGroup: (label: string | null) => void;
}>({ openGroup: null, setOpenGroup: () => {} });

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { openGroup, setOpenGroup } = useContext(NavAccordionContext);
  const open = openGroup === label;
  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpenGroup(open ? null : label)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors rounded-md hover:bg-sidebar-accent/30"
      >
        {label}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

// ─── Login page (institutional, 2-column layout) ─────────────────────────────
function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const loginUrl = getLoginUrl();
  const orgConfig = useOrgConfig();

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* ── Left column: institutional image ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-indigo-900/70 z-10" />
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoLTZ2LTZoNnptMC0zMHY2aC02VjRoNnptLTMwIDMwdjZINFYzNGg2em0wLTMwdjZINFY0aDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] z-0" />
        {/* City/government illustration using CSS */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-950" />
        {/* Decorative circles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-400/10 blur-3xl z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-indigo-400/10 blur-3xl z-0" />
        {/* Content overlay */}
        <div className="relative z-20 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {orgConfig.logoUrl ? (
              <img
                src={orgConfig.logoUrl}
                alt={orgConfig.orgName}
                className="h-10 w-10 rounded-xl object-contain bg-white/10 border border-white/30 p-1"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                <Scale className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <span className="text-xl font-bold text-white tracking-tight">{orgConfig.orgName}</span>
              <p className="text-xs text-blue-200/80">{orgConfig.platformName}</p>
            </div>
          </div>
          {/* Main content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs text-blue-100 backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Plataforma Institucional Certificada
              </div>
              <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
                Gestão Pública<br />
                <span className="text-blue-300">Inteligente</span>
              </h1>
              <p className="text-blue-100/80 text-lg leading-relaxed max-w-md">
                Centralize atendimentos, protocolos digitais, tramitação interna e ouvidoria em uma única plataforma omnichannel.
              </p>
            </div>
            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {[
                { icon: MessageSquare, label: "Inbox Unificado", desc: "WhatsApp, Instagram, E-mail" },
                { icon: ClipboardList, label: "Protocolo Digital", desc: "NUP automático" },
                { icon: GitBranch, label: "Estrutura Org.", desc: "Hierarquia completa" },
                { icon: ShieldCheck, label: "Auditoria", desc: "Trilha completa" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-2.5 rounded-xl border border-white/15 bg-white/8 backdrop-blur-sm p-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-400/20">
                    <Icon className="h-3.5 w-3.5 text-blue-200" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{label}</p>
                    <p className="text-[11px] text-blue-200/70">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Footer */}
          <p className="text-xs text-blue-200/40">
            Município de Itabaiana &mdash; Powered by CAIUS &mdash; Versão 2025
          </p>
        </div>
      </div>

      {/* ── Right column: authentication card ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-8 overflow-y-auto">
        {/* Mobile logo */}
        <div className="mb-6 flex flex-col items-center gap-2 lg:hidden">
          {orgConfig.logoUrl ? (
            <img
              src={orgConfig.logoUrl}
              alt={orgConfig.orgName}
              className="h-14 w-14 rounded-2xl object-contain shadow-lg"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 shadow-lg">
              <Scale className="h-7 w-7 text-white" />
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">{orgConfig.orgName}</h1>
            <p className="text-xs text-gray-500">{orgConfig.platformName}</p>
          </div>
        </div>

        {/* Auth card */}
        <div className="w-full max-w-[400px] rounded-2xl bg-white shadow-xl border border-gray-100 p-8">
          {/* Card header */}
          <div className="mb-6 space-y-1">
            <div className="hidden lg:flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700">
                <Scale className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <span className="text-base font-bold text-gray-900">CAIUS</span>
                <p className="text-[11px] text-gray-400">Plataforma Omnichannel</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h2>
            <p className="text-sm text-gray-500">Acesse sua conta para continuar</p>
          </div>

          {/* Email field (visual only — auth is via OAuth) */}
          <div className="space-y-3 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">E-mail institucional</label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                <Mail className="h-4 w-4 shrink-0 text-gray-300" />
                <span>usuario@municipio.gov.br</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Senha</label>
                <a href={loginUrl} className="text-xs text-blue-600 hover:text-blue-700 hover:underline">
                  Esqueci a senha
                </a>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                <KeyRound className="h-4 w-4 shrink-0 text-gray-300" />
                <span className="flex-1">••••••••</span>
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-300 hover:text-gray-400">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Primary login button */}
          <a href={loginUrl} className="block mb-4">
            <button className="w-full rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition-all hover:bg-blue-800 hover:shadow-blue-700/30 hover:shadow-lg active:scale-[0.98]">
              Entrar
            </button>
          </a>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">Ou continuar com</span>
            </div>
          </div>

          {/* OAuth options */}
          <div className="space-y-2.5 mb-5">
            <a href={loginUrl} className="block">
              <button className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Entrar com Google
              </button>
            </a>
            <a href={loginUrl} className="block">
              <button className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm">
                <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
                Entrar com conta institucional
              </button>
            </a>
            <a href={loginUrl} className="block">
              <button className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm">
                <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" />
                Entrar com certificado digital
              </button>
            </a>
          </div>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">acesso público</span>
            </div>
          </div>

          {/* Public access */}
          <div className="space-y-2">
            <Link href="/central-cidadao">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700 transition-all hover:bg-blue-100 hover:border-blue-200">
                <Building2 className="h-4 w-4" />
                Central de Serviços ao Cidadão
              </button>
            </Link>
            <Link href="/consulta">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-5 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100">
                <ClipboardList className="h-4 w-4" />
                Consultar protocolo por NUP
              </button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-[11px] text-gray-400 leading-relaxed">
          Ao acessar, você concorda com os termos de uso da plataforma.<br />
          Acesso restrito a servidores e colaboradores autorizados.
        </p>
        <p className="mt-1 text-center text-[10px] text-gray-300">
          Município de Itabaiana &mdash; Powered by CAIUS
        </p>
      </div>
    </div>
  );
}

export default function OmniLayout({ children, title, fullHeight }: OmniLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const orgConfig = useOrgConfig();
  const [location] = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Determine which group contains the active route
  function getActiveGroup(loc: string): string | null {
    if (atendimentoItems.some(i => loc === i.href || (i.href !== "/" && loc.startsWith(i.href)))) return "Atendimento";
    if (caiusItems.some(i => loc === i.href || (i.href !== "/" && loc.startsWith(i.href)))) return "Gestão Pública";
    if (channelItems.some(i => loc === i.href || (i.href !== "/" && loc.startsWith(i.href)))) return "Canais";
    if (adminItems.some(i => loc === i.href || (i.href !== "/" && loc.startsWith(i.href)))) return "Administração";
    if (advancedItems.some(i => loc === i.href || (i.href !== "/" && loc.startsWith(i.href)))) return "Configurações";
    if (orgItems.some(i => loc === i.href || (i.href !== "/" && loc.startsWith(i.href)))) return "Estrutura Org.";
    return "Atendimento"; // default
  }
  const [openGroup, setOpenGroup] = useState<string | null>(() => getActiveGroup(location));
  useEffect(() => {
    setOpenGroup(prev => prev ?? getActiveGroup(location));
  }, [location]);
  const { resolvedTheme, toggleTheme } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: notifications } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Permissões de menu: admins têm acesso total; demais usuários seguem a tabela
  const { data: menuPerms } = trpc.users.getMyMenuPermissions.useQuery(undefined, {
    enabled: isAuthenticated && user?.role !== "admin",
  });

  // Retorna true se o item deve aparecer no menu
  const canSeeItem = (href: string): boolean => {
    if (user?.role === "admin") return true;
    if (!menuPerms) return true; // enquanto carrega, mostra tudo
    if (href in menuPerms) return (menuPerms as Record<string, boolean>)[href];
    return true; // padrão = visível
  };

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const markRead = trpc.notifications.markRead.useMutation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando CAIUS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <NavAccordionContext.Provider value={{ openGroup, setOpenGroup }}>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* ── Sidebar lateral expandido ── */}
        <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          {/* Logo + nome */}
          <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
            <Link href="/dashboard">
              {orgConfig.logoUrl ? (
                <img
                  src={orgConfig.logoUrl}
                  alt={orgConfig.orgName}
                  className="h-8 w-8 shrink-0 rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/30 cursor-pointer hover:opacity-90 transition-opacity">
                  <Scale className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </Link>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">{orgConfig.orgName}</span>
              <span className="text-[10px] text-sidebar-foreground/40">{orgConfig.platformName}</span>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="space-y-4">
              {atendimentoItems.filter(i => canSeeItem(i.href)).length > 0 && (
                <NavGroup label="Atendimento">
                  {atendimentoItems.filter(i => canSeeItem(i.href)).map((item) => (
                    <NavItem key={item.href} {...item} isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))} />
                  ))}
                </NavGroup>
              )}

              {caiusItems.filter(i => canSeeItem(i.href)).length > 0 && (
                <NavGroup label="Gestão Pública">
                  {caiusItems.filter(i => canSeeItem(i.href)).map((item) => (
                    <NavItem key={item.href} {...item} isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))} />
                  ))}
                </NavGroup>
              )}

              {channelItems.filter(i => canSeeItem(i.href)).length > 0 && (
                <NavGroup label="Canais">
                  {channelItems.filter(i => canSeeItem(i.href)).map((item) => (
                    <NavItem key={item.href} {...item} isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))} />
                  ))}
                </NavGroup>
              )}

              {controleItems.filter(i => canSeeItem(i.href)).length > 0 && (
                <NavGroup label="Controle">
                  {controleItems.filter(i => canSeeItem(i.href)).map((item) => (
                    <NavItem key={item.href} {...item} isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))} />
                  ))}
                </NavGroup>
              )}

              {user?.role === "admin" && (
                <>
                  <NavGroup label="Administração">
                    {adminItems.map((item) => (
                      <NavItem key={item.href} {...item} isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))} />
                    ))}
                  </NavGroup>

                  <NavGroup label="Configurações">
                    {advancedItems.map((item) => (
                      <NavItem key={item.href} {...item} isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))} />
                    ))}
                  </NavGroup>

                  <NavGroup label="Estrutura Org.">
                    {orgItems.map((item) => (
                      <NavItem key={item.href} {...item} isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))} />
                    ))}
                  </NavGroup>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Footer do sidebar */}
          <div className="border-t border-sidebar-border p-3 space-y-1">
            <Link href="/consulta">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all cursor-pointer">
                <ClipboardList className="h-4 w-4 shrink-0" />
                <span className="truncate">Consulta Pública NUP</span>
              </div>
            </Link>
            <Link href="/central-cidadao">
              <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all cursor-pointer">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">Central do Cidadão</span>
              </div>
            </Link>
          </div>
        </aside>

        {/* ── Área principal ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* ── Barra superior ── */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 gap-3">
            {/* Título da página */}
            <h1 className="text-sm font-semibold text-foreground truncate">
              {title ?? "CAIUS — Plataforma Omnichannel"}
            </h1>

            {/* Ações do header */}
            <div className="flex items-center gap-1">
              {/* Busca global */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSearchOpen(!searchOpen)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Pesquisa Global</TooltipContent>
              </Tooltip>

              {/* Toggle tema */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                  >
                    {resolvedTheme === "dark"
                      ? <Sun className="h-4 w-4" />
                      : <Moon className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {resolvedTheme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </TooltipContent>
              </Tooltip>

              {/* Notificações */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setNotifOpen(!notifOpen);
                      if (unreadCount > 0) markRead.mutate();
                    }}
                    className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Notificações</TooltipContent>
              </Tooltip>

              {/* Avatar / menu usuário */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent transition-all ml-1">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                        {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-xs font-medium text-foreground max-w-[100px] truncate">{user?.name}</span>
                      <Badge variant="outline" className="text-[9px] capitalize h-3.5 px-1">{user?.role}</Badge>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <div className="flex gap-1.5 mt-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">{user?.role}</Badge>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive gap-2">
                    <LogOut className="h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Conteúdo principal */}
          <main className={fullHeight ? "flex-1 overflow-hidden" : "flex-1 overflow-auto scrollbar-thin"}>
            {children}
          </main>
        </div>

        {/* ── Painel de pesquisa global ── */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40 backdrop-blur-sm" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
            <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  ref={searchRef}
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar protocolos, conversas, contatos..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded hover:bg-accent">
                  Esc
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-auto">
                {!searchQuery && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Digite para pesquisar</p>
                    <p className="text-xs text-muted-foreground/60">Protocolos, conversas, contatos, documentos</p>
                  </div>
                )}
                {searchQuery && searchQuery.length >= 2 && (
                  <GlobalSearchResults query={searchQuery} onClose={() => { setSearchOpen(false); setSearchQuery(""); }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Painel de notificações ── */}
        {notifOpen && (
          <div className="fixed right-0 top-0 z-50 h-full w-80 border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 h-14">
              <h2 className="text-sm font-semibold">Notificações</h2>
              <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground text-xs px-2 py-1 rounded hover:bg-accent">
                Fechar
              </button>
            </div>
            <ScrollArea className="h-[calc(100%-3.5rem)]">
              {!notifications?.length ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Bell className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications?.map((n) => {
                    const isDocNotif = n.type === "document_received";
                    const relatedDocId = (n as any).relatedDocumentId as number | undefined;
                    const NotifIcon = isDocNotif ? FileText : Bell;
                    const iconColor = isDocNotif ? "text-blue-500" : "text-primary/60";
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "px-4 py-3 transition-colors group",
                          !n.isRead && "bg-primary/5",
                          isDocNotif && relatedDocId && "cursor-pointer hover:bg-accent/60"
                        )}
                        onClick={() => {
                          if (isDocNotif && relatedDocId) {
                            setNotifOpen(false);
                            window.location.href = `/documents?highlight=${relatedDocId}`;
                          }
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={cn("mt-0.5 flex-shrink-0 p-1 rounded-md", isDocNotif ? "bg-blue-500/10" : "bg-primary/10")}>
                            <NotifIcon className={cn("h-3.5 w-3.5", iconColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-sm font-medium text-foreground leading-snug flex-1 min-w-0">{n.title}</p>
                              {isDocNotif && relatedDocId && (
                                <ExternalLink className="h-3 w-3 text-muted-foreground/40 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                            {n.body && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>}
                            {(n as any).nup && (
                              <p className="text-[10px] text-primary/70 mt-0.5 font-mono">NUP: {(n as any).nup}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground/50 mt-1">
                              {new Date(n.createdAt).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </NavAccordionContext.Provider>
  );
}
