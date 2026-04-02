/**
 * Modal "Novo Atendimento / Nova Conversa"
 *
 * Regras de negócio:
 * - Ao menos UM identificador principal é obrigatório: e-mail, telefone ou Instagram
 * - CPF e CNPJ são opcionais e complementares — nunca substituem o identificador principal
 * - O canal da conversa é determinado pelo identificador principal utilizado
 * - Telefone → WhatsApp; E-mail → E-mail; Instagram → Instagram
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Mail,
  Phone,
  Instagram,
  User,
  FileText,
  AlertCircle,
  CheckCircle2,
  MessageSquarePlus,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface NewConversationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (conversationId: number) => void;
}

type PrimaryChannel = "email" | "whatsapp" | "instagram" | null;

function detectChannel(email?: string, phone?: string, igHandle?: string): PrimaryChannel {
  if (email) return "email";
  if (phone) return "whatsapp";
  if (igHandle) return "instagram";
  return null;
}

function channelLabel(channel: PrimaryChannel): string {
  if (channel === "email") return "E-mail";
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "instagram") return "Instagram";
  return "";
}

function channelColor(channel: PrimaryChannel): string {
  if (channel === "email") return "bg-blue-100 text-blue-800 border-blue-200";
  if (channel === "whatsapp") return "bg-green-100 text-green-800 border-green-200";
  if (channel === "instagram") return "bg-pink-100 text-pink-800 border-pink-200";
  return "";
}

export function NewConversationModal({ open, onClose, onSuccess }: NewConversationModalProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [igHandle, setIgHandle] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [showOptional, setShowOptional] = useState(false);
  const [existingContact, setExistingContact] = useState<any>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Canal detectado automaticamente
  const detectedChannel = detectChannel(
    email.trim() || undefined,
    phone.trim() || undefined,
    igHandle.trim() || undefined
  );

  // Verifica se ao menos um identificador principal foi preenchido
  const hasIdentifier = !!(email.trim() || phone.trim() || igHandle.trim());

  // Busca contas disponíveis para o canal detectado
  const { data: accounts } = trpc.accounts.list.useQuery(undefined, { enabled: open });

  // Filtra contas pelo canal detectado
  // O schema usa 'channel' (não 'type') e 'status' (não 'isActive')
  // Aceita contas connected ou connecting (WhatsApp pode estar em processo de conexão)
  const filteredAccounts = (accounts ?? []).filter((a: any) => {
    const isUsable = a.status === "connected" || a.status === "connecting";
    if (detectedChannel === "email") return a.channel === "email" && isUsable;
    if (detectedChannel === "whatsapp") return a.channel === "whatsapp" && isUsable;
    if (detectedChannel === "instagram") return a.channel === "instagram" && isUsable;
    return false;
  });

  // Busca contato existente com debounce
  const searchContacts = trpc.contacts.list.useQuery(
    { search: email.trim() || phone.trim() || igHandle.trim() },
    { enabled: false }
  );

  // Auto-seleciona conta quando há apenas uma disponível para o canal
  useEffect(() => {
    if (filteredAccounts.length === 1 && !accountId) {
      setAccountId(String(filteredAccounts[0].id));
    } else if (filteredAccounts.length === 0) {
      setAccountId("");
    }
  }, [filteredAccounts.length, detectedChannel]);

  useEffect(() => {
    if (!hasIdentifier) {
      setExistingContact(null);
      return;
    }
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(async () => {
      const result = await searchContacts.refetch();
      const contacts = result.data ?? [];
      const found = contacts.find((c: any) =>
        (email && c.email === email.trim()) ||
        (phone && c.phone === phone.trim()) ||
        (igHandle && c.igHandle === igHandle.trim())
      );
      setExistingContact(found ?? null);
      if (found?.name && !name) setName(found.name);
    }, 500);
    setSearchTimeout(t);
    return () => clearTimeout(t);
  }, [email, phone, igHandle]);

  const findOrCreateContact = trpc.contacts.findOrCreate.useMutation();
  const createConversation = trpc.conversations.create.useMutation();

  const handleSubmit = async () => {
    setError("");

    if (!hasIdentifier) {
      setError("Informe ao menos um identificador de contato: e-mail, telefone ou conta do Instagram.");
      return;
    }

    if (!detectedChannel) {
      setError("Não foi possível determinar o canal de comunicação.");
      return;
    }

    if (!accountId) {
      setError(`Selecione uma conta de ${channelLabel(detectedChannel)} para iniciar o atendimento.`);
      return;
    }

    try {
      // 1. Busca ou cria o contato
      const contact = await findOrCreateContact.mutateAsync({
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        igHandle: igHandle.trim() || undefined,
        cpfCnpj: cpfCnpj.trim() || undefined,
        name: name.trim() || undefined,
      });

      // 2. Cria a conversa vinculada ao contato e ao canal
      const conversation = await createConversation.mutateAsync({
        accountId: parseInt(accountId),
        contactId: contact.id,
        channel: detectedChannel as "email" | "whatsapp" | "instagram",
        subject: subject.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(conversation.id);
        handleClose();
      }, 1200);

    } catch (err: any) {
      setError(err?.message ?? "Erro ao iniciar atendimento. Tente novamente.");
    }
  };

  const handleClose = () => {
    setEmail("");
    setPhone("");
    setIgHandle("");
    setCpfCnpj("");
    setName("");
    setSubject("");
    setAccountId("");
    setShowOptional(false);
    setExistingContact(null);
    setError("");
    setSuccess(false);
    onClose();
  };

  const isLoading = findOrCreateContact.isPending || createConversation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Novo Atendimento
          </DialogTitle>
          <DialogDescription>
            Informe ao menos um identificador de contato para iniciar o atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Indicador de canal detectado */}
          {detectedChannel && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${channelColor(detectedChannel)}`}>
              <CheckCircle2 className="h-4 w-4" />
              Canal detectado: <strong>{channelLabel(detectedChannel)}</strong>
              <span className="text-xs font-normal ml-auto opacity-75">
                {detectedChannel === "whatsapp" && "Conversa iniciada via WhatsApp"}
                {detectedChannel === "email" && "Conversa iniciada via E-mail"}
                {detectedChannel === "instagram" && "Conversa iniciada via Instagram"}
              </span>
            </div>
          )}

          {/* Identificadores principais */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1">
              Identificadores de Contato
              <span className="text-destructive">*</span>
              <span className="text-xs font-normal text-muted-foreground ml-1">(ao menos um obrigatório)</span>
            </p>

            {/* E-mail */}
            <div className="space-y-1">
              <Label htmlFor="nc-email" className="flex items-center gap-1.5 text-sm">
                <Mail className="h-3.5 w-3.5 text-blue-500" />
                E-mail
              </Label>
              <Input
                id="nc-email"
                type="email"
                placeholder="contato@exemplo.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={email && detectedChannel === "email" ? "border-blue-400 ring-1 ring-blue-200" : ""}
              />
            </div>

            {/* Telefone */}
            <div className="space-y-1">
              <Label htmlFor="nc-phone" className="flex items-center gap-1.5 text-sm">
                <Phone className="h-3.5 w-3.5 text-green-500" />
                Telefone / WhatsApp
              </Label>
              <Input
                id="nc-phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={phone && detectedChannel === "whatsapp" ? "border-green-400 ring-1 ring-green-200" : ""}
              />
            </div>

            {/* Instagram */}
            <div className="space-y-1">
              <Label htmlFor="nc-instagram" className="flex items-center gap-1.5 text-sm">
                <Instagram className="h-3.5 w-3.5 text-pink-500" />
                Conta do Instagram
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  id="nc-instagram"
                  type="text"
                  placeholder="usuario"
                  value={igHandle}
                  onChange={(e) => setIgHandle(e.target.value.replace(/^@/, ""))}
                  className={`pl-7 ${igHandle && detectedChannel === "instagram" ? "border-pink-400 ring-1 ring-pink-200" : ""}`}
                />
              </div>
            </div>
          </div>

          {/* Contato existente encontrado */}
          {existingContact && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <Search className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Cadastro encontrado</p>
                <p className="text-amber-700">
                  {existingContact.name ?? "Contato sem nome"} — histórico existente será vinculado.
                </p>
              </div>
            </div>
          )}

          {/* Seleção de conta */}
          {detectedChannel && (
            <div className="space-y-1">
              <Label className="text-sm font-semibold">
                Conta de {channelLabel(detectedChannel)}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              {filteredAccounts.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhuma conta de {channelLabel(detectedChannel)} conectada.
                    Configure em Configurações → Contas.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Selecionar conta ${channelLabel(detectedChannel)}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                              a.status === "connected" ? "bg-green-500" :
                              a.status === "connecting" ? "bg-yellow-500" : "bg-gray-400"
                            }`}
                          />
                          {a.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Assunto */}
          <div className="space-y-1">
            <Label htmlFor="nc-subject" className="text-sm">Assunto <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input
              id="nc-subject"
              placeholder="Descreva brevemente o assunto"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Campos opcionais (CPF/CNPJ, Nome) */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showOptional ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Dados complementares (CPF/CNPJ, Nome)
            </button>
            {showOptional && (
              <div className="mt-3 space-y-3 pl-4 border-l-2 border-muted">
                <p className="text-xs text-muted-foreground">
                  CPF e CNPJ são opcionais. Servem apenas para enriquecer o cadastro, não definem o canal de comunicação.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="nc-name" className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5" />
                    Nome completo
                  </Label>
                  <Input
                    id="nc-name"
                    placeholder="Nome do contato"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nc-cpfcnpj" className="flex items-center gap-1.5 text-sm">
                    <FileText className="h-3.5 w-3.5" />
                    CPF / CNPJ
                    <Badge variant="outline" className="text-xs ml-1">Complementar</Badge>
                  </Label>
                  <Input
                    id="nc-cpfcnpj"
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Sucesso */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Atendimento iniciado com sucesso! Redirecionando...
            </div>
          )}
        </div>

        <Separator />

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasIdentifier || !accountId || isLoading || success}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Iniciando...
              </>
            ) : (
              <>
                <MessageSquarePlus className="h-4 w-4" />
                Iniciar Atendimento
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
