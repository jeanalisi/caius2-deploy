import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, Clock, DollarSign, Users, Building2,
  MessageSquare, Info, FileText, Shield, Globe, AlertCircle, Copy,
  Camera, MapPin, Loader2,
} from "lucide-react";
import { useRef, useState as useStateAlias } from "react";

const REQUEST_TYPES = [
  { value: "request", label: "Requerimento" },
  { value: "complaint", label: "Reclamação" },
  { value: "information", label: "Solicitação de Informação" },
  { value: "suggestion", label: "Sugestão" },
  { value: "praise", label: "Elogio" },
  { value: "ombudsman", label: "Ouvidoria" },
  { value: "esic", label: "e-SIC (Acesso à Informação)" },
];

function SelfieField({ label, value, onChange, isRequired, helpText }: { label: string; value: any; onChange: (v: any) => void; isRequired: boolean; helpText?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useStateAlias<MediaStream | null>(null);
  const [capturing, setCapturing] = useStateAlias(false);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(s);
      setCapturing(true);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch {
      alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.85);
    onChange(dataUrl);
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCapturing(false);
  };

  const retake = () => { onChange(null); };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}{isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {value ? (
        <div className="space-y-2">
          <img src={value} alt="Selfie" className="w-40 h-40 object-cover rounded-xl border border-gray-200 mx-auto block" />
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={retake}>
            <Camera className="h-4 w-4 mr-2" />Tirar Novamente
          </Button>
        </div>
      ) : capturing ? (
        <div className="space-y-2">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl border border-gray-200 max-h-48 object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <Button type="button" className="w-full" onClick={capture}>
            <Camera className="h-4 w-4 mr-2" />Capturar Foto
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full h-24 flex-col gap-2 border-dashed" onClick={startCamera}>
          <Camera className="h-8 w-8 text-gray-400" />
          <span className="text-sm text-gray-500">Clique para abrir a câmera</span>
        </Button>
      )}
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
    </div>
  );
}

function GeoField({ label, value, onChange, isRequired, helpText }: { label: string; value: any; onChange: (v: any) => void; isRequired: boolean; helpText?: string }) {
  const [loading, setLoading] = useStateAlias(false);
  const coords = value as { lat: number; lng: number; address?: string } | null;

  const getLocation = () => {
    if (!navigator.geolocation) { alert("Geolocalização não suportada neste navegador."); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          if (data.display_name) address = data.display_name;
        } catch { }
        onChange({ lat, lng, address });
        setLoading(false);
      },
      () => { alert("Não foi possível obter a localização. Verifique as permissões."); setLoading(false); }
    );
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}{isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {coords ? (
        <div className="p-3 rounded-lg border border-green-200 bg-green-50 space-y-1">
          <div className="flex items-center gap-2 text-green-700">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">Localização capturada</span>
          </div>
          <p className="text-xs text-green-600 break-all">{coords.address}</p>
          <p className="text-xs text-gray-400 font-mono">{coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>
          <Button type="button" variant="outline" size="sm" className="mt-1" onClick={() => onChange(null)}>
            Alterar Localização
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full h-16 flex-col gap-1 border-dashed" onClick={getLocation} disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <MapPin className="h-5 w-5 text-gray-400" />}
          <span className="text-sm text-gray-500">{loading ? "Obtendo localização..." : "Clique para capturar minha localização"}</span>
        </Button>
      )}
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
    </div>
  );
}

function DynamicField({ field, value, onChange }: { field: any; value: any; onChange: (v: any) => void }) {
  const { fieldType, label, placeholder, helpText, requirement } = field;
  const isRequired = requirement === "required";

  const labelEl = (
    <Label className="text-sm font-medium text-gray-700">
      {label}{isRequired && <span className="text-red-500 ml-1">*</span>}
    </Label>
  );

  // Special field types
  if (fieldType === "selfie" || fieldType === "photo") {
    return <SelfieField label={label} value={value} onChange={onChange} isRequired={isRequired} helpText={helpText} />;
  }
  if (fieldType === "georreferenciamento" || fieldType === "geolocation" || fieldType === "location") {
    return <GeoField label={label} value={value} onChange={onChange} isRequired={isRequired} helpText={helpText} />;
  }

  let input;
  if (fieldType === "textarea") {
    input = <Textarea value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? ""} rows={3} className="bg-white border-gray-200" />;
  } else if (fieldType === "select" || fieldType === "radio") {
    input = (
      <Select value={value || "__none__"} onValueChange={v => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger className="bg-white border-gray-200"><SelectValue placeholder={placeholder ?? "Selecione..."} /></SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((opt: string) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (fieldType === "checkbox") {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white">
        <div>
          <Label className="text-sm font-medium text-gray-700">{label}</Label>
          {helpText && <p className="text-xs text-gray-500 mt-0.5">{helpText}</p>}
        </div>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    );
  } else {
    const inputType = fieldType === "email" ? "email" : fieldType === "number" ? "number" : fieldType === "date" ? "date" : "text";
    input = <Input type={inputType} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? ""} className="bg-white border-gray-200" />;
  }

  return (
    <div className="space-y-1.5">
      {labelEl}
      {input}
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
    </div>
  );
}

export default function ServicoDetalhe() {
  const [, params] = useRoute("/servico/:id");
  const [, navigate] = useLocation();
  const serviceId = params?.id ? Number(params.id) : null;

  const { data: service, isLoading } = trpc.cidadao.getService.useQuery(
    { id: serviceId! },
    { enabled: !!serviceId }
  );

  const [step, setStep] = useState<"info" | "form" | "success">("info");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterCpf, setRequesterCpf] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState("request");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [nupResult, setNupResult] = useState("");

  const submitMutation = trpc.cidadao.submitRequest.useMutation({
    onSuccess: (data) => {
      setNupResult(typeof data.nup === "string" ? data.nup : (data as any).nup ?? "");
      setStep("success");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    if (!requesterName.trim()) { toast.error("Informe seu nome completo"); return; }
    if (!subject.trim()) { toast.error("Informe o assunto"); return; }
    if (!description.trim() || description.length < 10) { toast.error("Descreva sua solicitação com pelo menos 10 caracteres"); return; }

    submitMutation.mutate({
      serviceTypeId: serviceId ?? undefined,
      subjectId: selectedSubjectId ?? undefined,
      subject: subject || service?.name || "Solicitação",
      description,
      type: selectedType as any,
      requesterName,
      requesterEmail: requesterEmail || undefined,
      requesterPhone: requesterPhone || undefined,
      requesterCpfCnpj: requesterCpf || undefined,
      isConfidential,
    });
  }

  function copyNup() {
    navigator.clipboard.writeText(nupResult);
    toast.success("NUP copiado!");
  }

  if (isLoading) {
    return (
      <div className="light min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Carregando serviço...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="light min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800">Serviço não encontrado</h2>
          <p className="text-gray-500 text-sm mt-1">Este serviço não está disponível ou não foi publicado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/central-cidadao")}>
            <ArrowLeft className="w-4 h-4 mr-2" />Voltar à Central
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="light min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/central-cidadao")} className="gap-1.5 text-gray-600">
            <ArrowLeft className="w-4 h-4" />Voltar
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Central de Serviços do Cidadão</p>
            <h1 className="text-sm font-semibold text-gray-800 truncate">{service.name}</h1>
          </div>
          {service.category && (
            <Badge variant="outline" className="text-xs border-blue-200 text-blue-600 bg-blue-50">{service.category}</Badge>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* SUCCESS STATE */}
        {step === "success" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Solicitação Enviada!</h2>
            <p className="text-gray-500 mb-6">Sua solicitação foi registrada com sucesso. Guarde o número de protocolo abaixo para acompanhar o andamento.</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 inline-block">
              <p className="text-xs text-blue-600 font-medium mb-1">Número de Protocolo (NUP)</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono font-bold text-blue-800">{nupResult}</span>
                <Button variant="ghost" size="sm" onClick={copyNup} className="text-blue-600 hover:text-blue-700">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {requesterEmail ? `Uma confirmação foi enviada para ${requesterEmail}.` : "Anote o número acima para consultar o andamento da sua solicitação."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate(`/consulta?nup=${nupResult}`)} className="bg-blue-600 hover:bg-blue-700">
                Acompanhar Protocolo
              </Button>
              <Button variant="outline" onClick={() => navigate("/central-cidadao")}>
                Voltar à Central
              </Button>
            </div>
          </div>
        )}

        {/* INFO STATE */}
        {step === "info" && (
          <div className="space-y-6">
            {/* Service Header */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-800">{service.name}</h2>
                  {service.code && <p className="font-mono text-xs text-gray-400 mt-0.5">{service.code}</p>}
                  {service.description && <p className="text-gray-600 mt-2 text-sm leading-relaxed">{service.description}</p>}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {service.cost && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <DollarSign className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Custo</p>
                      <p className="text-sm text-gray-700">{service.cost}</p>
                    </div>
                  </div>
                )}
                {service.formOfService && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Atendimento</p>
                      <p className="text-sm text-gray-700">{service.formOfService}</p>
                    </div>
                  </div>
                )}
                {service.responseChannel && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Resposta via</p>
                      <p className="text-sm text-gray-700">{service.responseChannel}</p>
                    </div>
                  </div>
                )}
                {(service.slaResponseHours || service.slaConclusionHours) && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Prazo</p>
                      <p className="text-sm text-gray-700">
                        {service.slaConclusionHours ? `${service.slaConclusionHours}h` : `${service.slaResponseHours}h`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Purpose */}
            {service.purpose && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-600" />Para que serve?
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{service.purpose}</p>
              </div>
            )}

            {/* Who can request */}
            {service.whoCanRequest && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-blue-600" />Quem pode solicitar?
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{service.whoCanRequest}</p>
              </div>
            )}

            {/* Documents required */}
            {(service as any).documents?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-blue-600" />Documentos Necessários
                </h3>
                <div className="space-y-2">
                  {(service as any).documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${doc.requirement === "required" ? "bg-red-500" : doc.requirement === "complementary" ? "bg-yellow-500" : "bg-gray-400"}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{doc.name}</p>
                        {doc.description && <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">Formatos: {doc.acceptedFormats} · Máx: {doc.maxSizeMb}MB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Important notes */}
            {service.importantNotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4" />Observações Importantes
                </h3>
                <p className="text-amber-700 text-sm leading-relaxed">{service.importantNotes}</p>
              </div>
            )}

            {/* Subjects */}
            {(service as any).subjects?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">Tipos de Solicitação</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(service as any).subjects.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSubjectId(s.id); setSubject(s.name); setSelectedType("request"); setStep("form"); }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">{s.name}</p>
                        {s.description && <p className="text-xs text-gray-500 truncate">{s.description}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="bg-blue-600 rounded-2xl p-6 text-white text-center">
              <h3 className="text-lg font-bold mb-2">Pronto para solicitar?</h3>
              <p className="text-blue-100 text-sm mb-4">Preencha o formulário online e acompanhe o andamento pelo número de protocolo.</p>
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                onClick={() => setStep("form")}
              >
                Iniciar Solicitação
              </Button>
            </div>
          </div>
        )}

        {/* FORM STATE */}
        {step === "form" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep("info")} className="gap-1.5 text-gray-600">
                <ArrowLeft className="w-4 h-4" />Voltar
              </Button>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Formulário de Solicitação</h2>
                <p className="text-xs text-gray-500">{service.name}</p>
              </div>
            </div>

            {/* Requester Info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />Seus Dados
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Nome Completo <span className="text-red-500">*</span></Label>
                  <Input value={requesterName} onChange={e => setRequesterName(e.target.value)} placeholder="Seu nome completo" className="bg-white border-gray-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">E-mail</Label>
                  <Input type="email" value={requesterEmail} onChange={e => setRequesterEmail(e.target.value)} placeholder="seu@email.com" className="bg-white border-gray-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Telefone</Label>
                  <Input value={requesterPhone} onChange={e => setRequesterPhone(e.target.value)} placeholder="(00) 00000-0000" className="bg-white border-gray-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">CPF / CNPJ</Label>
                  <Input value={requesterCpf} onChange={e => setRequesterCpf(e.target.value)} placeholder="000.000.000-00" className="bg-white border-gray-200" />
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />Detalhes da Solicitação
              </h3>

              {/* Subject selector */}
              {(service as any).subjects?.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Assunto</Label>
                  <Select value={selectedSubjectId?.toString() ?? "none"} onValueChange={v => {
                    if (v === "none") return;
                    const s = (service as any).subjects.find((s: any) => s.id === Number(v));
                    setSelectedSubjectId(Number(v));
                    if (s) setSubject(s.name);
                  }}>
                    <SelectTrigger className="bg-white border-gray-200"><SelectValue placeholder="Selecione o assunto..." /></SelectTrigger>
                    <SelectContent>
                      {(service as any).subjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Tipo de Solicitação</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="bg-white border-gray-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Assunto / Título <span className="text-red-500">*</span></Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Descreva brevemente o assunto" className="bg-white border-gray-200" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Descrição Detalhada <span className="text-red-500">*</span></Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva sua solicitação com o máximo de detalhes possível..." rows={5} className="bg-white border-gray-200" />
                <p className="text-xs text-gray-400">{description.length} caracteres (mínimo 10)</p>
              </div>

              {/* Dynamic fields from service type */}
              {(service as any).fields?.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Informações Adicionais</p>
                  {(service as any).fields.map((field: any) => (
                    <DynamicField
                      key={field.id}
                      field={field}
                      value={formData[field.name]}
                      onChange={v => setFormData(d => ({ ...d, [field.name]: v }))}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-gray-500" />Solicitação Sigilosa
                  </Label>
                  <p className="text-xs text-gray-500 mt-0.5">Apenas servidores autorizados terão acesso</p>
                </div>
                <Switch checked={isConfidential} onCheckedChange={setIsConfidential} />
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-700 font-semibold"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setStep("info")}>
                Cancelar
              </Button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Ao enviar, você concorda com os termos de uso e política de privacidade do município.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
