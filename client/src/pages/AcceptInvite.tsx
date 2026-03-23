import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Building2, CheckCircle, Clock, Loader2, ShieldAlert, UserPlus, XCircle } from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";

const PROFILE_LABELS: Record<string, string> = {
  citizen: "Cidadão",
  attendant: "Atendente",
  sector_server: "Servidor de Setor",
  analyst: "Analista",
  manager: "Gestor",
  authority: "Autoridade",
  admin: "Administrador",
};

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);

  const { data: invite, isLoading, error } = trpc.orgInvites.byToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  const accept = trpc.orgInvites.accept.useMutation({
    onSuccess: () => {
      setAccepted(true);
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Verificando convite...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !invite) {
    const msg = error?.message ?? "Convite não encontrado.";
    const isExpired = msg.toLowerCase().includes("expirou");
    const isCancelled = msg.toLowerCase().includes("cancelado");
    const isAccepted = msg.toLowerCase().includes("já foi aceito");

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {isExpired ? (
              <Clock className="h-12 w-12 text-orange-400 mx-auto" />
            ) : isAccepted ? (
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isExpired ? "Convite Expirado" : isAccepted ? "Convite Já Aceito" : isCancelled ? "Convite Cancelado" : "Convite Inválido"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{msg}</p>
            </div>
            {isAccepted && (
              <Button onClick={() => navigate("/")} className="w-full">
                Acessar o Sistema
              </Button>
            )}
            {!isAccepted && (
              <p className="text-xs text-muted-foreground">
                Entre em contato com o administrador para solicitar um novo convite.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state after accepting
  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-14 w-14 text-green-400 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Convite Aceito!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Sua participação foi confirmada. Você pode agora acessar o sistema com as permissões configuradas.
              </p>
            </div>
            <Button onClick={() => navigate("/")} className="w-full">
              Acessar o Sistema
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accept invite form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Convite de Acesso</h1>
          <p className="text-sm text-muted-foreground">Você foi convidado para integrar o sistema CAIUS</p>
        </div>

        {/* Invite details card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Detalhes do Convite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invite.name && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Convidado</span>
                <span className="font-medium text-foreground">{invite.name}</span>
              </div>
            )}
            {invite.email && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">E-mail</span>
                <span className="font-medium text-foreground">{invite.email}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Perfil de Acesso</span>
              <span className="font-medium text-foreground">
                {PROFILE_LABELS[invite.systemProfile] ?? invite.systemProfile}
              </span>
            </div>
            {invite.expiresAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Válido até</span>
                <span className="font-medium text-foreground">
                  {new Date(invite.expiresAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {invite.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">{invite.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accept form */}
        <Card className="bg-card border-border">
          <CardContent className="pt-5 space-y-4">
            <div>
              <Label htmlFor="name">Confirme seu nome completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="mt-1"
              />
            </div>

            {accept.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{accept.error.message}</p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => accept.mutate({ token: token ?? "", name })}
              disabled={!name.trim() || accept.isPending}
            >
              {accept.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Aceitando convite...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" />Aceitar Convite</>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Ao aceitar, você concorda com os termos de uso do sistema CAIUS e confirma que é o destinatário deste convite.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
