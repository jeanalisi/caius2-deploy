import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ClipboardList, MessageSquare, User, FileText, Loader2 } from "lucide-react";

interface GlobalSearchResultsProps {
  query: string;
  onClose: () => void;
}

const typeIcons: Record<string, any> = {
  protocol: ClipboardList,
  conversation: MessageSquare,
  contact: User,
  document: FileText,
};

const typeLabels: Record<string, string> = {
  protocol: "Protocolo",
  conversation: "Conversa",
  contact: "Contato",
  document: "Documento",
};

const typeRoutes: Record<string, (id: number) => string> = {
  protocol: (id) => `/protocols/${id}`,
  conversation: (id) => `/inbox`,
  contact: (id) => `/conversations`,
  document: (id) => `/documents`,
};

export default function GlobalSearchResults({ query, onClose }: GlobalSearchResultsProps) {
  const [, navigate] = useLocation();

  const { data: results = [], isLoading } = trpc.globalSearch.search.useQuery(
    { query, limit: 20 },
    { enabled: query.length >= 2 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nenhum resultado para "{query}"</p>
      </div>
    );
  }

  // Group by type
  const grouped = results.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.entityType]) acc[item.entityType] = [];
    acc[item.entityType].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, items]) => {
        const Icon = typeIcons[type] ?? FileText;
        const label = typeLabels[type] ?? type;
        return (
          <div key={type}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Icon className="w-3 h-3" /> {label}s
            </p>
            <div className="space-y-1">
              {(items as any[]).map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(typeRoutes[type]?.(item.entityId) ?? "/");
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </p>
                  {item.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.snippet}</p>
                  )}
                  {item.nup && (
                    <p className="text-xs text-primary/70 font-mono mt-0.5">NUP: {item.nup}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
